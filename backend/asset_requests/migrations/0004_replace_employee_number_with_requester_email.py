from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("asset_requests", "0003_add_created_by_to_asset_requests"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="externalstoragerequest",
            name="employee_number",
        ),
        migrations.RemoveField(
            model_name="lanrequest",
            name="employee_number",
        ),
        migrations.RemoveField(
            model_name="pcrequest",
            name="employee_number",
        ),
        migrations.RemoveField(
            model_name="smartphonerequest",
            name="employee_number",
        ),
        migrations.AddField(
            model_name="externalstoragerequest",
            name="requester_email",
            field=models.EmailField(
                blank=True,
                db_index=True,
                default="",
                max_length=254,
                verbose_name="申請者メールアドレス",
            ),
        ),
        migrations.AddField(
            model_name="lanrequest",
            name="requester_email",
            field=models.EmailField(
                blank=True,
                db_index=True,
                default="",
                max_length=254,
                verbose_name="申請者メールアドレス",
            ),
        ),
        migrations.AddField(
            model_name="pcrequest",
            name="requester_email",
            field=models.EmailField(
                blank=True,
                db_index=True,
                default="",
                max_length=254,
                verbose_name="申請者メールアドレス",
            ),
        ),
        migrations.AddField(
            model_name="smartphonerequest",
            name="requester_email",
            field=models.EmailField(
                blank=True,
                db_index=True,
                default="",
                max_length=254,
                verbose_name="申請者メールアドレス",
            ),
        ),
    ]
