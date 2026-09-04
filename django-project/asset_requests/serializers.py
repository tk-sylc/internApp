from django.utils import timezone
from rest_framework import serializers

from .models import (
    ApprovedApplication,
    ExternalStorageRequest,
    LANRequest,
    PCRequest,
    SmartphoneRequest,
)


APPROVED_TYPE_DETAIL_FIELDS = {
    "pc": {"device_name"},
    "memory": {"device_name", "capacity"},
    "lan": {"device_type", "device_name"},
    "phone": {"os", "model_name", "storage"},
    "other": {"summary"},
}

APPROVED_OPERATION_DETAIL_FIELDS = {
    "purchase": {"operation_date", "quantity", "purpose"},
    "loan": {
        "management_number",
        "user_name",
        "operation_date",
        "expected_return_date",
        "quantity",
        "location",
        "purpose",
    },
    "return": {"management_number", "operation_date", "condition"},
    "disposal": {
        "management_number",
        "operation_date",
        "disposal_reason",
        "disposal_method",
    },
}


READ_ONLY_FIELDS = [
    "id",
    "reference_number",
    "requester_name",
    "department",
    "requester_email",
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
            "requester_email",
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
            "requester_email",
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
            "requester_email",
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
            "requester_email",
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


class ApprovedApplicationSerializer(serializers.ModelSerializer):
    reference_number = serializers.CharField(read_only=True)
    entered_by_name = serializers.CharField(
        source="entered_by.get_username",
        read_only=True,
    )

    class Meta:
        model = ApprovedApplication
        fields = [
            "id",
            "reference_number",
            "application_type",
            "operation_type",
            "applicant_name",
            "department",
            "approved_date",
            "details",
            "notes",
            "entered_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "reference_number", "entered_by_name", "created_at"]

    def validate_approved_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("未来の日付は指定できません。")
        return value

    def validate_department(self, value):
        allowed = {"営業部", "総務部", "システム部"}
        if value not in allowed:
            raise serializers.ValidationError("部署を選択してください。")
        return value

    def validate(self, attrs):
        application_type = attrs.get("application_type")
        operation_type = attrs.get("operation_type")
        details = attrs.get("details")
        type_fields = APPROVED_TYPE_DETAIL_FIELDS.get(application_type)
        operation_fields = APPROVED_OPERATION_DETAIL_FIELDS.get(operation_type)

        if not isinstance(details, dict):
            raise serializers.ValidationError({"details": "転記項目を入力してください。"})
        if type_fields is None:
            raise serializers.ValidationError({"application_type": "申請種別が不正です。"})
        if operation_fields is None:
            raise serializers.ValidationError({"operation_type": "処理区分が不正です。"})

        expected_fields = type_fields | operation_fields

        cleaned_details = {
            key: value
            for key, value in details.items()
            if key in expected_fields
        }
        missing = [
            key
            for key in expected_fields
            if cleaned_details.get(key) in (None, "")
        ]
        if missing:
            raise serializers.ValidationError(
                {"details": f"未入力の転記項目があります: {', '.join(sorted(missing))}"}
            )

        attrs["details"] = cleaned_details
        return attrs
