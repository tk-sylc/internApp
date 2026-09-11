import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CheckCircle2, FileSpreadsheet,
  KeyRound, LoaderCircle, LogIn, LogOut, Mail, PackageOpen,
  Search, X,
} from 'lucide-react'
import { OPERATIONS, TYPES } from './formConfig'
import RegisterFlow from './RegisterFlow'
import LedgerWorkspace, { LedgerSyncSummary } from './LedgerWorkspace'
import { apiRequest, useApiResource } from './ledgerApi'
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

function Dashboard({ records, loading, error, onRefresh, onNew, onRead }) {
  const [query, setQuery] = useState('')
  const visible = records.filter((record) => `${record.reference_number} ${record.applicant_name} ${record.department} ${(TYPES[record.application_type]?.label || 'その他')} ${OPERATIONS[record.operation_type]?.label}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <main className="workspace">
      <section className="dashboard-head"><h1>申請を登録</h1></section>
      <section className="operation-grid">
        {Object.entries(OPERATIONS).map(([key, operation]) => {
          return <button key={key} className="operation-card" onClick={() => onNew(key)}><div><strong>{operation.label}</strong><small>{operation.description}</small></div></button>
        })}
      </section>
      <section className="records-card">
        <div className="section-head"><h2>最近の登録</h2><label className="search"><Search aria-hidden="true" /><input aria-label="最近の登録を検索" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="受付番号・氏名で検索" /></label></div>
        {error ? <div className="ledger-error"><div className="alert error" role="alert">{error}</div><button className="button secondary" onClick={onRefresh}>再読み込み</button></div> : loading ? <div className="empty"><LoaderCircle className="spin" />読み込み中</div> : visible.length === 0 ? <div className="empty"><FileSpreadsheet /><strong>{query ? '該当する登録はありません' : 'まだ登録はありません'}</strong></div> : <div className="table-wrap"><table><thead><tr><th>受付番号</th><th>処理</th><th>機器</th><th>申請者</th><th>部署</th><th>登録責任者</th></tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td><button className="row-detail-button" onClick={() => onRead(record)}>{record.reference_number}</button></td><td><span className={`operation-chip ${record.operation_type}`}>{OPERATIONS[record.operation_type]?.label || '貸出'}</span></td><td>{(TYPES[record.application_type]?.label || 'その他')}</td><td>{record.applicant_name || '—'}</td><td>{record.department || '—'}</td><td><strong>{record.entered_by_name}</strong><small className="operator-email">{record.entered_by_email}</small></td></tr>)}</tbody></table></div>}
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
