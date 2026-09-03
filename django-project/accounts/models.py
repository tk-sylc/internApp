from django.conf import settings
from django.db import models


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