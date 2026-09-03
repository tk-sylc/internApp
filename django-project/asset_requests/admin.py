import re
from datetime import datetime

from django.contrib import admin

from .models import ExternalStorageRequest, LANRequest, PCRequest, SmartphoneRequest


class BaseAssetRequestAdmin(admin.ModelAdmin):
    list_display = (
        "reference_number",
        "created_by",
        "requester_name",
        "department",
        "employee_number",
        "status",
        "created_at",
    )
    list_editable = ("status",)
    list_filter = ("status", "department", "created_at")
    search_fields = (
        "created_by__username",
        "requester_name",
        "department",
        "employee_number",
    )
    readonly_fields = ("reference_number", "created_by", "created_at", "updated_at")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("created_by",)

    @admin.display(description="受付番号", ordering="id")
    def reference_number(self, obj):
        if obj is None:
            return "保存後に発行されます"
        return obj.reference_number

    def save_model(self, request, obj, form, change):
        if not change and not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def get_search_results(self, request, queryset, search_term):
        """通常の検索に加えて、完全な受付番号でも申請を検索する。"""
        base_queryset = queryset
        queryset, use_distinct = super().get_search_results(
            request,
            queryset,
            search_term,
        )
        pattern = re.compile(
            rf"^{re.escape(self.model.REFERENCE_PREFIX)}-(\d{{8}})-(\d+)$",
            re.IGNORECASE,
        )
        match = pattern.fullmatch(search_term.strip())
        if not match:
            return queryset, use_distinct

        try:
            created_date = datetime.strptime(match.group(1), "%Y%m%d").date()
        except ValueError:
            return queryset, use_distinct

        reference_match = base_queryset.filter(
            pk=int(match.group(2)),
            created_at__date=created_date,
        )
        return queryset | reference_match, use_distinct


@admin.register(PCRequest)
class PCRequestAdmin(BaseAssetRequestAdmin):
    list_display = BaseAssetRequestAdmin.list_display + (
        "management_number",
        "start_date",
    )
    search_fields = BaseAssetRequestAdmin.search_fields + (
        "applicant_name",
        "management_number",
    )
    list_filter = BaseAssetRequestAdmin.list_filter + ("start_date",)


@admin.register(SmartphoneRequest)
class SmartphoneRequestAdmin(BaseAssetRequestAdmin):
    list_display = BaseAssetRequestAdmin.list_display + (
        "os",
        "model_name",
        "quantity",
        "purchase_date",
    )
    list_filter = BaseAssetRequestAdmin.list_filter + (
        "os",
        "line_type",
        "storage",
        "sim_required",
        "purchase_date",
    )
    search_fields = BaseAssetRequestAdmin.search_fields + ("model_name",)


@admin.register(ExternalStorageRequest)
class ExternalStorageRequestAdmin(BaseAssetRequestAdmin):
    list_display = BaseAssetRequestAdmin.list_display + (
        "device_name",
        "capacity",
        "loan_date",
    )
    search_fields = BaseAssetRequestAdmin.search_fields + (
        "applicant_name",
        "device_name",
    )
    list_filter = BaseAssetRequestAdmin.list_filter + ("loan_date",)


@admin.register(LANRequest)
class LANRequestAdmin(BaseAssetRequestAdmin):
    list_display = BaseAssetRequestAdmin.list_display + (
        "device_type",
        "device_name",
        "quantity",
        "start_date",
        "return_date",
    )
    list_filter = BaseAssetRequestAdmin.list_filter + (
        "device_type",
        "start_date",
        "return_date",
    )
    search_fields = BaseAssetRequestAdmin.search_fields + ("device_name", "location")
