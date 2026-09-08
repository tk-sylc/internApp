from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class LedgerMigrationPreservationTests(TransactionTestCase):
    def test_upgrade_keeps_existing_registration_without_inventing_history(self):
        executor = MigrationExecutor(connection)
        old_target = [("asset_requests", "0013_move_disposal_date")]
        latest = executor.loader.graph.leaf_nodes()
        try:
            executor.migrate(old_target)
            apps = executor.loader.project_state(old_target).apps
            User = apps.get_model("auth", "User")
            user = User.objects.create(username="migration-operator", email="original@example.co.jp")
            Record = apps.get_model("asset_requests", "ApprovedApplication")
            record = Record.objects.create(application_type="pc", operation_type="purchase",
                entered_by_id=user.pk, entered_by_name="元の責任者", entered_by_email=user.email,
                applicant_name="移行前の社員", approved_date="2025-05-06", notes="保存するメモ",
                details={"device_name": "旧PC", "legacy_field": "既存の追加項目", "quantity": 0})
            before = Record.objects.filter(pk=record.pk).values().get()
            executor = MigrationExecutor(connection)
            executor.migrate(latest)
            apps = executor.loader.project_state(latest).apps
            Current = apps.get_model("asset_requests", "ApprovedApplication")
            after = Current.objects.filter(pk=record.pk).values().get()
            for key, value in before.items():
                self.assertEqual(after[key], value, key)
            self.assertFalse(after["is_cancelled"])
            self.assertEqual(after["revision"], 1)
            State = apps.get_model("asset_requests", "ApprovedLedgerState")
            self.assertEqual(State.objects.get(application_type="pc").state, "pending")
            # The feature does not claim to know edits made before rollout.
            from .serializers import ApprovedApplicationSerializer
            from .models import ApprovedApplication
            data = ApprovedApplicationSerializer(ApprovedApplication.objects.get(pk=record.pk), context={"include_history": True}).data
            self.assertEqual(data["history"], [])
        finally:
            MigrationExecutor(connection).migrate(latest)
