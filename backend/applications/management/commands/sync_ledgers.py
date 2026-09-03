from django.core.management.base import BaseCommand, CommandError

from applications.ledger_sync import LEDGER_CONFIG, sync_ledger


class Command(BaseCommand):
    help = 'SQLiteの申請内容からExcel管理台帳を再生成します。'

    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            choices=tuple(LEDGER_CONFIG),
            help='指定した申請種別だけを同期します。未指定の場合は全種類です。',
        )

    def handle(self, *args, **options):
        request_types = (
            [options['type']]
            if options['type']
            else list(LEDGER_CONFIG)
        )

        for request_type in request_types:
            try:
                output_path = sync_ledger(request_type)
            except (OSError, ValueError) as error:
                raise CommandError(
                    f'{request_type}の台帳を同期できませんでした: {error}'
                ) from error
            self.stdout.write(
                self.style.SUCCESS(f'{request_type}: {output_path}')
            )
