import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, FileSpreadsheet,
  KeyRound, LoaderCircle, LogIn, LogOut, Mail, PackageOpen,
  Search, X,
} from 'lucide-react'
import { OPERATIONS, TYPES, USAGE_FIELDS, OPERATION_FIELDS, DEPARTMENTS, newForm } from './formConfig'
import Field from './ApplicationField'
import LedgerWorkspace, { LedgerSyncSummary } from './LedgerWorkspace'
import { apiRequest, useActionSignal, useApiResource } from './ledgerApi'
import './App.css'

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

function Dashboard({ records, loading, error, onRefresh, onNew, onRead, onLedger }) {
  const [query, setQuery] = useState('')
  const visible = records.filter((record) => `${record.reference_number} ${record.applicant_name} ${record.department} ${(TYPES[record.application_type]?.label || 'その他')} ${OPERATIONS[record.operation_type]?.label}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <main className="workspace">
      <section className="dashboard-head"><span className="eyebrow">QUICK ENTRY</span><h1>何を記録しますか？</h1><p>処理を選ぶと、必要な項目だけが表示されます。</p></section>
      <section className="operation-grid">
        {Object.entries(OPERATIONS).map(([key, operation]) => {
          const Icon = operation.icon
          return <button key={key} className={`operation-card ${operation.tone}`} onClick={() => onNew(key)}><span><Icon /></span><div><strong>{operation.label}</strong><small>{operation.description}</small></div><ArrowRight /></button>
        })}
      </section>
      <div className="dashboard-ledger-link"><div><strong>登録済みの内容を確認する</strong><p>機器ごとの台帳全体を見て、修正・取消・履歴の確認ができます。</p></div><button className="button secondary" onClick={onLedger}><FileSpreadsheet />台帳を確認<ArrowRight /></button></div><section className="records-card">
        <div className="section-head"><div><span className="eyebrow">RECENT</span><h2>最近の登録</h2></div><label className="search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="受付番号・氏名で検索" /></label></div>
        {error ? <div className="ledger-error"><div className="alert error" role="alert">{error}</div><button className="button secondary" onClick={onRefresh}>再読み込み</button></div> : loading ? <div className="empty"><LoaderCircle className="spin" />読み込み中</div> : visible.length === 0 ? <div className="empty"><FileSpreadsheet /><strong>{query ? '該当する登録はありません' : 'まだ登録はありません'}</strong></div> : <div className="table-wrap"><table><thead><tr><th>受付番号</th><th>処理</th><th>機器</th><th>申請者</th><th>部署</th><th>登録責任者</th></tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td><button className="row-detail-button" onClick={() => onRead(record)}>{record.reference_number}</button></td><td><span className={`operation-chip ${record.operation_type}`}>{OPERATIONS[record.operation_type]?.label || '貸出'}</span></td><td>{(TYPES[record.application_type]?.label || 'その他')}</td><td>{record.applicant_name || '—'}</td><td>{record.department || '—'}</td><td><strong>{record.entered_by_name}</strong><small className="operator-email">{record.entered_by_email}</small></td></tr>)}</tbody></table></div>}
      </section>
    </main>
  )
}

function Stepper({ step }) {
  return <ol className="stepper">{['内容入力', '最終確認'].map((label, index) => <li key={label} className={index + 1 <= step ? 'active' : ''}><span>{index + 1 < step ? <Check /> : index + 1}</span>{label}</li>)}</ol>
}

function RegisterFlow({ operationKey, operator, onCancel, onComplete, onUnauthorized, registerLeaveGuard }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => newForm(operationKey))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const getSignal = useActionSignal()
  const isDirty = Boolean(form.applicant_name || form.department || form.notes || Object.values(form.details).some((value) => value !== ''))
  useEffect(() => registerLeaveGuard(() => {
    if (busy) return false
    return !isDirty || window.confirm('入力中の登録内容を破棄して画面を移動しますか？')
  }), [registerLeaveGuard, isDirty, busy])
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
    const signal = getSignal()
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/approved-applications/', {
        method: 'POST', signal,
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
      if (response.status === 401 || body.code === 'authentication_required') onUnauthorized()
      if (signal.aborted) return
      if (!response.ok) throw new Error(errorText(body, '登録できませんでした。'))
      onComplete(body)
    } catch (requestError) {
      if (signal.aborted) return
      setError(requestError.message || 'サーバーへ接続できませんでした。')
    } finally {
      if (!signal.aborted) setBusy(false)
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

function Complete({ result, onDone, onLedger }) {
  const pending = result.ledger_synced === false || Boolean(result.ledger_warning)
  return <main className="complete-page"><section className="complete-card"><span className={`complete-icon ${pending ? 'pending' : ''}`}><CheckCircle2 /></span><h1>{pending ? '登録は保存されました' : '登録が完了しました'}</h1>{pending ? <div className="alert error" role="alert">{result.ledger_warning || 'Excelにはまだ反映されていません。台帳画面で同期を再試行してください。'}</div> : <p>Excel台帳も更新されました。</p>}<div className="reference"><small>受付番号</small><strong>{result.reference_number}</strong></div><div className="complete-actions"><button className="button primary" onClick={onLedger}><FileSpreadsheet />登録内容・台帳を確認</button><button className="button secondary" onClick={onDone}>続けて登録する</button></div></section></main>
}

function AuthenticatedApp({ session, onLogout, onUnauthorized }) {
  const [screen, setScreen] = useState('dashboard')
  const [operation, setOperation] = useState(null)
  const [result, setResult] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [ledgerEntry, setLedgerEntry] = useState({ type: 'pc', id: null, key: 0 })
  const refreshData = useCallback(() => setRefresh((value) => value + 1), [])
  const leaveGuard = useRef(() => true)
  const registerLeaveGuard = useCallback((guard) => {
    leaveGuard.current = guard
    return () => { if (leaveGuard.current === guard) leaveGuard.current = () => true }
  }, [])
  const dashboard = () => { if (leaveGuard.current()) { setScreen('dashboard'); refreshData() } }

  const records = useApiResource('/api/approved-applications/', refresh, onUnauthorized)
  const summaries = useApiResource('/api/ledgers/', refresh, onUnauthorized)
  const openLedger = (type = 'pc', id = null) => {
    if (!leaveGuard.current()) return
    setLedgerEntry((current) => ({ type, id, key: current.key + 1 }))
    setScreen('ledgers')
  }
  const start = (key) => { setOperation(key); setScreen('register') }

  return <div className="app-shell"><Header user={session.user} onLogout={() => { if (leaveGuard.current()) onLogout() }} />
    <nav className="workspace-nav" aria-label="メインメニュー">
      <button className={screen !== 'ledgers' ? 'active' : ''} aria-current={screen !== 'ledgers' ? 'page' : undefined} onClick={dashboard}><PackageOpen />登録する</button>
      <button className={screen === 'ledgers' ? 'active' : ''} aria-current={screen === 'ledgers' ? 'page' : undefined} onClick={() => openLedger()}><FileSpreadsheet />台帳を確認</button>
    </nav>
    <LedgerSyncSummary ledgers={summaries.data} error={summaries.error} onOpen={openLedger} onRefresh={refreshData} />
    {screen === 'register' ? <RegisterFlow key={operation} operationKey={operation} operator={session} onUnauthorized={onUnauthorized} registerLeaveGuard={registerLeaveGuard} onCancel={dashboard} onComplete={(body) => { setResult(body); setScreen('complete'); refreshData() }} />
      : screen === 'complete' ? <Complete result={result} onDone={() => { setScreen('dashboard'); refreshData() }} onLedger={() => openLedger(result.application_type || 'pc', result.id)} />
        : screen === 'ledgers' ? <LedgerWorkspace key={ledgerEntry.key} initialType={ledgerEntry.type} initialRecordId={ledgerEntry.id} refresh={refresh} onRefresh={refreshData} onUnauthorized={onUnauthorized} registerLeaveGuard={registerLeaveGuard} />
          : <Dashboard records={records.data ?? []} loading={records.loading} error={records.error} onRefresh={refreshData} onNew={start} onLedger={() => openLedger()} onRead={(record) => openLedger(record.application_type, record.id)} />}
  </div>
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authRoute, setAuthRoute] = useState(() => window.location.hash)
  const [logoutError, setLogoutError] = useState('')
  const onUnauthorized = useCallback(() => setSession({ authenticated: false }), [])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/auth/session/', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(readJson).then((body) => { if (!controller.signal.aborted) setSession(body) })
      .catch(() => { if (!controller.signal.aborted) setSession({ authenticated: false }) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const updateRoute = () => setAuthRoute(window.location.hash)
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  const logout = async () => {
    setLogoutError('')
    try {
      await apiRequest('/api/auth/logout/', { method: 'POST', body: {} })
      setSession({ authenticated: false })
    } catch { setLogoutError('ログアウトできませんでした。接続を確認して、もう一度お試しください。') }
  }
  const goToAuth = (path = '') => { window.location.hash = path; setAuthRoute(window.location.hash) }
  if (!session) return <div className="boot"><LoaderCircle className="spin" />読み込み中</div>
  if (!session.authenticated) {
    const [path, query = ''] = authRoute.replace(/^#/, '').split('?')
    const params = new URLSearchParams(query)
    if (path === '/activate-account') return <SetNewPassword mode="invitation" token={params.get('token')} onComplete={() => goToAuth()} />
    if (path === '/reset-password') return <SetNewPassword mode="reset" uid={params.get('uid')} token={params.get('token')} onComplete={() => goToAuth()} />
    if (path === '/forgot-password') return <ForgotPassword onBack={() => goToAuth()} />
    return <Login onForgotPassword={() => goToAuth('/forgot-password')} onLogin={(body) => { goToAuth(); setLogoutError(''); setSession(body) }} />
  }
  return <>{logoutError && <div className="alert error logout-error" role="alert">{logoutError}</div>}<AuthenticatedApp key={session.user?.id || session.user?.email} session={session} onLogout={logout} onUnauthorized={onUnauthorized} /></>
}
