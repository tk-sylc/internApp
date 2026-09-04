import json
import re
from urllib.parse import parse_qs, urlsplit

from django.contrib.auth import authenticate, get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import Client, TestCase, override_settings
from django.urls import reverse

from .models import AccountInvitation, Department, EmailVerification, UserProfile
from .services import make_email_verification_token


User = get_user_model()
PASSWORD = "Test-password-123!"
NO_RATE_LIMITS = {name: (0, 0) for name in (
    "login",
    "email_verification",
    "password_reset",
    "password_reset_confirm",
)}


def post_json(client, url_name, data, **extra):
    return client.post(
        reverse(url_name),
        data=json.dumps(data),
        content_type="application/json",
        **extra,
    )


class UserProfileModelTests(TestCase):
    def test_profile_is_connected_to_user(self):
        user = User.objects.create_user(
            username="profile@example.com",
            email="profile@example.com",
            password=PASSWORD,
        )
        profile = UserProfile.objects.create(
            user=user,
            display_name="山田 太郎",
            department=Department.SALES,
        )

        self.assertEqual(user.profile, profile)
        self.assertEqual(profile.get_department_display(), "営業部")
        self.assertEqual(str(profile), "山田 太郎（営業部）")


class EmailVerificationModelTests(TestCase):
    def test_new_verification_is_pending(self):
        user = User.objects.create_user(username="pending@example.com")
        verification = EmailVerification.objects.create(user=user)

        self.assertTrue(verification.is_pending)
        self.assertIn("確認待ち", str(verification))


@override_settings(AUTH_RATE_LIMITS=NO_RATE_LIMITS)
class SessionViewTests(TestCase):
    def test_anonymous_user_is_not_authenticated(self):
        response = self.client.get(reverse("accounts:session"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "authenticated": False,
                "user": None,
                "profile_complete": False,
                "profile": None,
            },
        )
        self.assertIn("csrftoken", response.cookies)
        self.assertIn("no-store", response.headers["Cache-Control"])

    def test_authenticated_user_without_profile_is_returned(self):
        user = User.objects.create_user(
            username="test-user",
            email="test@example.com",
            password=PASSWORD,
        )
        self.client.force_login(user)

        response = self.client.get(reverse("accounts:session"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], "test@example.com")
        self.assertFalse(response.json()["profile_complete"])
        self.assertIsNone(response.json()["profile"])

    def test_authenticated_user_profile_is_returned(self):
        user = User.objects.create_user(
            username="profile-session@example.com",
            email="profile-session@example.com",
            password=PASSWORD,
        )
        UserProfile.objects.create(
            user=user,
            display_name="山田 太郎",
            department=Department.SYSTEM,
        )
        self.client.force_login(user)

        response = self.client.get(reverse("accounts:session"))

        self.assertTrue(response.json()["profile_complete"])
        self.assertEqual(
            response.json()["profile"],
            {
                "display_name": "山田 太郎",
                "department": Department.SYSTEM,
                "department_label": "システム部",
            },
        )


