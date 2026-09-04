import { useEffect, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, FileCheck2, FileSpreadsheet,
  FileText, HandCoins, LoaderCircle, LogIn, LogOut, PackageOpen,
  RotateCcw, Search, Trash2, UploadCloud, X,
} from 'lucide-react'
import './App.css'

const OPERATIONS = {
  purchase: { label: '購入', description: '新しい機器を台帳へ登録', icon: PackageOpen, tone: 'blue' },
  loan: { label: '貸出', description: '保有機器の貸出を記録', icon: HandCoins, tone: 'green' },
  return: { label: '返却', description: '貸出中の機器を返却', icon: RotateCcw, tone: 'orange' },
  disposal: { label: '廃棄', description: '保有機器の廃棄を記録', icon: Trash2, tone: 'red' },
}

const TYPES = {
  pc: { label: 'PC', fields: [['device_name', '機種・端末名']] },
  phone: { label: 'スマートフォン', fields: [['os', 'OS', 'select', ['iOS', 'Android', '指定なし']], ['model_name', '機種'], ['storage', '容量']] },
  lan: { label: 'LAN機器', fields: [['device_type', '機器種別'], ['device_name', '機器名']] },
  memory: { label: '外部記憶装置', fields: [['device_name', '機器名'], ['capacity', '容量']] },
}

const OPERATION_FIELDS = {
  purchase: [['operation_date', '購入日', 'date'], ['quantity', '数量', 'number'], ['purpose', '購入目的', 'textarea']],
  loan: [['management_number', '管理番号'], ['user_name', '利用者氏名'], ['operation_date', '貸出日', 'date'], ['expected_return_date', '返却予定日', 'date'], ['quantity', '数量', 'number'], ['location', '利用場所'], ['purpose', '利用目的', 'textarea']],
  return: [['management_number', '管理番号'], ['operation_date', '返却日', 'date'], ['condition', '返却時の状態', 'select', ['問題なし', '傷・汚れあり', '故障あり']]],
  disposal: [['management_number', '管理番号'], ['operation_date', '廃棄日', 'date'], ['disposal_reason', '廃棄理由', 'textarea'], ['disposal_method', '廃棄方法']],
}

const DEPARTMENTS = ['営業部', '総務部', 'システム部']
const today = () => new Date().toISOString().slice(0, 10)
const newForm = (operation) => ({
  operation_type: operation,
  application_type: 'pc',
  applicant_name: '',
  department: '',
  approved_date: today(),
  details: { operation_date: today(), quantity: '1' },
  notes: '',
  source_pdf: null,
  approved_confirmed: false,
})

function csrfToken() {
  return document.cookie.split('; ').find((row) => row.startsWith('csrftoken='))?.split('=')[1] ?? ''
}

async function readJson(response) {
  return response.json().catch(() => ({}))
}

function errorText(body, fallback) {
  if (typeof body.detail === 'string') return body.detail
  return Object.values(body).flat().find((item) => typeof item === 'string') ?? fallback
}

function formatDate(value) {
  if (!value) return '—'
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(date)
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login/', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
        body: JSON.stringify({ username, password }),
      })
      const body = await readJson(response)
      if (!response.ok) throw new Error(errorText(body, 'ログインできませんでした。'))
      onLogin(body)
    } catch (requestError) {
      setError(requestError.message || 'サーバーへ接続できませんでした。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="simple-login">
      <form className="simple-login__card" onSubmit={submit}>
        <div className="login-logo"><FileSpreadsheet /><span>internApp</span></div>
        <div><h1>ログイン</h1><p>資産台帳の登録・更新</p></div>
        {error && <div className="alert error">{error}</div>}
        <label>メールアドレスまたはログイン名<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required autoFocus /></label>
        <label>パスワード<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        <button className="button primary" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <LogIn />}ログイン</button>
      </form>
    </main>
  )
}

function Header({ user, onLogout }) {
  return <header className="app-header"><div className="brand"><FileSpreadsheet /> internApp</div><span className="header-title">資産台帳</span><div className="header-user"><span>{user?.email || user?.username}</span><button onClick={onLogout} title="ログアウト"><LogOut /></button></div></header>
}

