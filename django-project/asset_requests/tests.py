from datetime import date, timedelta

from django.contrib.admin.sites import AdminSite
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .admin import PCRequestAdmin
from .models import (
    ExternalStorageRequest,
    LANRequest,
    PCRequest,
    SmartphoneRequest,
)


def relative_date(days_from_today):
    return (timezone.localdate() + timedelta(days=days_from_today)).isoformat()


def expected_reference_number(asset_request):
    created_date = timezone.localdate(asset_request.created_at)
    return (
        f"{asset_request.REFERENCE_PREFIX}-{created_date:%Y%m%d}-"
        f"{asset_request.pk:06d}"
    )


class ReferenceNumberAdminTests(APITestCase):
    def test_request_can_be_found_by_its_complete_reference_number(self):
        pc_request = PCRequest.objects.create(
            requester_name="管理画面テスト",
            department="情報システム部",
            employee_number="ADMIN-001",
            applicant_name="管理画面テスト",
            management_number="PC-ADMIN-001",
            start_date=timezone.localdate(),
            location="東京本社",
            purpose="受付番号検索テスト",
        )
        model_admin = PCRequestAdmin(PCRequest, AdminSite())

        queryset, use_distinct = model_admin.get_search_results(
            request=None,
            queryset=PCRequest.objects.all(),
            search_term=pc_request.reference_number.lower(),
        )

        self.assertQuerySetEqual(queryset, [pc_request])
        self.assertFalse(use_distinct)


