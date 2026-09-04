import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import Lock

from django.conf import settings
from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

from accounts.models import UserProfile

from .models import ApprovedApplication


DETAIL_COLUMNS = {
    "pc": (
        ("機種名", "device_name"),
        ("CPU（GHz）", "cpu_ghz"),
        ("RAM（GB）", "ram_gb"),
        ("OS", "os"),
        ("OSバージョン", "os_version"),
        ("セキュリティソフト", "security_software"),
        ("ウイルス対策ソフト導入確認", "antivirus_installed"),
        ("Officeバージョン", "office_version"),
        ("ブラウザ", "browser"),
        ("ブラウザバージョン", "browser_version"),
        ("Adobe Readerバージョン", "adobe_reader_version"),
        ("Flash Playerバージョン", "flash_player_version"),
        ("性能", "performance"),
    ),
    "memory": (
        ("外部記憶装置の種類", "storage_type"),
        ("機器名", "device_name"),
        ("容量", "capacity"),
        ("暗号化ソフト", "encryption_software"),
        ("ウイルスチェック", "virus_check"),
        ("ウイルスパターンファイル", "virus_pattern_file"),
    ),
    "lan": (
        ("機器種別", "device_type"),
        ("機器名", "device_name"),
        ("暗号方式", "wireless_encryption"),
        ("その他の暗号方式", "wireless_encryption_other"),
        ("入手方法", "acquisition_method"),
        ("借用元", "borrowed_from"),
    ),
    "phone": (
        ("OS", "os"),
        ("OSバージョン", "os_version"),
        ("機種", "model_name"),
        ("容量", "storage"),
        ("性能", "performance"),
        ("電話番号", "phone_number"),
        ("キャリア名", "carrier"),
        ("セキュリティソフト", "security_software"),
        ("ウイルス対策ソフト導入確認", "antivirus_installed"),
    ),
    "other": (("転記内容", "_all"),),
}

OPERATION_COLUMNS = (
    ("管理番号", "management_number"),
    ("利用開始日", "usage_start_date"),
    ("利用終了日", "usage_end_date"),
    ("利用場所", "location"),
    ("数量", "quantity"),
    ("目的", "purpose"),
    ("返却時の状態", "condition"),
    ("廃棄理由", "disposal_reason"),
    ("廃棄方法", "disposal_method"),
)

FILE_NAMES = {
    "pc": "承認済み_PC管理台帳.xlsx",
    "memory": "承認済み_外部記憶装置管理台帳.xlsx",
    "lan": "承認済み_LAN機器管理台帳.xlsx",
    "phone": "承認済み_スマートフォン管理台帳.xlsx",
    "other": "承認済み_その他申請管理台帳.xlsx",
}

_SYNC_LOCK = Lock()


def _safe_value(value):
    if isinstance(value, bool):
        return "あり" if value else "なし"
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    if isinstance(value, str) and value.startswith(("=", "+", "-", "@")):
        return f"'{value}"
    return value


def _excel_datetime(value):
    """Excelが扱えないタイムゾーン情報を外し、設定中の現地時刻にする。"""

    if timezone.is_aware(value):
        return timezone.localtime(value).replace(tzinfo=None)
    return value


def _operator_name(record):
    if record.entered_by_name:
        return record.entered_by_name
    try:
        display_name = record.entered_by.profile.display_name.strip()
    except UserProfile.DoesNotExist:
        display_name = ""
    return display_name or record.entered_by.email or record.entered_by.get_username()


def sync_approved_ledger(application_type):
    columns = DETAIL_COLUMNS.get(application_type)
    if columns is None:
        raise ValueError(f"未対応の申請種別です: {application_type}")

    output_dir = Path(settings.APPROVED_LEDGER_OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / FILE_NAMES[application_type]

    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "転記データ"
    worksheet.freeze_panes = "A2"

    common_headers = ("受付番号", "処理区分", "申請者氏名", "所属部署", "登録担当者", "登録日時")
    all_columns = (*columns, *OPERATION_COLUMNS)
    worksheet.append([*common_headers, *(label for label, _key in all_columns), "担当者メモ"])
    header_fill = PatternFill(fill_type="solid", fgColor="17376D")
    for cell in worksheet[1]:
        cell.font = Font(color="FFFFFF", bold=True)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")

    queryset = (
        ApprovedApplication.objects.filter(application_type=application_type)
        .select_related("entered_by__profile")
        .order_by("pk")
    )
    for record in queryset:
        detail_values = []
        for _label, key in all_columns:
            value = record.details if key == "_all" else record.details.get(key, "")
            detail_values.append(_safe_value(value))
        worksheet.append([
            record.reference_number,
            record.get_operation_type_display(),
            _safe_value(record.applicant_name),
            _safe_value(record.department),
            _safe_value(_operator_name(record)),
            _excel_datetime(record.created_at),
            *detail_values,
            _safe_value(record.notes),
        ])

    worksheet.auto_filter.ref = worksheet.dimensions
    for column_cells in worksheet.columns:
        longest = max(len(str(cell.value or "")) for cell in column_cells)
        worksheet.column_dimensions[column_cells[0].column_letter].width = min(longest + 3, 42)

    with _SYNC_LOCK:
        temporary_path = None
        try:
            with NamedTemporaryFile(
                dir=output_dir,
                prefix=f".{output_path.stem}-",
                suffix=".tmp.xlsx",
                delete=False,
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)
            workbook.save(temporary_path)
            os.replace(temporary_path, output_path)
        finally:
            if temporary_path and temporary_path.exists():
                temporary_path.unlink()

    return output_path
