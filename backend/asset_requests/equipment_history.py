"""Read-only equipment suggestions from existing, non-cancelled applications."""
from django.db.models import Q
from rest_framework import serializers

from .models import ApprovedApplication
from .serializers import APPROVED_EQUIPMENT_DETAIL_FIELDS, equipment_number


def _loan_reference(record):
    if record is None:
        return None
    return {
        "id": record.pk, "reference_number": record.reference_number,
        "applicant_name": record.applicant_name, "created_at": record.created_at.isoformat(),
        "usage_start_date": record.details.get("usage_start_date", ""),
    }


def _candidate(record, active):
    number = equipment_number(record.details)
    loan = active.filter(operation_type="loan", details__management_number=number).first() if number else (
        record if record.operation_type == "loan" else None
    )
    return {
        "id": record.pk, "reference_number": record.reference_number,
        "application_type": record.application_type, "operation_type": record.operation_type,
        "applicant_name": record.applicant_name, "created_at": record.created_at.isoformat(),
        "details": {
            key: value for key, value in record.details.items()
            if key in APPROVED_EQUIPMENT_DETAIL_FIELDS[record.application_type]
            and value not in (None, "") and isinstance(value, (str, int, float, bool))
        },
        "related_loan": _loan_reference(loan),
    }


def equipment_history(params):
    kind = params.get("application_type", "")
    number = params.get("management_number", "").strip()
    query = params.get("q", "").strip()
    if kind not in APPROVED_EQUIPMENT_DETAIL_FIELDS:
        raise serializers.ValidationError({"application_type": "機器種別を選んでください。"})
    if len(number) > 10000 or len(query) > 100:
        raise serializers.ValidationError({"query": "検索条件が長すぎます。"})
    # A blank or cleared input must never return all application history.
    if not number and not query:
        return {"match": None, "candidates": []}
    active = ApprovedApplication.objects.filter(application_type=kind, is_cancelled=False).order_by("-created_at", "-pk")
    if number:
        record = active.filter(details__management_number=number).first()
        return {"match": _candidate(record, active) if record else None, "candidates": []}
    matches = active.filter(
        Q(details__device_name__icontains=query) | Q(details__model_name__icontains=query)
        | Q(details__summary__icontains=query) | Q(details__management_number__icontains=query)
    )
    result, seen = [], set()
    for record in matches[:200]:
        number = equipment_number(record.details)
        name = record.details.get("device_name") or record.details.get("model_name") or record.details.get("summary") or ""
        # Without an identifying number, same-model applications may be for
        # different physical devices. Keep each one available for selection.
        identity = (number, str(name)) if number else ("record", record.pk)
        if identity in seen:
            continue
        seen.add(identity)
        result.append(_candidate(record, active))
        if len(result) == 20:
            break
    return {"match": None, "candidates": result}
