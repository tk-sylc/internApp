import json
import logging

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from .approved_ledger_sync import sync_approved_ledger
from .ledger_sync import sync_ledger
from .models import (
    ApprovedApplication,
    ExternalStorageLoanApplication,
    LanEquipmentLoanApplication,
    PcLoanApplication,
    SmartphonePurchaseApplication,
)


logger = logging.getLogger(__name__)
User = get_user_model()


APPROVED_TYPE_DETAIL_FIELDS = {
    'pc': {'device_name'},
    'memory': {'device_name', 'capacity'},
    'lan': {'device_type', 'device_name'},
    'phone': {'os', 'model_name', 'storage'},
    'other': {'summary'},
}

APPROVED_OPERATION_DETAIL_FIELDS = {
    'purchase': {'operation_date', 'quantity', 'purpose'},
    'loan': {
        'management_number',
        'user_name',
        'operation_date',
        'expected_return_date',
        'quantity',
        'location',
        'purpose',
    },
    'return': {'management_number', 'operation_date', 'condition'},
    'disposal': {
        'management_number',
        'operation_date',
        'disposal_reason',
        'disposal_method',
    },
}

ALLOWED_DEPARTMENTS = {'営業部', '総務部', 'システム部'}


APPLICATION_SETTINGS = {
    'pc': {
        'model': PcLoanApplication,
        'fields': {
            'applicantName': 'applicant_name',
            'managementNumber': 'management_number',
            'startDate': 'start_date',
            'location': 'location',
        },
    },
    'memory': {
        'model': ExternalStorageLoanApplication,
        'fields': {
            'applicantName': 'applicant_name',
            'deviceName': 'device_name',
            'capacity': 'capacity',
            'location': 'location',
            'loanDate': 'loan_date',
        },
    },
    'lan': {
        'model': LanEquipmentLoanApplication,
        'fields': {
            'deviceType': 'device_type',
            'deviceName': 'device_name',
            'startDate': 'start_date',
            'returnDate': 'return_date',
            'location': 'location',
        },
    },
    'phone': {
        'model': SmartphonePurchaseApplication,
        'fields': {
            'model': 'model_name',
            'deliveryDate': 'purchase_date',
            'storage': 'storage',
            'simRequired': 'sim_required',
        },
    },
}


def _parse_json_object(request):
    try:
        payload = json.loads(request.body or '{}')
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, JsonResponse({'error': '送信データがJSONではありません。'}, status=400)
    if not isinstance(payload, dict):
        return None, JsonResponse({'error': '送信データの形式が正しくありません。'}, status=400)
    return payload, None


def _authentication_required():
    return JsonResponse({'error': 'ログインが必要です。'}, status=401)


def _session_payload(user=None):
    if user is None or not user.is_authenticated:
        return {'authenticated': False, 'user': None}
    return {
        'authenticated': True,
        'user': {
            'id': user.pk,
            'username': user.get_username(),
            'displayName': user.get_full_name() or user.get_username(),
            'email': user.email,
        },
    }


def _serialize_approved_application(application):
    return {
        'id': application.pk,
        'referenceNumber': application.reference_number,
        'applicationType': application.application_type,
        'operationType': application.operation_type,
        'applicantName': application.applicant_name,
        'department': application.department,
        'approvedDate': application.approved_date.isoformat(),
        'details': application.details,
        'notes': application.notes,
        'enteredBy': application.entered_by.get_username(),
        'createdAt': application.created_at.isoformat(),
    }


@require_GET
@ensure_csrf_cookie
def csrf_token(request):
    """ReactへDjangoのCSRF Cookieを発行する。"""

    return JsonResponse({'message': 'CSRF Cookieを発行しました。'})


@require_GET
@ensure_csrf_cookie
def session(request):
    """ログイン状態を返し、ReactへCSRF Cookieを発行する。"""

    return JsonResponse(_session_payload(request.user))


@require_POST
def login(request):
    """Djangoユーザー名またはメールアドレスで担当者を認証する。"""

    payload, error_response = _parse_json_object(request)
    if error_response:
        return error_response

    identifier = str(payload.get('username', '')).strip()
    password = str(payload.get('password', ''))
    if not identifier or not password:
        return JsonResponse({'error': 'ログイン名とパスワードを入力してください。'}, status=400)

    username = identifier
    email_usernames = list(
        User.objects.filter(email__iexact=identifier).values_list('username', flat=True)[:2]
    )
    if len(email_usernames) == 1:
        username = email_usernames[0]

    user = authenticate(request, username=username, password=password)
    if user is None or not user.is_active:
        return JsonResponse({'error': 'ログイン名またはパスワードが正しくありません。'}, status=401)

    auth_login(request, user)
    return JsonResponse(_session_payload(user))


@require_POST
def logout(request):
    """担当者のDjangoセッションを終了する。"""

    auth_logout(request)
    return JsonResponse({'authenticated': False, 'user': None})


