import json

from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .models import (
    ExternalStorageLoanApplication,
    LanEquipmentLoanApplication,
    PcLoanApplication,
    SmartphonePurchaseApplication,
)


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


@require_GET
@ensure_csrf_cookie
def csrf_token(request):
    """ReactへDjangoのCSRF Cookieを発行する。"""

    return JsonResponse({'message': 'CSRF Cookieを発行しました。'})


@require_POST
def create_application(request):
    """Reactの申請内容を検証し、申請種別に対応するモデルへ保存する。"""

    try:
        payload = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': '送信データがJSONではありません。'}, status=400)

    if not isinstance(payload, dict):
        return JsonResponse({'error': '送信データの形式が正しくありません。'}, status=400)

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

    return JsonResponse(
        {
            'id': application.pk,
            'requestType': request_type,
            'status': application.status,
            'message': '申請を保存しました。',
        },
        status=201,
    )
