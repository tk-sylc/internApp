from django.core.management.base import BaseCommand, CommandError
from asset_requests.approved_ledger_sync import FILE_NAMES, sync_approved_ledger


class Command(BaseCommand):
    help = "DBを正本として全件の承認済み台帳を再生成します（取消済みを除く）。"

    def add_arguments(self, parser):
        parser.add_argument("application_types", nargs="*", help="pc memory lan phone other（省略時は全種類）")

    def handle(self, *args, **options):
        types = options["application_types"] or list(FILE_NAMES)
        if any(value not in FILE_NAMES for value in types):
            raise CommandError("機器種別は pc memory lan phone other から指定してください。")
        failures = []
        for value in types:
            try:
                sync_approved_ledger(value)
            except Exception:
                failures.append(value)
                self.stderr.write(f"{value}: 同期失敗。保存先の権限とサーバーログを確認してください。")
            else:
                self.stdout.write(self.style.SUCCESS(f"{value}: 同期完了"))
        if failures:
            raise CommandError("一部の台帳を更新できませんでした。再試行してください。")
