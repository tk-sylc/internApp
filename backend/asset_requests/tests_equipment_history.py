"""Reuse is a copy into a new application, never an equipment inventory."""
from copy import deepcopy
from datetime import timedelta
from io import BytesIO
from tempfile import TemporaryDirectory
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from openpyxl import load_workbook
from rest_framework.test import APITestCase

from .models import ApprovedApplication
from .serializers import APPROVED_EQUIPMENT_DETAIL_FIELDS, APPROVED_TYPE_DETAIL_FIELDS

URL = "/api/approved-applications/"
LOOKUP = URL + "equipment-history/"


class EquipmentHistoryTests(APITestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        settings = override_settings(APPROVED_LEDGER_OUTPUT_DIR=directory.name)
        settings.enable()
        self.addCleanup(settings.disable)
        self.user = get_user_model().objects.create_user("equipment-operator", email="equipment@example.invalid")
        self.client.force_login(self.user)

    def fixture(self, kind="pc", operation="loan", number="PC-001", **extra):
        details = {key: "fixed-" + key for key in APPROVED_TYPE_DETAIL_FIELDS[kind]}
        details.update(management_number=number, quantity=2, purpose="old purpose", location="old location", usage_start_date="2026-09-01", usage_end_date="2026-09-03")
        fields = {"application_type": kind, "operation_type": operation, "applicant_name": "old applicant", "department": "old department", "details": details, "notes": "old note", "entered_by": self.user}
        fields.update(extra)
        return ApprovedApplication.objects.create(**fields)

    def lookup(self, **params):
        params.setdefault("application_type", "pc")
        response = self.client.get(LOOKUP, params)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response["Cache-Control"], "no-store")
        return response.data

    def test_lookup_requires_active_login_and_never_lists_without_input(self):
        self.fixture()
        self.assertEqual(self.lookup(), {"match": None, "candidates": []})
        self.assertEqual(self.client.get(LOOKUP, {"application_type": "invalid", "q": "fixed"}).status_code, 400)
        self.assertEqual(self.client.get(LOOKUP, {"application_type": "pc", "q": "a" * 101}).status_code, 400)
        self.client.logout()
        self.assertEqual(self.client.get(LOOKUP, {"application_type": "pc", "management_number": "PC-001"}).status_code, 403)
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.client.force_login(self.user)
        self.assertEqual(self.client.get(LOOKUP, {"application_type": "pc", "management_number": "PC-001"}).status_code, 403)

    def test_number_matches_latest_active_same_kind_with_latest_loan_reference(self):
        old_loan = self.fixture()
        latest_loan = self.fixture()
        purchase = self.fixture(operation="purchase")
        self.fixture(is_cancelled=True)
        self.fixture(kind="phone")
        result = self.lookup(management_number=" PC-001 ")["match"]
        self.assertEqual(result["id"], purchase.pk)
        self.assertEqual(result["related_loan"]["id"], latest_loan.pk)
        self.assertEqual(result["related_loan"]["usage_start_date"], "2026-09-01")
        self.assertNotEqual(result["related_loan"]["id"], old_loan.pk)
        self.assertIsNone(self.lookup(management_number="PC-00")["match"])
        # updated_at does not reorder the registration history; same timestamps
        # use primary key as a deterministic tie breaker.
        stamp = timezone.now() - timedelta(days=1)
        ApprovedApplication.objects.filter(pk__in=[old_loan.pk, latest_loan.pk, purchase.pk]).update(created_at=stamp)
        self.assertEqual(self.lookup(management_number="PC-001")["match"]["id"], purchase.pk)

    def test_name_candidates_are_bounded_deduplicated_and_keep_unnumbered_devices(self):
        first = self.fixture()
        latest = self.fixture()
        blank_one = self.fixture(number="")
        blank_two = self.fixture(number="")
        self.fixture(is_cancelled=True)
        self.fixture(kind="phone")
        result = self.lookup(q="fixed-device_name")
        self.assertIsNone(result["match"])
        ids = [item["id"] for item in result["candidates"]]
        self.assertEqual(set(ids), {latest.pk, blank_one.pk, blank_two.pk})
        self.assertNotIn(first.pk, ids)
        for index in range(25):
            self.fixture(number=f"PC-{index + 100}")
        self.assertEqual(len(self.lookup(q="fixed-device_name")["candidates"]), 20)

    def test_every_kind_and_operation_reuses_only_equipment_and_preserves_original(self):
        for kind in APPROVED_TYPE_DETAIL_FIELDS:
            source = self.fixture(kind=kind, number="REUSE-" + kind)
            original = deepcopy(source.details)
            candidate = self.lookup(application_type=kind, management_number="REUSE-" + kind)["match"]
            self.assertEqual(set(candidate["details"]), APPROVED_EQUIPMENT_DETAIL_FIELDS[kind])
            for operation in ("purchase", "loan", "return", "disposal"):
                with self.subTest(kind=kind, operation=operation):
                    copied = dict(candidate["details"])
                    field = next(key for key in copied if key != "management_number")
                    copied[field] = "edited this time"
                    payload = {"application_type": kind, "operation_type": operation, "source_application": source.pk, "details": copied}
                    if operation == "return":
                        payload["related_loan"] = source.pk
                    response = self.client.post(URL, payload, format="json")
                    self.assertEqual(response.status_code, 201, response.data)
                    created = ApprovedApplication.objects.get(pk=response.data["id"])
                    self.assertEqual(created.details, copied)
                    self.assertEqual((created.applicant_name, created.department, created.notes), ("", "", ""))
                    self.assertEqual(created.source_application_id, source.pk)
                    self.assertEqual(created.history.count(), 1)
                    source.refresh_from_db()
                    self.assertEqual(source.details, original)
                    self.assertEqual(source.revision, 1)
                    self.assertEqual(source.history.count(), 0)

    def test_reference_validation_rejects_wrong_kind_cancelled_nonloan_and_mismatched_number(self):
        source = self.fixture()
        wrong_kind = self.fixture(kind="phone")
        cancelled = self.fixture(is_cancelled=True)
        purchase = self.fixture(operation="purchase")
        other_number = self.fixture(number="PC-002")
        payload = {"application_type": "pc", "operation_type": "return", "source_application": source.pk, "related_loan": source.pk, "details": {"management_number": "PC-001"}}
        for change in ({"source_application": wrong_kind.pk}, {"source_application": cancelled.pk}, {"related_loan": purchase.pk}, {"related_loan": cancelled.pk}, {"related_loan": other_number.pk}, {"operation_type": "loan"}, {"source_application": 999999}):
            with self.subTest(change=change):
                response = self.client.post(URL, {**payload, **change}, format="json")
                self.assertEqual(response.status_code, 400, response.data)
        response = self.client.patch(f"{URL}{source.pk}/", {"revision": 1, "source_application": source.pk}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(ApprovedApplication.objects.count(), 5)

    def test_unnumbered_return_links_only_selected_loan_and_exports_reference(self):
        source = self.fixture(number="")
        other = self.fixture(number="")
        candidates = self.lookup(q="fixed-device_name")["candidates"]
        candidate = next(item for item in candidates if item["id"] == source.pk)
        self.assertEqual(candidate["related_loan"]["id"], source.pk)
        payload = {"application_type": "pc", "operation_type": "return", "source_application": source.pk, "related_loan": other.pk, "details": candidate["details"]}
        self.assertEqual(self.client.post(URL, payload, format="json").status_code, 400)
        payload["related_loan"] = source.pk
        response = self.client.post(URL, payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["source_application_reference"], source.reference_number)
        self.assertEqual(response.data["related_loan_reference"], source.reference_number)
        history = ApprovedApplication.objects.get(pk=response.data["id"]).history.get()
        self.assertEqual(history.after["related_loan_reference"], source.reference_number)
        preview = self.client.get("/api/ledgers/pc/").data
        row = next(row for row in preview["rows"] if row["id"] == response.data["id"])
        for field in ("source_application_reference", "related_loan_reference"):
            index = next(i for i, column in enumerate(preview["columns"]) if column["key"] == field)
            self.assertEqual(row["cells"][index], source.reference_number)
        download = self.client.get("/api/ledgers/pc/download/")
        book = load_workbook(BytesIO(b"".join(download.streaming_content)))
        self.addCleanup(book.close)
        self.assertEqual([cell.value for cell in book.active[1]], [column["label"] for column in preview["columns"]])
        values = [cell.value for cell in list(book.active.rows)[-1]]
        self.assertEqual(values.count(source.reference_number), 2)

    def test_later_cancelled_source_preserves_provenance_and_allows_unrelated_edit(self):
        source = self.fixture()
        response = self.client.post(URL, {"application_type": "pc", "operation_type": "return", "source_application": source.pk, "related_loan": source.pk, "details": {"management_number": "PC-001"}}, format="json")
        self.assertEqual(response.status_code, 201)
        ApprovedApplication.objects.filter(pk=source.pk).update(is_cancelled=True)
        result = self.client.patch(f"{URL}{response.data['id']}/", {"revision": 1, "notes": "updated memo"}, format="json")
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(result.data["related_loan"], source.pk)
        invalid = self.client.patch(f"{URL}{response.data['id']}/", {"revision": 2, "details": {"management_number": "OTHER"}}, format="json")
        self.assertEqual(invalid.status_code, 400)

    def test_idempotent_retry_uses_source_id_even_after_source_applicant_changes(self):
        source = self.fixture()
        key = str(uuid4())
        payload = {"application_type": "pc", "operation_type": "purchase", "source_application": source.pk, "details": {"management_number": "PC-001"}}
        first = self.client.post(URL, payload, format="json", HTTP_IDEMPOTENCY_KEY=key)
        self.assertEqual(first.status_code, 201)
        ApprovedApplication.objects.filter(pk=source.pk).update(applicant_name="changed source applicant")
        retry = self.client.post(URL, payload, format="json", HTTP_IDEMPOTENCY_KEY=key)
        self.assertEqual(retry.status_code, 201, retry.data)
        self.assertEqual(first.data["id"], retry.data["id"])
        self.assertEqual(ApprovedApplication.objects.count(), 2)
