import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, Clock3, FileCheck2, FileSpreadsheet, FileText, LoaderCircle, LogOut, Search, ShieldCheck, UploadCloud, X } from 'lucide-react'
import './App.css'

const TYPES = {
  pc: { label: 'PC貸出', short: 'PC', fields: [['user_name', '利用者氏名'], ['management_number', '管理番号'], ['start_date', '利用開始日', 'date'], ['location', '利用場所'], ['purpose', '利用目的', 'textarea']] },
  memory: { label: '外部記憶装置貸出', short: '記憶装置', fields: [['user_name', '利用者氏名'], ['device_name', '機器名'], ['capacity', '容量'], ['loan_date', '貸出日', 'date'], ['location', '利用場所'], ['purpose', '利用目的', 'textarea']] },
  lan: { label: 'LAN機器貸出', short: 'LAN', fields: [['device_type', '機器種別'], ['device_name', '機器名'], ['quantity', '必要個数', 'number'], ['start_date', '利用開始日', 'date'], ['return_date', '返却予定日', 'date'], ['location', '利用場所'], ['purpose', '利用目的', 'textarea']] },
  phone: { label: 'スマートフォン購入', short: 'スマートフォン', fields: [['os', 'OS', 'select', ['iOS', 'Android', '指定なし']], ['line_type', '回線区分', 'select', ['新規契約', '機種変更', '端末のみ購入']], ['model_name', '機種'], ['quantity', '台数', 'number'], ['purchase_date', '購入日', 'date'], ['storage', '容量'], ['sim_required', 'SIM', 'select', ['あり', 'なし']], ['purpose', '利用目的', 'textarea']] },
  other: { label: 'その他', short: 'その他', fields: [['summary', '転記内容', 'textarea']] },
}
const DEPARTMENTS = ['営業部', '総務部', 'システム部']
const today = () => new Date().toISOString().slice(0, 10)
const blankForm = () => ({ application_type: 'pc', applicant_name: '', department: '', approved_date: today(), notes: '', details: {}, source_pdf: null, approved_confirmed: false })

function csrfToken() { return document.cookie.split('; ').find((row) => row.startsWith('csrftoken='))?.split('=')[1] ?? '' }
async function readJson(response) { return response.json().catch(() => ({})) }
function errorText(body, fallback) { if (typeof body.detail === 'string') return body.detail; return Object.values(body).flat().find((item) => typeof item === 'string') ?? fallback }
function formatDate(value) { return value ? new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '—' }

function Login({ onLogin }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch('/api/auth/login/', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() }, body: JSON.stringify({ username, password }) })
      const body = await readJson(response); if (!response.ok) throw new Error(errorText(body, 'ログインできませんでした。')); onLogin(body)
    } catch (requestError) { setError(requestError.message || 'Djangoサーバーへ接続できませんでした。') } finally { setBusy(false) }
  }
  return <main className="login-shell"><section className="login-story"><div className="brand"><FileSpreadsheet /> internApp</div><div className="story-copy"><span className="eyebrow">APPROVED DOCUMENT WORKSPACE</span><h1>押印のあとを、<br />もっと軽やかに。</h1><p>承認済みPDFを確認しながら入力。整ったデータをExcel台帳へ自動で反映します。</p></div><div className="story-flow"><span><FileCheck2 /> 押印済みPDF</span><ArrowRight /><span><ClipboardCheck /> 内容確認</span><ArrowRight /><span><FileSpreadsheet /> Excel台帳</span></div></section><section className="login-panel"><form className="login-card" onSubmit={submit}><span className="eyebrow">STAFF SIGN IN</span><h2>担当者ログイン</h2><p>登録作業を始めるにはログインしてください。</p>{error && <div className="alert error">{error}</div>}<label>メールアドレスまたはログイン名<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label><label>パスワード<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label><button className="button primary" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <ShieldCheck />}ログイン</button><small>アカウントの発行・再設定は管理者にお問い合わせください。</small></form></section></main>
}

function Header({ user, onLogout }) { return <header className="app-header"><div className="brand"><FileSpreadsheet /> internApp</div><div className="header-context"><span>承認済み申請</span><strong>転記ワークスペース</strong></div><div className="header-user"><span>{user?.email || user?.username}</span><button onClick={onLogout} title="ログアウト"><LogOut /></button></div></header> }

