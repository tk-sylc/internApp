import json
import secrets
import uuid

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.contrib.auth.forms import SetPasswordForm
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from .models import AccountInvitation, Department, EmailVerification, UserProfile
from .services import (
    consume_rate_limit,
    log_email_delivery_failure,
    normalize_email,
    read_email_verification_token,
    send_password_reset_email,
)


User = get_user_model()


def parse_json_object(request):
    try:
        data = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, JsonResponse(
            {"detail": "JSON形式で送信してください。"},
            status=400,
        )

    if not isinstance(data, dict):
        return None, JsonResponse(
            {"detail": "JSONオブジェクトを送信してください。"},
            status=400,
        )

    return data, None


def field_error_response(fields, detail="入力内容を確認してください。"):
    return JsonResponse(
        {"detail": detail, "fields": fields},
        status=400,
    )


def rate_limit_response(window):
    response = JsonResponse(
        {
            "detail": "短時間に操作が集中しています。時間をおいてお試しください。",
            "retry_after": window,
        },
        status=429,
    )
    response["Retry-After"] = str(window)
    return response


def get_email_verification(user):
    try:
        return user.email_verification
    except EmailVerification.DoesNotExist:
        return None


def has_pending_email_verification(user):
    verification = get_email_verification(user)
    return verification is not None and verification.is_pending


def serialize_profile(user):
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        return None

    display_name = profile.display_name.strip()
    if not display_name or profile.department not in Department.values:
        return None

    return {
        "display_name": display_name,
        "department": profile.department,
        "department_label": profile.get_department_display(),
    }


def session_payload(user=None):
    if user is None or not user.is_authenticated:
        return {
            "authenticated": False,
            "user": None,
            "profile_complete": False,
            "profile": None,
        }

    profile_data = serialize_profile(user)
    return {
        "authenticated": True,
        "user": {
            "id": user.pk,
            "username": user.get_username(),
            "email": user.email,
        },
        "profile_complete": profile_data is not None,
        "profile": profile_data,
    }


@require_GET
@never_cache
@ensure_csrf_cookie
def session_view(request):
    return JsonResponse(session_payload(request.user))


@require_POST
@csrf_protect
@never_cache
def login_view(request):
    data, error_response = parse_json_object(request)
    if error_response:
        return error_response

    username = data.get("username")
    password = data.get("password")
    if not isinstance(username, str) or not isinstance(password, str):
        return field_error_response(
            {
                "username": ["ログイン名を入力してください。"],
                "password": ["パスワードを入力してください。"],
            }
        )

    username = username.strip()
    if "@" in username:
        username = username.casefold()

    if not username or not password:
        return field_error_response(
            {
                "username": [] if username else ["ログイン名を入力してください。"],
                "password": [] if password else ["パスワードを入力してください。"],
            }
        )

    limited, window = consume_rate_limit("login", request, username)
    if limited:
        return rate_limit_response(window)

    if "@" in username:
        email_matches = list(
            User.objects.filter(email__iexact=username).order_by("pk")[:2]
        )
        candidate = email_matches[0] if len(email_matches) == 1 else None
    else:
        candidate = User.objects.filter(username__iexact=username).first()

    authentication_username = candidate.get_username() if candidate else username
    user = authenticate(
        request,
        username=authentication_username,
        password=password,
    )
    if user is None:
        if candidate and candidate.check_password(password) and not candidate.is_active:
            if has_pending_email_verification(candidate):
                return JsonResponse(
                    {
                        "code": "email_verification_required",
                        "detail": "招待メールから初回パスワードを設定してください。",
                    },
                    status=403,
                )
            return JsonResponse(
                {
                    "code": "account_disabled",
                    "detail": "このアカウントは利用停止中です。管理者へ連絡してください。",
                },
                status=403,
            )

        return JsonResponse(
            {"detail": "ログイン名またはパスワードが正しくありません。"},
            status=401,
        )

    if has_pending_email_verification(user):
        return JsonResponse(
            {
                "code": "email_verification_required",
                "detail": "招待メールから初回パスワードを設定してください。",
            },
            status=403,
        )

    auth_login(request, user)
    return JsonResponse(session_payload(user))


@require_POST
@csrf_protect
@never_cache
def logout_view(request):
    auth_logout(request)
    return JsonResponse(session_payload())


@require_http_methods(["GET", "PUT"])
@csrf_protect
@never_cache
def profile_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "ログインが必要です。"}, status=401)

    if request.method == "GET":
        return JsonResponse(session_payload(request.user))

    data, error_response = parse_json_object(request)
    if error_response:
        return error_response

    display_name = data.get("display_name")
    department = data.get("department")
    fields = {}

    if not isinstance(display_name, str) or not display_name.strip():
        fields["display_name"] = ["氏名を入力してください。"]
    elif len(display_name.strip()) > 100:
        fields["display_name"] = ["氏名は100文字以内で入力してください。"]

    if not isinstance(department, str) or department not in Department.values:
        fields["department"] = ["部署を選択してください。"]

    if fields:
        return field_error_response(fields)

    UserProfile.objects.update_or_create(
        user=request.user,
        defaults={"display_name": display_name.strip(), "department": department},
    )
    return JsonResponse(session_payload(request.user))


