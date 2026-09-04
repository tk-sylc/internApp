import logging
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.crypto import salted_hmac
from django.utils.http import urlsafe_base64_encode


logger = logging.getLogger(__name__)
EMAIL_VERIFICATION_SALT = "accounts.email-verification.v1"


def normalize_email(value):
    return value.strip().casefold()


def is_company_email(email):
    if "@" not in email:
        return False

    domain = email.rsplit("@", 1)[1].casefold()
    return domain in settings.COMPANY_EMAIL_DOMAINS


def make_email_verification_token(verification):
    return signing.dumps(
        {
            "user_id": verification.user_id,
            "email": normalize_email(verification.user.email),
            "version": str(verification.token_version),
        },
        salt=EMAIL_VERIFICATION_SALT,
    )


def read_email_verification_token(token):
    return signing.loads(
        token,
        salt=EMAIL_VERIFICATION_SALT,
        max_age=settings.EMAIL_VERIFICATION_TIMEOUT,
    )


def send_verification_email(verification):
    token = make_email_verification_token(verification)
    query = urlencode({"token": token})
    verification_url = (
        f"{settings.FRONTEND_BASE_URL}/#/activate-account?{query}"
    )
    expiration_hours = max(1, settings.EMAIL_VERIFICATION_TIMEOUT // 3600)

    send_mail(
        "【社内機器管理】アカウントのご案内",
        (
            "管理者が社内機器管理アプリのアカウントを発行しました。\n\n"
            "次の画面を開き、本人専用のパスワードを設定してください。\n"
            f"{verification_url}\n\n"
            f"このリンクの有効期限は{expiration_hours}時間です。\n"
            "このメールに心当たりがない場合は、管理者へ連絡してください。"
        ),
        settings.DEFAULT_FROM_EMAIL,
        [verification.user.email],
    )


def send_password_reset_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    query = urlencode({"uid": uid, "token": token})
    reset_url = f"{settings.FRONTEND_BASE_URL}/#/reset-password?{query}"
    expiration_minutes = max(1, settings.PASSWORD_RESET_TIMEOUT // 60)

    send_mail(
        "【社内機器管理】パスワード再設定",
        (
            "社内機器管理アプリのパスワード再設定を受け付けました。\n\n"
            "次の画面から新しいパスワードを設定してください。\n"
            f"{reset_url}\n\n"
            f"このリンクの有効期限は{expiration_minutes}分です。\n"
            "心当たりがない場合は、このメールを破棄してください。"
        ),
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
    )


def consume_rate_limit(scope, request, identifier=""):
    limit, window = settings.AUTH_RATE_LIMITS.get(scope, (0, 0))
    if limit <= 0 or window <= 0:
        return False, 0

    remote_address = request.META.get("REMOTE_ADDR") or "unknown"
    dimensions = [("ip", remote_address)]
    normalized_identifier = str(identifier).strip().casefold()
    if normalized_identifier:
        dimensions.append(("id", normalized_identifier))

    limited = False
    for dimension, value in dimensions:
        digest = salted_hmac(
            "accounts.rate-limit.v1",
            f"{scope}:{dimension}:{value}",
        ).hexdigest()
        key = f"auth-rate:{digest}"

        if cache.add(key, 1, timeout=window):
            count = 1
        else:
            try:
                count = cache.incr(key)
            except ValueError:
                cache.set(key, 1, timeout=window)
                count = 1

        limited = limited or count > limit

    return limited, window


def log_email_delivery_failure(kind):
    logger.exception("Could not send %s email", kind)
