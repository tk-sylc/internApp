from django.contrib import admin

from .models import (
    ApprovedApplication,
    ExternalStorageLoanApplication,
    LanEquipmentLoanApplication,
    PcLoanApplication,
    SmartphonePurchaseApplication,
)


class BaseApplicationAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'requester_name',
        'department',
        'employee_number',
        'status',
        'created_at',
    )
    list_editable = ('status',)
    list_filter = ('status',)
    search_fields = ('requester_name', 'department', 'employee_number')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'


@admin.register(PcLoanApplication)
class PcLoanApplicationAdmin(BaseApplicationAdmin):
    list_display = (
        'id',
        'management_number',
        'applicant_name',
        'department',
        'start_date',
        'location',
        'status',
        'created_at',
    )
    search_fields = BaseApplicationAdmin.search_fields + (
        'management_number',
        'applicant_name',
        'location',
    )
    list_filter = ('status', 'start_date', 'department')


@admin.register(ExternalStorageLoanApplication)
class ExternalStorageLoanApplicationAdmin(BaseApplicationAdmin):
    list_display = (
        'id',
        'device_name',
        'capacity',
        'applicant_name',
        'department',
        'loan_date',
        'location',
        'status',
        'created_at',
    )
    search_fields = BaseApplicationAdmin.search_fields + (
        'device_name',
        'applicant_name',
        'location',
    )
    list_filter = ('status', 'loan_date', 'department')


@admin.register(LanEquipmentLoanApplication)
class LanEquipmentLoanApplicationAdmin(BaseApplicationAdmin):
    list_display = (
        'id',
        'device_type',
        'device_name',
        'requester_name',
        'start_date',
        'return_date',
        'location',
        'status',
        'created_at',
    )
    search_fields = BaseApplicationAdmin.search_fields + ('device_name', 'location')
    list_filter = ('status', 'device_type', 'start_date', 'return_date', 'department')


@admin.register(SmartphonePurchaseApplication)
class SmartphonePurchaseApplicationAdmin(BaseApplicationAdmin):
    list_display = (
        'id',
        'model_name',
        'storage',
        'sim_required',
        'requester_name',
        'purchase_date',
        'status',
        'created_at',
    )
    search_fields = BaseApplicationAdmin.search_fields + ('model_name',)
    list_filter = ('status', 'storage', 'sim_required', 'purchase_date', 'department')


@admin.register(ApprovedApplication)
class ApprovedApplicationAdmin(admin.ModelAdmin):
    list_display = (
        'reference_number',
        'operation_type',
        'application_type',
        'applicant_name',
        'department',
        'approved_date',
        'entered_by',
        'created_at',
    )
    list_filter = (
        'operation_type',
        'application_type',
        'department',
        'approved_date',
        'created_at',
    )
    search_fields = ('applicant_name', 'department', 'entered_by__username')
    readonly_fields = ('reference_number', 'entered_by', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    @admin.display(description='受付番号', ordering='id')
    def reference_number(self, obj):
        return obj.reference_number if obj else '保存後に発行されます'

    def save_model(self, request, obj, form, change):
        if not change and not obj.entered_by_id:
            obj.entered_by = request.user
        super().save_model(request, obj, form, change)