@require_POST
@csrf_protect
@never_cache
def confirm_email_verification_view(request):
    limited, window = consume_rate_limit("email_verification", request)
    if limited:
        return rate_limit_response(window)

    data, error_response = parse_json_object(request)
    if error_response:
        return error_response

    token = data.get("token")
    password = data.get("password")
    password_confirm = data.get("password_confirm")
    if not isinstance(token, str) or not token:
        return field_error_response({"token": ["招待リンクが必要です。"]})
    if not isinstance(password, str) or not password:
        return field_error_response({"password": ["パスワードを入力してください。"]})

    try:
        payload = read_email_verification_token(token)
        user_id = int(payload["user_id"])
        email = normalize_email(payload["email"])
        token_version = str(payload["version"])
    except (signing.BadSignature, KeyError, TypeError, ValueError):
        return JsonResponse(
            {"detail": "招待リンクが無効か、有効期限が切れています。"},
            status=400,
        )

    with transaction.atomic():
        try:
            verification = (
                EmailVerification.objects.select_for_update()
                .select_related("user")
                .get(user_id=user_id)
            )
        except EmailVerification.DoesNotExist:
            verification = None

        valid = (
            verification is not None
            and verification.is_pending
            and not verification.user.is_active
            and normalize_email(verification.user.email) == email
            and secrets.compare_digest(str(verification.token_version), token_version)
        )
        if not valid:
            return JsonResponse(
                {"detail": "招待リンクが無効か、有効期限が切れています。"},
                status=400,
            )

        form = SetPasswordForm(
            verification.user,
            data={"new_password1": password, "new_password2": password_confirm},
        )
        if not form.is_valid():
            fields = {
                "password": [
                    str(message) for message in form.errors.get("new_password1", [])
                ],
                "password_confirm": [
                    str(message) for message in form.errors.get("new_password2", [])
                ],
            }
            return field_error_response(
                {name: messages for name, messages in fields.items() if messages}
            )

        user = form.save()
        user.is_active = True
        user.save(update_fields=["is_active"])
        verification.verified_at = timezone.now()
        verification.token_version = uuid.uuid4()
        verification.save(update_fields=["verified_at", "token_version", "updated_at"])
        AccountInvitation.objects.filter(user=user).update(accepted_at=timezone.now())

    return JsonResponse(
        {"detail": "パスワードを設定しました。ログインしてください。"}
    )


@require_POST
@csrf_protect
@never_cache
def password_reset_view(request):
    data, error_response = parse_json_object(request)
    if error_response:
        return error_response

    email = data.get("email")
    if not isinstance(email, str):
        return field_error_response(
            {"email": ["会社メールアドレスを入力してください。"]}
        )
    normalized_email = normalize_email(email)
    try:
        validate_email(normalized_email)
    except ValidationError:
        return field_error_response(
            {"email": ["正しいメールアドレスを入力してください。"]}
        )

    limited, window = consume_rate_limit("password_reset", request, normalized_email)
    if limited:
        return rate_limit_response(window)

    user = User.objects.filter(email__iexact=normalized_email, is_active=True).first()
    if user and user.has_usable_password() and not has_pending_email_verification(user):
        try:
            send_password_reset_email(user)
        except Exception:
            log_email_delivery_failure("password reset")

    return JsonResponse(
        {
            "detail": (
                "該当するアカウントがある場合、パスワード再設定メールを送信しました。"
            )
        },
        status=202,
    )


@require_POST
@csrf_protect
@never_cache
def password_reset_confirm_view(request):
    limited, window = consume_rate_limit("password_reset_confirm", request)
    if limited:
        return rate_limit_response(window)

    data, error_response = parse_json_object(request)
    if error_response:
        return error_response

    uid = data.get("uid")
    token = data.get("token")
    password = data.get("password")
    password_confirm = data.get("password_confirm")
    if not all(isinstance(value, str) and value for value in (uid, token, password)):
        return field_error_response(
            {"password": ["新しいパスワードを入力してください。"]}
        )

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id, is_active=True)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if (
        user is None
        or has_pending_email_verification(user)
        or not default_token_generator.check_token(user, token)
    ):
        return JsonResponse(
            {"detail": "再設定リンクが無効か、有効期限が切れています。"},
            status=400,
        )

    form = SetPasswordForm(
        user,
        data={"new_password1": password, "new_password2": password_confirm},
    )
    if not form.is_valid():
        fields = {
            "password": [str(message) for message in form.errors.get("new_password1", [])],
            "password_confirm": [
                str(message) for message in form.errors.get("new_password2", [])
            ],
        }
        return field_error_response(
            {name: messages for name, messages in fields.items() if messages}
        )

    form.save()
    auth_logout(request)
    return JsonResponse(
        {
            "detail": (
                "パスワードを変更しました。新しいパスワードでログインしてください。"
            )
        }
    )
