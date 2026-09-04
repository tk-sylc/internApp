from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("asset_requests", "0006_approvedapplication_operation_type"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="approvedapplication",
            name="source_pdf",
        ),
    ]