function Dashboard({ records, loading, onNew }) {
  const [query, setQuery] = useState('')
  const visible = records.filter((record) => `${record.reference_number} ${record.applicant_name} ${record.department} ${TYPES[record.application_type]?.label}`.toLowerCase().includes(query.toLowerCase()))
  return <main className="workspace"><section className="hero"><div><span className="eyebrow">TODAY&apos;S WORKSPACE</span><h1>承認後の転記を、迷わず正確に。</h1><p>押印済み申請書を登録すると、申請種別ごとのExcel台帳へ自動反映されます。</p></div><button className="button primary large" onClick={onNew}><UploadCloud />PDFから登録</button></section><section className="metrics"><article><span className="metric-icon"><FileText /></span><div><small>登録件数</small><strong>{records.length}</strong></div></article><article><span className="metric-icon green"><CheckCircle2 /></span><div><small>台帳反映対象</small><strong>{records.length}</strong></div></article><article className="note"><Clock3 /><p>押印済みであることを確認してから登録してください。</p></article></section><section className="records-card"><div className="section-head"><div><span className="eyebrow">RECENT ENTRIES</span><h2>最近の登録</h2></div><label className="search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="受付番号・氏名で検索" /></label></div>{loading ? <div className="empty"><LoaderCircle className="spin" />読み込み中</div> : visible.length === 0 ? <div className="empty"><FileSpreadsheet /><strong>{query ? '該当する登録はありません' : 'まだ登録はありません'}</strong><span>押印済みPDFから最初の1件を登録しましょう。</span></div> : <div className="table-wrap"><table><thead><tr><th>受付番号</th><th>申請種別</th><th>申請者</th><th>部署</th><th>承認日</th><th>登録担当者</th></tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td><strong>{record.reference_number}</strong></td><td><span className="type-chip">{TYPES[record.application_type]?.short}</span></td><td>{record.applicant_name}</td><td>{record.department}</td><td>{formatDate(record.approved_date)}</td><td>{record.entered_by_name}</td></tr>)}</tbody></table></div>}</section></main>
}

function Stepper({ step }) { return <ol className="stepper">{['PDF選択', '内容入力', '最終確認'].map((label, index) => <li key={label} className={index + 1 <= step ? 'active' : ''}><span>{index + 1 < step ? <Check /> : index + 1}</span>{label}</li>)}</ol> }

function Field({ field, value, onChange }) {
  const [key, label, kind = 'text', options] = field
  return <label className={kind === 'textarea' ? 'wide' : ''}>{label}{kind === 'textarea' ? <textarea rows="3" value={value ?? ''} onChange={(event) => onChange(key, event.target.value)} /> : kind === 'select' ? <select value={value ?? ''} onChange={(event) => onChange(key, event.target.value)}><option value="">選択してください</option>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input type={kind} min={kind === 'number' ? 1 : undefined} value={value ?? ''} onChange={(event) => onChange(key, event.target.value)} />}</label>
}

