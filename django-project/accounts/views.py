import json

from django.contrib.auth import authenticate
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST


@require_GET
@never_cache
@ensure_csrf_cookie
def session_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({
            "authenticated": False,
            "user": None,
        })

    return JsonResponse({
        "authenticated": True,
        "user": {
            "id": request.user.pk,
            "username": request.user.get_username(),
        },
    })


@require_POST
@csrf_protect
def login_view(request):
    try:
        data = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"detail": "JSON形式で送信してください。"},
            status=400,
        )

    if not isinstance(data, dict):
        return JsonResponse(
            {"detail": "JSONオブジェクトを送信してください。"},
            status=400,
        )

    username = data.get("username")
    password = data.get("password")

    if not isinstance(username, str) or not isinstance(password, str):
        return JsonResponse(
            {"detail": "ログイン名とパスワードを入力してください。"},
            status=400,
        )

    username = username.strip()

    if not username or not password:
        return JsonResponse(
            {"detail": "ログイン名とパスワードを入力してください。"},
            status=400,
        )

    user = authenticate(
        request,
        username=username,
        password=password,
    )

    if user is None:
        return JsonResponse(
            {"detail": "ログイン名またはパスワードが正しくありません。"},
            status=401,
        )

    auth_login(request, user)

    return JsonResponse({
        "authenticated": True,
        "user": {
            "id": user.pk,
            "username": user.get_username(),
        },
    })


@require_POST
@csrf_protect
def logout_view(request):
    auth_logout(request)

    return JsonResponse({
        "authenticated": False,
        "user": None,
    })
