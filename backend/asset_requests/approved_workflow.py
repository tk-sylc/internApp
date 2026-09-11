"""Transactional edits and audit logging for the operator-facing ledger."""
from copy import deepcopy
import hashlib
import json

from django.db import IntegrityError, transaction

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import APIException

from accounts.models import UserProfile
from .approved_ledger_sync import DETAIL_COLUMNS, OPERATION_COLUMNS, lock_ledgers, mark_pending
from .models import ApprovedApplication, ApprovedApplicationHistory
from .serializers import ApprovedApplicationSerializer


class RevisionConflict(APIException):
    status_code = 409
    default_detail = "他の担当者が更新しました。最新の内容を読み直してから操作してください。"
    default_code = "revision_conflict"


class RevisionInput(serializers.Serializer):
    revision = serializers.IntegerField(min_value=1)


class CancellationInput(RevisionInput):
    reason = serializers.CharField(allow_blank=False, max_length=1000, trim_whitespace=True)


SNAPSHOT_FIELDS = ("application_type", "operation_type", "applicant_name", "department", "details", "notes", "is_cancelled", "cancellation_reason", "source_application_reference", "related_loan_reference")
FIELD_LABELS = {"application_type": "機器種別", "operation_type": "処理区分", "applicant_name": "申請者氏名", "department": "所属部署", "notes": "担当者メモ", "is_cancelled": "取消状態", "cancellation_reason": "取消理由"}
FIELD_LABELS.update({"source_application_reference": "機器情報の参照元申請", "related_loan_reference": "元の貸出申請"})
DETAIL_LABELS = {key: label for columns in DETAIL_COLUMNS.values() for label, key in columns}
DETAIL_LABELS.update({key: label for label, key in OPERATION_COLUMNS})
DETAIL_LABELS["summary"] = "転記内容"


def actor_snapshot(user):
    try:
        name = user.profile.display_name.strip()
    except UserProfile.DoesNotExist:
        name = ""
    email = user.email.strip()
    return name or email or user.get_username(), email


def snapshot(record):
    return {field: deepcopy(getattr(record, field)) for field in SNAPSHOT_FIELDS}


def _flat_snapshot(value):
    result = {key: item for key, item in value.items() if key != "details"}
    result.update({"details." + key: item for key, item in value.get("details", {}).items()})
    return result


def _history(record, actor, action, before, reason=""):
    after = snapshot(record)
    old, new = _flat_snapshot(before), _flat_snapshot(after)
    changes = []
    for field in sorted(old.keys() | new.keys()):
        previous, current = old.get(field, ""), new.get(field, "")
        if previous == current:
            continue
        label = DETAIL_LABELS.get(field.removeprefix("details."), field.removeprefix("details.")) if field.startswith("details.") else FIELD_LABELS.get(field, field)
        changes.append({"field": field, "label": label, "before": previous, "after": current})
    name, email = actor_snapshot(actor)
    ApprovedApplicationHistory.objects.create(
        application=record, actor=actor, actor_name=name, actor_email=email,
        action=action, before=before, after=after, changes=changes, reason=reason,
    )


def create_application(serializer, actor, request_id=None):
    name, email = actor_snapshot(actor)
    fingerprint = hashlib.sha256(json.dumps(
        serializer.validated_data, sort_keys=True, ensure_ascii=False,
        separators=(",", ":"), default=lambda value: value.pk if isinstance(value, ApprovedApplication) else str(value),
    ).encode("utf-8")).hexdigest() if request_id else ""

    def previous_result():
        previous = ApprovedApplication.objects.filter(client_request_id=request_id).first()
        if previous is not None and (
            previous.entered_by_id != actor.pk or previous.creation_fingerprint != fingerprint
        ):
            raise RevisionConflict("同じ送信番号で異なる登録はできません。保存済みの内容を確認してください。")
        return previous

    with lock_ledgers([serializer.validated_data["application_type"]]) as states:
        if request_id:
            previous = previous_result()
            if previous is not None:
                return previous
        serializer.validate_references(serializer.validated_data)
        try:
            with transaction.atomic():
                record = serializer.save(
                    entered_by=actor, entered_by_name=name, entered_by_email=email,
                    client_request_id=request_id, creation_fingerprint=fingerprint,
                )
        except IntegrityError:
            # A unique key also protects callers that locked different ledgers.
            previous = previous_result() if request_id else None
            if previous is not None:
                return previous
            raise
        _history(record, actor, "create", {})
        mark_pending(states)
    return record


def change_application(pk, actor, data, action="update"):
    revision_input = (CancellationInput if action == "cancel" else RevisionInput)(data=data)
    revision_input.is_valid(raise_exception=True)
    expected = revision_input.validated_data["revision"]
    initial = get_object_or_404(ApprovedApplication, pk=pk)
    target_type = data.get("application_type", initial.application_type) if action == "update" else initial.application_type
    if target_type not in ApprovedApplication.ApplicationType.values:
        raise serializers.ValidationError({"application_type": "機器種別が不正です。"})
    affected_types = {initial.application_type, target_type}
    # Always ledger locks before record locks. Type moves lock both in sorted
    # order, matching generation, so concurrent changes cannot publish old rows.
    with lock_ledgers(affected_types) as states:
        record = get_object_or_404(ApprovedApplication.objects.select_for_update(), pk=pk)
        if record.revision != expected:
            raise RevisionConflict()
        before = snapshot(record)
        reason = ""
        if action == "update":
            if record.is_cancelled:
                raise RevisionConflict("取消済みです。復元してから修正してください。")
            serializer = ApprovedApplicationSerializer(record, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            updates = dict(serializer.validated_data)
        elif action == "cancel":
            if record.is_cancelled:
                raise RevisionConflict("この登録は既に取り消されています。")
            reason = revision_input.validated_data["reason"]
            updates = {"is_cancelled": True, "cancellation_reason": reason}
        elif action == "restore":
            if not record.is_cancelled:
                raise RevisionConflict("この登録は既に有効です。")
            updates = {"is_cancelled": False, "cancellation_reason": ""}
        else:
            raise ValueError("Unknown ledger action")
        updates.update(revision=expected + 1, updated_at=timezone.now())
        # Explicit compare-and-swap is an additional safeguard for SQLite and
        # makes the expected revision part of the write, not just a prior read.
        changed = ApprovedApplication.objects.filter(pk=pk, revision=expected).update(**updates)
        if changed != 1:
            raise RevisionConflict()
        record.refresh_from_db()
        _history(record, actor, action, before, reason)
        mark_pending(states)
    return record, affected_types
