import logging

from io import BytesIO

from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserProfile

from .approved_ledger_sync import (
    FILE_NAMES, LEDGER_LABELS, SYNC_ERROR_MESSAGE, ledger_preview,
    lock_ledgers, sync_approved_ledger, sync_status,
)
from .approved_workflow import create_application, change_application
from .equipment_history import equipment_history
from .ledger_sync import sync_ledger
from .models import (
    ApprovedApplication,
    ApprovedLedgerState,
    ExternalStorageRequest,
    LANRequest,
    PCRequest,
    SmartphoneRequest,
)
from .serializers import (
    ApprovedApplicationSerializer,
    ExternalStorageRequestSerializer,
    LANRequestSerializer,
    PCRequestSerializer,
    SmartphoneRequestSerializer,
)


logger = logging.getLogger(__name__)


class BaseAssetRequestCreateView(generics.CreateAPIView):
    request_type = None

    def perform_create(self, serializer):
        try:
            profile = self.request.user.profile
        except UserProfile.DoesNotExist:
            raise serializers.ValidationError(
                {"profile": "申請前にプロフィールを登録してください。"}
            )

        serializer.save(
            created_by=self.request.user,
            requester_name=profile.display_name,
            department=profile.get_department_display(),
            requester_email=self.request.user.email,
        )

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        ledger_warning = None

        try:
            sync_ledger(self.request_type)
        except (OSError, ValueError):
            ledger_warning = (
                "申請は保存しましたが、Excel管理台帳を更新できませんでした。"
            )
            logger.exception("Excel管理台帳の同期に失敗しました。")

        response.data["ledger_synced"] = ledger_warning is None
        response.data["ledger_warning"] = ledger_warning
        return response


class PCRequestCreateView(BaseAssetRequestCreateView):
    request_type = "pc"
    queryset = PCRequest.objects.all()
    serializer_class = PCRequestSerializer


class ExternalStorageRequestCreateView(BaseAssetRequestCreateView):
    request_type = "memory"
    queryset = ExternalStorageRequest.objects.all()
    serializer_class = ExternalStorageRequestSerializer


class LANRequestCreateView(BaseAssetRequestCreateView):
    request_type = "lan"
    queryset = LANRequest.objects.all()
    serializer_class = LANRequestSerializer


class SmartphoneRequestCreateView(BaseAssetRequestCreateView):
    request_type = "phone"
    queryset = SmartphoneRequest.objects.all()
    serializer_class = SmartphoneRequestSerializer


class NoStoreResponseMixin:
    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store"
        if response.status_code == 403 and not request.user.is_authenticated and isinstance(getattr(response, "data", None), dict):
            response.data["code"] = "authentication_required"
        return response


class ActiveOperatorPermission(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_active


def _sync_types(application_types):
    success = True
    for application_type in sorted(application_types):
        try:
            sync_approved_ledger(application_type)
        except Exception:
            success = False
            logger.exception("台帳のExcel同期に失敗しました。")
    return success


def _record_response(record, synced=None, status=200):
    result = dict(ApprovedApplicationSerializer(record, context={"include_history": True}).data)
    if synced is not None:
        result.update(ledger_synced=synced, ledger_warning=None if synced else SYNC_ERROR_MESSAGE)
    return Response(result, status=status)


class EquipmentHistoryView(NoStoreResponseMixin, APIView):
    permission_classes = [ActiveOperatorPermission]

    def get(self, request):
        return Response(equipment_history(request.query_params))


class ApprovedApplicationListCreateView(NoStoreResponseMixin, generics.ListCreateAPIView):
    permission_classes = [ActiveOperatorPermission]
    serializer_class = ApprovedApplicationSerializer

    def get_queryset(self):
        queryset = ApprovedApplication.objects.select_related("entered_by__profile", "source_application", "related_loan")
        if self.request.query_params.get("include_cancelled") != "1":
            queryset = queryset.filter(is_cancelled=False)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        from rest_framework.serializers import UUIDField
        raw_key = request.headers.get("Idempotency-Key")
        request_id = UUIDField().run_validation(raw_key) if raw_key is not None else None
        record = create_application(serializer, request.user, request_id=request_id)
        return _record_response(record, _sync_types({record.application_type}), status=201)


class ApprovedApplicationDetailView(NoStoreResponseMixin, APIView):
    permission_classes = [ActiveOperatorPermission]

    def get(self, request, pk):
        record = get_object_or_404(ApprovedApplication.objects.select_related("entered_by__profile", "source_application", "related_loan"), pk=pk)
        return _record_response(record)

    def patch(self, request, pk):
        record, types = change_application(pk, request.user, request.data)
        return _record_response(record, _sync_types(types))


class ApprovedApplicationCancelView(NoStoreResponseMixin, APIView):
    permission_classes = [ActiveOperatorPermission]

    def post(self, request, pk):
        record, types = change_application(pk, request.user, request.data, action="cancel")
        return _record_response(record, _sync_types(types))


class ApprovedApplicationRestoreView(NoStoreResponseMixin, APIView):
    permission_classes = [ActiveOperatorPermission]

    def post(self, request, pk):
        record, types = change_application(pk, request.user, request.data, action="restore")
        return _record_response(record, _sync_types(types))


def _ledger_type(application_type):
    if application_type not in FILE_NAMES:
        raise Http404
    return application_type


class LedgerListView(NoStoreResponseMixin, APIView):
    permission_classes = [ActiveOperatorPermission]

    def get(self, request):
        return Response([
            {"application_type": value, "label": LEDGER_LABELS[value],
             "count": ApprovedApplication.objects.filter(application_type=value, is_cancelled=False).count(),
             "sync": sync_status(value)}
            for value in FILE_NAMES
        ])


class LedgerDetailView(NoStoreResponseMixin, APIView):
    permission_classes = [ActiveOperatorPermission]

    def get(self, request, application_type):
        return Response(ledger_preview(_ledger_type(application_type), request.query_params.get("include_cancelled") == "1"))


class LedgerSyncView(NoStoreResponseMixin, APIView):
    permission_classes = [ActiveOperatorPermission]

    def post(self, request, application_type):
        value = _ledger_type(application_type)
        succeeded = _sync_types({value})
        return Response({"sync": sync_status(value)}, status=200 if succeeded else 503)


class LedgerDownloadView(NoStoreResponseMixin, APIView):
    permission_classes = [ActiveOperatorPermission]

    def get(self, request, application_type):
        value = _ledger_type(application_type)
        try:
            # Hold the same lock through the fresh generation AND reading bytes,
            # so a concurrent replace cannot switch files after validation.
            # Catch inside outer atomic to retain persistent failure status.
            with lock_ledgers([value]):
                try:
                    path = sync_approved_ledger(value)
                    content = path.read_bytes()
                except Exception:
                    logger.exception("最新台帳のダウンロードに失敗しました。")
                    ApprovedLedgerState.objects.filter(application_type=value).update(
                        state=ApprovedLedgerState.State.ERROR, error=SYNC_ERROR_MESSAGE,
                    )
                    content = None
        except Exception:
            logger.exception("台帳の読み込みに失敗しました。")
            content = None
        if content is None:
            return Response({"detail": "最新のExcelを作成できませんでした。台帳の同期状態を確認して再試行してください。"}, status=503)
        response = FileResponse(BytesIO(content), as_attachment=True, filename=FILE_NAMES[value], content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response["Cache-Control"] = "no-store"
        return response
