from django.utils import timezone
from rest_framework import serializers

from .models import (
    ExternalStorageRequest,
    LANRequest,
    PCRequest,
    SmartphoneRequest,
)


READ_ONLY_FIELDS = [
    "id",
    "reference_number",
    "status",
    "created_at",
    "updated_at",
]


class BaseAssetRequestSerializer(serializers.ModelSerializer):
    reference_number = serializers.CharField(read_only=True)


class PCRequestSerializer(BaseAssetRequestSerializer):
    class Meta:
        model = PCRequest
        fields = [
            "id",
            "reference_number",
            "requester_name",
            "department",
            "employee_number",
            "applicant_name",
            "management_number",
            "start_date",
            "location",
            "purpose",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = READ_ONLY_FIELDS

    def validate_start_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("過去の日付は指定できません。")
        return value


class ExternalStorageRequestSerializer(BaseAssetRequestSerializer):
    class Meta:
        model = ExternalStorageRequest
        fields = [
            "id",
            "reference_number",
            "requester_name",
            "department",
            "employee_number",
            "applicant_name",
            "device_name",
            "capacity",
            "location",
            "loan_date",
            "purpose",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = READ_ONLY_FIELDS

    def validate_loan_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("過去の日付は指定できません。")
        return value


class LANRequestSerializer(BaseAssetRequestSerializer):
    class Meta:
        model = LANRequest
        fields = [
            "id",
            "reference_number",
            "requester_name",
            "department",
            "employee_number",
            "device_type",
            "device_name",
            "quantity",
            "start_date",
            "return_date",
            "location",
            "purpose",
            "notes",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = READ_ONLY_FIELDS

    def validate_start_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("過去の日付は指定できません。")
        return value

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        return_date = attrs.get("return_date")

        if start_date and return_date and return_date < start_date:
            raise serializers.ValidationError(
                {"return_date": "返却予定日は利用開始日以降にしてください。"}
            )

        return attrs


class SmartphoneRequestSerializer(BaseAssetRequestSerializer):
    class Meta:
        model = SmartphoneRequest
        fields = [
            "id",
            "reference_number",
            "requester_name",
            "department",
            "employee_number",
            "os",
            "line_type",
            "model_name",
            "quantity",
            "purchase_date",
            "storage",
            "sim_required",
            "purpose",
            "notes",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = READ_ONLY_FIELDS

    def validate_purchase_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("過去の日付は指定できません。")
        return value
