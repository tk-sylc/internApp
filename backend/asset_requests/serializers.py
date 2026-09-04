from django.utils import timezone
from rest_framework import serializers

from accounts.models import UserProfile

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
    "purchase": {"quantity", "purpose"},
    "loan": {
        "management_number",
        "user_name",
        "quantity",
        "purpose",
    },
    "return": {"management_number", "condition"},
    "disposal": {
        "management_number",
        "disposal_reason",
        "disposal_method",
    },
}

APPROVED_COMMON_DETAIL_FIELDS = {
    "usage_start_date",
    "usage_end_date",
    "location",
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
    entered_by_name = serializers.SerializerMethodField()
    entered_by_email = serializers.SerializerMethodField()

    class Meta:
        model = ApprovedApplication
        fields = [
            "id",
            "reference_number",
            "application_type",
            "operation_type",
            "applicant_name",
            "department",
            "details",
            "notes",
            "entered_by_name",
            "entered_by_email",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "reference_number",
            "entered_by_name",
            "entered_by_email",
            "created_at",
        ]
        extra_kwargs = {
            "applicant_name": {"required": False, "allow_blank": True},
            "department": {"required": False, "allow_blank": True},
            "details": {"required": False},
            "notes": {"required": False, "allow_blank": True},
        }

    def get_entered_by_name(self, obj):
        if obj.entered_by_name:
            return obj.entered_by_name
        try:
            display_name = obj.entered_by.profile.display_name.strip()
        except UserProfile.DoesNotExist:
            display_name = ""
        return display_name or obj.entered_by.email or obj.entered_by.get_username()

    def get_entered_by_email(self, obj):
        return obj.entered_by_email or obj.entered_by.email

    def validate_department(self, value):
        if value == "":
            return value
        allowed = {"営業部", "総務部", "システム部"}
        if value not in allowed:
            raise serializers.ValidationError("部署を選択してください。")
        return value

    def validate(self, attrs):
        application_type = attrs.get("application_type")
        operation_type = attrs.get("operation_type")
        details = attrs.get("details", {})
        type_fields = APPROVED_TYPE_DETAIL_FIELDS.get(application_type)
        operation_fields = APPROVED_OPERATION_DETAIL_FIELDS.get(operation_type)

        if not isinstance(details, dict):
            raise serializers.ValidationError({"details": "転記項目を入力してください。"})
        if type_fields is None:
            raise serializers.ValidationError({"application_type": "申請種別が不正です。"})
        if operation_fields is None:
            raise serializers.ValidationError({"operation_type": "処理区分が不正です。"})

        expected_fields = type_fields | operation_fields | APPROVED_COMMON_DETAIL_FIELDS

        cleaned_details = {
            key: value
            for key, value in details.items()
            if key in expected_fields and value not in (None, "")
        }

        attrs["details"] = cleaned_details
        return attrs
