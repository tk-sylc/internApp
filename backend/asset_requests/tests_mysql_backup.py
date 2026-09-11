"""T-037: physical SQL backup/restore, enabled only by the isolated test runner."""
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
from unittest import skipUnless
from uuid import uuid4

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from accounts.models import Department, UserProfile
from .models import ApprovedApplication


@skipUnless(getattr(settings, "DEBUG_ISOLATED_MYSQL", False), "requires private disposable MySQL")
class MySQLBackupRoundTripTests(TransactionTestCase):
    def test_accounts_records_history_and_sync_survive_sql_restore(self):
        import MySQLdb
        db = connection.settings_dict
        self.assertEqual(connection.vendor, "mysql")
        self.assertTrue(db["NAME"].startswith("test_"))
        self.assertEqual(db["HOST"], "127.0.0.1")
        self.assertNotEqual(int(db["PORT"]), 3306)
        binary = Path(r"C:\Program Files\MySQL\MySQL Server 8.4\bin")
        restore_name = "debug_restore_" + uuid4().hex
        with TemporaryDirectory() as directory:
            override = self.settings(APPROVED_LEDGER_OUTPUT_DIR=directory)
            override.enable()
            self.addCleanup(override.disable)
            user = get_user_model().objects.create_user("backup-test", email="backup@example.invalid", password="Backup-Check-394!")
            UserProfile.objects.create(user=user, display_name="Backup operator", department=Department.SYSTEM)
            client = APIClient()
            client.force_login(user)
            created = client.post('/api/approved-applications/', {
                "application_type": "phone", "operation_type": "purchase", "applicant_name": "backup check",
                "details": {"phone_number": "09001234567", "model_name": "restore device"}, "notes": "before"}, format='json')
            self.assertEqual(created.status_code, 201)
            changed = client.patch(f"/api/approved-applications/{created.data['id']}/", {
                "revision": 1, "notes": "after\nrestorable"}, format='json')
            self.assertEqual(changed.status_code, 200)
            self.assertEqual(ApprovedApplication.objects.get().history.count(), 2)
            options = Path(directory)/"client.cnf"
            options.write_text("[client]\nhost=127.0.0.1\nport="+str(db['PORT'])+
                "\nuser="+db['USER']+"\npassword="+db['PASSWORD']+"\n", encoding="utf-8")
            backup = Path(directory)/"backup.sql"
            with backup.open('wb') as output:
                result = subprocess.run([str(binary/'mysqldump.exe'), '--defaults-file='+str(options),
                    '--single-transaction', '--skip-comments', '--set-gtid-purged=OFF', db['NAME']],
                    stdout=output, stderr=subprocess.PIPE, timeout=60, creationflags=subprocess.CREATE_NO_WINDOW)
            self.assertEqual(result.returncode, 0, result.stderr.decode(errors='replace'))
            restored = MySQLdb.connect(host=db['HOST'], port=int(db['PORT']), user=db['USER'],
                passwd=db['PASSWORD'], charset='utf8mb4')
            try:
                with restored.cursor() as cursor:
                    cursor.execute('CREATE DATABASE `'+restore_name+'` CHARACTER SET utf8mb4')
                with backup.open('rb') as source:
                    result = subprocess.run([str(binary/'mysql.exe'), '--defaults-file='+str(options), restore_name],
                        stdin=source, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60,
                        creationflags=subprocess.CREATE_NO_WINDOW)
                self.assertEqual(result.returncode, 0, result.stderr.decode(errors='replace'))
                with restored.cursor() as target, connection.cursor() as original:
                    target.execute('USE `'+restore_name+'`')
                    for table, key in [('auth_user', 'id'), ('accounts_userprofile', 'id'),
                                       ('asset_requests_approvedapplication', 'id'),
                                       ('asset_requests_approvedapplicationhistory', 'id'),
                                       ('asset_requests_approvedledgerstate', 'application_type')]:
                        sql = f'SELECT * FROM `{table}` ORDER BY `{key}`'
                        original.execute(sql)
                        target.execute(sql)
                        self.assertEqual(target.fetchall(), original.fetchall(), table)
            finally:
                # This identifier is generated here and can never be a user's database.
                with restored.cursor() as cursor:
                    cursor.execute('DROP DATABASE IF EXISTS `'+restore_name+'`')
                restored.close()
