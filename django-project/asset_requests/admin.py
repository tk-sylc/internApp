from django.contrib import admin

from .models import ExternalStorageRequest, LANRequest, PCRequest, SmartphoneRequest


class BaseAssetRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "requester_name",
        "department",
        "employee_number",
        "status",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("requester_name", "department", "employee_number")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


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


@admin.register(SmartphoneRequest)
class SmartphoneRequestAdmin(BaseAssetRequestAdmin):
    list_display = BaseAssetRequestAdmin.list_display + (
        "os",
        "model_name",
        "quantity",
        "purchase_date",
    )
    list_filter = BaseAssetRequestAdmin.list_filter + ("os", "line_type")
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


@admin.register(LANRequest)
class LANRequestAdmin(BaseAssetRequestAdmin):
    list_display = BaseAssetRequestAdmin.list_display + (
        "device_type",
        "device_name",
        "quantity",
        "start_date",
        "return_date",
    )
    list_filter = BaseAssetRequestAdmin.list_filter + ("device_type",)
    search_fields = BaseAssetRequestAdmin.search_fields + ("device_name", "location")
