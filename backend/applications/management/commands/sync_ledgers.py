from django.core.management.base import BaseCommand, CommandError

from applications.approved_ledger_sync import FILE_NAMES, sync_approved_ledger
from applications.ledger_sync import LEDGER_CONFIG, sync_ledger


class Command(BaseCommand):
    help = 'MySQLの申請内容からExcel管理台帳を再生成します。'

    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            choices=tuple(dict.fromkeys((*LEDGER_CONFIG, *FILE_NAMES))),
            help='指定した申請種別だけを同期します。未指定の場合は全種類です。',
        )
        parser.add_argument(
            '--approved',
            action='store_true',
            help='担当者が登録した承認済み資産処理の台帳を同期します。',
        )

    def handle(self, *args, **options):
        sync_function = sync_approved_ledger if options['approved'] else sync_ledger
        available_types = FILE_NAMES if options['approved'] else LEDGER_CONFIG
        request_types = (
            [options['type']]
            if options['type']
            else list(available_types)
        )

        if options['type'] and options['type'] not in available_types:
            raise CommandError('指定した台帳種別はこの同期方法では使用できません。')

        for request_type in request_types:
            try:
                output_path = sync_function(request_type)
            except (OSError, ValueError) as error:
                raise CommandError(
                    f'{request_type}の台帳を同期できませんでした: {error}'
                ) from error
            self.stdout.write(
                self.style.SUCCESS(f'{request_type}: {output_path}')
            )
