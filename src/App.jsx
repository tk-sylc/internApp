import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ClipboardCheck,
  FilePenLine,
  Info,
  KeyRound,
  Laptop,
  LoaderCircle,
  LogIn,
  LogOut,
  Network,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Trash2,
  Usb,
  UserRound,
} from 'lucide-react'
import './App.css'

const REQUEST_TYPES = {
  pc: {
    title: 'PC貸出',
    formTitle: 'PC貸出申請',
    description: '業務用ノート・デスクトップPC',
    lead: '申請者と貸出対象のPC、利用情報を入力してください。',
    category: '貸出',
    tone: 'blue',
    icon: Laptop,
    fields: [
      {
        name: 'applicantName',
        label: '利用者氏名',
        type: 'text',
        placeholder: '例：山田 太郎',
        hint: '実際にPCを利用する方の氏名',
        required: true,
      },
      {
        name: 'managementNumber',
        label: '管理番号',
        type: 'text',
        placeholder: '例：PC-01234',
        required: true,
      },
      { name: 'startDate', label: '利用開始希望日', type: 'date', required: true },
      {
        name: 'location',
        label: '利用場所',
        type: 'text',
        placeholder: '例：東京本社、在宅勤務',
        required: true,
      },
      {
        name: 'purpose',
        label: '利用目的',
        type: 'textarea',
        placeholder: 'PCを利用する業務や理由を入力してください',
        required: true,
        fullWidth: true,
      },
    ],
  },
  memory: {
    title: '外部記憶装置貸出',
    formTitle: '外部記憶装置貸出申請',
    description: 'USBメモリや外付けストレージの貸出申請',
    lead: '貸し出す外部記憶装置と利用情報を入力してください。',
    category: '貸出',
    tone: 'teal',
    icon: Usb,
    fields: [
      {
        name: 'applicantName',
        label: '利用者氏名',
        type: 'text',
        placeholder: '例：山田 太郎',
        hint: '実際に機器を利用する方の氏名',
        required: true,
      },
      {
        name: 'deviceName',
        label: '機器名',
        type: 'text',
        placeholder: '例：USBメモリ、外付けSSD',
        required: true,
      },
      {
        name: 'capacity',
        label: '容量',
        type: 'text',
        placeholder: '例：64GB、1TB',
        required: true,
      },
      {
        name: 'location',
        label: '場所',
        type: 'text',
        placeholder: '例：東京本社、第2会議室',
        required: true,
      },
      { name: 'loanDate', label: '貸出希望日', type: 'date', required: true },
      {
        name: 'purpose',
        label: '利用目的',
        type: 'textarea',
        placeholder: '外部記憶装置を利用する業務や理由を入力してください',
        required: true,
        fullWidth: true,
      },
    ],
  },
  lan: {
    title: 'LAN機器貸出',
    formTitle: 'LAN機器貸出申請',
    description: 'ケーブル・変換アダプターなど',
    lead: '必要なLAN機器と利用期間、利用場所を入力してください。',
    category: '貸出',
    tone: 'amber',
    icon: Network,
    fields: [
      {
        name: 'deviceType',
        label: '機器種別',
        type: 'select',
        options: ['LANケーブル', 'USB-LANアダプター', 'モバイルルーター', 'その他'],
        required: true,
      },
      {
        name: 'deviceName',
        label: '機器名',
        type: 'text',
        placeholder: '例：USB-C LANアダプター、CAT6 LANケーブル',
        required: true,
      },
      {
        name: 'quantity',
        label: '必要個数',
        type: 'number',
        min: '1',
        placeholder: '1',
        required: true,
      },
      { name: 'startDate', label: '利用開始希望日', type: 'date', required: true },
      { name: 'returnDate', label: '返却予定日', type: 'date', required: true },
      {
        name: 'location',
        label: '利用場所',
        type: 'text',
        placeholder: '例：第2会議室、展示会場',
        required: true,
        fullWidth: true,
      },
      {
        name: 'purpose',
        label: '利用目的',
        type: 'textarea',
        placeholder: '利用する業務と接続予定の機器を入力してください',
        required: true,
        fullWidth: true,
      },
      {
        name: 'notes',
        label: 'ケーブル長・備考',
        type: 'textarea',
        placeholder: '例：5m以上を希望',
        fullWidth: true,
      },
    ],
  },
  phone: {
    title: 'スマートフォン購入',
    formTitle: 'スマートフォン購入申請',
    description: '業務用端末・回線の購入申請',
    lead: '希望する端末や回線の条件、業務上の利用目的を入力してください。',
    category: '購入',
    tone: 'coral',
    icon: Smartphone,
    fields: [
      {
        name: 'os',
        label: 'OS',
        type: 'select',
        options: ['iOS', 'Android', '指定なし'],
        required: true,
      },
      {
        name: 'lineType',
        label: '回線区分',
        type: 'select',
        options: ['新規契約', '機種変更', '端末のみ購入'],
        required: true,
      },
      {
        name: 'model',
        label: '機種',
        type: 'text',
        placeholder: '例：iPhone 16、指定なし',
        required: true,
      },
      {
        name: 'quantity',
        label: '台数',
        type: 'number',
        min: '1',
        placeholder: '1',
        required: true,
      },
      { name: 'deliveryDate', label: '希望購入日', type: 'date', required: true },
      {
        name: 'storage',
        label: '容量',
        type: 'select',
        options: ['64GB', '128GB', '256GB', '512GB', '指定なし'],
        required: true,
      },
      {
        name: 'simRequired',
        label: 'SIMの有無',
        type: 'select',
        options: ['あり', 'なし'],
        required: true,
      },
      {
        name: 'purpose',
        label: '利用目的',
        type: 'textarea',
        placeholder: '利用者・担当業務・購入が必要な理由を入力してください',
        required: true,
        fullWidth: true,
      },
      {
        name: 'notes',
        label: '希望キャリア・備考',
        type: 'textarea',
        placeholder: 'キャリアやSIMの指定などがあれば入力してください',
        fullWidth: true,
      },
    ],
  },
}

const APPLICANT_FIELDS = [
  {
    name: 'requesterName',
    label: '申請者氏名',
    type: 'text',
    placeholder: '例：山田 太郎',
    hint: 'この申請を行う方の氏名',
    required: true,
  },
  {
    name: 'department',
    label: '所属部署',
    type: 'text',
    placeholder: '例：営業部',
    required: true,
  },
  {
    name: 'employeeNumber',
    label: '社員番号',
    type: 'text',
    placeholder: '例：EMP-0124',
    required: true,
  },
]

