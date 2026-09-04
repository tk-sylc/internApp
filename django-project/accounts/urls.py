from django.urls import path

from .views import (
    confirm_email_verification_view,
    login_view,
    logout_view,
    password_reset_confirm_view,
    password_reset_view,
    profile_view,
    register_view,
    resend_email_verification_view,
    session_view,
)


app_name = "accounts"

urlpatterns = [
    path("session/", session_view, name="session"),
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("profile/", profile_view, name="profile"),
    path("register/", register_view, name="register"),
    path(
        "email-verification/confirm/",
        confirm_email_verification_view,
        name="email-verification-confirm",
    ),
    path(
        "email-verification/resend/",
        resend_email_verification_view,
        name="email-verification-resend",
    ),
    path("password-reset/", password_reset_view, name="password-reset"),
    path(
        "password-reset/confirm/",
        password_reset_confirm_view,
        name="password-reset-confirm",
    ),
]
