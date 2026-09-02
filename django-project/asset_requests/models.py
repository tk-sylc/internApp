from django.core.validators import MinValueValidator
from django.db import models


class RequestStatus(models.TextChoices):
    PENDING = "pending", "申請中"
    APPROVED = "approved", "承認"
    REJECTED = "rejected", "却下"


class BaseAssetRequest(models.Model):
    """4種類の申請テーブルで共通して保持する項目。"""

    requester_name = models.CharField("申請者氏名", max_length=100)
    department = models.CharField("所属部署", max_length=100)
    employee_number = models.CharField("社員番号", max_length=50, db_index=True)
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

    def __str__(self):
        return f"{self.requester_name}（{self.employee_number}）"


class PCRequest(BaseAssetRequest):
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
