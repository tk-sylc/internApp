from django.contrib import admin

from .models import (
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
