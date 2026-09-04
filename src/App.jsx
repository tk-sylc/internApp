import { useEffect, useState } from 'react'
import {
  ArrowLeft, ArrowRight, CalendarDays, ChevronRight, CircleCheck,
  FileSpreadsheet, HandCoins, Info, KeyRound, Laptop, LogIn, LogOut,
  Network, PackageCheck, RotateCcw, Search, ShieldCheck, ShoppingCart,
  Smartphone, Trash2, Usb, UserRound,
} from 'lucide-react'
import './App.css'

const ASSETS = {
  pc: {
    title: 'PC', tone: 'blue', icon: Laptop,
    fields: [{ name: 'device_name', label: '機種・端末名', placeholder: '例：ThinkPad X1 Carbon', required: true }],
  },
  memory: {
    title: '外部記憶装置', tone: 'teal', icon: Usb,
    fields: [
      { name: 'device_name', label: '機器名', placeholder: '例：USBメモリ', required: true },
      { name: 'capacity', label: '容量', placeholder: '例：64GB、1TB', required: true },
    ],
  },
  lan: {
    title: 'LAN機器', tone: 'amber', icon: Network,
    fields: [
      { name: 'device_type', label: '機器種別', type: 'select', options: ['LANケーブル', 'USB-LANアダプター', 'モバイルルーター', 'その他'], required: true },
      { name: 'device_name', label: '機器名', placeholder: '例：CAT6 LANケーブル', required: true },
    ],
  },
  phone: {
    title: 'スマートフォン', tone: 'coral', icon: Smartphone,
    fields: [
      { name: 'os', label: 'OS', type: 'select', options: ['iOS', 'Android', '指定なし'], required: true },
      { name: 'model_name', label: '機種', placeholder: '例：iPhone 16', required: true },
      { name: 'storage', label: '容量', type: 'select', options: ['64GB', '128GB', '256GB', '512GB', '指定なし'], required: true },
    ],
  },
  other: {
    title: 'その他', tone: 'blue', icon: PackageCheck,
    fields: [{ name: 'summary', label: '転記内容', type: 'textarea', required: true, fullWidth: true }],
  },
}

const OPERATIONS = {
  purchase: {
    title: '購入', formTitle: '購入内容の登録', description: '新しく購入した資産を台帳へ登録',
    tone: 'blue', icon: ShoppingCart,
    fields: [
      { name: 'operation_date', label: '購入日', type: 'date', required: true },
      { name: 'quantity', label: '数量', type: 'number', min: 1, required: true },
      { name: 'purpose', label: '購入目的', type: 'textarea', required: true, fullWidth: true },
    ],
  },
  loan: {
    title: '貸出', formTitle: '貸出内容の登録', description: '保有資産の貸出を台帳へ登録',
    tone: 'teal', icon: HandCoins,
    fields: [
      { name: 'management_number', label: '管理番号', placeholder: '例：PC-01234', required: true },
      { name: 'user_name', label: '利用者氏名', required: true },
      { name: 'operation_date', label: '貸出日', type: 'date', required: true },
      { name: 'expected_return_date', label: '返却予定日', type: 'date', required: true },
      { name: 'quantity', label: '数量', type: 'number', min: 1, required: true },
      { name: 'location', label: '利用場所', required: true },
      { name: 'purpose', label: '利用目的', type: 'textarea', required: true, fullWidth: true },
    ],
  },
  return: {
    title: '返却', formTitle: '返却内容の登録', description: '貸出中の資産の返却を台帳へ登録',
    tone: 'amber', icon: RotateCcw,
    fields: [
      { name: 'management_number', label: '管理番号', required: true },
      { name: 'operation_date', label: '返却日', type: 'date', required: true },
      { name: 'condition', label: '返却時の状態', type: 'select', options: ['問題なし', '傷・汚れあり', '故障あり'], required: true },
    ],
  },
  disposal: {
    title: '廃棄', formTitle: '廃棄内容の登録', description: '使用を終了した資産を台帳へ登録',
    tone: 'coral', icon: Trash2,
    fields: [
      { name: 'management_number', label: '管理番号', required: true },
      { name: 'operation_date', label: '廃棄日', type: 'date', required: true },
      { name: 'disposal_reason', label: '廃棄理由', type: 'textarea', required: true, fullWidth: true },
      { name: 'disposal_method', label: '廃棄方法', required: true },
    ],
  },
}

const DEPARTMENTS = ['営業部', '総務部', 'システム部']
const DRAFT_PREFIX = 'asset-desk-ledger-draft-v1'
const today = () => new Date().toISOString().slice(0, 10)
const draftKey = (username) => `${DRAFT_PREFIX}:${username}`

