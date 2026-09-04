import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from .services import is_company_email, normalize_email


class Department(models.TextChoices):
    SALES = "sales", "営業部"
    GENERAL_AFFAIRS = "general_affairs", "総務部"
    SYSTEM = "system", "システム部"


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    display_name = models.CharField("氏名", max_length=100)
    department = models.CharField(
        "部署",
        max_length=20,
        choices=Department.choices,
    )
    created_at = models.DateTimeField("作成日時", auto_now_add=True)
    updated_at = models.DateTimeField("更新日時", auto_now=True)

    def __str__(self):
        return f"{self.display_name}（{self.get_department_display()}）"


class EmailVerification(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_verification",
    )
    token_version = models.UUIDField(default=uuid.uuid4, editable=False)
    sent_at = models.DateTimeField("確認メール送信日時", default=timezone.now)
    verified_at = models.DateTimeField(
        "メール確認日時",
        null=True,
        blank=True,
        editable=False,
    )
    created_at = models.DateTimeField("作成日時", auto_now_add=True)
    updated_at = models.DateTimeField("更新日時", auto_now=True)

    @property
    def is_pending(self):
        return self.verified_at is None

    def __str__(self):
        status = "確認待ち" if self.is_pending else "確認済み"
        return f"{self.user.get_username()}（{status}）"


class AccountInvitation(models.Model):
    email = models.EmailField("会社メールアドレス", unique=True)
    display_name = models.CharField("氏名", max_length=100)
    department = models.CharField(
        "部署",
        max_length=20,
        choices=Department.choices,
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="account_invitation",
        null=True,
        blank=True,
        editable=False,
    )
    invited_at = models.DateTimeField("招待日時", auto_now_add=True)
    accepted_at = models.DateTimeField(
        "利用開始日時",
        null=True,
        blank=True,
        editable=False,
    )

    class Meta:
        verbose_name = "アカウント招待"
        verbose_name_plural = "アカウント招待"
        ordering = ("-invited_at",)

    def clean(self):
        super().clean()
        self.email = normalize_email(self.email)
        if not settings.COMPANY_EMAIL_DOMAINS:
            raise ValidationError(
                {"email": "COMPANY_EMAIL_DOMAINSを設定してください。"}
            )
        if not is_company_email(self.email):
            raise ValidationError(
                {"email": "許可された会社メールアドレスを入力してください。"}
            )

    @property
    def status(self):
        return "利用開始済み" if self.accepted_at else "招待中"

    def __str__(self):
        return f"{self.display_name} <{self.email}>"
