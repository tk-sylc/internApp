from django.db import migrations


def merge_values(first, second):
    values = [str(value).strip() for value in (first, second) if value]
    return " ".join(value for index, value in enumerate(values) if value not in values[:index])


def merge_technical_detail_fields(apps, schema_editor):
    approved_application = apps.get_model("asset_requests", "ApprovedApplication")

    for record in approved_application.objects.filter(
        application_type__in=("pc", "phone")
    ).iterator():
        details = dict(record.details or {})
        details["os"] = merge_values(details.get("os"), details.pop("os_version", None))

        if record.application_type == "pc":
            details["browser_version"] = merge_values(
                details.pop("browser", None),
                details.get("browser_version"),
            )

        details.pop("performance", None)
        details = {key: value for key, value in details.items() if value not in (None, "")}
        record.details = details
        record.save(update_fields=("details",))


class Migration(migrations.Migration):
    dependencies = [
        ("asset_requests", "0011_alter_approvedapplication_applicant_name"),
    ]

    operations = [
        migrations.RunPython(merge_technical_detail_fields, migrations.RunPython.noop),
    ]