function readDraft(username) {
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey(username)))
    return OPERATIONS[draft?.operationKey] && draft?.values ? draft : null
  } catch { return null }
}

function writeDraft(username, draft) {
  if (draft) sessionStorage.setItem(draftKey(username), JSON.stringify(draft))
  else sessionStorage.removeItem(draftKey(username))
}

function csrfToken() {
  const item = document.cookie.split('; ').find((part) => part.startsWith('csrftoken='))
  return item ? decodeURIComponent(item.slice('csrftoken='.length)) : ''
}

const readJson = (response) => response.json().catch(() => ({}))
const errorText = (body, fallback) => body?.fields
  ? Object.values(body.fields).flat().join(' ')
  : body?.error || fallback

function Field({ field, value = '', onChange }) {
  const id = `field-${field.name}`
  const options = field.options || []
  return (
    <div className={field.fullWidth ? 'form-field form-field--full' : 'form-field'}>
      <label htmlFor={id}>{field.label}{field.required && <span className="required-label">必須</span>}</label>
      {field.type === 'select' ? (
        <select id={id} value={value} required={field.required} onChange={(event) => onChange(field.name, event.target.value)}>
          <option value="" disabled>選択してください</option>
          {options.map((option) => {
            const key = typeof option === 'string' ? option : option.value
            return <option key={key} value={key}>{typeof option === 'string' ? option : option.label}</option>
          })}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea id={id} value={value} rows="4" required={field.required} placeholder={field.placeholder} onChange={(event) => onChange(field.name, event.target.value)} />
      ) : (
        <input id={id} value={value} type={field.type || 'text'} min={field.min} max={field.max} required={field.required} placeholder={field.placeholder} onChange={(event) => onChange(field.name, event.target.value)} />
      )}
    </div>
  )
}

function Login({ onSuccess }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true); setError('')
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/auth/login/', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
        body: JSON.stringify({ username: data.get('username'), password: data.get('password') }),
      })
      const body = await readJson(response)
      if (!response.ok) throw new Error(errorText(body, 'ログインできませんでした。'))
      onSuccess(body)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'ログインできませんでした。')
    } finally { setBusy(false) }
  }
  return (
    <main id="main-content" className="login-page">
      <section className="login-card">
        <div className="login-brand"><span className="brand-mark"><PackageCheck size={25} /></span><div className="brand-copy"><strong>Asset Desk</strong><span>資産管理台帳</span></div></div>
        <div className="login-heading"><span className="section-kicker">STAFF SIGN IN</span><h1>担当者ログイン</h1><p>Djangoに登録された担当者アカウントでログインしてください。</p></div>
        <form className="login-form" onSubmit={submit}>
          <div className="login-field"><label htmlFor="login-name">ログイン名またはメールアドレス</label><div className="login-input"><UserRound size={18} /><input id="login-name" name="username" autoComplete="username" required autoFocus /></div></div>
          <div className="login-field"><label htmlFor="login-password">パスワード</label><div className="login-input"><KeyRound size={18} /><input id="login-password" name="password" type="password" autoComplete="current-password" required /></div></div>
          {error && <div className="submit-error" role="alert"><Info size={18} /><span>{error}</span></div>}
          <button className="primary-button login-button" disabled={busy}>{busy ? '確認中...' : 'ログイン'}<LogIn size={18} /></button>
        </form>
        <div className="login-note"><ShieldCheck size={18} /><p>この画面は資産管理担当者専用です。</p></div>
      </section>
    </main>
  )
}

function Header({ user, onHome, onLogout }) {
  return (
    <header className="app-header"><div className="header-inner">
      <button className="brand" type="button" onClick={onHome}><span className="brand-mark"><PackageCheck size={22} /></span><span className="brand-copy"><strong>Asset Desk</strong><span>資産管理台帳</span></span></button>
      <div className="header-actions"><div className="user-profile"><span className="user-avatar">{user.displayName.charAt(0)}</span><span className="user-copy"><strong>{user.displayName}</strong><span>資産管理担当者</span></span></div><button className="logout-button" onClick={onLogout}><LogOut size={17} />ログアウト</button></div>
    </div></header>
  )
}

function Stepper({ current }) {
  return <ol className="stepper">{['処理選択', '詳細入力', '内容確認', '登録完了'].map((label, index) => {
    const number = index + 1
    return <li key={label} className={number < current ? 'is-complete' : number === current ? 'is-current' : ''}><span className="step-number">{number < current ? <CircleCheck size={18} /> : number}</span><span>{label}</span></li>
  })}</ol>
}