@override_settings(AUTH_RATE_LIMITS=NO_RATE_LIMITS)
class LoginViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="login-user",
            email="login@example.com",
            password=PASSWORD,
        )

    def test_valid_credentials_log_user_in_and_return_full_session(self):
        response = post_json(
            self.client,
            "accounts:login",
            {"username": self.user.username, "password": PASSWORD},
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["authenticated"])
        self.assertEqual(response.json()["user"]["email"], self.user.email)
        self.assertFalse(response.json()["profile_complete"])

    def test_email_logs_in_user_whose_username_is_different(self):
        response = post_json(
            self.client,
            "accounts:login",
            {"username": "LOGIN@EXAMPLE.COM", "password": PASSWORD},
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["authenticated"])
        self.assertEqual(response.json()["user"]["username"], "login-user")

    def test_invalid_password_does_not_log_user_in(self):
        response = post_json(
            self.client,
            "accounts:login",
            {"username": self.user.username, "password": "wrong-password"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertFalse(
            self.client.get(reverse("accounts:session")).json()["authenticated"]
        )

    def test_pending_email_verification_prevents_login(self):
        pending = User.objects.create_user(
            username="waiting@example.com",
            email="waiting@example.com",
            password=PASSWORD,
            is_active=False,
        )
        EmailVerification.objects.create(user=pending)

        response = post_json(
            self.client,
            "accounts:login",
            {"username": pending.username, "password": PASSWORD},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "email_verification_required")


@override_settings(AUTH_RATE_LIMITS=NO_RATE_LIMITS)
class LogoutViewTests(TestCase):
    def test_logout_ends_authenticated_session(self):
        user = User.objects.create_user(username="logout-user", password=PASSWORD)
        self.client.force_login(user)

        response = self.client.post(reverse("accounts:logout"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "authenticated": False,
                "user": None,
                "profile_complete": False,
                "profile": None,
            },
        )


@override_settings(AUTH_RATE_LIMITS=NO_RATE_LIMITS)
class ProfileViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="profile-api@example.com",
            email="profile-api@example.com",
            password=PASSWORD,
        )
        self.client.force_login(self.user)

    def test_profile_can_be_created_and_updated(self):
        create_response = self.client.put(
            reverse("accounts:profile"),
            data=json.dumps({
                "display_name": "  山田 太郎  ",
                "department": Department.SALES,
            }),
            content_type="application/json",
        )

        self.assertEqual(create_response.status_code, 200)
        self.assertTrue(create_response.json()["profile_complete"])
        self.assertEqual(create_response.json()["profile"]["display_name"], "山田 太郎")

        update_response = self.client.put(
            reverse("accounts:profile"),
            data=json.dumps({
                "display_name": "山田 花子",
                "department": Department.GENERAL_AFFAIRS,
            }),
            content_type="application/json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.department, Department.GENERAL_AFFAIRS)

    def test_profile_rejects_invalid_values(self):
        response = self.client.put(
            reverse("accounts:profile"),
            data=json.dumps({"display_name": "", "department": "unknown"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("display_name", response.json()["fields"])
        self.assertIn("department", response.json()["fields"])

    def test_anonymous_user_cannot_read_profile(self):
        self.client.logout()
        response = self.client.get(reverse("accounts:profile"))
        self.assertEqual(response.status_code, 401)


@override_settings(
    COMPANY_EMAIL_DOMAINS=("example.com",),
    FRONTEND_BASE_URL="https://assets.example.com",
)
class AccountInvitationAdminTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password=PASSWORD,
        )
        self.client.force_login(self.admin)

    def test_admin_invite_creates_inactive_user_and_sends_link(self):
        response = self.client.post(
            reverse("admin:accounts_accountinvitation_add"),
            {
                "email": "NEW.User@EXAMPLE.COM",
                "display_name": "山田 太郎",
                "department": Department.SALES,
                "_save": "保存",
            },
        )

        self.assertEqual(response.status_code, 302)
        user = User.objects.get(username="new.user@example.com")
        self.assertFalse(user.is_active)
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.profile.display_name, "山田 太郎")
        self.assertTrue(user.email_verification.is_pending)
        self.assertEqual(AccountInvitation.objects.get(user=user).email, user.email)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("https://assets.example.com/#/activate-account?", mail.outbox[0].body)

    def test_admin_cannot_invite_external_domain(self):
        response = self.client.post(
            reverse("admin:accounts_accountinvitation_add"),
            {
                "email": "user@outside.example",
                "display_name": "社外ユーザー",
                "department": Department.SYSTEM,
                "_save": "保存",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "許可された会社メールアドレス")
        self.assertEqual(User.objects.count(), 1)


@override_settings(
    AUTH_RATE_LIMITS=NO_RATE_LIMITS,
    EMAIL_VERIFICATION_RESEND_COOLDOWN=0,
)
class EmailVerificationTests(TestCase):
    def setUp(self):
        self.user = User(
            username="verify@example.com",
            email="verify@example.com",
            is_active=False,
        )
        self.user.set_unusable_password()
        self.user.save()
        self.verification = EmailVerification.objects.create(user=self.user)
        self.invitation = AccountInvitation.objects.create(
            email=self.user.email,
            display_name="招待利用者",
            department=Department.SYSTEM,
            user=self.user,
        )

    def test_valid_token_sets_password_and_activates_user_once(self):
        token = make_email_verification_token(self.verification)
        response = post_json(
            self.client,
            "accounts:email-verification-confirm",
            {"token": token, "password": PASSWORD, "password_confirm": PASSWORD},
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.verification.refresh_from_db()
        self.invitation.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.assertTrue(self.user.check_password(PASSWORD))
        self.assertIsNotNone(self.verification.verified_at)
        self.assertIsNotNone(self.invitation.accepted_at)

        reused = post_json(
            self.client,
            "accounts:email-verification-confirm",
            {"token": token, "password": PASSWORD, "password_confirm": PASSWORD},
        )
        self.assertEqual(reused.status_code, 400)

    def test_tampered_token_is_rejected(self):
        token = make_email_verification_token(self.verification)
        response = post_json(
            self.client,
            "accounts:email-verification-confirm",
            {"token": f"{token}tampered", "password": PASSWORD, "password_confirm": PASSWORD},
        )
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_password_mismatch_does_not_consume_invitation(self):
        token = make_email_verification_token(self.verification)
        response = post_json(
            self.client,
            "accounts:email-verification-confirm",
            {"token": token, "password": PASSWORD, "password_confirm": "different"},
        )

        self.assertEqual(response.status_code, 400)
        retry = post_json(
            self.client,
            "accounts:email-verification-confirm",
            {"token": token, "password": PASSWORD, "password_confirm": PASSWORD},
        )
        self.assertEqual(retry.status_code, 200)


@override_settings(
    AUTH_RATE_LIMITS=NO_RATE_LIMITS,
    FRONTEND_BASE_URL="https://assets.example.com",
)
class PasswordResetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="reset@example.com",
            email="reset@example.com",
            password=PASSWORD,
        )

    def test_reset_request_and_confirm_change_password_once(self):
        response = post_json(
            self.client,
            "accounts:password-reset",
            {"email": self.user.email},
        )
        self.assertEqual(response.status_code, 202)
        self.assertEqual(len(mail.outbox), 1)

        reset_url = re.search(r"https://\S+", mail.outbox[0].body).group(0)
        query = parse_qs(urlsplit(reset_url).fragment.split("?", 1)[1])
        uid = query["uid"][0]
        token = query["token"][0]
        new_password = "Changed-password-456!"

        confirmed = post_json(
            self.client,
            "accounts:password-reset-confirm",
            {
                "uid": uid,
                "token": token,
                "password": new_password,
                "password_confirm": new_password,
            },
        )
        self.assertEqual(confirmed.status_code, 200)
        self.assertIsNotNone(
            authenticate(username=self.user.username, password=new_password)
        )
        self.assertIsNone(authenticate(username=self.user.username, password=PASSWORD))

        reused = post_json(
            self.client,
            "accounts:password-reset-confirm",
            {
                "uid": uid,
                "token": token,
                "password": PASSWORD,
                "password_confirm": PASSWORD,
            },
        )
        self.assertEqual(reused.status_code, 400)

    def test_unknown_email_has_same_public_response_without_mail(self):
        response = post_json(
            self.client,
            "accounts:password-reset",
            {"email": "unknown@example.com"},
        )
        self.assertEqual(response.status_code, 202)
        self.assertEqual(len(mail.outbox), 0)

    def test_inactive_pending_user_does_not_receive_reset_mail(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        EmailVerification.objects.create(user=self.user)

        response = post_json(
            self.client,
            "accounts:password-reset",
            {"email": self.user.email},
        )
        self.assertEqual(response.status_code, 202)
        self.assertEqual(len(mail.outbox), 0)


@override_settings(AUTH_RATE_LIMITS=NO_RATE_LIMITS)
class CSRFProtectionTests(TestCase):
    def setUp(self):
        self.csrf_client = Client(enforce_csrf_checks=True)

    def test_mutating_account_endpoints_reject_missing_csrf(self):
        user = User.objects.create_user(username="csrf-user", password=PASSWORD)
        self.csrf_client.force_login(user)
        endpoints = [
            ("accounts:login", "post", {"username": "csrf-user", "password": PASSWORD}),
            ("accounts:logout", "post", None),
            ("accounts:profile", "put", {"display_name": "山田", "department": "sales"}),
            ("accounts:email-verification-confirm", "post", {"token": "invalid"}),
            ("accounts:password-reset", "post", {"email": "user@example.com"}),
            ("accounts:password-reset-confirm", "post", {"uid": "x", "token": "x"}),
        ]

        for url_name, method, data in endpoints:
            with self.subTest(url_name=url_name):
                kwargs = {}
                if data is not None:
                    kwargs = {"data": json.dumps(data), "content_type": "application/json"}
                response = getattr(self.csrf_client, method)(reverse(url_name), **kwargs)
                self.assertEqual(response.status_code, 403)


class RateLimitTests(TestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    @override_settings(AUTH_RATE_LIMITS={"password_reset": (1, 60)})
    def test_password_reset_is_rate_limited(self):
        first = post_json(
            self.client,
            "accounts:password-reset",
            {"email": "unknown@example.com"},
        )
        second = post_json(
            self.client,
            "accounts:password-reset",
            {"email": "unknown@example.com"},
        )

        self.assertEqual(first.status_code, 202)
        self.assertEqual(second.status_code, 429)
        self.assertEqual(second.headers["Retry-After"], "60")
