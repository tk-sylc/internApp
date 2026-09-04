import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("asset_requests", "0004_replace_employee_number_with_requester_email"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ApprovedApplication",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("application_type", models.CharField(choices=[("pc", "PC貸出"), ("memory", "外部記憶装置貸出"), ("lan", "LAN機器貸出"), ("phone", "スマートフォン購入"), ("other", "その他")], db_index=True, max_length=20, verbose_name="申請種別")),
                ("applicant_name", models.CharField(max_length=100, verbose_name="申請者氏名")),
                ("department", models.CharField(db_index=True, max_length=100, verbose_name="所属部署")),
                ("approved_date", models.DateField(db_index=True, verbose_name="承認日")),
                ("source_pdf", models.FileField(upload_to="approved/%Y/%m/", verbose_name="押印済み申請書")),
                ("details", models.JSONField(default=dict, verbose_name="転記項目")),
                ("notes", models.TextField(blank=True, verbose_name="担当者メモ")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="登録日時")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="更新日時")),
                ("entered_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="approved_applications_entered", to=settings.AUTH_USER_MODEL, verbose_name="登録担当者")),
            ],
            options={
                "verbose_name": "承認済み申請",
                "verbose_name_plural": "承認済み申請",
                "ordering": ["-created_at"],
            },
        ),
    ]
