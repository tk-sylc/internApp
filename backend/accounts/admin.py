import uuid

from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AuthenticationForm
from django import forms
from django.db import transaction
from django.utils import timezone

from .models import AccountInvitation, EmailVerification, UserProfile
from .services import log_email_delivery_failure, normalize_email, send_verification_email


User = get_user_model()


class EmailAdminAuthenticationForm(AuthenticationForm):
    """Django管理画面もメイン画面と同じメール認証に揃える。"""

    username = forms.EmailField(
        label="会社メールアドレス",
        widget=forms.EmailInput(
            attrs={
                "autofocus": True,
                "autocomplete": "email",
                "placeholder": "name@example.co.jp",
            }
        ),
    )

    def clean(self):
        email = normalize_email(self.cleaned_data.get("username", ""))
        matches = list(User.objects.filter(email__iexact=email).order_by("pk")[:2])
        if len(matches) != 1:
            raise self.get_invalid_login_error()
        self.cleaned_data["username"] = matches[0].get_username()
        return super().clean()


admin.site.login_form = EmailAdminAuthenticationForm


class AccountInvitationForm(forms.ModelForm):
    class Meta:
        model = AccountInvitation
        fields = ("email", "display_name", "department")

    def clean_email(self):
        email = normalize_email(self.cleaned_data["email"])
        users = User.objects.filter(email__iexact=email)
        invitations = AccountInvitation.objects.filter(email__iexact=email)
        if self.instance.pk:
            invitations = invitations.exclude(pk=self.instance.pk)
            if self.instance.user_id:
                users = users.exclude(pk=self.instance.user_id)
        if users.exists():
            raise forms.ValidationError("このメールアドレスは登録済みです。")
        if invitations.exists():
            raise forms.ValidationError("このメールアドレスは招待済みです。")
        return email


@admin.register(AccountInvitation)
class AccountInvitationAdmin(admin.ModelAdmin):
    form = AccountInvitationForm
    list_display = ("email", "display_name", "department", "status", "invited_at")
    list_filter = ("department", "accepted_at")
    search_fields = ("email", "display_name")
    readonly_fields = ("user", "invited_at", "accepted_at")
    actions = ("resend_invitations",)

    def save_model(self, request, obj, form, change):
        if change:
            super().save_model(request, obj, form, change)
            return

        with transaction.atomic():
            user = User(username=obj.email, email=obj.email, is_active=False)
            user.set_unusable_password()
            user.save()
            UserProfile.objects.create(
                user=user,
                display_name=obj.display_name,
                department=obj.department,
            )
            verification = EmailVerification.objects.create(user=user)
            obj.user = user
            super().save_model(request, obj, form, change)

        try:
            send_verification_email(verification)
        except Exception:
            log_email_delivery_failure("account invitation")
            self.message_user(
                request,
                "アカウントは作成されましたが、招待メールを送信できませんでした。",
                level=messages.ERROR,
            )

    @admin.action(description="選択した招待メールを再送する")
    def resend_invitations(self, request, queryset):
        sent = 0
        for invitation in queryset.filter(accepted_at__isnull=True).select_related("user"):
            if invitation.user is None:
                continue
            verification, _ = EmailVerification.objects.get_or_create(user=invitation.user)
            verification.token_version = uuid.uuid4()
            verification.sent_at = timezone.now()
            verification.verified_at = None
            verification.save()
            try:
                send_verification_email(verification)
            except Exception:
                log_email_delivery_failure("account invitation resend")
            else:
                sent += 1
        self.message_user(request, f"{sent}件の招待メールを再送しました。")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "display_name",
        "user",
        "department",
        "updated_at",
    )
    list_filter = ("department",)
    search_fields = (
        "display_name",
        "user__username",
        "user__email",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    list_select_related = ("user",)


@admin.register(EmailVerification)
class EmailVerificationAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "is_pending",
        "sent_at",
        "verified_at",
    )
    list_filter = ("verified_at", "sent_at")
    search_fields = ("user__username", "user__email")
    readonly_fields = (
        "user",
        "token_version",
        "sent_at",
        "verified_at",
        "created_at",
        "updated_at",
    )
    list_select_related = ("user",)
