import { useEffect, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, FileSpreadsheet, HandCoins,
  KeyRound, LoaderCircle, LogIn, LogOut, Mail, PackageOpen, RotateCcw,
  Search, Trash2, X,
} from 'lucide-react'
import './App.css'

const OPERATIONS = {
  purchase: { label: '購入', description: '新しい機器を台帳へ登録', icon: PackageOpen, tone: 'blue' },
  loan: { label: '貸出', description: '保有機器の貸出を記録', icon: HandCoins, tone: 'green' },
  return: { label: '返却', description: '貸出中の機器を返却', icon: RotateCcw, tone: 'orange' },
  disposal: { label: '廃棄', description: '保有機器の廃棄を記録', icon: Trash2, tone: 'red' },
}

const TYPES = {
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

const USAGE_FIELDS = {
  purchase: [['usage_start_date', '利用開始日', 'date'], ['usage_end_date', '利用終了日', 'date'], ['purpose', '目的', 'textarea'], ['location', '利用場所']],
  loan: [['usage_start_date', '利用開始日', 'date'], ['usage_end_date', '利用終了日', 'date'], ['purpose', '目的', 'textarea'], ['location', '利用場所']],
  return: [['usage_end_date', '利用終了日', 'date'], ['condition', '返却時の状態', 'select', ['問題なし', '傷・汚れあり', '故障あり']], ['location', '利用場所']],
  disposal: [['usage_start_date', '利用開始日', 'date'], ['usage_end_date', '利用終了日', 'date'], ['disposal_reason', '廃棄理由', 'textarea'], ['disposal_method', '廃棄方法'], ['location', '利用場所']],
}

const OPERATION_FIELDS = {
  purchase: [['quantity', '数量', 'number', null, { min: 1, step: 1 }]],
  loan: [['management_number', '管理番号'], ['quantity', '数量', 'number', null, { min: 1, step: 1 }]],
  return: [['management_number', '管理番号']],
  disposal: [['management_number', '管理番号']],
}

const DEPARTMENTS = ['営業部', '総務部', 'システム部']
const newForm = (operation) => ({
  operation_type: operation,
  application_type: 'pc',
  applicant_name: '',
  department: '',
  details: {},
  notes: '',
})

function csrfToken() {
  return document.cookie.split('; ').find((row) => row.startsWith('csrftoken='))?.split('=')[1] ?? ''
}

async function readJson(response) {
  return response.json().catch(() => ({}))
}

function errorText(body, fallback) {
  if (typeof body.detail === 'string') return body.detail
  const fieldMessage = Object.values(body.fields ?? {}).flat().find((item) => typeof item === 'string')
  return fieldMessage ?? Object.values(body).flat().find((item) => typeof item === 'string') ?? fallback
}

function AuthCard({ icon: Icon = KeyRound, title, description, children }) {
  return <main className="simple-login"><section className="simple-login__card"><div className="login-logo"><FileSpreadsheet /><span>社内機器管理</span></div><div className="auth-heading"><Icon /><div><h1>{title}</h1><p>{description}</p></div></div>{children}</section></main>
}

function Login({ onLogin, onForgotPassword }) {
  const [email, setEmail] = useState('')
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
        body: JSON.stringify({ email, password }),
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
    <AuthCard icon={LogIn} title="ログイン" description="資産台帳の登録・更新">
      <form className="auth-form" onSubmit={submit}>
        {error && <div className="alert error">{error}</div>}
        <label>会社メールアドレス<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required autoFocus /></label>
        <label>パスワード<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        <button className="button primary" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <LogIn />}ログイン</button>
        <button type="button" className="auth-link" onClick={onForgotPassword}>パスワードを忘れた方</button>
      </form>
      <p className="auth-note">アカウントは管理者が発行します。初回は届いた招待メールからパスワードを設定してください。</p>
    </AuthCard>
  )
}

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/auth/password-reset/', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
        body: JSON.stringify({ email }),
      })
      const body = await readJson(response)
      if (!response.ok) throw new Error(errorText(body, '再設定メールを送信できませんでした。'))
      setMessage(body.detail)
    } catch (requestError) { setError(requestError.message || 'サーバーへ接続できませんでした。') }
    finally { setBusy(false) }
  }

  return <AuthCard icon={Mail} title="パスワード再設定" description="登録済みの会社メールへ再設定リンクを送ります">
    <form className="auth-form" onSubmit={submit}>
      {message && <div className="alert success"><CheckCircle2 />{message}</div>}
      {error && <div className="alert error"><X />{error}</div>}
      <label>会社メールアドレス<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required autoFocus /></label>
      <button className="button primary" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Mail />}再設定メールを送る</button>
      <button type="button" className="auth-link" onClick={onBack}>ログインへ戻る</button>
    </form>
  </AuthCard>
}

