"""Run real independent Python processes when the test database is MySQL."""
import json
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.test import TransactionTestCase, skipUnlessDBFeature
from rest_framework.test import APIClient

from .models import ApprovedApplication, ApprovedLedgerState

CHILD = """
import json, os, sys
os.environ['DJANGO_SETTINGS_MODULE'] = sys.argv[1]
import django
django.setup()
from django.conf import settings
from django.db import connections
settings.DATABASES['default']['NAME'] = sys.argv[2]
connections['default'].close()
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
settings.APPROVED_LEDGER_OUTPUT_DIR = sys.argv[3]
settings.ALLOWED_HOSTS = ['testserver']
client = APIClient()
client.force_authenticate(get_user_model().objects.get(pk=int(sys.argv[4])))
print('READY', flush=True)
action = sys.argv[7]
revision = int(sys.argv[8])
url = '/api/approved-applications/' + sys.argv[5] + '/'
if action == 'update':
    r = client.patch(url, {'revision': revision, 'notes': sys.argv[6]}, format='json')
else:
    r = client.post(url + action + '/', {'revision': revision, 'reason': sys.argv[6]}, format='json')
print(json.dumps({'status': r.status_code}), flush=True)
"""


@skipUnlessDBFeature("has_select_for_update")
class LedgerProcessLockTests(TransactionTestCase):
    def setUp(self):
        self.files = TemporaryDirectory()
        self.addCleanup(self.files.cleanup)
        override = self.settings(APPROVED_LEDGER_OUTPUT_DIR=self.files.name)
        override.enable()
        self.addCleanup(override.disable)
        self.operator = get_user_model().objects.create_user('process-operator', email='process@example.co.jp')
        client = APIClient()
        client.force_authenticate(self.operator)
        response = client.post('/api/approved-applications/', {'application_type': 'pc', 'operation_type': 'purchase'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.record_id = response.data['id']

    def spawn_update(self, note, action='update', revision=1):
        process = subprocess.Popen([sys.executable, '-c', CHILD,
            os.environ['DJANGO_SETTINGS_MODULE'], connection.settings_dict['NAME'],
            self.files.name, str(self.operator.pk), str(self.record_id), note, action, str(revision)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8',
            env={**os.environ, 'PYTHONIOENCODING': 'utf-8'}, cwd=Path(settings.BASE_DIR))
        def cleanup():
            if process.poll() is None:
                process.kill()
                process.communicate(timeout=10)
        self.addCleanup(cleanup)
        return process

    def test_independent_workers_cannot_overwrite_same_revision(self):
        first = self.spawn_update('first process')
        second = self.spawn_update('second process')
        statuses = []
        for process in (first, second):
            stdout, stderr = process.communicate(timeout=30)
            self.assertEqual(process.returncode, 0, stderr)
            statuses.append(json.loads(stdout.strip().splitlines()[-1])['status'])
        self.assertEqual(sorted(statuses), [200, 409])
        record = ApprovedApplication.objects.get(pk=self.record_id)
        self.assertEqual(record.revision, 2)
        state = ApprovedLedgerState.objects.get(application_type='pc')
        self.assertEqual(state.generation, state.synced_generation)
        self.assertEqual(state.state, 'synced')

    def test_database_ledger_lock_blocks_other_process_until_commit(self):
        with transaction.atomic():
            ApprovedLedgerState.objects.select_for_update().get(application_type='pc')
            process = self.spawn_update('after lock release')
            self.assertEqual(process.stdout.readline().strip(), 'READY')
            with self.assertRaises(subprocess.TimeoutExpired):
                process.communicate(timeout=0.7)
        stdout, stderr = process.communicate(timeout=30)
        self.assertEqual(process.returncode, 0, stderr)
        self.assertEqual(json.loads(stdout.strip().splitlines()[-1])['status'], 200)
        self.assertEqual(ApprovedApplication.objects.get(pk=self.record_id).notes, 'after lock release')

    def test_update_cancel_race_and_sequential_stale_restore(self):
        processes = (self.spawn_update('racing edit'), self.spawn_update('racing cancel', 'cancel'))
        statuses = []
        for process in processes:
            stdout, stderr = process.communicate(timeout=30)
            self.assertEqual(process.returncode, 0, stderr)
            statuses.append(json.loads(stdout.strip().splitlines()[-1])['status'])
        self.assertEqual(sorted(statuses), [200, 409])
        saved = ApprovedApplication.objects.get(pk=self.record_id)
        self.assertEqual(saved.revision, 2)
        self.assertEqual(saved.history.count(), 2)
        client = APIClient()
        client.force_authenticate(self.operator)
        url = f'/api/approved-applications/{saved.pk}/'
        if not saved.is_cancelled:
            self.assertEqual(client.post(url+'cancel/', {'revision': 2, 'reason': 'prepare restore'}, format='json').status_code, 200)
            saved.refresh_from_db()
        self.assertEqual(client.post(url+'restore/', {'revision': saved.revision-1}, format='json').status_code, 409)
        self.assertEqual(client.post(url+'restore/', {'revision': saved.revision}, format='json').status_code, 200)
        self.assertEqual(client.post(url+'cancel/', {'revision': saved.revision, 'reason': 'stale'}, format='json').status_code, 409)

    def test_cancel_restore_race_preserves_one_successful_change(self):
        processes = (self.spawn_update('racing cancel', 'cancel'), self.spawn_update('racing restore', 'restore'))
        statuses = []
        for process in processes:
            stdout, stderr = process.communicate(timeout=30)
            self.assertEqual(process.returncode, 0, stderr)
            statuses.append(json.loads(stdout.strip().splitlines()[-1])['status'])
        self.assertEqual(statuses, [200, 409])
        saved = ApprovedApplication.objects.get(pk=self.record_id)
        self.assertTrue(saved.is_cancelled)
        self.assertEqual(saved.revision, 2)
        self.assertEqual(saved.history.count(), 2)
        state = ApprovedLedgerState.objects.get(pk='pc')
        self.assertEqual(state.generation, state.synced_generation)
