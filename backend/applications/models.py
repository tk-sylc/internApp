from django.core.exceptions import ValidationError
from django.db import models


class ApplicationStatus(models.TextChoices):
    PENDING = 'pending', '申請中'
    APPROVED = 'approved', '承認'
    REJECTED = 'rejected', '却下'


class BaseApplication(models.Model):
    """全申請画面に共通する申請者情報。"""

    requester_name = models.CharField('申請者情報の氏名', max_length=100)
    department = models.CharField('所属部署', max_length=100)
    employee_number = models.CharField('社員番号', max_length=50)
    status = models.CharField(
        '申請状態',
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField('申請日時', auto_now_add=True)
    updated_at = models.DateTimeField('更新日時', auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']


class PcLoanApplication(BaseApplication):
    applicant_name = models.CharField('貸出者氏名', max_length=100)
    management_number = models.CharField('管理番号', max_length=50)
    start_date = models.DateField('利用開始日')
    location = models.CharField('利用場所', max_length=200)

    class Meta(BaseApplication.Meta):
        verbose_name = 'PC貸出申請'
        verbose_name_plural = 'PC貸出申請'

    def __str__(self):
        return f'{self.management_number} - {self.applicant_name}'


class ExternalStorageLoanApplication(BaseApplication):
    applicant_name = models.CharField('貸出者氏名', max_length=100)
    device_name = models.CharField('機器名', max_length=100)
    capacity = models.CharField('容量', max_length=50)
    location = models.CharField('場所', max_length=200)
    loan_date = models.DateField('貸し出し日')

    class Meta(BaseApplication.Meta):
        verbose_name = '外部記憶装置貸出申請'
        verbose_name_plural = '外部記憶装置貸出申請'

    def __str__(self):
        return f'{self.device_name} - {self.applicant_name}'


class LanEquipmentLoanApplication(BaseApplication):
    class DeviceType(models.TextChoices):
        LAN_CABLE = 'LANケーブル', 'LANケーブル'
        USB_LAN_ADAPTER = 'USB-LANアダプター', 'USB-LANアダプター'
        MOBILE_ROUTER = 'モバイルルーター', 'モバイルルーター'
        OTHER = 'その他', 'その他'

    device_type = models.CharField(
        '機器種別',
        max_length=30,
        choices=DeviceType.choices,
    )
    device_name = models.CharField('機器名', max_length=100)
    start_date = models.DateField('利用開始日')
    return_date = models.DateField('返却予定日')
    location = models.CharField('利用場所', max_length=200)

    class Meta(BaseApplication.Meta):
        verbose_name = 'LAN機器貸出申請'
        verbose_name_plural = 'LAN機器貸出申請'

    def clean(self):
        super().clean()
        if self.start_date and self.return_date and self.return_date < self.start_date:
            raise ValidationError({'return_date': '返却予定日は利用開始日以降にしてください。'})

    def __str__(self):
        return f'{self.device_name} - {self.requester_name}'


class SmartphonePurchaseApplication(BaseApplication):
    class Storage(models.TextChoices):
        GB_64 = '64GB', '64GB'
        GB_128 = '128GB', '128GB'
        GB_256 = '256GB', '256GB'
        GB_512 = '512GB', '512GB'
        UNSPECIFIED = '指定なし', '指定なし'

    class SimRequired(models.TextChoices):
        YES = 'あり', 'あり'
        NO = 'なし', 'なし'

    model_name = models.CharField('機種', max_length=100)
    purchase_date = models.DateField('購入日')
    storage = models.CharField('容量', max_length=10, choices=Storage.choices)
    sim_required = models.CharField(
        'SIMの有無',
        max_length=2,
        choices=SimRequired.choices,
    )

    class Meta(BaseApplication.Meta):
        verbose_name = 'スマートフォン購入申請'
        verbose_name_plural = 'スマートフォン購入申請'

    def __str__(self):
        return f'{self.model_name} - {self.requester_name}'
