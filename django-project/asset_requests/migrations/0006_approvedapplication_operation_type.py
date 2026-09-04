from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("asset_requests", "0005_approvedapplication"),
    ]

    operations = [
        migrations.AddField(
            model_name="approvedapplication",
            name="operation_type",
            field=models.CharField(
                choices=[
                    ("purchase", "購入"),
                    ("disposal", "廃棄"),
                    ("loan", "貸出"),
                    ("return", "返却"),
                ],
                db_index=True,
                default="loan",
                max_length=20,
                verbose_name="処理区分",
            ),
            preserve_default=False,
        ),
    ]
