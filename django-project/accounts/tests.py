import json

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse


class SessionViewTests(TestCase):
    def test_anonymous_user_is_not_authenticated(self):
        response = self.client.get(reverse("accounts:session"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "authenticated": False,
                "user": None,
            },
        )
        self.assertIn("csrftoken", response.cookies)
        self.assertIn("no-cache", response.headers["Cache-Control"])
        self.assertIn("no-store", response.headers["Cache-Control"])
        self.assertIn("private", response.headers["Cache-Control"])

    def test_authenticated_user_information_is_returned(self):
        user = get_user_model().objects.create_user(
            username="test-user",
            password="Test-password-123!",
        )
        self.client.force_login(user)

        response = self.client.get(reverse("accounts:session"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "authenticated": True,
                "user": {
                    "id": user.pk,
                    "username": "test-user",
                },
            },
        )


class LoginViewTests(TestCase):
    password = "Test-password-123!"

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="login-user",
            password=self.password,
        )

    def test_valid_credentials_log_user_in(self):
        response = self.client.post(
            reverse("accounts:login"),
            data=json.dumps({
                "username": self.user.username,
                "password": self.password,
            }),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "authenticated": True,
                "user": {
                    "id": self.user.pk,
                    "username": self.user.username,
                },
            },
        )

        session_response = self.client.get(reverse("accounts:session"))
        self.assertTrue(session_response.json()["authenticated"])

    def test_invalid_password_does_not_log_user_in(self):
        response = self.client.post(
            reverse("accounts:login"),
            data=json.dumps({
                "username": self.user.username,
                "password": "wrong-password",
            }),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json(),
            {
                "detail": "ログイン名またはパスワードが正しくありません。",
            },
        )

        session_response = self.client.get(reverse("accounts:session"))
        self.assertFalse(session_response.json()["authenticated"])


class LogoutViewTests(TestCase):
    def test_logout_ends_authenticated_session(self):
        user = get_user_model().objects.create_user(
            username="logout-user",
            password="Test-password-123!",
        )
        self.client.force_login(user)

        response = self.client.post(reverse("accounts:logout"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "authenticated": False,
                "user": None,
            },
        )

        session_response = self.client.get(reverse("accounts:session"))
        self.assertFalse(session_response.json()["authenticated"])


class CSRFProtectionTests(TestCase):
    def test_login_rejects_request_without_csrf_token(self):
        user = get_user_model().objects.create_user(
            username="csrf-user",
            password="Test-password-123!",
        )
        csrf_client = Client(enforce_csrf_checks=True)

        response = csrf_client.post(
            reverse("accounts:login"),
            data=json.dumps({
                "username": user.username,
                "password": "Test-password-123!",
            }),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    def test_login_accepts_request_with_valid_csrf_token(self):
        user = get_user_model().objects.create_user(
            username="csrf-valid-user",
            password="Test-password-123!",
        )
        csrf_client = Client(enforce_csrf_checks=True)

        csrf_client.get(reverse("accounts:session"))
        csrf_token = csrf_client.cookies["csrftoken"].value

        response = csrf_client.post(
            reverse("accounts:login"),
            data=json.dumps({
                "username": user.username,
                "password": "Test-password-123!",
            }),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["authenticated"])

    def test_logout_rejects_request_without_csrf_token(self):
        user = get_user_model().objects.create_user(
            username="csrf-logout-user",
            password="Test-password-123!",
        )
        csrf_client = Client(enforce_csrf_checks=True)
        csrf_client.force_login(user)

        response = csrf_client.post(reverse("accounts:logout"))

        self.assertEqual(response.status_code, 403)
        session_response = csrf_client.get(reverse("accounts:session"))
        self.assertTrue(session_response.json()["authenticated"])

    def test_logout_accepts_request_with_valid_csrf_token(self):
        user = get_user_model().objects.create_user(
            username="csrf-valid-logout-user",
            password="Test-password-123!",
        )
        csrf_client = Client(enforce_csrf_checks=True)
        csrf_client.force_login(user)

        csrf_client.get(reverse("accounts:session"))
        csrf_token = csrf_client.cookies["csrftoken"].value

        response = csrf_client.post(
            reverse("accounts:logout"),
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["authenticated"])
        session_response = csrf_client.get(reverse("accounts:session"))
        self.assertFalse(session_response.json()["authenticated"])
