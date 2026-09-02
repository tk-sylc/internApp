from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("asset_requests", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="pcrequest",
            name="purpose",
            field=models.TextField(default="未設定", verbose_name="利用目的"),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="externalstoragerequest",
            name="purpose",
            field=models.TextField(default="未設定", verbose_name="利用目的"),
            preserve_default=False,
        ),
    ]
