from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("asset_requests", "0015_creation_idempotency")]
    operations = [
        migrations.AddField(
            model_name="approvedapplication", name="source_application",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.PROTECT,
                related_name="reused_applications", to="asset_requests.approvedapplication",
                verbose_name="機器情報の参照元申請",
            ),
        ),
        migrations.AddField(
            model_name="approvedapplication", name="related_loan",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.PROTECT,
                related_name="referenced_returns", to="asset_requests.approvedapplication",
                verbose_name="元の貸出申請",
            ),
        ),
    ]
