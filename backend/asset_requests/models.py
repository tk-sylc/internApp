from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class RequestStatus(models.TextChoices):
    PENDING = "pending", "申請中"
    APPROVED = "approved", "承認"
    REJECTED = "rejected", "却下"


class BaseAssetRequest(models.Model):
    """4種類の申請テーブルで共通して保持する項目。"""

    REFERENCE_PREFIX = "REQ"

    requester_name = models.CharField("申請者氏名", max_length=100)
    department = models.CharField("所属部署", max_length=100)
    requester_email = models.EmailField(
        "申請者メールアドレス",
        blank=True,
        default="",
        db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="作成ユーザー",
        on_delete=models.PROTECT,
        related_name="%(app_label)s_%(class)s_created",
        null=True,
        blank=True,
    )
    status = models.CharField(
        "申請状態",
        max_length=20,
        choices=RequestStatus.choices,
        default=RequestStatus.PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField("申請日時", auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField("更新日時", auto_now=True)

    class Meta:
        abstract = True

    @property
    def reference_number(self):
        """モデル種別・申請日・主キーから変更されない受付番号を返す。"""
        if self.pk is None or self.created_at is None:
            return ""

        created_date = timezone.localdate(self.created_at)
        return f"{self.REFERENCE_PREFIX}-{created_date:%Y%m%d}-{self.pk:06d}"

    def __str__(self):
        return f"{self.requester_name}（{self.requester_email}）"


class PCRequest(BaseAssetRequest):
    REFERENCE_PREFIX = "PC"

    applicant_name = models.CharField("利用者氏名", max_length=100)
    management_number = models.CharField("管理番号", max_length=50, db_index=True)
    start_date = models.DateField("利用開始日")
    location = models.CharField("利用場所", max_length=200)
    purpose = models.TextField("利用目的")

    class Meta:
        db_table = "asset_requests_pc_request"
        ordering = ["-created_at"]
        verbose_name = "PC貸出申請"
        verbose_name_plural = "PC貸出申請"


class SmartphoneRequest(BaseAssetRequest):
    REFERENCE_PREFIX = "SP"

    class OS(models.TextChoices):
        IOS = "iOS", "iOS"
        ANDROID = "Android", "Android"
        UNSPECIFIED = "指定なし", "指定なし"

    class LineType(models.TextChoices):
        NEW_CONTRACT = "新規契約", "新規契約"
        DEVICE_CHANGE = "機種変更", "機種変更"
        DEVICE_ONLY = "端末のみ購入", "端末のみ購入"

    class Storage(models.TextChoices):
        GB_64 = "64GB", "64GB"
        GB_128 = "128GB", "128GB"
        GB_256 = "256GB", "256GB"
        GB_512 = "512GB", "512GB"
        UNSPECIFIED = "指定なし", "指定なし"

    os = models.CharField("OS", max_length=20, choices=OS.choices)
    line_type = models.CharField("回線区分", max_length=20, choices=LineType.choices)
    model_name = models.CharField("機種", max_length=100)
    quantity = models.PositiveIntegerField("台数", validators=[MinValueValidator(1)])
    purchase_date = models.DateField("購入日")
    storage = models.CharField("容量", max_length=20, choices=Storage.choices)
    sim_required = models.BooleanField("SIMの有無")
    purpose = models.TextField("利用目的")
    notes = models.TextField("希望キャリア・備考", blank=True)

    class Meta:
        db_table = "asset_requests_smartphone_request"
        ordering = ["-created_at"]
        verbose_name = "スマートフォン購入申請"
        verbose_name_plural = "スマートフォン購入申請"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1),
                name="smartphone_quantity_at_least_one",
            ),
        ]


class ExternalStorageRequest(BaseAssetRequest):
    REFERENCE_PREFIX = "EXT"

    applicant_name = models.CharField("利用者氏名", max_length=100)
    device_name = models.CharField("機器名", max_length=100)
    capacity = models.CharField("容量", max_length=50)
    location = models.CharField("利用場所", max_length=200)
    loan_date = models.DateField("貸し出し日")
    purpose = models.TextField("利用目的")

    class Meta:
        db_table = "asset_requests_external_storage_request"
        ordering = ["-created_at"]
        verbose_name = "外部記憶装置貸出申請"
        verbose_name_plural = "外部記憶装置貸出申請"


class LANRequest(BaseAssetRequest):
    REFERENCE_PREFIX = "LAN"

    class DeviceType(models.TextChoices):
        LAN_CABLE = "LANケーブル", "LANケーブル"
        USB_LAN_ADAPTER = "USB-LANアダプター", "USB-LANアダプター"
        MOBILE_ROUTER = "モバイルルーター", "モバイルルーター"
        OTHER = "その他", "その他"

    device_type = models.CharField("機器種別", max_length=30, choices=DeviceType.choices)
    device_name = models.CharField("機器名", max_length=100)
    quantity = models.PositiveIntegerField("必要個数", validators=[MinValueValidator(1)])
    start_date = models.DateField("利用開始日")
    return_date = models.DateField("返却予定日")
    location = models.CharField("利用場所", max_length=200)
    purpose = models.TextField("利用目的")
    notes = models.TextField("ケーブル長・備考", blank=True)

    class Meta:
        db_table = "asset_requests_lan_request"
        ordering = ["-created_at"]
        verbose_name = "LAN機器貸出申請"
        verbose_name_plural = "LAN機器貸出申請"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1),
                name="lan_quantity_at_least_one",
            ),
            models.CheckConstraint(
                condition=models.Q(return_date__gte=models.F("start_date")),
                name="lan_return_date_on_or_after_start_date",
            ),
        ]


