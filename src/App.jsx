import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Info,
  KeyRound,
  Laptop,
  LogIn,
  Network,
  PackageCheck,
  ShieldCheck,
  Smartphone,
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
        label: '氏名',
        type: 'text',
        placeholder: '例：山田 太郎',
        required: true,
      },
      {
        name: 'managementNumber',
        label: '管理番号',
        type: 'text',
        placeholder: '例：PC-01234',
        required: true,
      },
      { name: 'startDate', label: '利用開始日', type: 'date', required: true },
      {
        name: 'location',
        label: '利用場所',
        type: 'text',
        placeholder: '例：東京本社、在宅勤務',
        required: true,
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
        label: '氏名',
        type: 'text',
        placeholder: '例：山田 太郎',
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
      { name: 'loanDate', label: '貸し出し日', type: 'date', required: true },
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
      { name: 'startDate', label: '利用開始日', type: 'date', required: true },
      { name: 'returnDate', label: '返却予定日', type: 'date', required: true },
      {
        name: 'location',
        label: '利用場所',
        type: 'text',
        placeholder: '例：第2会議室、展示会場',
        required: true,
        fullWidth: true,
      },
    ],
  },
  phone: {
    title: 'スマートフォン購入',
    formTitle: 'スマートフォン購入申請',
    description: '業務用端末・回線の購入申請',
    lead: '購入する端末の機種、購入日、容量、SIMの有無を入力してください。',
    category: '購入',
    tone: 'coral',
    icon: Smartphone,
    fields: [
      {
        name: 'model',
        label: '機種',
        type: 'text',
        placeholder: '例：iPhone 16、指定なし',
        required: true,
      },
      { name: 'deliveryDate', label: '購入日', type: 'date', required: true },
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
    ],
  },
}

