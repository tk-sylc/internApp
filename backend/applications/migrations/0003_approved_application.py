from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('applications', '0002_add_application_status'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ApprovedApplication',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('application_type', models.CharField(choices=[('pc', 'PC'), ('memory', '外部記憶装置'), ('lan', 'LAN機器'), ('phone', 'スマートフォン'), ('other', 'その他')], db_index=True, max_length=20, verbose_name='機器種別')),
                ('operation_type', models.CharField(choices=[('purchase', '購入'), ('loan', '貸出'), ('return', '返却'), ('disposal', '廃棄')], db_index=True, max_length=20, verbose_name='処理区分')),
                ('applicant_name', models.CharField(max_length=100, verbose_name='申請者氏名')),
                ('department', models.CharField(db_index=True, max_length=100, verbose_name='所属部署')),
                ('approved_date', models.DateField(db_index=True, verbose_name='承認日')),
                ('details', models.JSONField(default=dict, verbose_name='転記項目')),
                ('notes', models.TextField(blank=True, verbose_name='担当者メモ')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='登録日時')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新日時')),
                ('entered_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='approved_applications_entered', to=settings.AUTH_USER_MODEL, verbose_name='登録担当者')),
            ],
            options={
                'verbose_name': '承認済み資産処理',
                'verbose_name_plural': '承認済み資産処理',
                'ordering': ['-created_at'],
            },
        ),
    ]
