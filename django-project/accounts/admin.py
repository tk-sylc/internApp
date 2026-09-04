from django.contrib import admin

from .models import EmailVerification, UserProfile


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
