from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("asset_requests", "0014_ledger_workflow")]
    operations = [
        migrations.AddField(
            model_name="approvedapplication", name="client_request_id",
            field=models.UUIDField(null=True, blank=True, unique=True, editable=False),
        ),
        migrations.AddField(
            model_name="approvedapplication", name="creation_fingerprint",
            field=models.CharField(max_length=64, blank=True, editable=False),
        ),
    ]