@require_http_methods(['GET', 'POST'])
def approved_applications(request):
    """担当者向けの承認済み資産処理を一覧・登録する。"""

    if not request.user.is_authenticated:
        return _authentication_required()

    if request.method == 'GET':
        applications = ApprovedApplication.objects.select_related('entered_by').all()[:100]
        return JsonResponse(
            [_serialize_approved_application(application) for application in applications],
            safe=False,
        )

    payload, error_response = _parse_json_object(request)
    if error_response:
        return error_response

    if payload.get('approvedConfirmed') is not True:
        return JsonResponse(
            {'error': '上司の承認が完了していることを確認してください。'},
            status=400,
        )

    application_type = payload.get('applicationType')
    operation_type = payload.get('operationType')
    type_fields = APPROVED_TYPE_DETAIL_FIELDS.get(application_type)
    operation_fields = APPROVED_OPERATION_DETAIL_FIELDS.get(operation_type)
    details = payload.get('details')
    field_errors = {}

    if type_fields is None:
        field_errors['applicationType'] = ['機器種別を選択してください。']
    if operation_fields is None:
        field_errors['operationType'] = ['処理区分が正しくありません。']
    if payload.get('department') not in ALLOWED_DEPARTMENTS:
        field_errors['department'] = ['所属部署を選択してください。']
    if not isinstance(details, dict):
        field_errors['details'] = ['転記項目を入力してください。']
        details = {}

    expected_fields = (type_fields or set()) | (operation_fields or set())
    cleaned_details = {key: details.get(key) for key in expected_fields}
    missing_fields = sorted(
        key for key, value in cleaned_details.items() if value is None or str(value).strip() == ''
    )
    if missing_fields:
        field_errors['details'] = [f"未入力の項目があります: {', '.join(missing_fields)}"]

    if 'quantity' in cleaned_details:
        try:
            quantity = int(cleaned_details['quantity'])
            if quantity < 1:
                raise ValueError
            cleaned_details['quantity'] = quantity
        except (TypeError, ValueError):
            field_errors['quantity'] = ['数量は1以上の整数で入力してください。']

    operation_date = cleaned_details.get('operation_date')
    expected_return_date = cleaned_details.get('expected_return_date')
    if operation_date and expected_return_date and expected_return_date < operation_date:
        field_errors['expected_return_date'] = ['返却予定日は貸出日以降にしてください。']

    if field_errors:
        return JsonResponse(
            {'error': '入力内容を確認してください。', 'fields': field_errors},
            status=400,
        )

    application = ApprovedApplication(
        application_type=application_type,
        operation_type=operation_type,
        applicant_name=payload.get('applicantName'),
        department=payload.get('department'),
        approved_date=payload.get('approvedDate'),
        details=cleaned_details,
        notes=str(payload.get('notes', '')).strip(),
        entered_by=request.user,
    )

    try:
        application.full_clean()
        with transaction.atomic():
            application.save()
    except ValidationError as error:
        return JsonResponse(
            {'error': '入力内容を確認してください。', 'fields': error.message_dict},
            status=400,
        )

    ledger_synced = True
    ledger_warning = None
    try:
        sync_approved_ledger(application.application_type)
    except (OSError, ValueError):
        ledger_synced = False
        ledger_warning = '登録は完了しましたが、Excel管理台帳を更新できませんでした。'
        logger.exception('承認済み資産処理のExcel台帳同期に失敗しました。')

    response_data = _serialize_approved_application(application)
    response_data['ledgerSynced'] = ledger_synced
    response_data['ledgerWarning'] = ledger_warning
    return JsonResponse(response_data, status=201)


@require_POST
def create_application(request):
    """Reactの申請内容を検証し、申請種別に対応するモデルへ保存する。"""

    if not request.user.is_authenticated:
        return _authentication_required()

    payload, error_response = _parse_json_object(request)
    if error_response:
        return error_response

    request_type = payload.get('requestType')
    settings = APPLICATION_SETTINGS.get(request_type)
    if settings is None:
        return JsonResponse({'error': '申請種別が正しくありません。'}, status=400)

    model_values = {
        'requester_name': payload.get('requesterName'),
        'department': payload.get('department'),
        'employee_number': payload.get('employeeNumber'),
    }
    for frontend_name, model_name in settings['fields'].items():
        model_values[model_name] = payload.get(frontend_name)

    application = settings['model'](**model_values)

    try:
        application.full_clean()
        with transaction.atomic():
            application.save()
    except ValidationError as error:
        return JsonResponse(
            {
                'error': '入力内容を確認してください。',
                'fields': error.message_dict,
            },
            status=400,
        )

    ledger_synced = True
    ledger_warning = None
    try:
        sync_ledger(request_type)
    except (OSError, ValueError):
        ledger_synced = False
        ledger_warning = '申請は保存しましたが、Excel管理台帳を更新できませんでした。'
        logger.exception('Excel管理台帳の同期に失敗しました。')

    return JsonResponse(
        {
            'id': application.pk,
            'requestType': request_type,
            'status': application.status,
            'ledgerSynced': ledger_synced,
            'ledgerWarning': ledger_warning,
            'message': ledger_warning or '申請を保存し、Excel管理台帳を更新しました。',
        },
        status=201,
    )
