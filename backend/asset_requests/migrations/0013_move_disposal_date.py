from django.db import migrations


def move_disposal_date(apps, schema_editor):
    approved_application = apps.get_model("asset_requests", "ApprovedApplication")

    for record in approved_application.objects.filter(operation_type="disposal").iterator():
        details = dict(record.details or {})
        disposal_date = (
            details.get("disposal_date")
            or details.pop("usage_end_date", None)
            or details.pop("usage_start_date", None)
        )
        details.pop("usage_start_date", None)
        details.pop("usage_end_date", None)
        if disposal_date:
            details["disposal_date"] = disposal_date
        record.details = details
        record.save(update_fields=("details",))


class Migration(migrations.Migration):
    dependencies = [
        ("asset_requests", "0012_merge_technical_detail_fields"),
    ]

    operations = [
        migrations.RunPython(move_disposal_date, migrations.RunPython.noop),
    ]
