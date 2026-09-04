import uuid

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="EmailVerification",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "token_version",
                    models.UUIDField(default=uuid.uuid4, editable=False),
                ),
                (
                    "sent_at",
                    models.DateTimeField(
                        default=django.utils.timezone.now,
                        verbose_name="確認メール送信日時",
                    ),
                ),
                (
                    "verified_at",
                    models.DateTimeField(
                        blank=True,
                        editable=False,
                        null=True,
                        verbose_name="メール確認日時",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="作成日時")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="更新日時")),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="email_verification",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