const APPLICANT_FIELDS = [
  {
    name: 'requesterName',
    label: '氏名',
    type: 'text',
    placeholder: '例：山田 太郎',
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

const DRAFT_STORAGE_KEY_PREFIX = 'asset-desk-request-draft-v1'

function getDraftStorageKey(userName) {
  return `${DRAFT_STORAGE_KEY_PREFIX}:${userName}`
}

function loadDraft(userName) {
  try {
    const savedDraft = window.sessionStorage.getItem(getDraftStorageKey(userName))
    if (!savedDraft) return null

    const draft = JSON.parse(savedDraft)
    if (!REQUEST_TYPES[draft?.requestKey] || !draft.values || typeof draft.values !== 'object') {
      window.sessionStorage.removeItem(getDraftStorageKey(userName))
      return null
    }
    return draft
  } catch {
    window.sessionStorage.removeItem(getDraftStorageKey(userName))
    return null
  }
}

function storeDraft(userName, draft) {
  const storageKey = getDraftStorageKey(userName)
  if (draft) {
    window.sessionStorage.setItem(storageKey, JSON.stringify(draft))
  } else {
    window.sessionStorage.removeItem(storageKey)
  }
}

function getCookie(name) {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${name}=`))

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : ''
}

async function getCsrfToken() {
  const existingToken = getCookie('csrftoken')
  if (existingToken) return existingToken

  const response = await fetch('/api/csrf/', {
    credentials: 'same-origin',
  })
  if (!response.ok) {
    throw new Error('セキュリティ情報を取得できませんでした。')
  }

  const token = getCookie('csrftoken')
  if (!token) {
    throw new Error('セキュリティ情報が見つかりませんでした。')
  }
  return token
}

function getSubmissionError(responseData) {
  if (responseData?.fields) {
    return Object.values(responseData.fields).flat().join(' ')
  }
  return responseData?.error || '申請を保存できませんでした。'
}

function FormField({ field, value = '', onChange }) {
  const fieldId = `field-${field.name}`
  const className = field.fullWidth ? 'form-field form-field--full' : 'form-field'

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
          onChange={(event) => onChange(field.name, event.target.value)}
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
          rows="4"
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      ) : (
        <input
          id={fieldId}
          name={field.name}
          type={field.type}
          min={field.min}
          placeholder={field.placeholder}
          required={field.required}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      )}
    </div>
  )
}

function Login({ onLogin }) {
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

        <form className="login-form" onSubmit={onLogin}>
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
              />
            </div>
          </div>

          <button className="primary-button login-button" type="submit">
            ログイン
            <LogIn size={18} aria-hidden="true" />
          </button>
        </form>

        <div className="login-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <p>認証情報は安全に取り扱い、他の人と共有しないでください。</p>
        </div>
      </section>
    </main>
  )
}

function AppHeader({ onHome, userName }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <button className="brand" type="button" onClick={onHome} aria-label="申請ホームへ戻る">
          <span className="brand-mark" aria-hidden="true">
            <PackageCheck size={22} strokeWidth={2.2} />
          </span>
          <span className="brand-copy">
            <strong>Asset Desk</strong>
            <span>社内資産申請</span>
          </span>
        </button>

        <div className="user-profile" aria-label="ログインユーザー">
          <span className="user-avatar" aria-hidden="true">{userName.charAt(0).toUpperCase()}</span>
          <span className="user-copy">
            <strong>{userName}</strong>
            <span>ログイン中</span>
          </span>
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
  const draftRequest = draft ? REQUEST_TYPES[draft.requestKey] : null

  return (
    <main id="main-content" className="page-container home-page">
      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <span className="eyebrow">EQUIPMENT REQUEST</span>
          <h1 id="welcome-title">お疲れさまです、{userName}さん</h1>
          <p>必要な機器・サービスを選択して、申請を始めましょう。</p>
        </div>
        <div className="welcome-status">
          <CalendarDays size={19} aria-hidden="true" />
          <span>申請は約3分で完了します</span>
        </div>
      </section>

      {draftRequest && (
        <section className="draft-panel" aria-labelledby="draft-heading">
          <div>
            <span className="section-kicker">SAVED DRAFT</span>
            <h2 id="draft-heading">入力途中の申請があります</h2>
            <p>{draftRequest.formTitle}の下書きを、このブラウザで一時保存しています。</p>
          </div>
          <div className="draft-panel__actions">
            <button className="secondary-button" type="button" onClick={onDiscardDraft}>
              下書きを破棄
            </button>
            <button className="primary-button" type="button" onClick={onResumeDraft}>
              入力を再開
              <ArrowRight size={18} aria-hidden="true" />
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

function RequestForm({ request, onBack, onSubmit, formValues, onFieldChange }) {
  const Icon = request.icon

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
            <h1>{request.formTitle}</h1>
            <p>{request.lead}</p>
          </div>
        </div>
      </div>

      <Stepper currentStep={2} />

      <div className="form-layout">
        <form className="request-form" onSubmit={onSubmit}>
          <section className="form-section" aria-labelledby="applicant-heading">
            <div className="form-section__heading">
              <span className="section-number">01</span>
              <div>
                <h2 id="applicant-heading">申請者情報</h2>
                <p><span className="required-dot">*</span> 申請者の情報を入力してください。</p>
              </div>
            </div>
            <div className="applicant-grid">
              {APPLICANT_FIELDS.map((field) => (
                <FormField
                  key={field.name}
                  field={field}
                  value={formValues[field.name] ?? ''}
                  onChange={onFieldChange}
                />
              ))}
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
              {request.fields.map((field) => (
                <FormField
                  key={field.name}
                  field={field}
                  value={formValues[field.name] ?? ''}
                  onChange={onFieldChange}
                />
              ))}
            </div>
          </section>

          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onBack}
            >
              ホームへ戻る
            </button>
            <button className="primary-button" type="submit">
              入力内容を確認する
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

function Confirmation({ request, formValues, onBack, onSubmit, isSubmitting, submitError }) {
  const Icon = request.icon
  const sections = [
    { title: '申請者情報', fields: APPLICANT_FIELDS },
    { title: '申請内容', fields: request.fields },
  ]

  return (
    <main id="main-content" className="page-container form-page confirmation-page">
      <nav className="breadcrumb" aria-label="パンくずリスト">
        <span>申請ホーム</span>
        <ChevronRight size={15} aria-hidden="true" />
        <span>{request.formTitle}</span>
        <ChevronRight size={15} aria-hidden="true" />
        <span aria-current="page">内容確認</span>
      </nav>

      <div className="form-page__heading">
        <button className="back-button" type="button" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft size={18} aria-hidden="true" />
          入力画面へ戻る
        </button>
        <div className="title-with-icon">
          <span className={`request-icon request-icon--${request.tone}`} aria-hidden="true">
            <Icon size={28} strokeWidth={1.9} />
          </span>
          <div>
            <span className="section-kicker">CONFIRM REQUEST</span>
            <h1>申請内容の確認</h1>
            <p>内容に間違いがなければ、申請を送信してください。</p>
          </div>
        </div>
      </div>

      <Stepper currentStep={3} />

      <section className="confirmation-card">
        <div className="confirmation-request">
          <span className={`request-icon request-icon--${request.tone}`} aria-hidden="true">
            <Icon size={23} strokeWidth={1.9} />
          </span>
          <div><span>申請種別</span><strong>{request.formTitle}</strong></div>
        </div>

        {sections.map((section) => (
          <section className="confirmation-section" key={section.title}>
            <h2>{section.title}</h2>
            <dl className="confirmation-list">
              {section.fields.map((field) => (
                <div key={field.name}>
                  <dt>{field.label}</dt>
                  <dd>{formValues[field.name] || '—'}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        {submitError && (
          <div className="submit-error confirmation-error" role="alert">
            <Info size={18} aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onBack} disabled={isSubmitting}>
            入力内容を修正する
          </button>
          <button className="primary-button" type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : 'この内容で申請する'}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  )
}

function Complete({ request, onHome, submissionId, ledgerWarning }) {
  const Icon = request.icon

  return (
    <main id="main-content" className="page-container complete-page" aria-live="polite">
      <Stepper currentStep={4} />
      <section className="complete-card">
        <span className="complete-icon" aria-hidden="true">
          <CircleCheck size={40} strokeWidth={1.8} />
        </span>
        <span className="section-kicker">REQUEST RECEIVED</span>
        <h1>申請内容を受け付けました</h1>
        <p>入力データを保存しました。担当部署で内容を確認後、ご連絡します。</p>

        {ledgerWarning && (
          <div className="submit-error complete-warning" role="alert">
            <Info size={18} aria-hidden="true" />
            <span>{ledgerWarning} 管理者に再同期を依頼してください。</span>
          </div>
        )}

        <div className="complete-summary">
          <span className={`request-icon request-icon--${request.tone}`} aria-hidden="true">
            <Icon size={23} strokeWidth={1.9} />
          </span>
          <div>
            <span>申請項目</span>
            <strong>{request.formTitle}</strong>
          </div>
          <span className="demo-badge">受付番号 #{submissionId}</span>
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
  const [userName, setUserName] = useState('')
  const [view, setView] = useState('home')
  const [selectedKey, setSelectedKey] = useState(null)
  const [draft, setDraft] = useState(null)
  const [formValues, setFormValues] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submissionId, setSubmissionId] = useState(null)
  const [ledgerWarning, setLedgerWarning] = useState('')
  const selectedRequest = selectedKey ? REQUEST_TYPES[selectedKey] : null

  useEffect(() => {
    const pageTitle = !isAuthenticated
      ? 'ログイン | Asset Desk'
      : view === 'form' && selectedRequest
      ? `${selectedRequest.formTitle} | Asset Desk`
      : view === 'confirm' && selectedRequest
        ? `申請内容の確認 | ${selectedRequest.formTitle}`
      : view === 'complete'
        ? '受付完了 | Asset Desk'
        : 'Asset Desk | 社内資産申請'
    document.title = pageTitle
  }, [isAuthenticated, selectedRequest, view])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const clearDraft = () => {
    setDraft(null)
    storeDraft(userName, null)
  }

  const goHome = () => {
    setView('home')
    setSelectedKey(null)
    setFormValues({})
    setSubmitError('')
    setSubmissionId(null)
    setLedgerWarning('')
    scrollToTop()
  }

  const startRequest = (key) => {
    if (!REQUEST_TYPES[key]) return

    const canResume = draft?.requestKey === key
    if (draft && !canResume) {
      const shouldDiscard = window.confirm(
        `${REQUEST_TYPES[draft.requestKey].formTitle}の下書きがあります。破棄して新しい申請を始めますか？`,
      )
      if (!shouldDiscard) return
      clearDraft()
    }

    setSelectedKey(key)
    setFormValues(canResume ? { ...draft.values } : {})
    setView('form')
    setSubmitError('')
    setSubmissionId(null)
    setLedgerWarning('')
    scrollToTop()
  }

  const resumeDraft = () => {
    if (!draft || !REQUEST_TYPES[draft.requestKey]) return

    setSelectedKey(draft.requestKey)
    setFormValues({ ...draft.values })
    setSubmitError('')
    setSubmissionId(null)
    setView('form')
    scrollToTop()
  }

  const discardDraft = () => {
    if (window.confirm('保存されている下書きを破棄しますか？')) {
      clearDraft()
    }
  }

  const handleFieldChange = (fieldName, value) => {
    const nextValues = { ...formValues, [fieldName]: value }
    const hasValues = Object.values(nextValues).some(
      (fieldValue) => String(fieldValue).trim() !== '',
    )
    const nextDraft = hasValues
      ? { requestKey: selectedKey, values: nextValues, updatedAt: new Date().toISOString() }
      : null

    setFormValues(nextValues)
    setDraft(nextDraft)
    storeDraft(userName, nextDraft)
    setSubmitError('')
  }

  const reviewRequest = (event) => {
    event.preventDefault()
    setSubmitError('')
    setView('confirm')
    scrollToTop()
  }

  const returnToForm = () => {
    if (isSubmitting) return

    setSubmitError('')
    setView('form')
    scrollToTop()
  }

  const submitRequest = async () => {
    setIsSubmitting(true)
    setSubmitError('')

    try {
      const csrfToken = await getCsrfToken()
      const response = await fetch('/api/applications/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          requestType: selectedKey,
          ...formValues,
        }),
      })
      const responseData = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(getSubmissionError(responseData))
      }

      setSubmissionId(responseData.id)
      setLedgerWarning(responseData.ledgerWarning || '')
      clearDraft()
      setView('complete')
      scrollToTop()
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : '申請を保存できませんでした。'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const login = (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextUserName = String(formData.get('loginName')).trim()
    setUserName(nextUserName)
    setDraft(loadDraft(nextUserName))
    setIsAuthenticated(true)
    scrollToTop()
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell login-shell">
        <a className="skip-link" href="#main-content">本文へスキップ</a>
        <Login onLogin={login} />
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
      <AppHeader onHome={goHome} userName={userName} />
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
          onBack={goHome}
          onSubmit={reviewRequest}
          formValues={formValues}
          onFieldChange={handleFieldChange}
        />
      )}
      {view === 'confirm' && selectedRequest && (
        <Confirmation
          request={selectedRequest}
          formValues={formValues}
          onBack={returnToForm}
          onSubmit={submitRequest}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      )}
      {view === 'complete' && selectedRequest && (
        <Complete
          request={selectedRequest}
          onHome={goHome}
          submissionId={submissionId}
          ledgerWarning={ledgerWarning}
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