class ApprovedApplication(models.Model):
    """承認済みの資産手続きをExcel台帳へ転記するための登録データ。"""

    class ApplicationType(models.TextChoices):
        PC = "pc", "PC貸出"
        EXTERNAL_STORAGE = "memory", "外部記憶装置貸出"
        LAN = "lan", "LAN機器貸出"
        SMARTPHONE = "phone", "スマートフォン購入"
        OTHER = "other", "その他"

    class OperationType(models.TextChoices):
        PURCHASE = "purchase", "購入"
        DISPOSAL = "disposal", "廃棄"
        LOAN = "loan", "貸出"
        RETURN = "return", "返却"

    application_type = models.CharField(
        "機器種別",
        max_length=20,
        choices=ApplicationType.choices,
        db_index=True,
    )
    operation_type = models.CharField(
        "処理区分",
        max_length=20,
        choices=OperationType.choices,
        db_index=True,
    )
    applicant_name = models.CharField("申請者氏名", max_length=100, blank=True)
    department = models.CharField("所属部署", max_length=100, blank=True, db_index=True)
    approved_date = models.DateField("旧承認日", null=True, blank=True, db_index=True)
    details = models.JSONField("転記項目", default=dict)
    notes = models.TextField("担当者メモ", blank=True)
    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="登録担当者",
        on_delete=models.PROTECT,
        related_name="approved_applications_entered",
    )
    entered_by_name = models.CharField(
        "登録責任者氏名",
        max_length=100,
        blank=True,
        editable=False,
    )
    entered_by_email = models.EmailField(
        "登録責任者メールアドレス",
        blank=True,
        editable=False,
    )
    created_at = models.DateTimeField("登録日時", auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField("更新日時", auto_now=True)

    source_application = models.ForeignKey(
        "self", on_delete=models.PROTECT, null=True, blank=True,
        related_name="reused_applications", verbose_name="機器情報の参照元申請",
    )
    related_loan = models.ForeignKey(
        "self", on_delete=models.PROTECT, null=True, blank=True,
        related_name="referenced_returns", verbose_name="元の貸出申請",
    )

    @property
    def source_application_reference(self):
        return self.source_application.reference_number if self.source_application_id else ""

    @property
    def related_loan_reference(self):
        return self.related_loan.reference_number if self.related_loan_id else ""

    revision = models.PositiveIntegerField("版番号", default=1, editable=False)
    client_request_id = models.UUIDField(null=True, blank=True, unique=True, editable=False)
    creation_fingerprint = models.CharField(max_length=64, blank=True, editable=False)
    is_cancelled = models.BooleanField("取消済み", default=False, db_index=True)
    cancellation_reason = models.TextField("取消理由", blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "資産台帳登録"
        verbose_name_plural = "資産台帳登録"

    @property
    def reference_number(self):
        if self.pk is None or self.created_at is None:
            return ""
        created_date = timezone.localdate(self.created_at)
        return f"ENTRY-{created_date:%Y%m%d}-{self.pk:06d}"

    def __str__(self):
        return f"{self.reference_number} {self.applicant_name}"


class ApprovedApplicationHistory(models.Model):
    """Immutable snapshots of actions taken through the ledger workflow."""

    class Action(models.TextChoices):
        CREATE = "create", "登録"
        UPDATE = "update", "修正"
        CANCEL = "cancel", "取消"
        RESTORE = "restore", "復元"

    application = models.ForeignKey(
        ApprovedApplication, on_delete=models.PROTECT, related_name="history",
    )
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    actor_name = models.CharField(max_length=150)
    actor_email = models.EmailField(blank=True)
    action = models.CharField(max_length=10, choices=Action.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    before = models.JSONField(default=dict)
    after = models.JSONField(default=dict)
    changes = models.JSONField(default=list)
    reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at", "-pk"]
        verbose_name = "台帳の変更履歴"
        verbose_name_plural = "台帳の変更履歴"


class ApprovedLedgerState(models.Model):
    """A persistent per-ledger mutex and synchronization status."""

    class State(models.TextChoices):
        PENDING = "pending", "Excel未反映"
        SYNCED = "synced", "反映済み"
        ERROR = "error", "同期失敗"

    application_type = models.CharField(
        max_length=20, primary_key=True,
        choices=ApprovedApplication.ApplicationType.choices,
    )
    state = models.CharField(max_length=10, choices=State.choices, default=State.PENDING)
    generation = models.PositiveBigIntegerField(default=0)
    synced_generation = models.PositiveBigIntegerField(default=0)
    synced_at = models.DateTimeField(null=True, blank=True)
    error = models.TextField(blank=True)
