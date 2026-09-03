from django.contrib import admin

from .models import UserProfile


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