function Dashboard({ records, loading, onNew }) {
  const [query, setQuery] = useState('')
  const visible = records.filter((record) => `${record.reference_number} ${record.applicant_name} ${record.department} ${TYPES[record.application_type]?.label} ${OPERATIONS[record.operation_type]?.label}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <main className="workspace">
      <section className="dashboard-head"><span className="eyebrow">QUICK ENTRY</span><h1>何を記録しますか？</h1><p>処理を選ぶと、必要な項目だけが表示されます。</p></section>
      <section className="operation-grid">
        {Object.entries(OPERATIONS).map(([key, operation]) => {
          const Icon = operation.icon
          return <button key={key} className={`operation-card ${operation.tone}`} onClick={() => onNew(key)}><span><Icon /></span><div><strong>{operation.label}</strong><small>{operation.description}</small></div><ArrowRight /></button>
        })}
      </section>
      <section className="records-card">
        <div className="section-head"><div><span className="eyebrow">RECENT</span><h2>最近の登録</h2></div><label className="search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="受付番号・氏名で検索" /></label></div>
        {loading ? <div className="empty"><LoaderCircle className="spin" />読み込み中</div> : visible.length === 0 ? <div className="empty"><FileSpreadsheet /><strong>{query ? '該当する登録はありません' : 'まだ登録はありません'}</strong></div> : <div className="table-wrap"><table><thead><tr><th>受付番号</th><th>処理</th><th>機器</th><th>申請者</th><th>部署</th><th>承認日</th></tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td><strong>{record.reference_number}</strong></td><td><span className={`operation-chip ${record.operation_type}`}>{OPERATIONS[record.operation_type]?.label || '貸出'}</span></td><td>{TYPES[record.application_type]?.label}</td><td>{record.applicant_name}</td><td>{record.department}</td><td>{formatDate(record.approved_date)}</td></tr>)}</tbody></table></div>}
      </section>
    </main>
  )
}

function Stepper({ step }) {
  return <ol className="stepper">{['書類', '入力', '確認'].map((label, index) => <li key={label} className={index + 1 <= step ? 'active' : ''}><span>{index + 1 < step ? <Check /> : index + 1}</span>{label}</li>)}</ol>
}

function Field({ field, value, onChange }) {
  const [key, label, kind = 'text', options] = field
  if (kind === 'textarea') return <label className="wide">{label}<textarea rows="3" value={value ?? ''} onChange={(event) => onChange(key, event.target.value)} /></label>
  if (kind === 'select') return <label>{label}<select value={value ?? ''} onChange={(event) => onChange(key, event.target.value)}><option value="">選択してください</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
  return <label>{label}<input type={kind} min={kind === 'number' ? 1 : undefined} value={value ?? ''} onChange={(event) => onChange(key, event.target.value)} /></label>
}

function RegisterFlow({ operationKey, onCancel, onComplete }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => newForm(operationKey))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const operation = OPERATIONS[operationKey]
  const fields = [...TYPES[form.application_type].fields, ...OPERATION_FIELDS[operationKey]]

  const setDetail = (key, value) => setForm((current) => ({ ...current, details: { ...current.details, [key]: value } }))
  const chooseFile = (file) => {
    setError('')
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) return setError('PDFファイルを選択してください。')
    if (file.size > 10 * 1024 * 1024) return setError('PDFは10MB以下にしてください。')
    setForm((current) => ({ ...current, source_pdf: file }))
  }
  const next = () => {
    setError('')
    if (step === 1 && (!form.source_pdf || !form.approved_confirmed)) return setError('押印済みPDFを選択し、確認欄にチェックしてください。')
    if (step === 2 && [form.applicant_name, form.department, form.approved_date, ...fields.map(([key]) => form.details[key])].some((value) => value === undefined || value === '')) return setError('未入力の項目があります。')
    setStep((current) => current + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const submit = async () => {
    setBusy(true); setError('')
    const data = new FormData()
    for (const key of ['operation_type', 'application_type', 'applicant_name', 'department', 'approved_date', 'notes', 'source_pdf']) data.append(key, form[key] ?? '')
    data.append('details', JSON.stringify(form.details))
    try {
      const response = await fetch('/api/approved-applications/', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRFToken': csrfToken() }, body: data })
      const body = await readJson(response)
      if (!response.ok) throw new Error(errorText(body, '登録できませんでした。'))
      onComplete(body)
    } catch (requestError) {
      setError(requestError.message || 'サーバーへ接続できませんでした。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flow-page">
      <div className="flow-top"><button className="text-button" onClick={onCancel}><ArrowLeft />一覧へ戻る</button><Stepper step={step} /></div>
      <section className="flow-card">
        <div className={`flow-operation ${operation.tone}`}>{operation.label}</div>
        {step === 1 && <><h1>押印済みPDFを選択</h1><p className="lead">承認・押印が完了した書類を登録してください。</p><label className={`drop-zone ${form.source_pdf ? 'has-file' : ''}`}><input type="file" accept="application/pdf,.pdf" onChange={(event) => chooseFile(event.target.files?.[0])} /><span className="drop-icon">{form.source_pdf ? <FileCheck2 /> : <UploadCloud />}</span><strong>{form.source_pdf?.name || 'PDFを選択'}</strong><small>{form.source_pdf ? `${(form.source_pdf.size / 1024 / 1024).toFixed(2)} MB` : '最大10MB'}</small></label><label className="approval-check"><input type="checkbox" checked={form.approved_confirmed} onChange={(event) => setForm({ ...form, approved_confirmed: event.target.checked })} /><span><strong>押印済みであることを確認しました</strong><small>未承認の書類は登録しないでください。</small></span></label></>}
        {step === 2 && <><h1>{operation.label}内容を入力</h1><p className="lead">必要な項目だけを表示しています。</p><div className="form-grid"><label>機器種別<select value={form.application_type} onChange={(event) => setForm((current) => ({ ...current, application_type: event.target.value, details: { operation_date: current.details.operation_date, quantity: current.details.quantity } }))}>{Object.entries(TYPES).map(([key, type]) => <option key={key} value={key}>{type.label}</option>)}</select></label><label>申請者氏名<input value={form.applicant_name} onChange={(event) => setForm({ ...form, applicant_name: event.target.value })} /></label><label>所属部署<select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}><option value="">選択してください</option>{DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}</select></label><label>承認日<input type="date" max={today()} value={form.approved_date} onChange={(event) => setForm({ ...form, approved_date: event.target.value })} /></label>{fields.map((field) => <Field key={field[0]} field={field} value={form.details[field[0]]} onChange={setDetail} />)}<label className="wide">担当者メモ（任意）<textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div></>}
        {step === 3 && <><h1>登録内容を確認</h1><p className="lead">内容に間違いがなければ台帳へ登録してください。</p><div className="review-file"><FileText /><div><small>元の申請書</small><strong>{form.source_pdf?.name}</strong></div></div><dl className="review-list"><div><dt>処理</dt><dd>{operation.label}</dd></div><div><dt>機器種別</dt><dd>{TYPES[form.application_type].label}</dd></div><div><dt>申請者</dt><dd>{form.applicant_name}（{form.department}）</dd></div><div><dt>承認日</dt><dd>{formatDate(form.approved_date)}</dd></div>{fields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{form.details[key]}</dd></div>)}</dl></>}
        {error && <div className="alert error"><X />{error}</div>}
        <div className="flow-actions">{step > 1 && <button className="button secondary" onClick={() => setStep(step - 1)}><ArrowLeft />戻る</button>}<span />{step < 3 ? <button className="button primary" onClick={next}>次へ<ArrowRight /></button> : <button className="button primary" onClick={submit} disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <FileSpreadsheet />}台帳へ登録</button>}</div>
      </section>
    </main>
  )
}

function Complete({ result, onDone }) {
  return <main className="complete-page"><section className="complete-card"><span className="complete-icon"><CheckCircle2 /></span><h1>登録が完了しました</h1>{result.ledger_warning ? <div className="alert error">{result.ledger_warning}</div> : <p>Excel台帳も更新されました。</p>}<div className="reference"><small>受付番号</small><strong>{result.reference_number}</strong></div><button className="button primary" onClick={onDone}>一覧へ戻る</button></section></main>
}

export default function App() {
  const [session, setSession] = useState(null)
  const [screen, setScreen] = useState('dashboard')
  const [operation, setOperation] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const loadRecords = async () => { setLoading(true); try { const response = await fetch('/api/approved-applications/', { credentials: 'same-origin', cache: 'no-store' }); if (response.ok) setRecords(await response.json()) } finally { setLoading(false) } }

  useEffect(() => {
    fetch('/api/auth/session/', { credentials: 'same-origin', cache: 'no-store' }).then(readJson).then((body) => {
      setSession(body)
      if (body.authenticated) fetch('/api/approved-applications/', { credentials: 'same-origin', cache: 'no-store' }).then((response) => response.ok ? response.json() : []).then(setRecords).finally(() => setLoading(false))
      else setLoading(false)
    }).catch(() => { setSession({ authenticated: false }); setLoading(false) })
  }, [])

  const logout = async () => { await fetch('/api/auth/logout/', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRFToken': csrfToken() } }).catch(() => null); setSession({ authenticated: false }) }
  const start = (key) => { setOperation(key); setScreen('register') }
  if (!session) return <div className="boot"><LoaderCircle className="spin" />読み込み中</div>
  if (!session.authenticated) return <Login onLogin={(body) => { setSession(body); loadRecords() }} />

  return <div className="app-shell"><Header user={session.user} onLogout={logout} />{screen === 'register' ? <RegisterFlow operationKey={operation} onCancel={() => setScreen('dashboard')} onComplete={(body) => { setResult(body); setScreen('complete') }} /> : screen === 'complete' ? <Complete result={result} onDone={() => { setScreen('dashboard'); loadRecords() }} /> : <Dashboard records={records} loading={loading} onNew={start} />}</div>
}