const COMMON_API_FIELDS = {
  requesterName: 'requester_name',
  department: 'department',
  employeeNumber: 'employee_number',
}

const REQUEST_API_CONFIG = {
  pc: {
    endpoint: '/api/pc-requests/',
    fields: {
      applicantName: 'applicant_name',
      managementNumber: 'management_number',
      startDate: 'start_date',
      location: 'location',
      purpose: 'purpose',
    },
  },
  memory: {
    endpoint: '/api/external-storage-requests/',
    fields: {
      applicantName: 'applicant_name',
      deviceName: 'device_name',
      capacity: 'capacity',
      location: 'location',
      loanDate: 'loan_date',
      purpose: 'purpose',
    },
  },
  lan: {
    endpoint: '/api/lan-requests/',
    fields: {
      deviceType: 'device_type',
      deviceName: 'device_name',
      quantity: 'quantity',
      startDate: 'start_date',
      returnDate: 'return_date',
      location: 'location',
      purpose: 'purpose',
      notes: 'notes',
    },
  },
  phone: {
    endpoint: '/api/smartphone-requests/',
    fields: {
      os: 'os',
      lineType: 'line_type',
      model: 'model_name',
      quantity: 'quantity',
      deliveryDate: 'purchase_date',
      storage: 'storage',
      simRequired: 'sim_required',
      purpose: 'purpose',
      notes: 'notes',
    },
  },
}

const API_FIELD_LABELS = {
  requester_name: '申請者氏名',
  department: '所属部署',
  employee_number: '社員番号',
  applicant_name: '利用者氏名',
  management_number: '管理番号',
  start_date: '利用開始希望日',
  location: '利用場所',
  purpose: '利用目的',
  device_name: '機器名',
  capacity: '容量',
  loan_date: '貸出希望日',
  device_type: '機器種別',
  quantity: '数量',
  return_date: '返却予定日',
  notes: '備考',
  os: 'OS',
  line_type: '回線区分',
  model_name: '機種',
  purchase_date: '希望購入日',
  storage: '容量',
  sim_required: 'SIMの有無',
  non_field_errors: '入力内容',
}

const FIELD_MAX_LENGTHS = {
  requesterName: 100,
  department: 100,
  employeeNumber: 50,
  applicantName: 100,
  managementNumber: 50,
  location: 200,
  deviceName: 100,
  capacity: 50,
  model: 100,
}

const DRAFT_STORAGE_KEY_PREFIX = 'asset-desk-request-draft-v2'
const REQUEST_TIMEOUT_MS = 15_000

function readCookie(name) {
  const cookiePrefix = `${name}=`
  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(cookiePrefix))

  return cookie ? decodeURIComponent(cookie.slice(cookiePrefix.length)) : ''
}

async function getCsrfToken(signal) {
  let csrfToken = readCookie('csrftoken')

  if (!csrfToken) {
    const response = await fetch('/api/auth/session/', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
    })

    if (!response.ok) {
      throw new Error(`CSRF token request failed: HTTP ${response.status}`)
    }

    csrfToken = readCookie('csrftoken')
  }

  if (!csrfToken) {
    throw new Error('CSRF token was not issued')
  }

  return csrfToken
}

async function readJsonResponse(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function getRequestFields(request) {
  return [...APPLICANT_FIELDS, ...request.fields]
}

function getTodayString() {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 10)
}

function hasDraftValues(values = {}) {
  return Object.values(values).some((value) => String(value ?? '').trim() !== '')
}

function getDraftStorageKey(ownerName) {
  const normalizedOwnerName = String(ownerName ?? '').trim().toLocaleLowerCase('ja-JP')
  return normalizedOwnerName
    ? `${DRAFT_STORAGE_KEY_PREFIX}:${encodeURIComponent(normalizedOwnerName)}`
    : null
}

function normalizeDraftValues(requestKey, values) {
  const request = REQUEST_TYPES[requestKey]
  if (!request || !values || typeof values !== 'object' || Array.isArray(values)) {
    return null
  }

  const normalizedValues = {}
  for (const field of getRequestFields(request)) {
    const value = values[field.name]
    if (value === undefined || value === null) {
      continue
    }
    if (!['string', 'number', 'boolean'].includes(typeof value)) {
      return null
    }
    normalizedValues[field.name] = String(value)
  }

  return normalizedValues
}

function readRequestDraft(ownerName) {
  const storageKey = getDraftStorageKey(ownerName)
  if (!storageKey || typeof window === 'undefined') {
    return null
  }

  try {
    const rawDraft = window.sessionStorage.getItem(storageKey)
    if (!rawDraft) {
      return null
    }

    const parsedDraft = JSON.parse(rawDraft)
    const normalizedValues = normalizeDraftValues(parsedDraft?.requestKey, parsedDraft?.values)
    if (!normalizedValues || !hasDraftValues(normalizedValues)) {
      window.sessionStorage.removeItem(storageKey)
      return null
    }

    const updatedAt = typeof parsedDraft.updatedAt === 'string'
      && !Number.isNaN(Date.parse(parsedDraft.updatedAt))
      ? parsedDraft.updatedAt
      : null

    return {
      requestKey: parsedDraft.requestKey,
      values: normalizedValues,
      updatedAt,
    }
  } catch {
    try {
      window.sessionStorage.removeItem(storageKey)
    } catch {
      // ストレージ自体が利用できない場合は、画面内の状態だけで継続する。
    }
    return null
  }
}

function storeRequestDraft(ownerName, draft) {
  const storageKey = getDraftStorageKey(ownerName)
  if (!storageKey || typeof window === 'undefined') {
    return
  }

  try {
    if (draft && hasDraftValues(draft.values)) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(draft))
    } else {
      window.sessionStorage.removeItem(storageKey)
    }
  } catch {
    // ブラウザでストレージが無効でも、画面内の入力はそのまま利用できる。
  }
}

function formatDateValue(value) {
  const [year, month, day] = String(value).split('-').map(Number)
  if (!year || !month || !day) {
    return value
  }

  return `${year}年${month}月${day}日`
}