function SetNewPassword({ mode, token, uid, onComplete }) {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isInvitation = mode === 'invitation'

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const endpoint = isInvitation ? '/api/auth/email-verification/confirm/' : '/api/auth/password-reset/confirm/'
      const payload = isInvitation ? { token, password, password_confirm: passwordConfirm } : { uid, token, password, password_confirm: passwordConfirm }
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
        body: JSON.stringify(payload),
      })
      const body = await readJson(response)
      if (!response.ok) throw new Error(errorText(body, 'パスワードを設定できませんでした。'))
      setMessage(body.detail)
    } catch (requestError) { setError(requestError.message || 'サーバーへ接続できませんでした。') }
    finally { setBusy(false) }
  }

  return <AuthCard title={isInvitation ? '初回パスワード設定' : '新しいパスワード'} description={isInvitation ? '本人専用のパスワードを設定してください' : '今後使用するパスワードを入力してください'}>
    {message ? <><div className="alert success"><CheckCircle2 />{message}</div><button className="button primary" onClick={onComplete}><LogIn />ログインへ</button></> : <form className="auth-form" onSubmit={submit}>
      {error && <div className="alert error"><X />{error}</div>}
      {!token && <div className="alert error"><X />リンクが正しくありません。管理者へ連絡してください。</div>}
      <label>新しいパスワード<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required autoFocus /></label>
      <label>新しいパスワード（確認）<input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} autoComplete="new-password" required /></label>
      <p className="password-hint">8文字以上で、推測されにくいパスワードを設定してください。</p>
      <button className="button primary" disabled={busy || !token}>{busy ? <LoaderCircle className="spin" /> : <KeyRound />}パスワードを設定</button>
    </form>}
  </AuthCard>
}

function Header({ user, onLogout }) {
  return <header className="app-header"><div className="brand"><FileSpreadsheet /> 社内機器管理</div><span className="header-title">資産台帳</span><div className="header-user"><span>{user?.email}</span><button onClick={onLogout} title="ログアウト"><LogOut /></button></div></header>
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
        {loading ? <div className="empty"><LoaderCircle className="spin" />読み込み中</div> : visible.length === 0 ? <div className="empty"><FileSpreadsheet /><strong>{query ? '該当する登録はありません' : 'まだ登録はありません'}</strong></div> : <div className="table-wrap"><table><thead><tr><th>受付番号</th><th>処理</th><th>機器</th><th>申請者</th><th>部署</th><th>登録責任者</th></tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td><strong>{record.reference_number}</strong></td><td><span className={`operation-chip ${record.operation_type}`}>{OPERATIONS[record.operation_type]?.label || '貸出'}</span></td><td>{TYPES[record.application_type]?.label}</td><td>{record.applicant_name || '—'}</td><td>{record.department || '—'}</td><td><strong>{record.entered_by_name}</strong><small className="operator-email">{record.entered_by_email}</small></td></tr>)}</tbody></table></div>}
      </section>
    </main>
  )
}

function Stepper({ step }) {
  return <ol className="stepper">{['内容入力', '最終確認'].map((label, index) => <li key={label} className={index + 1 <= step ? 'active' : ''}><span>{index + 1 < step ? <Check /> : index + 1}</span>{label}</li>)}</ol>
}

function Field({ field, value, onChange }) {
  const [key, label, kind = 'text', options, inputProps = {}] = field
  if (kind === 'textarea') return <label className="wide">{label}<textarea rows="3" value={value ?? ''} onChange={(event) => onChange(key, event.target.value)} /></label>
  if (kind === 'select') return <label>{label}<select value={value ?? ''} onChange={(event) => onChange(key, event.target.value)}><option value="">選択しない</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
  return <label>{label}<input type={kind} {...inputProps} value={value ?? ''} onChange={(event) => onChange(key, event.target.value)} /></label>
}