class PCRequestCreateAPITests(APITestCase):
    url_name = "asset_requests:pc-request-create"

    def get_payload(self):
        return {
            "requester_name": "テスト太郎",
            "department": "開発部",
            "employee_number": "TEST-001",
            "applicant_name": "テスト太郎",
            "management_number": "PC-TEST-001",
            "start_date": relative_date(1),
            "location": "テスト環境",
            "purpose": "API自動テスト",
        }

    def test_pc_request_can_be_created(self):
        response = self.client.post(
            reverse(self.url_name),
            self.get_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PCRequest.objects.count(), 1)

        pc_request = PCRequest.objects.get()
        self.assertEqual(pc_request.purpose, "API自動テスト")
        self.assertEqual(pc_request.status, "pending")
        self.assertEqual(
            response.data["reference_number"],
            expected_reference_number(pc_request),
        )

    def test_pc_request_requires_purpose(self):
        payload = self.get_payload()
        payload.pop("purpose")

        response = self.client.post(reverse(self.url_name), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("purpose", response.data)
        self.assertFalse(PCRequest.objects.exists())

    def test_pc_request_status_cannot_be_set_by_client(self):
        payload = self.get_payload()
        payload["status"] = "approved"
        payload["reference_number"] = "FORGED-REFERENCE"

        response = self.client.post(reverse(self.url_name), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PCRequest.objects.get().status, "pending")
        self.assertEqual(response.data["status"], "pending")
        self.assertNotEqual(response.data["reference_number"], "FORGED-REFERENCE")

    def test_pc_request_rejects_past_start_date(self):
        payload = self.get_payload()
        payload["start_date"] = relative_date(-1)

        response = self.client.post(reverse(self.url_name), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("start_date", response.data)
        self.assertFalse(PCRequest.objects.exists())


class ExternalStorageRequestCreateAPITests(APITestCase):
    url_name = "asset_requests:external-storage-request-create"

    def get_payload(self):
        return {
            "requester_name": "テスト花子",
            "department": "総務部",
            "employee_number": "TEST-002",
            "applicant_name": "テスト花子",
            "device_name": "暗号化USBメモリ",
            "capacity": "64GB",
            "location": "東京本社",
            "loan_date": relative_date(2),
            "purpose": "データ受け渡し",
        }

    def test_external_storage_request_can_be_created(self):
        response = self.client.post(
            reverse(self.url_name),
            self.get_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ExternalStorageRequest.objects.count(), 1)

        request = ExternalStorageRequest.objects.get()
        self.assertEqual(request.device_name, "暗号化USBメモリ")
        self.assertEqual(request.purpose, "データ受け渡し")
        self.assertEqual(request.status, "pending")
        self.assertEqual(
            response.data["reference_number"],
            expected_reference_number(request),
        )

    def test_external_storage_request_requires_purpose(self):
        payload = self.get_payload()
        payload.pop("purpose")

        response = self.client.post(reverse(self.url_name), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("purpose", response.data)
        self.assertFalse(ExternalStorageRequest.objects.exists())

    def test_external_storage_request_rejects_past_loan_date(self):
        payload = self.get_payload()
        payload["loan_date"] = relative_date(-1)

        response = self.client.post(reverse(self.url_name), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("loan_date", response.data)
        self.assertFalse(ExternalStorageRequest.objects.exists())


class LANRequestCreateAPITests(APITestCase):
    url_name = "asset_requests:lan-request-create"

    def get_payload(self):
        return {
            "requester_name": "テスト次郎",
            "department": "情報システム部",
            "employee_number": "TEST-003",
            "device_type": LANRequest.DeviceType.USB_LAN_ADAPTER,
            "device_name": "USB-C LANアダプター",
            "quantity": 2,
            "start_date": relative_date(3),
            "return_date": relative_date(10),
            "location": "大阪支社",
            "purpose": "出張先での有線接続",
            "notes": "USB-C対応",
        }

    def test_lan_request_can_be_created(self):
        payload = self.get_payload()
        response = self.client.post(
            reverse(self.url_name),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(LANRequest.objects.count(), 1)

        request = LANRequest.objects.get()
        self.assertEqual(request.quantity, 2)
        self.assertEqual(
            request.return_date,
            date.fromisoformat(payload["return_date"]),
        )
        self.assertEqual(request.status, "pending")
        self.assertEqual(
            response.data["reference_number"],
            expected_reference_number(request),
        )

    def test_lan_request_requires_purpose(self):
        payload = self.get_payload()
        payload.pop("purpose")

        response = self.client.post(reverse(self.url_name), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("purpose", response.data)
        self.assertFalse(LANRequest.objects.exists())

    def test_lan_request_rejects_quantity_less_than_one(self):
        payload = self.get_payload()
        payload["quantity"] = 0

        response = self.client.post(reverse(self.url_name), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity", response.data)
        self.assertFalse(LANRequest.objects.exists())

    def test_lan_request_rejects_return_date_before_start_date(self):
        payload = self.get_payload()
        payload["return_date"] = relative_date(2)

        response = self.client.post(reverse(self.url_name), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("return_date", response.data)
        self.assertFalse(LANRequest.objects.exists())

    def test_lan_request_rejects_past_start_date(self):
        payload = self.get_payload()
        payload["start_date"] = relative_date(-1)

        response = self.client.post(reverse(self.url_name), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("start_date", response.data)
        self.assertFalse(LANRequest.objects.exists())


class SmartphoneRequestCreateAPITests(APITestCase):
    url_name = "asset_requests:smartphone-request-create"

    def get_payload(self):
        return {
            "requester_name": "テスト三郎",
            "department": "営業部",
            "employee_number": "TEST-004",
            "os": SmartphoneRequest.OS.IOS,
            "line_type": SmartphoneRequest.LineType.NEW_CONTRACT,
            "model_name": "iPhoneテストモデル",
            "quantity": 1,
            "purchase_date": relative_date(4),
            "storage": SmartphoneRequest.Storage.GB_128,
            "sim_required": False,
            "purpose": "営業連絡",
            "notes": "テスト申請",
        }

    def test_smartphone_request_can_be_created(self):
        payload = self.get_payload()
        response = self.client.post(
            reverse(self.url_name),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SmartphoneRequest.objects.count(), 1)

        request = SmartphoneRequest.objects.get()
        self.assertEqual(request.model_name, "iPhoneテストモデル")
        self.assertEqual(
            request.purchase_date,
            date.fromisoformat(payload["purchase_date"]),
        )
        self.assertIs(request.sim_required, False)
        self.assertEqual(request.status, "pending")
        self.assertEqual(
            response.data["reference_number"],
            expected_reference_number(request),
        )

    def test_smartphone_request_requires_purpose(self):
        payload = self.get_payload()
        payload.pop("purpose")

        response = self.client.post(reverse(self.url_name), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("purpose", response.data)
        self.assertFalse(SmartphoneRequest.objects.exists())

    def test_smartphone_request_requires_sim_required(self):
        payload = self.get_payload()
        payload.pop("sim_required")

        response = self.client.post(reverse(self.url_name), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sim_required", response.data)
        self.assertFalse(SmartphoneRequest.objects.exists())

    def test_smartphone_request_requires_model_name_and_purchase_date(self):
        for field_name in ("model_name", "purchase_date"):
            with self.subTest(field_name=field_name):
                payload = self.get_payload()
                payload.pop(field_name)

                response = self.client.post(
                    reverse(self.url_name),
                    payload,
                    format="json",
                )

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(field_name, response.data)

        self.assertFalse(SmartphoneRequest.objects.exists())

    def test_smartphone_request_rejects_quantity_less_than_one(self):
        payload = self.get_payload()
        payload["quantity"] = 0

        response = self.client.post(reverse(self.url_name), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity", response.data)
        self.assertFalse(SmartphoneRequest.objects.exists())

    def test_smartphone_request_rejects_past_purchase_date(self):
        payload = self.get_payload()
        payload["purchase_date"] = relative_date(-1)

        response = self.client.post(reverse(self.url_name), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("purchase_date", response.data)
        self.assertFalse(SmartphoneRequest.objects.exists())


class CreateEndpointMethodTests(APITestCase):
    def test_create_endpoints_do_not_expose_request_lists(self):
        url_names = [
            "asset_requests:pc-request-create",
            "asset_requests:external-storage-request-create",
            "asset_requests:lan-request-create",
            "asset_requests:smartphone-request-create",
        ]

        for url_name in url_names:
            with self.subTest(url_name=url_name):
                response = self.client.get(reverse(url_name))

                self.assertEqual(
                    response.status_code,
                    status.HTTP_405_METHOD_NOT_ALLOWED,
                )