function RegisterFlow({ onCancel, onComplete }) {
  const [step, setStep] = useState(1); const [form, setForm] = useState(blankForm); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const config = TYPES[form.application_type]
  const setDetail = (key, value) => setForm((current) => ({ ...current, details: { ...current.details, [key]: value } }))
  const chooseFile = (file) => { setError(''); if (!file) return; if (!file.name.toLowerCase().endsWith('.pdf')) return setError('PDFファイルを選択してください。'); if (file.size > 10 * 1024 * 1024) return setError('PDFは10MB以下にしてください。'); setForm((current) => ({ ...current, source_pdf: file })) }
  const next = () => { setError(''); if (step === 1 && (!form.source_pdf || !form.approved_confirmed)) return setError('押印済みPDFを選択し、確認欄にチェックしてください。'); if (step === 2 && [form.applicant_name, form.department, form.approved_date, ...config.fields.map(([key]) => form.details[key])].some((value) => value === undefined || value === '')) return setError('未入力の項目があります。'); setStep((current) => current + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const submit = async () => {
    setBusy(true); setError(''); const data = new FormData(); ['application_type', 'applicant_name', 'department', 'approved_date', 'notes', 'source_pdf'].forEach((key) => data.append(key, form[key] ?? '')); const details = { ...form.details }; if (form.application_type === 'phone') details.sim_required = details.sim_required === 'あり'; data.append('details', JSON.stringify(details))
    try { const response = await fetch('/api/approved-applications/', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRFToken': csrfToken() }, body: data }); const body = await readJson(response); if (!response.ok) throw new Error(errorText(body, '登録できませんでした。')); onComplete(body) } catch (requestError) { setError(requestError.message || 'Djangoサーバーへ接続できませんでした。') } finally { setBusy(false) }
  }
  return <main className="flow-page"><div className="flow-top"><button className="text-button" onClick={onCancel}><ArrowLeft />一覧へ戻る</button><Stepper step={step} /></div><section className="flow-card">{step === 1 && <><span className="eyebrow">STEP 01</span><h1>押印済みPDFを選択</h1><p className="lead">上司の承認・押印が完了した申請書だけを登録してください。</p><label className={`drop-zone ${form.source_pdf ? 'has-file' : ''}`}><input type="file" accept="application/pdf,.pdf" onChange={(event) => chooseFile(event.target.files?.[0])} /><span className="drop-icon">{form.source_pdf ? <FileCheck2 /> : <UploadCloud />}</span><strong>{form.source_pdf?.name || 'PDFを選択'}</strong><span>{form.source_pdf ? `${(form.source_pdf.size / 1024 / 1024).toFixed(2)} MB` : 'PDF形式・最大10MB'}</span></label><label className="approval-check"><input type="checkbox" checked={form.approved_confirmed} onChange={(event) => setForm({ ...form, approved_confirmed: event.target.checked })} /><span><strong>押印済みであることを確認しました</strong><small>未承認の申請書は登録しないでください。</small></span></label></>}{step === 2 && <><span className="eyebrow">STEP 02</span><h1>台帳へ反映する内容</h1><p className="lead">PDFを見ながら入力してください。Excelの列順や書式はアプリが整えます。</p><div className="form-grid"><label>申請種別<select value={form.application_type} onChange={(event) => setForm((current) => ({ ...current, application_type: event.target.value, details: {} }))}>{Object.entries(TYPES).map(([key, type]) => <option key={key} value={key}>{type.label}</option>)}</select></label><label>申請者氏名<input value={form.applicant_name} onChange={(event) => setForm({ ...form, applicant_name: event.target.value })} /></label><label>所属部署<select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}><option value="">選択してください</option>{DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}</select></label><label>承認日<input type="date" max={today()} value={form.approved_date} onChange={(event) => setForm({ ...form, approved_date: event.target.value })} /></label>{config.fields.map((field) => <Field key={field[0]} field={field} value={form.details[field[0]]} onChange={setDetail} />)}<label className="wide">担当者メモ（任意）<textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div></>}{step === 3 && <><span className="eyebrow">STEP 03</span><h1>登録内容の最終確認</h1><p className="lead">登録するとデータが保存され、該当するExcel台帳が更新されます。</p><div className="review-file"><FileText /><div><small>元の申請書</small><strong>{form.source_pdf?.name}</strong></div></div><dl className="review-list"><div><dt>申請種別</dt><dd>{config.label}</dd></div><div><dt>申請者</dt><dd>{form.applicant_name}</dd></div><div><dt>所属部署</dt><dd>{form.department}</dd></div><div><dt>承認日</dt><dd>{formatDate(form.approved_date)}</dd></div>{config.fields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{String(form.details[key] ?? '—')}</dd></div>)}</dl></>}{error && <div className="alert error"><X />{error}</div>}<div className="flow-actions">{step > 1 && <button className="button secondary" onClick={() => setStep(step - 1)}><ArrowLeft />戻る</button>}<span />{step < 3 ? <button className="button primary" onClick={next}>次へ<ArrowRight /></button> : <button className="button primary" onClick={submit} disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <FileSpreadsheet />}台帳へ登録</button>}</div></section></main>
}

function Complete({ result, onDone }) { return <main className="complete-page"><section className="complete-card"><span className="complete-icon"><CheckCircle2 /></span><span className="eyebrow">ENTRY COMPLETED</span><h1>台帳への登録が完了しました</h1><p>元PDFと入力内容を保存しました。</p>{result.ledger_warning ? <div className="alert error">{result.ledger_warning}</div> : <div className="alert success"><Check />Excel台帳も正常に更新されました。</div>}<div className="reference"><small>受付番号</small><strong>{result.reference_number}</strong></div><button className="button primary" onClick={onDone}>登録一覧へ</button></section></main> }

export default function App() {
  const [session, setSession] = useState(null); const [screen, setScreen] = useState('dashboard'); const [records, setRecords] = useState([]); const [loading, setLoading] = useState(true); const [result, setResult] = useState(null)
  const loadRecords = async () => { setLoading(true); try { const response = await fetch('/api/approved-applications/', { credentials: 'same-origin', cache: 'no-store' }); if (response.ok) setRecords(await response.json()) } finally { setLoading(false) } }
  useEffect(() => {
    fetch('/api/auth/session/', { credentials: 'same-origin', cache: 'no-store' })
      .then(readJson)
      .then((body) => {
        setSession(body)
        if (body.authenticated) {
          fetch('/api/approved-applications/', { credentials: 'same-origin', cache: 'no-store' })
            .then((response) => response.ok ? response.json() : [])
            .then(setRecords)
            .finally(() => setLoading(false))
        } else {
          setLoading(false)
        }
      })
      .catch(() => { setSession({ authenticated: false }); setLoading(false) })
  }, [])
  const logout = async () => { await fetch('/api/auth/logout/', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRFToken': csrfToken() } }).catch(() => null); setSession({ authenticated: false }) }
  if (!session) return <div className="boot"><LoaderCircle className="spin" />ワークスペースを準備しています</div>
  if (!session.authenticated) return <Login onLogin={(body) => { setSession(body); loadRecords() }} />
  return <div className="app-shell"><Header user={session.user} onLogout={logout} />{screen === 'register' ? <RegisterFlow onCancel={() => setScreen('dashboard')} onComplete={(body) => { setResult(body); setScreen('complete') }} /> : screen === 'complete' ? <Complete result={result} onDone={() => { setScreen('dashboard'); loadRecords() }} /> : <Dashboard records={records} loading={loading} onNew={() => setScreen('register')} />}</div>
}