function formatDateTime(value) {
  if (!value) {
    return '―'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatFieldValue(field, value) {
  if (value === undefined || value === null || value === '') {
    return '未入力'
  }

  if (field.type === 'date') {
    return formatDateValue(value)
  }

  return String(value)
}

function validateRequestValues(requestKey, request, values) {
  const errors = {}
  const today = getTodayString()

  getRequestFields(request).forEach((field) => {
    const value = values[field.name]
    const normalizedValue = typeof value === 'string' ? value.trim() : value

    if (
      field.required
      && (normalizedValue === '' || normalizedValue === undefined || normalizedValue === null)
    ) {
      errors[field.name] = '入力してください。'
      return
    }

    const maxLength = FIELD_MAX_LENGTHS[field.name]
    if (maxLength && typeof normalizedValue === 'string' && normalizedValue.length > maxLength) {
      errors[field.name] = `${maxLength}文字以内で入力してください。`
    }

    if (field.type === 'number' && normalizedValue !== '' && normalizedValue !== undefined) {
      const numericValue = Number(normalizedValue)
      if (
        !Number.isFinite(numericValue)
        || !Number.isInteger(numericValue)
        || numericValue < Number(field.min ?? 0)
      ) {
        errors[field.name] = `${field.min ?? 0}以上の整数で入力してください。`
      }
    }

    if (field.type === 'date' && normalizedValue && normalizedValue < today) {
      errors[field.name] = '本日以降の日付を選択してください。'
    }
  })

  if (
    requestKey === 'lan' &&
    values.startDate &&
    values.returnDate &&
    values.returnDate < values.startDate
  ) {
    errors.returnDate = '利用開始希望日以降を選択してください。'
  }

  return errors
}

function normalizeFormValue(fieldName, value) {
  if (fieldName === 'quantity') {
    return Number(value)
  }

  if (fieldName === 'simRequired') {
    return value === 'あり'
  }

  return typeof value === 'string' ? value.trim() : value
}

function buildRequestPayload(requestKey, formValues) {
  const config = REQUEST_API_CONFIG[requestKey]
  const fields = { ...COMMON_API_FIELDS, ...config.fields }

  return Object.fromEntries(
    Object.entries(fields).map(([formField, apiField]) => [
      apiField,
      normalizeFormValue(formField, formValues[formField]),
    ]),
  )
}

function formatApiErrors(errorBody, statusCode, requestKey) {
  const fieldErrors = {}
  const formErrors = []
  const apiFields = {
    ...COMMON_API_FIELDS,
    ...(REQUEST_API_CONFIG[requestKey]?.fields ?? {}),
  }
  const apiToFormField = Object.fromEntries(
    Object.entries(apiFields).map(([formField, apiField]) => [apiField, formField]),
  )

  if (errorBody && typeof errorBody === 'object' && !Array.isArray(errorBody)) {
    Object.entries(errorBody).forEach(([fieldName, messages]) => {
      const messageList = Array.isArray(messages) ? messages : [messages]
      const message = messageList.map(String).join(' ')
      const formFieldName = apiToFormField[fieldName]

      if (formFieldName) {
        fieldErrors[formFieldName] = message
      } else if (fieldName === 'detail' || fieldName === 'non_field_errors') {
        formErrors.push(message)
      } else {
        const label = API_FIELD_LABELS[fieldName] ?? fieldName
        formErrors.push(`${label}: ${message}`)
      }
    })

    if (Object.keys(fieldErrors).length > 0 || formErrors.length > 0) {
      return { fieldErrors, formErrors }
    }
  }

  return {
    fieldErrors,
    formErrors: [
      `サーバーで申請を受け付けられませんでした（HTTP ${statusCode}）。入力内容を保持したまま再試行できます。`,
    ],
  }
}

function FormField({
  field,
  value = '',
  onChange,
  error,
  minimum,
  disabled = false,
}) {
  const fieldId = `field-${field.name}`
  const hintId = field.hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const className = field.fullWidth ? 'form-field form-field--full' : 'form-field'
  const handleChange = (event) => onChange(field.name, event.target.value)

  return (
    <div className={className}>
      <label htmlFor={fieldId}>
        {field.label}
        {field.required && <span className="required-label">必須</span>}
      </label>

      {field.type === 'select' ? (
        <select
          id={fieldId}
          name={field.name}
          required={field.required}
          value={value}
          onChange={handleChange}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          disabled={disabled}
        >
          <option value="" disabled>
            選択してください
          </option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          id={fieldId}
          name={field.name}
          placeholder={field.placeholder}
          required={field.required}
          value={value}
          onChange={handleChange}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          rows="4"
          disabled={disabled}
        />
      ) : (
        <input
          id={fieldId}
          name={field.name}
          type={field.type}
          min={minimum ?? field.min}
          step={field.type === 'number' ? '1' : undefined}
          maxLength={FIELD_MAX_LENGTHS[field.name]}
          placeholder={field.placeholder}
          required={field.required}
          value={value}
          onChange={handleChange}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          disabled={disabled}
        />
      )}
      {field.hint && (
        <span className="field-hint" id={hintId}>
          {field.hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={errorId}>
          <CircleAlert size={15} aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  )
}

function SessionLoading() {
  return (
    <main id="main-content" className="login-page">
      <section className="login-card session-loading-card" aria-labelledby="session-loading-title" aria-busy="true">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">
            <PackageCheck size={25} strokeWidth={2.2} />
          </span>
          <div className="brand-copy">
            <strong>Asset Desk</strong>
            <span>社内資産申請ポータル</span>
          </div>
        </div>

        <div className="session-loading" role="status" aria-live="polite">
          <LoaderCircle className="button-spinner" size={28} aria-hidden="true" />
          <div>
            <h1 id="session-loading-title">ログイン状態を確認しています</h1>
            <p>しばらくお待ちください。</p>
          </div>
        </div>
      </section>
    </main>
  )
}

function Login({ onLogin, error, isSubmitting }) {
  return (
    <main id="main-content" className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">
            <PackageCheck size={25} strokeWidth={2.2} />
          </span>
          <div className="brand-copy">
            <strong>Asset Desk</strong>
            <span>社内資産申請ポータル</span>
          </div>
        </div>

        <div className="login-heading">
          <span className="section-kicker">WELCOME BACK</span>
          <h1 id="login-title">ログイン</h1>
          <p>ログイン名とパスワードを入力してください。</p>
        </div>

        <form className="login-form" onSubmit={onLogin} aria-busy={isSubmitting}>
          {error && (
            <div id="login-error" className="form-alert login-alert" role="alert">
              <CircleAlert size={20} aria-hidden="true" />
              <div>
                <strong>ログインできませんでした</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="login-field">
            <label htmlFor="login-name">ログイン名</label>
            <div className="login-input">
              <UserRound size={18} aria-hidden="true" />
              <input
                id="login-name"
                name="loginName"
                type="text"
                autoComplete="username"
                placeholder="ログイン名を入力"
                required
                autoFocus
                disabled={isSubmitting}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-password">パスワード</label>
            <div className="login-input">
              <KeyRound size={18} aria-hidden="true" />
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="パスワードを入力"
                required
                disabled={isSubmitting}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
          </div>

          <button className="primary-button login-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                確認しています
                <LoaderCircle className="button-spinner" size={18} aria-hidden="true" />
              </>
            ) : (
              <>
                ログイン
                <LogIn size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="login-note">
          <Info size={18} aria-hidden="true" />
          <p>Djangoに登録されているログイン名とパスワードを使用してください。</p>
        </div>
      </section>
    </main>
  )
}

function AppHeader({ onHome, onLogout, userName, navigationDisabled, isLoggingOut }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <button
          className="brand"
          type="button"
          onClick={onHome}
          aria-label="申請ホームへ戻る"
          disabled={navigationDisabled}
        >
          <span className="brand-mark" aria-hidden="true">
            <PackageCheck size={22} strokeWidth={2.2} />
          </span>
          <span className="brand-copy">
            <strong>Asset Desk</strong>
            <span>社内資産申請</span>
          </span>
        </button>

        <div className="header-account">
          <div className="user-profile" aria-label={`ログインユーザー: ${userName}`}>
            <span className="user-avatar" aria-hidden="true">{userName.charAt(0).toUpperCase()}</span>
            <span className="user-copy">
              <strong>{userName}</strong>
              <span>ログイン中</span>
            </span>
          </div>
          <button
            className="secondary-button header-logout-button"
            type="button"
            onClick={onLogout}
            disabled={navigationDisabled || isLoggingOut}
            aria-label={isLoggingOut ? 'ログアウトしています' : 'ログアウト'}
          >
            {isLoggingOut ? (
              <LoaderCircle className="button-spinner" size={17} aria-hidden="true" />
            ) : (
              <LogOut size={17} aria-hidden="true" />
            )}
            <span>{isLoggingOut ? '処理中' : 'ログアウト'}</span>
          </button>
        </div>
      </div>
    </header>
  )
}

function Stepper({ currentStep }) {
  const steps = ['項目選択', '詳細入力', '内容確認', '受付完了']

  return (
    <ol className="stepper" aria-label="申請の進行状況">
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isComplete = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep
        return (
          <li
            key={step}
            className={`${isComplete ? 'is-complete' : ''} ${isCurrent ? 'is-current' : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="step-number" aria-hidden="true">
              {isComplete ? <CircleCheck size={18} /> : stepNumber}
            </span>
            <span>{step}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Home({ onSelect, userName, draft, onResumeDraft, onDiscardDraft }) {
  const headingRef = useRef(null)
  const draftRequest = draft ? REQUEST_TYPES[draft.requestKey] : null
  const draftFields = draftRequest ? getRequestFields(draftRequest) : []
  const requiredDraftFields = draftFields.filter((field) => field.required)
  const completedDraftFields = requiredDraftFields.filter(
    (field) => String(draft.values[field.name] ?? '').trim() !== '',
  ).length

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <main id="main-content" className="page-container home-page">
      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <span className="eyebrow">EQUIPMENT REQUEST</span>
          <h1 id="welcome-title" ref={headingRef} tabIndex="-1">お疲れさまです、{userName}さん</h1>
          <p>必要な機器・サービスを選択して、申請を始めましょう。</p>
        </div>
        <div className="welcome-status">
          <CalendarDays size={19} aria-hidden="true" />
          <span>申請は約3分で完了します</span>
        </div>
      </section>

      {draftRequest && hasDraftValues(draft.values) && (
        <section className="draft-panel" aria-labelledby="draft-heading">
          <span className="draft-panel__icon" aria-hidden="true">
            <FilePenLine size={22} />
          </span>
          <div className="draft-panel__content">
            <span className="section-kicker">SAVED DRAFT</span>
            <h2 id="draft-heading">{draftRequest.formTitle}の下書きがあります</h2>
            <p>
              必須項目 {completedDraftFields}/{requiredDraftFields.length}件を入力済み
              {draft.updatedAt ? `・${formatDateTime(draft.updatedAt)}に保存` : ''}
            </p>
          </div>
          <div className="draft-panel__actions">
            <button className="secondary-button" type="button" onClick={onResumeDraft}>
              下書きを再開
            </button>
            <button className="draft-discard-button" type="button" onClick={onDiscardDraft}>
              <Trash2 size={16} aria-hidden="true" />
              破棄
            </button>
          </div>
        </section>
      )}

      <section className="request-section" aria-labelledby="request-heading">
        <div className="section-heading">
          <div>
            <span className="section-kicker">NEW REQUEST</span>
            <h2 id="request-heading">何を申請しますか？</h2>
          </div>
          <p>申請する項目を1つ選択してください</p>
        </div>

        <div className="request-grid">
          {Object.entries(REQUEST_TYPES).map(([key, request]) => {
            const Icon = request.icon
            return (
              <button
                className={`request-card request-card--${request.tone}`}
                type="button"
                key={key}
                onClick={() => onSelect(key)}
                aria-label={`${request.title}の申請を始める`}
              >
                <span className="request-card__top">
                  <span className="request-icon" aria-hidden="true">
                    <Icon size={27} strokeWidth={1.9} />
                  </span>
                  <span className="category-badge">{request.category}</span>
                </span>
                <span className="request-card__body">
                  <strong>{request.title}</strong>
                  <span>{request.description}</span>
                </span>
                <span className="request-card__action" aria-hidden="true">
                  申請を始める
                  <ArrowRight size={18} />
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <aside className="security-note">
        <ShieldCheck size={20} aria-hidden="true" />
        <p>
          <strong>申請前にご確認ください</strong>
          入力内容は承認担当者へ共有されます。機密情報やパスワードは記載しないでください。
        </p>
      </aside>
    </main>
  )
}

function RequestForm({
  request,
  values,
  onFieldChange,
  fieldErrors,
  errorFocusRequest,
  onBack,
  onSubmit,
  submitErrors,
}) {
  const Icon = request.icon
  const headingRef = useRef(null)
  const errorRef = useRef(null)
  const allFields = getRequestFields(request)
  const requiredFields = allFields.filter((field) => field.required)
  const fieldLabels = Object.fromEntries(allFields.map((field) => [field.name, field.label]))
  const errorEntries = Object.entries(fieldErrors)
  const filledRequiredFieldCount = requiredFields.filter(
    (field) => String(values[field.name] ?? '').trim() !== '',
  ).length

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!errorFocusRequest) {
      return
    }

    if (errorFocusRequest.fieldName) {
      document.getElementById(`field-${errorFocusRequest.fieldName}`)?.focus()
    } else {
      errorRef.current?.focus()
    }
  }, [errorFocusRequest])

  const renderField = (field) => {
    const minimum = field.type === 'date'
      ? field.name === 'returnDate'
        ? values.startDate || getTodayString()
        : getTodayString()
      : undefined

    return (
      <FormField
        key={field.name}
        field={field}
        value={values[field.name] ?? ''}
        onChange={onFieldChange}
        error={fieldErrors[field.name]}
        minimum={minimum}
      />
    )
  }

  return (
    <main id="main-content" className="page-container form-page">
      <nav className="breadcrumb" aria-label="パンくずリスト">
        <button type="button" onClick={onBack}>申請ホーム</button>
        <ChevronRight size={15} aria-hidden="true" />
        <span aria-current="page">{request.formTitle}</span>
      </nav>

      <div className="form-page__heading">
        <button className="back-button" type="button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          戻る
        </button>
        <div className="title-with-icon">
          <span className={`request-icon request-icon--${request.tone}`} aria-hidden="true">
            <Icon size={28} strokeWidth={1.9} />
          </span>
          <div>
            <span className="section-kicker">REQUEST FORM</span>
            <h1 ref={headingRef} tabIndex="-1">{request.formTitle}</h1>
            <p>{request.lead}</p>
          </div>
        </div>
      </div>

      <Stepper currentStep={2} />

      <div className="form-layout">
        <form className="request-form" onSubmit={onSubmit} noValidate>
          {(errorEntries.length > 0 || submitErrors.length > 0) && (
            <div
              id="request-submit-error"
              className="form-alert form-alert--top"
              role="alert"
              tabIndex="-1"
              ref={errorRef}
            >
              <CircleAlert size={21} aria-hidden="true" />
              <div>
                <strong>入力内容を確認してください</strong>
                <ul>
                  {errorEntries.map(([fieldName, message]) => (
                    <li key={fieldName}>{fieldLabels[fieldName] ?? fieldName}：{message}</li>
                  ))}
                  {submitErrors.map((errorMessage, index) => (
                    <li key={`${index}-${errorMessage}`}>{errorMessage}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <section className="form-section" aria-labelledby="applicant-heading">
            <div className="form-section__heading">
              <span className="section-number">01</span>
              <div>
                <h2 id="applicant-heading">申請者情報</h2>
                <p><span className="required-dot">*</span> 申請者の情報を入力してください。</p>
              </div>
            </div>
            <div className="applicant-grid">
              {APPLICANT_FIELDS.map(renderField)}
            </div>
          </section>

          <section className="form-section" aria-labelledby="details-heading">
            <div className="form-section__heading">
              <span className="section-number">02</span>
              <div>
                <h2 id="details-heading">申請内容</h2>
                <p><span className="required-dot">*</span> 必須項目を入力してください。</p>
              </div>
            </div>
            <div className="form-grid">
              {request.fields.map(renderField)}
            </div>
          </section>

          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onBack}
            >
              下書き保存して戻る
            </button>
            <button
              className="primary-button"
              type="submit"
              aria-describedby={errorEntries.length > 0 || submitErrors.length > 0 ? 'request-submit-error' : undefined}
            >
              入力内容を確認
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </form>

        <aside className="form-sidebar" aria-label="申請内容の案内">
          <div className="summary-card">
            <span className={`request-icon request-icon--${request.tone}`} aria-hidden="true">
              <Icon size={24} strokeWidth={1.9} />
            </span>
            <span className="summary-label">選択中の申請</span>
            <strong>{request.title}</strong>
            <span className="summary-category">{request.category}申請</span>
            <div
              className="summary-progress"
              role="progressbar"
              aria-label="必須項目の入力進捗"
              aria-valuemin="0"
              aria-valuemax={requiredFields.length}
              aria-valuenow={filledRequiredFieldCount}
            >
              <span>必須項目 {filledRequiredFieldCount}/{requiredFields.length}件を入力済み</span>
              <div className="summary-progress__track" aria-hidden="true">
                <span style={{ width: `${(filledRequiredFieldCount / requiredFields.length) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="help-card">
            <Info size={19} aria-hidden="true" />
            <div>
              <strong>入力時のお願い</strong>
              <p>希望日は余裕をもって設定してください。担当部署が内容を確認後、ご連絡します。</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

function ReviewSection({ number, title, fields, values }) {
  return (
    <section className="review-section" aria-labelledby={`review-section-${number}`}>
      <div className="form-section__heading">
        <span className="section-number">{number}</span>
        <div>
          <h2 id={`review-section-${number}`}>{title}</h2>
          <p>入力内容に誤りがないか確認してください。</p>
        </div>
      </div>
      <dl className="review-grid">
        {fields.map((field) => (
          <div className={field.fullWidth ? 'review-item review-item--full' : 'review-item'} key={field.name}>
            <dt>{field.label}</dt>
            <dd>{formatFieldValue(field, values[field.name])}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function RequestConfirmation({
  request,
  values,
  onBack,
  onSubmit,
  isSubmitting,
  submitErrors,
}) {
  const Icon = request.icon
  const headingRef = useRef(null)
  const errorRef = useRef(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    if (submitErrors.length > 0) {
      errorRef.current?.focus()
    }
  }, [submitErrors])

  return (
    <main id="main-content" className="page-container confirmation-page">
      <nav className="breadcrumb" aria-label="パンくずリスト">
        <button type="button" onClick={onBack} disabled={isSubmitting}>入力画面</button>
        <ChevronRight size={15} aria-hidden="true" />
        <span aria-current="page">内容確認</span>
      </nav>

      <div className="form-page__heading">
        <button className="back-button" type="button" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft size={18} aria-hidden="true" />
          修正する
        </button>
        <div className="title-with-icon">
          <span className={`request-icon request-icon--${request.tone}`} aria-hidden="true">
            <ClipboardCheck size={28} strokeWidth={1.9} />
          </span>
          <div>
            <span className="section-kicker">CONFIRM REQUEST</span>
            <h1 ref={headingRef} tabIndex="-1">入力内容を確認してください</h1>
            <p>{request.formTitle}を送信する前の最終確認です。</p>
          </div>
        </div>
      </div>

      <Stepper currentStep={3} />

      <div className="confirmation-card" aria-busy={isSubmitting}>
        {submitErrors.length > 0 && (
          <div className="form-alert form-alert--confirmation" role="alert" tabIndex="-1" ref={errorRef}>
            <CircleAlert size={21} aria-hidden="true" />
            <div>
              <strong>申請を送信できませんでした</strong>
              <ul>
                {submitErrors.map((errorMessage, index) => (
                  <li key={`${index}-${errorMessage}`}>{errorMessage}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="confirmation-summary">
          <span className={`request-icon request-icon--${request.tone}`} aria-hidden="true">
            <Icon size={25} strokeWidth={1.9} />
          </span>
          <div>
            <span>申請種別</span>
            <strong>{request.formTitle}</strong>
          </div>
          <span className="summary-category">{request.category}申請</span>
        </div>

        <ReviewSection number="01" title="申請者情報" fields={APPLICANT_FIELDS} values={values} />
        <ReviewSection number="02" title="申請内容" fields={request.fields} values={values} />

        <div className="confirmation-note">
          <Info size={18} aria-hidden="true" />
          <p>送信後は担当部署が内容を確認します。修正が必要な場合は「入力画面に戻る」を選択してください。</p>
        </div>

        <div className="confirmation-actions">
          <span className="visually-hidden" role="status" aria-live="polite">
            {isSubmitting ? '申請を送信しています。しばらくお待ちください。' : ''}
          </span>
          <button className="secondary-button" type="button" onClick={onBack} disabled={isSubmitting}>
            入力画面に戻る
          </button>
          <button className="primary-button" type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                送信しています
                <LoaderCircle className="button-spinner" size={18} aria-hidden="true" />
              </>
            ) : (
              <>
                この内容で申請する
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}

function Complete({ request, onHome, submissionResult, submittedValues }) {
  const Icon = request.icon
  const headingRef = useRef(null)
  const referenceNumber = submissionResult?.reference_number
    ?? (submissionResult?.id ? `#${submissionResult.id}` : '受付済み')
  const statusLabels = {
    pending: '申請中',
    approved: '承認',
    rejected: '却下',
  }
  const statusLabel = statusLabels[submissionResult?.status] ?? '申請中'
  const requesterName = submittedValues?.requesterName
    ?? submissionResult?.requester_name
    ?? '―'

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <main id="main-content" className="page-container complete-page">
      <Stepper currentStep={4} />
      <section className="complete-card">
        <span className="complete-icon" aria-hidden="true">
          <CircleCheck size={40} strokeWidth={1.8} />
        </span>
        <span className="section-kicker">REQUEST RECEIVED</span>
        <h1 ref={headingRef} tabIndex="-1">申請内容を受け付けました</h1>
        <p>申請内容は保存されました。担当部署で内容を確認後、申請者へご連絡します。</p>

        <div className="receipt-card">
          <div className="receipt-card__header">
            <span className={`request-icon request-icon--${request.tone}`} aria-hidden="true">
              <Icon size={23} strokeWidth={1.9} />
            </span>
            <div>
              <span>受付番号</span>
              <strong>{referenceNumber}</strong>
            </div>
            <span className="status-badge">{statusLabel}</span>
          </div>

          <dl className="receipt-details">
            <div>
              <dt>申請項目</dt>
              <dd>{request.formTitle}</dd>
            </div>
            <div>
              <dt>申請者</dt>
              <dd>{requesterName}</dd>
            </div>
            <div>
              <dt>受付日時</dt>
              <dd>{formatDateTime(submissionResult?.created_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="complete-next-step">
          <Info size={18} aria-hidden="true" />
          <p>担当部署が内容を確認します。お問い合わせの際は受付番号をお伝えください。</p>
        </div>

        <button className="primary-button" type="button" onClick={onHome}>
          申請メニューへ戻る
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </section>
    </main>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [accountError, setAccountError] = useState('')
  const [userName, setUserName] = useState('')
  const [view, setView] = useState('home')
  const [selectedKey, setSelectedKey] = useState(null)
  const [draft, setDraft] = useState(null)
  const [formValues, setFormValues] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [errorFocusRequest, setErrorFocusRequest] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitErrors, setSubmitErrors] = useState([])
  const [submissionResult, setSubmissionResult] = useState(null)
  const [submittedValues, setSubmittedValues] = useState(null)
  const submittingRef = useRef(false)
  const selectedRequest = selectedKey ? REQUEST_TYPES[selectedKey] : null

  useEffect(() => {
    const abortController = new AbortController()

    const restoreSession = async () => {
      try {
        const response = await fetch('/api/auth/session/', {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: abortController.signal,
        })
        const result = await readJsonResponse(response)

        if (!response.ok || !result || typeof result.authenticated !== 'boolean') {
          throw new Error(`Session request failed: HTTP ${response.status}`)
        }

        if (result.authenticated) {
          if (typeof result.user?.username !== 'string' || !result.user.username.trim()) {
            throw new Error('Authenticated user was not returned')
          }

          const nextUserName = result.user.username.trim()
          setUserName(nextUserName)
          setDraft(readRequestDraft(nextUserName))
          setIsAuthenticated(true)
        } else {
          setUserName('')
          setDraft(null)
          setIsAuthenticated(false)
        }

        setLoginError('')
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('ログイン状態を確認できませんでした', error)
          setIsAuthenticated(false)
          setLoginError('サーバーに接続できませんでした。Djangoが起動しているか確認してください。')
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsCheckingSession(false)
        }
      }
    }

    restoreSession()

    return () => {
      abortController.abort()
    }
  }, [])

  useEffect(() => {
    const pageTitle = isCheckingSession
      ? '確認中 | Asset Desk'
      : !isAuthenticated
      ? 'ログイン | Asset Desk'
      : view === 'form' && selectedRequest
      ? `${selectedRequest.formTitle} | Asset Desk`
      : view === 'confirm' && selectedRequest
        ? `申請内容の確認 | ${selectedRequest.formTitle}`
      : view === 'complete'
        ? '受付完了 | Asset Desk'
        : 'Asset Desk | 社内資産申請'
    document.title = pageTitle
  }, [isAuthenticated, isCheckingSession, selectedRequest, view])

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }

  const resetRequestFlow = () => {
    setView('home')
    setSelectedKey(null)
    setFormValues({})
    setFieldErrors({})
    setErrorFocusRequest(null)
    setSubmitErrors([])
    setSubmissionResult(null)
    setSubmittedValues(null)
  }

  const returnToLogin = (message = '') => {
    setIsAuthenticated(false)
    setUserName('')
    setDraft(null)
    setAccountError('')
    setLoginError(message)
    resetRequestFlow()
    scrollToTop()
  }

  const clearDraft = () => {
    setDraft(null)
    storeRequestDraft(userName, null)
  }

  const queueFormErrorFocus = (errors) => {
    const fieldName = Object.keys(errors)[0]
    setErrorFocusRequest((currentRequest) => ({
      sequence: (currentRequest?.sequence ?? 0) + 1,
      fieldName,
    }))
  }

  const goHome = () => {
    if (submittingRef.current) {
      return
    }

    resetRequestFlow()
    scrollToTop()
  }

  const startRequest = (key) => {
    if (!REQUEST_TYPES[key]) {
      return
    }

    const canResumeDraft = draft?.requestKey === key && hasDraftValues(draft.values)
    if (draft && hasDraftValues(draft.values) && !canResumeDraft) {
      const shouldDiscard = window.confirm(
        `${REQUEST_TYPES[draft.requestKey].formTitle}の下書きがあります。下書きを破棄して新しい申請を始めますか？`,
      )
      if (!shouldDiscard) {
        return
      }
      clearDraft()
    }

    setSelectedKey(key)
    setFormValues(canResumeDraft ? { ...draft.values } : {})
    setFieldErrors({})
    setErrorFocusRequest(null)
    setSubmitErrors([])
    setSubmissionResult(null)
    setSubmittedValues(null)
    setView('form')
    scrollToTop()
  }

  const resumeDraft = () => {
    if (!draft || !REQUEST_TYPES[draft.requestKey] || !hasDraftValues(draft.values)) {
      return
    }

    setSelectedKey(draft.requestKey)
    setFormValues({ ...draft.values })
    setFieldErrors({})
    setErrorFocusRequest(null)
    setSubmitErrors([])
    setSubmissionResult(null)
    setSubmittedValues(null)
    setView('form')
    scrollToTop()
  }

  const discardDraft = () => {
    if (!draft) {
      return
    }

    const shouldDiscard = window.confirm('保存されている下書きを破棄しますか？')
    if (shouldDiscard) {
      clearDraft()
    }
  }

  const handleFieldChange = (fieldName, value) => {
    const nextValues = { ...formValues, [fieldName]: value }
    const nextDraft = selectedKey && hasDraftValues(nextValues)
      ? {
          requestKey: selectedKey,
          values: nextValues,
          updatedAt: new Date().toISOString(),
        }
      : null

    setFormValues(nextValues)
    setDraft(nextDraft)
    storeRequestDraft(userName, nextDraft)
    setSubmitErrors([])
    setFieldErrors((currentErrors) => {
      if (!currentErrors[fieldName]) {
        return currentErrors
      }
      const nextErrors = { ...currentErrors }
      delete nextErrors[fieldName]
      return nextErrors
    })
  }

  const reviewRequest = (event) => {
    event.preventDefault()

    if (!selectedKey || !selectedRequest) {
      return
    }

    const normalizedValues = Object.fromEntries(
      Object.entries(formValues).map(([fieldName, value]) => [
        fieldName,
        typeof value === 'string' ? value.trim() : value,
      ]),
    )
    const validationErrors = validateRequestValues(selectedKey, selectedRequest, normalizedValues)
    const nextDraft = hasDraftValues(normalizedValues)
      ? {
          requestKey: selectedKey,
          values: normalizedValues,
          updatedAt: new Date().toISOString(),
        }
      : null

    setFormValues(normalizedValues)
    setDraft(nextDraft)
    storeRequestDraft(userName, nextDraft)
    setFieldErrors(validationErrors)
    setSubmitErrors([])

    if (Object.keys(validationErrors).length > 0) {
      queueFormErrorFocus(validationErrors)
      return
    }

    setErrorFocusRequest(null)
    setView('confirm')
    scrollToTop()
  }

  const returnToForm = () => {
    if (submittingRef.current) {
      return
    }

    setSubmitErrors([])
    setErrorFocusRequest(null)
    setView('form')
    scrollToTop()
  }

  const submitRequest = async () => {
    if (submittingRef.current || !selectedKey || !selectedRequest) {
      return
    }

    const validationErrors = validateRequestValues(selectedKey, selectedRequest, formValues)
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      queueFormErrorFocus(validationErrors)
      setSubmitErrors([])
      setView('form')
      scrollToTop()
      return
    }

    const apiConfig = REQUEST_API_CONFIG[selectedKey]
    if (!apiConfig) {
      setSubmitErrors(['この申請種別の送信先が見つかりません。'])
      return
    }

    const payload = buildRequestPayload(selectedKey, formValues)
    const abortController = new AbortController()
    const timeoutId = window.setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS)

    submittingRef.current = true
    setIsSubmitting(true)
    setSubmitErrors([])

    try {
      const csrfToken = await getCsrfToken(abortController.signal)
      const response = await fetch(apiConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
        signal: abortController.signal,
      })

      const result = await readJsonResponse(response)

      if (!response.ok && (response.status === 401 || response.status === 403)) {
        try {
          const sessionResponse = await fetch('/api/auth/session/', {
            credentials: 'same-origin',
            cache: 'no-store',
            signal: abortController.signal,
          })
          const sessionResult = await readJsonResponse(sessionResponse)

          if (sessionResponse.ok && sessionResult?.authenticated === false) {
            returnToLogin('ログインの有効期限が切れました。もう一度ログインしてください。')
            return
          }
        } catch (error) {
          if (error?.name === 'AbortError') {
            throw error
          }
          console.error('申請エラー後のログイン状態を確認できませんでした', error)
        }
      }

      if (!response.ok) {
        const apiErrors = formatApiErrors(result, response.status, selectedKey)
        setFieldErrors(apiErrors.fieldErrors)
        setSubmitErrors(apiErrors.formErrors)
        if (Object.keys(apiErrors.fieldErrors).length > 0) {
          queueFormErrorFocus(apiErrors.fieldErrors)
          setView('form')
          scrollToTop()
        }
        return
      }

      const hasValidReceipt = result
        && typeof result === 'object'
        && !Array.isArray(result)
        && typeof result.reference_number === 'string'
        && result.reference_number.trim() !== ''
        && typeof result.status === 'string'
      if (!hasValidReceipt) {
        setSubmitErrors([
          'サーバーから受付結果を確認できませんでした。送信済みの可能性があるため、再送せず担当部署へ受付状況を確認してください。',
        ])
        return
      }

      setSubmissionResult(result)
      setSubmittedValues({ ...formValues })
      clearDraft()
      setView('complete')
      scrollToTop()
    } catch (error) {
      console.error('申請APIとの通信に失敗しました', error)
      setSubmitErrors([
        error?.name === 'AbortError'
          ? '15秒以内にサーバーから応答がありませんでした。入力内容は保持されています。再送前に担当部署へ受付状況を確認してください。'
          : 'サーバーに接続できませんでした。入力内容は保持されています。再送前に担当部署へ受付状況を確認してください。',
      ])
    } finally {
      window.clearTimeout(timeoutId)
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const login = async (event) => {
    event.preventDefault()
    if (isLoggingIn) {
      return
    }

    const formData = new FormData(event.currentTarget)
    const nextUserName = String(formData.get('loginName')).trim()
    const password = String(formData.get('password'))
    const abortController = new AbortController()
    const timeoutId = window.setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS)

    setIsLoggingIn(true)
    setLoginError('')

    try {
      const csrfToken = await getCsrfToken(abortController.signal)
      const response = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: nextUserName,
          password,
        }),
        signal: abortController.signal,
      })
      const result = await readJsonResponse(response)

      if (!response.ok) {
        const message = typeof result?.detail === 'string'
          ? result.detail
          : response.status === 403
            ? '安全確認に失敗しました。ページを再読み込みして、もう一度お試しください。'
            : `ログインできませんでした（HTTP ${response.status}）。`
        setLoginError(message)
        return
      }

      if (result?.authenticated !== true || typeof result.user?.username !== 'string') {
        throw new Error('Login response was invalid')
      }

      const authenticatedUserName = result.user.username.trim()
      if (!authenticatedUserName) {
        throw new Error('Login response did not include a username')
      }

      resetRequestFlow()
      setUserName(authenticatedUserName)
      setDraft(readRequestDraft(authenticatedUserName))
      setIsAuthenticated(true)
      setAccountError('')
      scrollToTop()
    } catch (error) {
      console.error('ログインAPIとの通信に失敗しました', error)
      setLoginError(
        error?.name === 'AbortError'
          ? 'ログイン処理がタイムアウトしました。もう一度お試しください。'
          : 'サーバーに接続できませんでした。Djangoが起動しているか確認してください。',
      )
    } finally {
      window.clearTimeout(timeoutId)
      setIsLoggingIn(false)
    }
  }

  const logout = async () => {
    if (isLoggingOut || submittingRef.current) {
      return
    }

    const abortController = new AbortController()
    const timeoutId = window.setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS)

    setIsLoggingOut(true)
    setAccountError('')

    try {
      const csrfToken = await getCsrfToken(abortController.signal)
      const response = await fetch('/api/auth/logout/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        credentials: 'same-origin',
        signal: abortController.signal,
      })
      const result = await readJsonResponse(response)

      if (!response.ok || result?.authenticated !== false) {
        throw new Error(`Logout request failed: HTTP ${response.status}`)
      }

      returnToLogin()
    } catch (error) {
      console.error('ログアウトAPIとの通信に失敗しました', error)
      setAccountError(
        error?.name === 'AbortError'
          ? 'ログアウト処理がタイムアウトしました。もう一度お試しください。'
          : 'ログアウトできませんでした。通信状態を確認して、もう一度お試しください。',
      )
    } finally {
      window.clearTimeout(timeoutId)
      setIsLoggingOut(false)
    }
  }

  if (isCheckingSession) {
    return (
      <div className="app-shell login-shell">
        <a className="skip-link" href="#main-content">本文へスキップ</a>
        <SessionLoading />
        <footer className="app-footer login-footer">
          <span>Asset Desk</span>
          <span>社内資産申請ポータル</span>
        </footer>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell login-shell">
        <a className="skip-link" href="#main-content">本文へスキップ</a>
        <Login onLogin={login} error={loginError} isSubmitting={isLoggingIn} />
        <footer className="app-footer login-footer">
          <span>Asset Desk</span>
          <span>社内資産申請ポータル</span>
        </footer>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">本文へスキップ</a>
      <AppHeader
        onHome={goHome}
        onLogout={logout}
        userName={userName}
        navigationDisabled={isSubmitting || isLoggingOut}
        isLoggingOut={isLoggingOut}
      />
      {accountError && (
        <div className="page-container form-alert account-alert" role="alert">
          <CircleAlert size={20} aria-hidden="true" />
          <div>
            <strong>アカウント操作を完了できませんでした</strong>
            <p>{accountError}</p>
          </div>
        </div>
      )}
      {view === 'home' && (
        <Home
          onSelect={startRequest}
          userName={userName}
          draft={draft}
          onResumeDraft={resumeDraft}
          onDiscardDraft={discardDraft}
        />
      )}
      {view === 'form' && selectedRequest && (
        <RequestForm
          request={selectedRequest}
          values={formValues}
          onFieldChange={handleFieldChange}
          fieldErrors={fieldErrors}
          errorFocusRequest={errorFocusRequest}
          onBack={goHome}
          onSubmit={reviewRequest}
          submitErrors={submitErrors}
        />
      )}
      {view === 'confirm' && selectedRequest && (
        <RequestConfirmation
          request={selectedRequest}
          values={formValues}
          onBack={returnToForm}
          onSubmit={submitRequest}
          isSubmitting={isSubmitting}
          submitErrors={submitErrors}
        />
      )}
      {view === 'complete' && selectedRequest && (
        <Complete
          request={selectedRequest}
          onHome={goHome}
          submissionResult={submissionResult}
          submittedValues={submittedValues}
        />
      )}
      <footer className="app-footer">
        <span>Asset Desk</span>
        <span>社内資産申請ポータル</span>
      </footer>
    </div>
  )
}

export default App
