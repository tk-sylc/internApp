"""Remaining authentication boundaries from T-033; mail stays in memory."""
import time
import re
from datetime import timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .models import AccountInvitation, Department, EmailVerification
from .services import make_email_verification_token
from .tests import NO_RATE_LIMITS, PASSWORD, post_json


@override_settings(AUTH_RATE_LIMITS=NO_RATE_LIMITS,
                   MAILERS={"default": {"BACKEND": "django.core.mail.backends.locmem.EmailBackend"}},
                   COMPANY_EMAIL_DOMAINS=["example.com"],
                   FRONTEND_BASE_URL="https://assets.example.com",
                   EMAIL_VERIFICATION_TIMEOUT=3600, PASSWORD_RESET_TIMEOUT=3600)
class AccountDebugBoundaryTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            "boundary@example.com", email="boundary@example.com", password=PASSWORD,
            is_active=False)
        self.verification = EmailVerification.objects.create(user=self.user)
        self.invitation = AccountInvitation.objects.create(
            user=self.user, email=self.user.email, display_name="Boundary test",
            department=Department.SYSTEM)
        self.admin = get_user_model().objects.create_superuser(
            "boundary-admin", email="admin@example.com", password=PASSWORD)

    def activate(self, token):
        return post_json(self.client, "accounts:email-verification-confirm", {
            "token": token, "password": PASSWORD, "password_confirm": PASSWORD})

    def resend(self, invitation=None):
        self.client.force_login(self.admin)
        return self.client.post(reverse("admin:accounts_accountinvitation_changelist"), {
            "action": "resend_invitations", "_selected_action": (invitation or self.invitation).pk,
            "index": 0})

    def test_expired_invitation_rejected_and_resend_invalidates_previous_link(self):
        with patch("django.core.signing.time.time", return_value=time.time()-3601):
            expired = make_email_verification_token(self.verification)
        self.assertEqual(self.activate(expired).status_code, 400)
        old = make_email_verification_token(self.verification)
        self.assertEqual(self.resend().status_code, 302)
        self.verification.refresh_from_db()
        self.assertEqual(self.activate(old).status_code, 400)
        self.assertEqual(len(mail.outbox), 1)
        link = re.search(r"https://\S+", mail.outbox[0].body).group(0)
        new = parse_qs(urlsplit(link).fragment.split("?", 1)[1])["token"][0]
        self.assertEqual(self.activate(new).status_code, 200)
        self.assertEqual(self.activate(new).status_code, 400)

    def test_initial_invitation_delivery_failure_can_be_retried(self):
        self.client.force_login(self.admin)
        with patch("accounts.admin.send_verification_email", side_effect=OSError("test mail offline")):
            response = self.client.post(reverse("admin:accounts_accountinvitation_add"), {
                "email": "mail-failed@example.com", "display_name": "Mail retry test",
                "department": Department.SYSTEM, "_save": "Save"})
        self.assertEqual(response.status_code, 302)
        invitation = AccountInvitation.objects.get(email="mail-failed@example.com")
        self.assertFalse(invitation.user.is_active)
        self.assertEqual(self.resend(invitation).status_code, 302)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(self.activate(make_email_verification_token(invitation.user.email_verification)).status_code, 200)

    def test_resend_failure_does_not_activate_user_and_recovers(self):
        with patch("accounts.admin.send_verification_email", side_effect=OSError("test resend offline")):
            self.assertEqual(self.resend().status_code, 302)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertEqual(self.resend().status_code, 302)
        self.verification.refresh_from_db()
        self.assertEqual(self.activate(make_email_verification_token(self.verification)).status_code, 200)

    def reset_payload(self):
        return {"uid": urlsafe_base64_encode(force_bytes(self.user.pk)),
                "token": default_token_generator.make_token(self.user),
                "password": "Replacement-password-759!", "password_confirm": "Replacement-password-759!"}

    def prepare_active(self):
        self.activate(make_email_verification_token(self.verification))
        self.user.refresh_from_db()

    def test_reset_expired_tampered_and_disabled_links_cannot_change_password(self):
        self.prepare_active()
        with patch.object(default_token_generator, "_now",
                          return_value=default_token_generator._now()-timedelta(seconds=3601)):
            expired = self.reset_payload()
        tampered = self.reset_payload()
        tampered["token"] += "invalid"
        for payload in (expired, tampered):
            with self.subTest(token_kind="expired" if payload is expired else "tampered"):
                self.assertEqual(post_json(self.client, "accounts:password-reset-confirm", payload).status_code, 400)
        disabled = self.reset_payload()
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.assertEqual(post_json(self.client, "accounts:password-reset-confirm", disabled).status_code, 400)
        self.assertEqual(self.resend().status_code, 302)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertTrue(self.user.check_password(PASSWORD))
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_delivery_failure_resend_and_single_use(self):
        self.prepare_active()
        with patch("accounts.views.send_password_reset_email", side_effect=OSError("test reset offline")):
            self.assertEqual(post_json(self.client, "accounts:password-reset", {"email": self.user.email}).status_code, 202)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))
        for _ in range(2):
            self.assertEqual(post_json(self.client, "accounts:password-reset", {"email": self.user.email}).status_code, 202)
        self.assertEqual(len(mail.outbox), 2)
        payload = self.reset_payload()
        self.assertIn(payload["uid"], mail.outbox[-1].body)
        self.assertEqual(post_json(self.client, "accounts:password-reset-confirm", payload).status_code, 200)
        self.assertEqual(post_json(self.client, "accounts:password-reset-confirm", payload).status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(payload["password"]))
