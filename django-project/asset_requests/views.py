import logging

from rest_framework import generics, serializers

from accounts.models import UserProfile

from .approved_ledger_sync import sync_approved_ledger
from .ledger_sync import sync_ledger
from .models import (
    ApprovedApplication,
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


class ApprovedApplicationListCreateView(generics.ListCreateAPIView):
    queryset = ApprovedApplication.objects.select_related("entered_by").all()
    serializer_class = ApprovedApplicationSerializer

    def perform_create(self, serializer):
        serializer.save(entered_by=self.request.user)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        ledger_warning = None

        try:
            sync_approved_ledger(response.data["application_type"])
        except (OSError, ValueError):
            ledger_warning = (
                "登録は完了しましたが、Excel台帳を更新できませんでした。"
            )
            logger.exception("承認済み申請のExcel台帳同期に失敗しました。")

        response.data["ledger_synced"] = ledger_warning is None
        response.data["ledger_warning"] = ledger_warning
        return response