function RegisterFlow({ operationKey, operator, onCancel, onComplete }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => newForm(operationKey))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const operation = OPERATIONS[operationKey]
  const selectedType = TYPES[form.application_type]
  const fields = [
    ...selectedType.fields,
    ...OPERATION_FIELDS[operationKey],
    ...USAGE_FIELDS[operationKey],
    ...(selectedType.secondaryFields ?? []),
  ]
  const operatorName = operator.profile?.display_name || operator.user?.email
  const operatorEmail = operator.user?.email

  const setDetail = (key, value) => setForm((current) => ({ ...current, details: { ...current.details, [key]: value } }))
  const next = () => {
    setError('')
    setStep((current) => current + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const submit = async () => {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/approved-applications/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
        body: JSON.stringify({
          operation_type: form.operation_type,
          application_type: form.application_type,
          applicant_name: form.applicant_name,
          department: form.department,
          details: form.details,
          notes: form.notes,
        }),
      })
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
        {step === 1 && <><h1>{operation.label}内容を入力</h1><p className="lead">申請書を見ながら、分かる範囲を記載してください。</p><div className="form-grid"><div className="responsible-card wide"><span>登録責任者（変更不可）</span><strong>{operatorName}</strong><small>{operatorEmail}</small><p>ログイン中のアカウントが自動で記録されます。</p></div><label>機器種別<select value={form.application_type} onChange={(event) => setForm((current) => ({ ...current, application_type: event.target.value }))}>{Object.entries(TYPES).map(([key, type]) => <option key={key} value={key}>{type.label}</option>)}</select></label><label>申請者氏名<input value={form.applicant_name} onChange={(event) => setForm({ ...form, applicant_name: event.target.value })} /></label><label>所属部署<select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}><option value="">選択しない</option>{DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}</select></label>{fields.map((field) => <Field key={field[0]} field={field} value={form.details[field[0]]} onChange={setDetail} />)}<label className="wide">担当者メモ<textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div></>}
        {step === 2 && <><h1>登録内容を確認</h1><p className="lead">未入力の項目は「未入力」と表示されます。このまま登録できます。</p><dl className="review-list"><div><dt>登録責任者</dt><dd>{operatorName}（{operatorEmail}）</dd></div><div><dt>処理</dt><dd>{operation.label}</dd></div><div><dt>機器種別</dt><dd>{TYPES[form.application_type].label}</dd></div><div><dt>申請者氏名</dt><dd>{form.applicant_name || '未入力'}</dd></div><div><dt>所属部署</dt><dd>{form.department || '未入力'}</dd></div>{fields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{form.details[key] || '未入力'}</dd></div>)}</dl></>}
        {error && <div className="alert error"><X />{error}</div>}
        <div className="flow-actions">{step > 1 && <button className="button secondary" onClick={() => setStep(step - 1)}><ArrowLeft />戻る</button>}<span />{step < 2 ? <button className="button primary" onClick={next}>確認へ<ArrowRight /></button> : <button className="button primary" onClick={submit} disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <FileSpreadsheet />}台帳へ登録</button>}</div>
      </section>
    </main>
  )
}

function Complete({ result, onDone }) {
  return <main className="complete-page"><section className="complete-card"><span className="complete-icon"><CheckCircle2 /></span><h1>登録が完了しました</h1>{result.ledger_warning ? <div className="alert error">{result.ledger_warning}</div> : <p>Excel台帳も更新されました。</p>}<div className="reference"><small>受付番号</small><strong>{result.reference_number}</strong></div><button className="button primary" onClick={onDone}>一覧へ戻る</button></section></main>
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authRoute, setAuthRoute] = useState(() => window.location.hash)
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

  useEffect(() => {
    const updateRoute = () => setAuthRoute(window.location.hash)
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  const logout = async () => { await fetch('/api/auth/logout/', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRFToken': csrfToken() } }).catch(() => null); setSession({ authenticated: false }) }
  const start = (key) => { setOperation(key); setScreen('register') }
  const goToAuth = (path = '') => { window.location.hash = path; setAuthRoute(window.location.hash) }
  if (!session) return <div className="boot"><LoaderCircle className="spin" />読み込み中</div>
  if (!session.authenticated) {
    const [path, query = ''] = authRoute.replace(/^#/, '').split('?')
    const params = new URLSearchParams(query)
    if (path === '/activate-account') return <SetNewPassword mode="invitation" token={params.get('token')} onComplete={() => goToAuth()} />
    if (path === '/reset-password') return <SetNewPassword mode="reset" uid={params.get('uid')} token={params.get('token')} onComplete={() => goToAuth()} />
    if (path === '/forgot-password') return <ForgotPassword onBack={() => goToAuth()} />
    return <Login onForgotPassword={() => goToAuth('/forgot-password')} onLogin={(body) => { goToAuth(); setSession(body); loadRecords() }} />
  }

  return <div className="app-shell"><Header user={session.user} onLogout={logout} />{screen === 'register' ? <RegisterFlow operationKey={operation} operator={session} onCancel={() => setScreen('dashboard')} onComplete={(body) => { setResult(body); setScreen('complete') }} /> : screen === 'complete' ? <Complete result={result} onDone={() => { setScreen('dashboard'); loadRecords() }} /> : <Dashboard records={records} loading={loading} onNew={start} />}</div>
}
