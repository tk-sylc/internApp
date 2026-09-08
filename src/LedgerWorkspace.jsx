import { useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, History, LoaderCircle, Pencil, RefreshCw, RotateCcw, Search, Trash2, X } from 'lucide-react'
import Field from './ApplicationField'
import { DEPARTMENTS, OPERATIONS, OPERATION_FIELDS, TYPES as REGISTRATION_TYPES, USAGE_FIELDS } from './formConfig'
import { apiRequest, useActionSignal, useApiResource } from './ledgerApi'

const TYPES = { ...REGISTRATION_TYPES, other: { label: 'その他', fields: [['summary', '転記内容', 'textarea']] } }

const displayValue = (value) => value === null || value === undefined || value === '' ? '未入力' : typeof value === 'object' ? JSON.stringify(value) : String(value)
function historyValue(field, value) {
  if (field === 'application_type') return TYPES[value]?.label || displayValue(value)
  if (field === 'operation_type') return OPERATIONS[value]?.label || displayValue(value)
  if (field === 'is_cancelled' && typeof value === 'boolean') return value ? '取消済み' : '有効'
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ'
  return displayValue(value)
}
const formatDate = (value) => value ? new Date(value).toLocaleString('ja-JP') : '—'
const allDefinitions = Object.fromEntries([
  ...Object.values(TYPES).flatMap((type) => [...type.fields, ...(type.secondaryFields ?? [])]),
  ...Object.values(OPERATION_FIELDS).flat(), ...Object.values(USAGE_FIELDS).flat(),
].map((field) => [field[0], field]))

function getFields(form) {
  const type = TYPES[form.application_type]
  const selected = [...(type?.fields ?? []), ...(OPERATION_FIELDS[form.operation_type] ?? []), ...(USAGE_FIELDS[form.operation_type] ?? []), ...(type?.secondaryFields ?? [])]
  const fields = new Map(selected.map((field) => [field[0], field]))
  Object.keys(form.details ?? {}).forEach((key) => {
    if (!fields.has(key)) fields.set(key, allDefinitions[key] ?? [key, key, 'textarea'])
  })
  return [...fields.values()]
}

