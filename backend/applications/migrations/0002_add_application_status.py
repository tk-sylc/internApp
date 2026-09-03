from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('applications', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='externalstorageloanapplication',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', '申請中'),
                    ('approved', '承認'),
                    ('rejected', '却下'),
                ],
                db_index=True,
                default='pending',
                max_length=20,
                verbose_name='申請状態',
            ),
        ),
        migrations.AddField(
            model_name='lanequipmentloanapplication',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', '申請中'),
                    ('approved', '承認'),
                    ('rejected', '却下'),
                ],
                db_index=True,
                default='pending',
                max_length=20,
                verbose_name='申請状態',
            ),
        ),
        migrations.AddField(
            model_name='pcloanapplication',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', '申請中'),
                    ('approved', '承認'),
                    ('rejected', '却下'),
                ],
                db_index=True,
                default='pending',
                max_length=20,
                verbose_name='申請状態',
            ),
        ),
        migrations.AddField(
            model_name='smartphonepurchaseapplication',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', '申請中'),
                    ('approved', '承認'),
                    ('rejected', '却下'),
                ],
                db_index=True,
                default='pending',
                max_length=20,
                verbose_name='申請状態',
            ),
        ),
    ]
