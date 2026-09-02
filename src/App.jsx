import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Info,
  Laptop,
  Network,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Usb,
} from 'lucide-react'
import './App.css'

const REQUEST_TYPES = {
  pc: {
    title: 'PC貸出',
    formTitle: 'PC貸出申請',
    description: '業務用ノート・デスクトップPC',
    lead: '利用期間と、業務に必要なPCの仕様を入力してください。',
    category: '貸出',
    tone: 'blue',
    icon: Laptop,
    fields: [
      {
        name: 'pcType',
        label: 'PC種別',
        type: 'select',
        options: ['ノートPC', 'デスクトップPC', 'どちらでも可'],
        required: true,
      },
      {
        name: 'os',
        label: '希望OS',
        type: 'select',
        options: ['Windows', 'macOS', '指定なし'],
        required: true,
      },
      { name: 'startDate', label: '利用開始日', type: 'date', required: true },
      { name: 'returnDate', label: '返却予定日', type: 'date', required: true },
      {
        name: 'location',
        label: '主な利用場所',
        type: 'text',
        placeholder: '例：東京本社、在宅勤務',
        required: true,
        fullWidth: true,
      },
      {
        name: 'purpose',
        label: '利用目的',
        type: 'textarea',
        placeholder: '担当業務や必要なソフトウェアなどを入力してください',
        required: true,
        fullWidth: true,
      },
      {
        name: 'notes',
        label: '必要な付属品・備考',
        type: 'textarea',
        placeholder: '例：マウス、ACアダプター、外部モニター',
        fullWidth: true,
      },
    ],
  },
  memory: {
    title: 'USBメモリ貸出',
    formTitle: 'USBメモリ貸出申請',
    description: '暗号化対応の業務用USBメモリ',
    lead: '必要な容量と利用期間、取り扱うデータについて入力してください。',
    category: '貸出',
    tone: 'teal',
    icon: Usb,
    fields: [
      {
        name: 'capacity',
        label: '希望容量',
        type: 'select',
        options: ['16GB', '32GB', '64GB', '128GB', '指定なし'],
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
      { name: 'startDate', label: '利用開始日', type: 'date', required: true },
      { name: 'returnDate', label: '返却予定日', type: 'date', required: true },
      {
        name: 'dataType',
        label: '保存するデータの種類',
        type: 'select',
        options: ['社内資料', '顧客提出用データ', 'イベント・会議資料', 'その他'],
        required: true,
        fullWidth: true,
      },
      {
        name: 'purpose',
        label: '利用目的',
        type: 'textarea',
        placeholder: '利用する業務と理由を入力してください',
        required: true,
        fullWidth: true,
      },
      {
        name: 'notes',
        label: '備考',
        type: 'textarea',
        placeholder: '補足事項があれば入力してください',
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

function FormField({ field }) {
  const fieldId = `field-${field.name}`
  const className = field.fullWidth ? 'form-field form-field--full' : 'form-field'

  return (
    <div className={className}>
      <label htmlFor={fieldId}>
        {field.label}
        {field.required && <span className="required-label">必須</span>}
      </label>

      {field.type === 'select' ? (
        <select id={fieldId} name={field.name} required={field.required} defaultValue="">
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
        />
      ) : (
        <input
          id={fieldId}
          name={field.name}
          type={field.type}
          min={field.min}
          placeholder={field.placeholder}
          required={field.required}
        />
      )}
    </div>
  )
}

function AppHeader({ onHome }) {
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
          <span className="user-avatar" aria-hidden="true">山</span>
          <span className="user-copy">
            <strong>山田 太郎</strong>
            <span>営業部</span>
          </span>
        </div>
      </div>
    </header>
  )
}

function Stepper({ currentStep }) {
  const steps = ['項目選択', '詳細入力', '受付完了']

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

function Home({ onSelect }) {
  return (
    <main id="main-content" className="page-container home-page">
      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <span className="eyebrow">EQUIPMENT REQUEST</span>
          <h1 id="welcome-title">お疲れさまです、山田さん</h1>
          <p>必要な機器・サービスを選択して、申請を始めましょう。</p>
        </div>
        <div className="welcome-status">
          <CalendarDays size={19} aria-hidden="true" />
          <span>申請は約3分で完了します</span>
        </div>
      </section>

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

function RequestForm({ request, onBack, onSubmit }) {
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
                <p>ログイン情報から自動で入力されています。</p>
              </div>
            </div>
            <div className="applicant-grid">
              <div>
                <span>申請者</span>
                <strong>山田 太郎</strong>
              </div>
              <div>
                <span>所属部署</span>
                <strong>営業部</strong>
              </div>
              <div>
                <span>社員番号</span>
                <strong>EMP-0124</strong>
              </div>
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
                <FormField key={field.name} field={field} />
              ))}
            </div>
          </section>

          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={onBack}>キャンセル</button>
            <button className="primary-button" type="submit">
              この内容で申請する
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

function Complete({ request, onHome }) {
  const Icon = request.icon

  return (
    <main id="main-content" className="page-container complete-page" aria-live="polite">
      <Stepper currentStep={3} />
      <section className="complete-card">
        <span className="complete-icon" aria-hidden="true">
          <CircleCheck size={40} strokeWidth={1.8} />
        </span>
        <span className="section-kicker">REQUEST RECEIVED</span>
        <h1>申請内容を受け付けました</h1>
        <p>担当部署で内容を確認します。現在はフロントエンド版のため、入力データは保存されません。</p>

        <div className="complete-summary">
          <span className={`request-icon request-icon--${request.tone}`} aria-hidden="true">
            <Icon size={23} strokeWidth={1.9} />
          </span>
          <div>
            <span>申請項目</span>
            <strong>{request.formTitle}</strong>
          </div>
          <span className="demo-badge">デモ受付</span>
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
  const [view, setView] = useState('home')
  const [selectedKey, setSelectedKey] = useState(null)
  const selectedRequest = selectedKey ? REQUEST_TYPES[selectedKey] : null

  useEffect(() => {
    const pageTitle = view === 'form' && selectedRequest
      ? `${selectedRequest.formTitle} | Asset Desk`
      : view === 'complete'
        ? '受付完了 | Asset Desk'
        : 'Asset Desk | 社内資産申請'
    document.title = pageTitle
  }, [selectedRequest, view])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const goHome = () => {
    setView('home')
    setSelectedKey(null)
    scrollToTop()
  }

  const startRequest = (key) => {
    setSelectedKey(key)
    setView('form')
    scrollToTop()
  }

  const submitRequest = (event) => {
    event.preventDefault()
    setView('complete')
    scrollToTop()
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">本文へスキップ</a>
      <AppHeader onHome={goHome} />
      {view === 'home' && <Home onSelect={startRequest} />}
      {view === 'form' && selectedRequest && (
        <RequestForm request={selectedRequest} onBack={goHome} onSubmit={submitRequest} />
      )}
      {view === 'complete' && selectedRequest && (
        <Complete request={selectedRequest} onHome={goHome} />
      )}
      <footer className="app-footer">
        <span>Asset Desk</span>
        <span>社内資産申請ポータル</span>
      </footer>
    </div>
  )
}

export default App