function Alert({ children, kind = 'error' }) {
  return <div className={`alert ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{kind === 'error' ? <AlertCircle /> : <CheckCircle2 />}<div>{children}</div></div>
}

export function LedgerSyncSummary({ ledgers, error, onOpen, onRefresh }) {
  if (error) return <div className="sync-overview"><Alert>Excel同期状態を確認できません。{error} <button className="inline-button" onClick={onRefresh}>再読み込み</button></Alert></div>
  const pending = ledgers?.filter((ledger) => ledger.sync?.state !== 'synced') ?? []
  if (!pending.length) return null
  return <aside className="sync-overview" aria-label="Excel未反映の台帳"><div className="sync-summary"><AlertCircle /><div><strong>Excelに未反映の台帳があります</strong><p>アプリの登録内容は保存されています。対象の台帳から同期を再試行してください。</p><div className="sync-links">{pending.map((ledger) => <button className="inline-button" key={ledger.application_type} onClick={() => onOpen(ledger.application_type)}>{ledger.label || TYPES[ledger.application_type]?.label}を確認 <span aria-hidden="true">→</span></button>)}</div></div></div></aside>
}

function SyncStatus({ sync, onRetry, busy }) {
  const isSynced = sync?.state === 'synced'
  return <div className={`sync-status ${isSynced ? 'is-synced' : 'is-pending'}`} role="status">
    {isSynced ? <CheckCircle2 /> : <AlertCircle />}
    <div><strong>{isSynced ? 'Excelは最新です' : 'Excelに未反映の内容があります'}</strong><p>{isSynced ? `最終同期：${formatDate(sync?.synced_at)}` : '登録内容はアプリで確認できます。Excel同期を再試行してください。'}</p>{!isSynced && sync?.error && <p>{sync.error}</p>}</div>
    {!isSynced && <button className="button secondary" disabled={busy} onClick={onRetry}>{busy ? <LoaderCircle className="spin" /> : <RefreshCw />}同期を再試行</button>}
  </div>
}

function RecordHistory({ entries }) {
  const labels = { create: '登録', update: '修正', cancel: '取消', restore: '復元' }
  return <section className="history-section"><div className="detail-section-head"><History /><h2>変更履歴</h2><span>{entries.length}件</span></div><p className="help-text">操作した担当者と変更内容を自動記録します。この機能の導入前の変更履歴はありません。</p>
    {!entries.length ? <p className="history-empty">記録されている変更履歴はありません。</p> : <ol className="history-list">{entries.map((entry, index) => <li key={entry.id ?? index}><details open={index === 0}><summary><span className={`history-action ${entry.action}`}>{labels[entry.action] || entry.action}</span><strong>{entry.actor_name || entry.actor_email || '不明'}</strong><time>{formatDate(entry.created_at)}</time></summary><div className="history-content">{entry.actor_email && <p className="help-text">{entry.actor_email}</p>}{entry.reason && <p><strong>理由：</strong>{entry.reason}</p>}{entry.changes?.length > 0 ? <div className="table-wrap"><table className="history-table"><caption className="sr-only">変更前と変更後の内容</caption><thead><tr><th scope="col">項目</th><th scope="col">変更前</th><th scope="col">変更後</th></tr></thead><tbody>{entry.changes.map((change, changeIndex) => <tr key={`${change.field}-${changeIndex}`}><th scope="row">{change.label || change.field}</th><td>{historyValue(change.field, change.before)}</td><td>{historyValue(change.field, change.after)}</td></tr>)}</tbody></table></div> : <p className="help-text">項目の変更はありません。</p>}</div></details></li>)}</ol>}
  </section>
}

function RecordContent({ record, onChanged, onReload, onUnauthorized, onBack, registerLeaveGuard }) {
  const [form, setForm] = useState(() => ({ operation_type: record.operation_type, application_type: record.application_type, applicant_name: record.applicant_name ?? '', department: record.department ?? '', details: { ...record.details }, notes: record.notes ?? '' }))
  const [editing, setEditing] = useState(false)
  const [cancelStep, setCancelStep] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const getSignal = useActionSignal()
  const fields = getFields(form)
  const hasChanges = ['operation_type', 'application_type', 'applicant_name', 'department', 'notes'].some((key) => form[key] !== (record[key] ?? '')) || JSON.stringify(form.details) !== JSON.stringify(record.details ?? {})
  useEffect(() => registerLeaveGuard(() => {
    if (busy) return false
    return !editing || !hasChanges || window.confirm('保存していない修正を破棄して画面を移動しますか？')
  }), [registerLeaveGuard, editing, hasChanges, busy])
  useEffect(() => {
    if (!editing || !hasChanges) return undefined
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [editing, hasChanges])
  const setDetail = (key, value) => setForm((current) => ({ ...current, details: { ...current.details, [key]: value } }))
  const leave = () => {
    if (hasChanges && editing && !window.confirm('保存していない修正を破棄して台帳へ戻りますか？')) return
    onBack()
  }
  const save = async (action, event) => {
    event?.preventDefault()
    if (busy || conflict) return
    const signal = getSignal()
    setBusy(true); setError('')
    try {
      const url = `/api/approved-applications/${record.id}/${action === 'update' ? '' : `${action}/`}`
      const body = action === 'update' ? { ...form, revision: record.revision } : { revision: record.revision, ...(action === 'cancel' ? { reason: reason.trim() } : {}) }
      const result = await apiRequest(url, { method: action === 'update' ? 'PATCH' : 'POST', body, signal })
      if (signal.aborted) return
      onChanged(result, action)
    } catch (requestError) {
      if (signal.aborted) return
      if ((requestError.status === 401 || requestError.code === 'authentication_required')) onUnauthorized()
      setConflict(requestError.status === 409)
      setError(requestError.message || '通信に失敗しました。最新内容と履歴を確認してから再度お試しください。')
    } finally { if (!signal.aborted) setBusy(false) }
  }
  const discardEdit = () => {
    if (hasChanges && !window.confirm('保存していない修正を破棄しますか？')) return
    onReload()
  }

  return <>
    <div className="flow-top"><button className="text-button" onClick={leave} disabled={busy}><ArrowLeft />台帳へ戻る</button><span className="help-text">受付番号 {record.reference_number}</span></div>
    <section className="record-detail-card">
      <div className="record-title"><div><span className="eyebrow">REGISTRATION</span><h1>{editing ? '登録内容を修正' : '登録内容を確認'}</h1><p className="help-text">{TYPES[record.application_type]?.label}・{OPERATIONS[record.operation_type]?.label} ／ 更新 {formatDate(record.updated_at || record.created_at)}</p></div>{record.is_cancelled ? <span className="cancelled-badge">取消済み</span> : !editing && <button className="button primary" onClick={() => setEditing(true)}><Pencil />修正する</button>}</div>
      <div className="responsible-card"><span>登録責任者</span><strong>{record.entered_by_name || record.entered_by_email || '不明'}</strong><small>{record.entered_by_email}</small><p>登録日時：{formatDate(record.created_at)}。修正した担当者は変更履歴に記録され、登録責任者は変わりません。</p></div>
      {record.is_cancelled && <div className="cancelled-notice"><strong>この登録は台帳・Excelから除外されています。</strong><p>取消理由：{record.cancellation_reason || '—'}</p><button className="button secondary" disabled={busy || conflict} onClick={() => { if (window.confirm('この登録を復元し、台帳とExcelへ戻しますか？')) save('restore') }}><RotateCcw />{busy ? '復元中…' : '登録を復元する'}</button></div>}
      {error && <Alert>{error}{conflict && <div className="conflict-actions"><p>他の担当者による更新を上書きしないため、保存を停止しました。</p><button className="button secondary" onClick={() => { if (!hasChanges || window.confirm('入力中の内容を破棄して、最新の登録内容を読み込みますか？')) onReload() }}><RefreshCw />最新内容を読み直す</button></div>}</Alert>}
      {editing ? <form onSubmit={(event) => save('update', event)}>
        <p className="help-text edit-guidance">他の担当者が登録した内容も修正できます。保存すると台帳とExcelに反映されます。</p>
        <fieldset className="edit-fieldset" disabled={busy || conflict}><div className="form-grid">
          <label>処理<select value={form.operation_type} onChange={(event) => setForm({ ...form, operation_type: event.target.value })}>{Object.entries(OPERATIONS).map(([key, operation]) => <option key={key} value={key}>{operation.label}</option>)}</select></label>
          <label>機器種<select value={form.application_type} onChange={(event) => setForm({ ...form, application_type: event.target.value })}>{Object.entries(TYPES).map(([key, type]) => <option key={key} value={key}>{type.label}</option>)}</select></label>
          <label>申請者氏名<input value={form.applicant_name} onChange={(event) => setForm({ ...form, applicant_name: event.target.value })} /></label>
          <label>所属部署<select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}><option value="">選択しない</option>{form.department && !DEPARTMENTS.includes(form.department) && <option>{form.department}</option>}{DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}</select></label>
          {fields.map((field) => typeof form.details[field[0]] === 'object' && form.details[field[0]] !== null ? <label className="wide" key={field[0]}>{field[1]}（保存済みの詳細）<textarea value={JSON.stringify(form.details[field[0]], null, 2)} readOnly /><small>複合形式の値は保持されます。</small></label> : <Field key={field[0]} field={field} value={form.details[field[0]]} onChange={setDetail} />)}
          <label className="wide">担当者メモ<textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        </div></fieldset>
        <div className="detail-actions"><button type="button" className="button secondary" disabled={busy} onClick={discardEdit}>修正をやめる</button><button className="button primary" disabled={busy || conflict || !hasChanges}>{busy ? <LoaderCircle className="spin" /> : <CheckCircle2 />}修正を保存する</button></div>
        <section className="cancel-section"><h2>誤登録の取消</h2><p>二重登録などを台帳とExcelから除外します。機器の「廃棄」とは別の操作で、元の登録内容と履歴は残ります。</p>
          {!cancelStep ? <button type="button" className="button danger-outline" disabled={busy || conflict} onClick={() => setCancelStep(true)}><Trash2 />この登録を取り消す</button> : <div className="cancel-confirm"><label>取消理由（必須）<textarea value={reason} maxLength={1000} rows="3" onChange={(event) => setReason(event.target.value)} placeholder="例：同じ申請を二重に登録したため" disabled={busy || conflict} /></label><p>取消を確定します。入力中の修正は保存されません。必要な場合は後から復元できます。</p><div className="detail-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => setCancelStep(false)}>取消をやめる</button><button type="button" className="button danger" disabled={busy || conflict || !reason.trim()} onClick={() => save('cancel')}>{busy ? <LoaderCircle className="spin" /> : <Trash2 />}取消を確定する</button></div></div>}
        </section>
      </form> : <dl className="review-list record-review"><div><dt>処理</dt><dd>{OPERATIONS[record.operation_type]?.label}</dd></div><div><dt>機器種</dt><dd>{TYPES[record.application_type]?.label}</dd></div><div><dt>申請者氏名</dt><dd>{displayValue(record.applicant_name)}</dd></div><div><dt>所属部署</dt><dd>{displayValue(record.department)}</dd></div>{getFields(record).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{displayValue(record.details?.[key])}</dd></div>)}<div><dt>担当者メモ</dt><dd>{displayValue(record.notes)}</dd></div></dl>}
    </section>
    <RecordHistory entries={record.history ?? []} />
  </>
}

export default function LedgerWorkspace({ initialType = 'pc', initialRecordId = null, refresh, onRefresh, onUnauthorized, registerLeaveGuard }) {
  const [type, setType] = useState(initialType)
  const [recordId, setRecordId] = useState(initialRecordId)
  const [query, setQuery] = useState('')
  const [includeCancelled, setIncludeCancelled] = useState(false)
  const [flash, setFlash] = useState(null)
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState('')
  const getSignal = useActionSignal()
  const ledger = useApiResource(recordId ? null : `/api/ledgers/${type}/${includeCancelled ? '?include_cancelled=1' : ''}`, refresh, onUnauthorized)
  const detail = useApiResource(recordId ? `/api/approved-applications/${recordId}/` : null, refresh, onUnauthorized)
  const rows = ledger.data?.rows ?? []
  const visibleRows = rows.filter((row) => row.cells.some((cell) => String(cell ?? '').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))
  const pickType = (nextType) => { setType(nextType); setQuery(''); setFlash(null); setActionError('') }
  const changed = (result, action) => {
    const labels = { update: '修正を保存しました。', cancel: '登録を取り消しました。', restore: '登録を復元しました。' }
    setFlash({ text: `${labels[action]}${result.ledger_warning ? ` ${result.ledger_warning}` : result.ledger_synced === false ? ' Excelに未反映です。台帳画面から同期を再試行してください。' : ' Excel台帳にも反映しました。'}`, warning: Boolean(result.ledger_warning) || result.ledger_synced === false })
    if (result.application_type) setType(result.application_type)
    onRefresh()
  }
  const ledgerAction = async (action) => {
    const signal = getSignal()
    setBusy(action); setActionError('')
    try {
      if (action === 'sync') {
        const result = await apiRequest(`/api/ledgers/${type}/sync/`, { method: 'POST', body: {}, signal })
        if (signal.aborted) return
        if (result.sync?.state !== 'synced') throw new Error(result.sync?.error || 'Excelの同期が完了しませんでした。再試行してください。')
        setFlash({ text: 'Excelを最新の登録内容に同期しました。' })
      } else {
        const response = await apiRequest(`/api/ledgers/${type}/download/`, { signal, download: true })
        const blob = await response.blob()
        if (signal.aborted) return
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl; link.download = `${TYPES[type].label}_台帳.xlsx`
        document.body.appendChild(link); link.click(); link.remove()
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
        setFlash({ text: '最新の台帳全体をダウンロードしました。検索条件はExcelに適用されません。' })
      }
    } catch (error) {
      if (signal.aborted) return
      if ((error.status === 401 || error.code === 'authentication_required')) onUnauthorized()
      setActionError(error.message || '処理に失敗しました。再試行してください。')
    } finally {
      if (!signal.aborted) { setBusy(''); onRefresh() }
    }
  }

  if (recordId) return <main className="workspace detail-workspace">
    {flash && <Alert kind={flash.warning ? 'error' : 'success'}>{flash.text}</Alert>}
    {detail.loading ? <div className="empty" role="status"><LoaderCircle className="spin" />登録内容を読み込み中</div> : detail.error ? <><button className="text-button" onClick={() => setRecordId(null)}><ArrowLeft />台帳へ戻る</button><Alert>{detail.error} <button className="inline-button" onClick={onRefresh}>再読み込み</button></Alert></> : detail.data && <RecordContent key={`${detail.data.id}-${detail.data.revision}-${refresh}`} record={detail.data} onChanged={changed} onUnauthorized={onUnauthorized} registerLeaveGuard={registerLeaveGuard} onReload={onRefresh} onBack={() => { setRecordId(null); setFlash(null) }} />}
  </main>

  return <main className="workspace ledger-workspace">
    <section className="ledger-heading"><div><span className="eyebrow">EQUIPMENT LEDGERS</span><h1>台帳を確認</h1><p>全体を見ながら、登録内容の確認・修正ができます。</p></div><span className="ledger-policy"><FileSpreadsheet />Excelはアプリの登録内容から更新</span></section>
    <div className="ledger-types" role="group" aria-label="機器種別">{Object.entries(TYPES).map(([key, item]) => <button key={key} className={type === key ? 'selected' : ''} aria-pressed={type === key} disabled={Boolean(busy)} onClick={() => pickType(key)}><FileSpreadsheet />{item.label}</button>)}</div>
    {flash && <Alert kind={flash.warning ? 'error' : 'success'}>{flash.text}</Alert>}
    {actionError && <Alert>{actionError}</Alert>}
    {ledger.data && <SyncStatus sync={ledger.data.sync} busy={Boolean(busy)} onRetry={() => ledgerAction('sync')} />}
    <section className="records-card ledger-card">
      <div className="section-head"><div><h2>{TYPES[type].label}の台帳</h2><p className="help-text">Excelと同じ項目を、全列・全件表示します。</p></div><button className="button primary" disabled={Boolean(busy) || ledger.loading || Boolean(ledger.error)} onClick={() => ledgerAction('download')}>{busy === 'download' ? <LoaderCircle className="spin" /> : <Download />}台帳全体をExcelで取得</button></div>
      <div className="ledger-toolbar"><label className="search"><Search /><span className="sr-only">台帳の全項目から検索</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名前・管理番号など、全項目から検索" /></label>{query && <button className="text-button" onClick={() => setQuery('')}><X />検索を解除</button>}<label className="checkbox-label"><input type="checkbox" checked={includeCancelled} onChange={(event) => setIncludeCancelled(event.target.checked)} />取消済みも表示</label></div>
      <div className="ledger-table-meta"><span aria-live="polite">{ledger.loading ? '読み込み中…' : `${visibleRows.length} / ${rows.length}件${includeCancelled ? '（取消済みを含む）' : ''}`}</span><span>横にスクロールすると、すべての項目を確認できます。</span></div>
      {ledger.loading ? <div className="empty" role="status"><LoaderCircle className="spin" />台帳を読み込み中</div> : ledger.error ? <div className="ledger-error"><Alert>{ledger.error}</Alert><button className="button secondary" onClick={onRefresh}><RefreshCw />再読み込み</button></div> : !visibleRows.length ? <div className="empty"><FileSpreadsheet /><strong>{query ? '検索条件に一致する登録はありません' : 'この台帳にはまだ登録がありません'}</strong>{query && <button className="text-button" onClick={() => setQuery('')}>検索を解除して全体を表示</button>}</div> : <div className="table-wrap ledger-scroll" tabIndex={0} role="region" aria-label={`${TYPES[type].label}台帳・全列を横にスクロールできます`}><table className="ledger-table"><caption className="sr-only">{TYPES[type].label}台帳の全項目。詳細ボタンから登録内容を修正できます。</caption><thead><tr><th className="ledger-action-col" scope="col">確認・修正</th>{includeCancelled && <th scope="col">登録状態</th>}{ledger.data.columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} className={row.is_cancelled ? 'cancelled-row' : ''}><td className="ledger-action-col"><button className="row-detail-button" aria-label={`登録 ${row.cells[0] || row.id} の詳細・修正`} onClick={() => { setRecordId(row.id); setFlash(null); setActionError('') }}>詳細・修正</button></td>{includeCancelled && <td>{row.is_cancelled ? <span className="cancelled-badge">取消済み</span> : '有効'}</td>}{ledger.data.columns.map((column, index) => <td key={column.key}>{String(row.cells[index] ?? '')}</td>)}</tr>)}</tbody></table></div>}
      <p className="ledger-footer">Excelは検索条件にかかわらず、取消済みを除いた最新の台帳全体を取得します。ダウンロードしたExcelへの直接編集は、アプリに反映されません。</p>
    </section>
  </main>
}