function Records({ records, loading }) {
  const [query, setQuery] = useState('')
  const visible = records.filter((item) => `${item.referenceNumber} ${item.applicantName} ${item.department}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <section className="records-section">
      <div className="section-heading records-heading"><div><span className="section-kicker">RECENT ENTRIES</span><h2>最近の台帳登録</h2></div><label className="records-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="受付番号・氏名で検索" /></label></div>
      {loading || visible.length === 0 ? <p className="records-empty">{loading ? '読み込み中...' : query ? '該当する登録はありません。' : 'まだ登録はありません。'}</p> : (
        <div className="records-table-wrap"><table className="records-table"><thead><tr><th>受付番号</th><th>処理</th><th>機器</th><th>申請者</th><th>部署</th><th>承認日</th><th>担当者</th></tr></thead><tbody>
          {visible.map((item) => <tr key={item.id}><td><strong>{item.referenceNumber}</strong></td><td>{OPERATIONS[item.operationType]?.title}</td><td>{ASSETS[item.applicationType]?.title}</td><td>{item.applicantName}</td><td>{item.department}</td><td>{item.approvedDate}</td><td>{item.enteredBy}</td></tr>)}
        </tbody></table></div>
      )}
    </section>
  )
}

function Home({ user, records, loading, draft, onStart, onClearDraft }) {
  return (
    <main id="main-content" className="page-container home-page">
      <section className="welcome-panel"><div className="welcome-copy"><span className="eyebrow">ASSET LEDGER</span><h1>お疲れさまです、{user.displayName}さん</h1><p>上司の承認が完了した資産手続きを台帳へ登録します。</p></div><div className="welcome-status"><CalendarDays size={19} /><span>登録担当者も記録されます</span></div></section>
      {draft && <section className="draft-panel"><div><span className="section-kicker">SAVED DRAFT</span><h2>入力途中の登録があります</h2><p>{OPERATIONS[draft.operationKey].formTitle}の下書きです。</p></div><div className="draft-panel__actions"><button className="secondary-button" onClick={onClearDraft}>下書きを破棄</button><button className="primary-button" onClick={() => onStart(draft.operationKey)}>入力を再開<ArrowRight size={18} /></button></div></section>}
      <section className="request-section"><div className="section-heading"><div><span className="section-kicker">NEW ENTRY</span><h2>どの処理を登録しますか？</h2></div><p>承認済みの処理を選択してください</p></div><div className="request-grid">
        {Object.entries(OPERATIONS).map(([key, item]) => { const Icon = item.icon; return <button className={`request-card request-card--${item.tone}`} key={key} onClick={() => onStart(key)}><span className="request-card__top"><span className="request-icon"><Icon size={27} /></span><span className="category-badge">台帳処理</span></span><span className="request-card__body"><strong>{item.title}</strong><span>{item.description}</span></span><span className="request-card__action">登録を始める<ArrowRight size={18} /></span></button> })}
      </div></section>
      <Records records={records} loading={loading} />
      <aside className="security-note"><ShieldCheck size={20} /><p><strong>登録前にご確認ください</strong>未承認の内容は登録せず、承認済みの原本と照合してください。</p></aside>
    </main>
  )
}

function formFields(operation, assetType) {
  return {
    common: [
      { name: 'applicationType', label: '機器種別', type: 'select', options: Object.entries(ASSETS).map(([value, asset]) => ({ value, label: asset.title })), required: true },
      { name: 'applicantName', label: '申請者氏名', required: true },
      { name: 'department', label: '所属部署', type: 'select', options: DEPARTMENTS, required: true },
      { name: 'approvedDate', label: '承認日', type: 'date', max: today(), required: true },
    ],
    details: [...(ASSETS[assetType]?.fields || []), ...operation.fields],
  }
}

function EntryForm({ operation, values, onChange, onBack, onReview, error }) {
  const { common, details } = formFields(operation, values.applicationType)
  const Icon = operation.icon
  return (
    <main id="main-content" className="page-container form-page">
      <nav className="breadcrumb"><button onClick={onBack}>台帳ホーム</button><ChevronRight size={15} /><span>{operation.formTitle}</span></nav>
      <div className="form-page__heading"><button className="back-button" onClick={onBack}><ArrowLeft size={18} />戻る</button><div className="title-with-icon"><span className={`request-icon request-icon--${operation.tone}`}><Icon size={28} /></span><div><span className="section-kicker">LEDGER ENTRY</span><h1>{operation.formTitle}</h1><p>承認済みの原本を見ながら入力してください。</p></div></div></div>
      <Stepper current={2} />
      <div className="form-layout"><form className="request-form" onSubmit={onReview}>
        <section className="form-section"><div className="form-section__heading"><span className="section-number">01</span><div><h2>承認情報</h2><p><span className="required-dot">*</span> 必須項目を入力してください。</p></div></div><div className="applicant-grid">{common.map((field) => <Field key={field.name} field={field} value={values[field.name]} onChange={onChange} />)}</div></section>
        {values.applicationType && <section className="form-section"><div className="form-section__heading"><span className="section-number">02</span><div><h2>台帳への転記内容</h2><p><span className="required-dot">*</span> 原本と照合してください。</p></div></div><div className="form-grid">{details.map((field) => <Field key={field.name} field={field} value={values[field.name]} onChange={onChange} />)}<Field field={{ name: 'notes', label: '担当者メモ（任意）', type: 'textarea', fullWidth: true }} value={values.notes} onChange={onChange} /></div><label className="approval-check"><input type="checkbox" checked={values.approvedConfirmed === true} onChange={(event) => onChange('approvedConfirmed', event.target.checked)} /><span><strong>上司の承認が完了していることを確認しました</strong><small>未承認の内容は登録しないでください。</small></span></label></section>}
        {error && <div className="submit-error" role="alert"><Info size={18} /><span>{error}</span></div>}
        <div className="form-actions"><button className="secondary-button" type="button" onClick={onBack}>ホームへ戻る</button><button className="primary-button" disabled={!values.applicationType}>入力内容を確認する<ArrowRight size={18} /></button></div>
      </form><aside className="form-sidebar"><div className="summary-card"><span className={`request-icon request-icon--${operation.tone}`}><Icon size={24} /></span><span className="summary-label">選択中の処理</span><strong>{operation.title}</strong><span className="summary-category">資産台帳</span></div><div className="help-card"><Info size={19} /><div><strong>入力時のお願い</strong><p>承認済みの原本と管理番号を照合してください。</p></div></div></aside></div>
    </main>
  )
}

function Confirmation({ operation, values, onBack, onSubmit, busy, error }) {
  const { common, details } = formFields(operation, values.applicationType)
  const Icon = operation.icon
  return (
    <main id="main-content" className="page-container form-page confirmation-page">
      <div className="form-page__heading"><button className="back-button" onClick={onBack} disabled={busy}><ArrowLeft size={18} />入力画面へ戻る</button><div className="title-with-icon"><span className={`request-icon request-icon--${operation.tone}`}><Icon size={28} /></span><div><span className="section-kicker">CONFIRM ENTRY</span><h1>登録内容の確認</h1><p>承認済みの原本と内容を照合してください。</p></div></div></div>
      <Stepper current={3} /><section className="confirmation-card"><div className="confirmation-request"><span className={`request-icon request-icon--${operation.tone}`}><Icon size={23} /></span><div><span>処理・機器</span><strong>{operation.title}・{ASSETS[values.applicationType].title}</strong></div></div>
        {[['承認情報', common.slice(1)], ['転記内容', details]].map(([title, fields]) => <section className="confirmation-section" key={title}><h2>{title}</h2><dl className="confirmation-list">{fields.map((field) => <div key={field.name}><dt>{field.label}</dt><dd>{values[field.name] || '—'}</dd></div>)}</dl></section>)}
        {error && <div className="submit-error confirmation-error"><Info size={18} /><span>{error}</span></div>}
        <div className="form-actions"><button className="secondary-button" onClick={onBack} disabled={busy}>入力内容を修正する</button><button className="primary-button" onClick={onSubmit} disabled={busy}>{busy ? '登録中...' : 'この内容で台帳へ登録'}<FileSpreadsheet size={18} /></button></div>
      </section>
    </main>
  )
}

function Complete({ result, onHome }) {
  const operation = OPERATIONS[result.operationType]
  const Icon = operation.icon
  return <main id="main-content" className="page-container complete-page"><Stepper current={4} /><section className="complete-card"><span className="complete-icon"><CircleCheck size={40} /></span><span className="section-kicker">ENTRY COMPLETED</span><h1>台帳への登録が完了しました</h1><p>入力内容と登録担当者を保存しました。</p>{result.ledgerWarning && <div className="submit-error complete-warning"><Info size={18} /><span>{result.ledgerWarning}</span></div>}<div className="complete-summary"><span className={`request-icon request-icon--${operation.tone}`}><Icon size={23} /></span><div><span>登録内容</span><strong>{operation.title}・{ASSETS[result.applicationType].title}</strong></div><span className="demo-badge">{result.referenceNumber}</span></div><button className="primary-button" onClick={onHome}>登録一覧へ戻る<ArrowRight size={18} /></button></section></main>
}

export default function App() {
  const [session, setSession] = useState(null)
  const [view, setView] = useState('home')
  const [operationKey, setOperationKey] = useState(null)
  const [values, setValues] = useState({})
  const [draft, setDraft] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const operation = OPERATIONS[operationKey]

  useEffect(() => {
    fetch('/api/auth/session/', { credentials: 'same-origin', cache: 'no-store' })
      .then(readJson)
      .then((body) => {
        setSession(body)
        if (!body.authenticated) return
        setDraft(readDraft(body.user.username))
        setLoading(true)
        fetch('/api/approved-applications/', { credentials: 'same-origin', cache: 'no-store' })
          .then((response) => response.ok ? response.json() : [])
          .then(setRecords)
          .finally(() => setLoading(false))
      })
      .catch(() => setSession({ authenticated: false }))
  }, [])

  const handleLogin = (body) => {
    setSession(body)
    setDraft(readDraft(body.user.username))
    setLoading(true)
    fetch('/api/approved-applications/', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => response.ok ? response.json() : [])
      .then(setRecords)
      .finally(() => setLoading(false))
  }

  const clearDraft = () => { writeDraft(session.user.username, null); setDraft(null) }
  const home = () => { setView('home'); setOperationKey(null); setValues({}); setError(''); setResult(null); window.scrollTo(0, 0) }
  const start = (key) => {
    const resume = draft?.operationKey === key
    if (draft && !resume && !window.confirm('保存中の下書きを破棄しますか？')) return
    if (!resume) clearDraft()
    setOperationKey(key); setValues(resume ? draft.values : {}); setError(''); setView('form'); window.scrollTo(0, 0)
  }
  const change = (name, value) => {
    let next = { ...values, [name]: value }
    if (name === 'applicationType' && value !== values.applicationType) {
      const keep = new Set(['applicationType', 'applicantName', 'department', 'approvedDate', 'notes', 'approvedConfirmed', ...operation.fields.map((field) => field.name)])
      next = Object.fromEntries(Object.entries(next).filter(([key]) => keep.has(key)))
    }
    const nextDraft = { operationKey, values: next }
    setValues(next); setDraft(nextDraft); writeDraft(session.user.username, nextDraft); setError('')
  }
  const review = (event) => {
    event.preventDefault()
    if (values.approvedConfirmed !== true) return setError('上司の承認が完了していることを確認してください。')
    setError(''); setView('confirm'); window.scrollTo(0, 0)
  }
  const submit = async () => {
    setBusy(true); setError('')
    const fields = [...ASSETS[values.applicationType].fields, ...operation.fields]
    const details = Object.fromEntries(fields.map((field) => [field.name, values[field.name]]))
    if (details.quantity) details.quantity = Number(details.quantity)
    try {
      const response = await fetch('/api/approved-applications/', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
        body: JSON.stringify({ applicationType: values.applicationType, operationType: operationKey, applicantName: values.applicantName, department: values.department, approvedDate: values.approvedDate, details, notes: values.notes || '', approvedConfirmed: true }),
      })
      const body = await readJson(response)
      if (!response.ok) throw new Error(errorText(body, '台帳へ登録できませんでした。'))
      clearDraft(); setResult(body); setRecords((items) => [body, ...items]); setView('complete'); window.scrollTo(0, 0)
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : '台帳へ登録できませんでした。') }
    finally { setBusy(false) }
  }
  const logout = async () => {
    await fetch('/api/auth/logout/', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRFToken': csrfToken() } }).catch(() => null)
    setSession({ authenticated: false }); setRecords([]); setView('home')
  }

  if (session === null) return <div className="boot-screen">読み込み中...</div>
  if (!session.authenticated) return <div className="app-shell login-shell"><Login onSuccess={handleLogin} /><footer className="app-footer login-footer"><span>Asset Desk</span><span>資産管理担当者専用</span></footer></div>
  return <div className="app-shell"><Header user={session.user} onHome={home} onLogout={logout} />
    {view === 'home' && <Home user={session.user} records={records} loading={loading} draft={draft} onStart={start} onClearDraft={() => window.confirm('下書きを破棄しますか？') && clearDraft()} />}
    {view === 'form' && operation && <EntryForm operation={operation} values={values} onChange={change} onBack={home} onReview={review} error={error} />}
    {view === 'confirm' && operation && <Confirmation operation={operation} values={values} onBack={() => setView('form')} onSubmit={submit} busy={busy} error={error} />}
    {view === 'complete' && result && <Complete result={result} onHome={home} />}
    <footer className="app-footer"><span>Asset Desk</span><span>資産管理担当者専用</span></footer>
  </div>
}
