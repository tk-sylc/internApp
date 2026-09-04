import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("asset_requests", "0002_add_purpose_to_pc_and_external_storage"),
    ]

    operations = [
        migrations.AddField(
            model_name="externalstoragerequest",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="%(app_label)s_%(class)s_created",
                to=settings.AUTH_USER_MODEL,
                verbose_name="作成ユーザー",
            ),
        ),
        migrations.AddField(
            model_name="lanrequest",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="%(app_label)s_%(class)s_created",
                to=settings.AUTH_USER_MODEL,
                verbose_name="作成ユーザー",
            ),
        ),
        migrations.AddField(
            model_name="pcrequest",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="%(app_label)s_%(class)s_created",
                to=settings.AUTH_USER_MODEL,
                verbose_name="作成ユーザー",
            ),
        ),
        migrations.AddField(
            model_name="smartphonerequest",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="%(app_label)s_%(class)s_created",
                to=settings.AUTH_USER_MODEL,
                verbose_name="作成ユーザー",
            ),
        ),
    ]
