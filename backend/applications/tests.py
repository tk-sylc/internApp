import json
from datetime import date

from django.core.exceptions import ValidationError
from django.test import Client, TestCase
from django.urls import reverse

from .models import (
    ApplicationStatus,
    ExternalStorageLoanApplication,
    LanEquipmentLoanApplication,
    PcLoanApplication,
    SmartphonePurchaseApplication,
)


COMMON_FIELDS = {
    'requester_name': '山田 太郎',
    'department': '営業部',
    'employee_number': 'EMP-0124',
}


class ApplicationModelTests(TestCase):
    def test_save_all_application_types(self):
        PcLoanApplication.objects.create(
            **COMMON_FIELDS,
            applicant_name='山田 太郎',
            management_number='PC-01234',
            start_date=date(2026, 9, 3),
            location='東京本社',
        )
        ExternalStorageLoanApplication.objects.create(
            **COMMON_FIELDS,
            applicant_name='山田 太郎',
            device_name='USBメモリ',
            capacity='64GB',
            location='東京本社',
            loan_date=date(2026, 9, 3),
        )
        LanEquipmentLoanApplication.objects.create(
            **COMMON_FIELDS,
            device_type=LanEquipmentLoanApplication.DeviceType.LAN_CABLE,
            device_name='CAT6 LANケーブル',
            start_date=date(2026, 9, 3),
            return_date=date(2026, 9, 10),
            location='第2会議室',
        )
        SmartphonePurchaseApplication.objects.create(
            **COMMON_FIELDS,
            model_name='iPhone 16',
            purchase_date=date(2026, 9, 3),
            storage=SmartphonePurchaseApplication.Storage.GB_128,
            sim_required=SmartphonePurchaseApplication.SimRequired.YES,
        )

        self.assertEqual(PcLoanApplication.objects.count(), 1)
        self.assertEqual(ExternalStorageLoanApplication.objects.count(), 1)
        self.assertEqual(LanEquipmentLoanApplication.objects.count(), 1)
        self.assertEqual(SmartphonePurchaseApplication.objects.count(), 1)
        self.assertEqual(
            PcLoanApplication.objects.get().status,
            ApplicationStatus.PENDING,
        )

    def test_lan_return_date_must_not_precede_start_date(self):
        application = LanEquipmentLoanApplication(
            **COMMON_FIELDS,
            device_type=LanEquipmentLoanApplication.DeviceType.LAN_CABLE,
            device_name='CAT6 LANケーブル',
            start_date=date(2026, 9, 10),
            return_date=date(2026, 9, 3),
            location='第2会議室',
        )

        with self.assertRaises(ValidationError):
            application.full_clean()

    def test_application_status_can_be_updated(self):
        application = PcLoanApplication.objects.create(
            **COMMON_FIELDS,
            applicant_name='山田 太郎',
            management_number='PC-01234',
            start_date=date(2026, 9, 3),
            location='東京本社',
        )

        application.status = ApplicationStatus.APPROVED
        application.save(update_fields=['status'])
        application.refresh_from_db()

        self.assertEqual(application.status, ApplicationStatus.APPROVED)


class CreateApplicationViewTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.csrf_url = reverse('applications:csrf-token')
        self.create_url = reverse('applications:create-application')
        self.payload = {
            'requestType': 'pc',
            'requesterName': '山田 太郎',
            'department': '営業部',
            'employeeNumber': 'EMP-0124',
            'applicantName': '山田 太郎',
            'managementNumber': 'PC-01234',
            'startDate': '2026-09-03',
            'location': '東京本社',
        }

    def post_with_csrf(self, payload):
        self.client.get(self.csrf_url)
        token = self.client.cookies['csrftoken'].value
        return self.client.post(
            self.create_url,
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_X_CSRFTOKEN=token,
        )

    def test_create_pc_application(self):
        response = self.post_with_csrf(self.payload)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(PcLoanApplication.objects.count(), 1)
        application = PcLoanApplication.objects.get()
        self.assertEqual(application.management_number, 'PC-01234')
        self.assertEqual(response.json()['id'], application.pk)
        self.assertEqual(response.json()['status'], ApplicationStatus.PENDING)

    def test_create_each_non_pc_application_type(self):
        cases = [
            (
                {
                    'requestType': 'memory',
                    'requesterName': '山田 太郎',
                    'department': '営業部',
                    'employeeNumber': 'EMP-0124',
                    'applicantName': '山田 太郎',
                    'deviceName': 'USBメモリ',
                    'capacity': '64GB',
                    'location': '東京本社',
                    'loanDate': '2026-09-03',
                },
                ExternalStorageLoanApplication,
            ),
            (
                {
                    'requestType': 'lan',
                    'requesterName': '山田 太郎',
                    'department': '営業部',
                    'employeeNumber': 'EMP-0124',
                    'deviceType': 'LANケーブル',
                    'deviceName': 'CAT6 LANケーブル',
                    'startDate': '2026-09-03',
                    'returnDate': '2026-09-10',
                    'location': '第2会議室',
                },
                LanEquipmentLoanApplication,
            ),
            (
                {
                    'requestType': 'phone',
                    'requesterName': '山田 太郎',
                    'department': '営業部',
                    'employeeNumber': 'EMP-0124',
                    'model': 'iPhone 16',
                    'deliveryDate': '2026-09-03',
                    'storage': '128GB',
                    'simRequired': 'あり',
                },
                SmartphonePurchaseApplication,
            ),
        ]

        for payload, model in cases:
            with self.subTest(request_type=payload['requestType']):
                response = self.post_with_csrf(payload)
                self.assertEqual(response.status_code, 201)
                self.assertEqual(model.objects.count(), 1)

    def test_reject_missing_required_field(self):
        del self.payload['managementNumber']

        response = self.post_with_csrf(self.payload)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(PcLoanApplication.objects.count(), 0)

    def test_reject_post_without_csrf_token(self):
        response = self.client.post(
            self.create_url,
            data=json.dumps(self.payload),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(PcLoanApplication.objects.count(), 0)
