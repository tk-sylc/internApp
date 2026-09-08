import { HandCoins, PackageOpen, RotateCcw, Trash2 } from 'lucide-react'

export const OPERATIONS = {
  purchase: { label: '購入', description: '新しい機器を台帳へ登録', icon: PackageOpen, tone: 'blue' },
  loan: { label: '貸出', description: '保有機器の貸出を記録', icon: HandCoins, tone: 'green' },
  return: { label: '返却', description: '貸出中の機器を返却', icon: RotateCcw, tone: 'orange' },
  disposal: { label: '廃棄', description: '保有機器の廃棄を記録', icon: Trash2, tone: 'red' },
}

export const TYPES = {
  pc: {
    label: 'PC',
    fields: [['device_name', '機種名']],
    secondaryFields: [
      ['cpu_ghz', 'CPU（GHz）', 'number', null, { min: 0, step: 0.1 }],
      ['ram_gb', 'RAM（GB）', 'number', null, { min: 0, step: 1 }],
      ['os', 'OS・バージョン'],
      ['security_software', 'セキュリティソフト'],
      ['antivirus_installed', 'ウイルス対策ソフト導入確認', 'select', ['導入済み', '未導入', '不明']],
      ['office_version', 'Officeバージョン'],
      ['browser_version', 'Browserバージョン'],
      ['adobe_reader_version', 'Adobe Readerバージョン'],
      ['flash_player_version', 'Flash Playerバージョン'],
    ],
  },
  phone: {
    label: 'スマートフォン',
    fields: [
      ['model_name', '機種名'],
      ['storage', '容量'],
      ['phone_number', '電話番号', 'tel'],
      ['carrier', 'キャリア名'],
    ],
    secondaryFields: [
      ['os', 'OS・バージョン'],
      ['security_software', 'セキュリティソフト'],
      ['antivirus_installed', 'ウイルス対策ソフト導入確認', 'select', ['導入済み', '未導入', '不明']],
    ],
  },
  lan: {
    label: 'LAN機器',
    fields: [
      ['device_type', '機器種別'],
      ['device_name', '機器名'],
    ],
    secondaryFields: [
      ['acquisition_method', '入手方法', 'select', ['借用', '購入', '不明']],
      ['borrowed_from', '借用元'],
      ['wireless_encryption', '暗号方式', 'select', ['WPA2', 'WPA', 'その他', '不明']],
      ['wireless_encryption_other', 'その他の暗号方式'],
    ],
  },
  memory: {
    label: '外部記憶装置',
    fields: [
      ['storage_type', '外部記憶装置の種類', 'select', ['USBメモリ', 'ポータブルHDD', 'SDカード', 'その他']],
      ['device_name', '機器名'],
      ['capacity', '容量'],
    ],
    secondaryFields: [
      ['encryption_software', '暗号化ソフト', 'select', ['装備済み', '未装備', '不明']],
      ['virus_check', 'ウイルスチェック', 'select', ['確認済み', '未確認', '不明']],
      ['virus_pattern_file', 'ウイルスパターンファイル'],
    ],
  },
}

export const USAGE_FIELDS = {
  purchase: [['usage_start_date', '利用開始日', 'date'], ['usage_end_date', '利用終了日', 'date'], ['purpose', '目的', 'textarea'], ['location', '利用場所']],
  loan: [['usage_start_date', '利用開始日', 'date'], ['usage_end_date', '利用終了日', 'date'], ['purpose', '目的', 'textarea'], ['location', '利用場所']],
  return: [['usage_end_date', '利用終了日', 'date'], ['condition', '返却時の状態', 'select', ['問題なし', '傷・汚れあり', '故障あり']], ['location', '利用場所']],
  disposal: [['disposal_date', '廃棄日', 'date'], ['disposal_reason', '廃棄理由', 'textarea'], ['disposal_method', '廃棄方法'], ['location', '利用場所']],
}

export const OPERATION_FIELDS = {
  purchase: [['quantity', '数量', 'number', null, { min: 1, step: 1 }]],
  loan: [['management_number', '管理番号'], ['quantity', '数量', 'number', null, { min: 1, step: 1 }]],
  return: [['management_number', '管理番号']],
  disposal: [['management_number', '管理番号']],
}

export const DEPARTMENTS = ['営業部', '総務部', 'システム部']
export const newForm = (operation) => ({
  operation_type: operation,
  application_type: 'pc',
  applicant_name: '',
  department: '',
  details: {},
  notes: '',
})

