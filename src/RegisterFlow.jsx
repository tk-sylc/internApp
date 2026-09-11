import { useEffect, useReducer, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { OPERATIONS, TYPES, DEPARTMENTS, getEquipmentFields, getRequestFields } from './formConfig'
import Field from './ApplicationField'
import { apiRequest, useActionSignal, useBeforeUnload } from './ledgerApi'
import { entryReducer, initialEntry } from './equipmentPrefill'

const displayValue = (value) => value === '' || value === null || value === undefined ? '未入力' : String(value)
const shortDate = (value) => value ? new Date(value).toLocaleDateString('ja-JP') : ''

export default function RegisterFlow({ operationKey, operator, onCancel, onComplete, onUnauthorized, registerLeaveGuard }) {
  const [{ form, lookup, source, needsIdentityCheck }, dispatch] = useReducer(entryReducer, operationKey, initialEntry)
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingType, setPendingType] = useState(null)
  const submitting = useRef(false)
  const submission = useRef(null)
  const lookupRequest = useRef({ generation: 0, controller: null, timer: null, lastNumber: null })
  const getSignal = useActionSignal()
  const isDirty = Boolean(form.application_type !== 'pc' || form.applicant_name || form.department || form.notes || Object.values(form.details).some((value) => value !== ''))
  useBeforeUnload(isDirty || busy)
  useEffect(() => registerLeaveGuard(() => {
    if (busy) return false
    return !isDirty || window.confirm('入力中の登録内容を破棄して画面を移動しますか？')
  }), [registerLeaveGuard, isDirty, busy])
  useEffect(() => {
    const request = lookupRequest.current
    return () => { request.controller?.abort(); clearTimeout(request.timer); request.generation += 1 }
  }, [])

  const operation = OPERATIONS[operationKey]
  const equipmentFields = getEquipmentFields(form.application_type)
  const requestFields = getRequestFields(form.application_type, operationKey)
  const operatorName = operator.profile?.display_name || operator.user?.email
  const operatorEmail = operator.user?.email

  const invalidateLookup = () => {
    const request = lookupRequest.current
    request.generation += 1
    request.controller?.abort()
    clearTimeout(request.timer)
    request.lastNumber = null
  }

  const searchEquipment = (mode, value, delay = 0) => {
    const text = String(value ?? '').trim()
    if (!text || (mode === 'name' && text.length < 2)) {
      invalidateLookup()
      dispatch({ type: 'clear-lookup' })
      return
    }
    const key = `${form.application_type}:${text}`
    if (mode === 'number' && lookupRequest.current.lastNumber === key) return
    invalidateLookup()
    const request = lookupRequest.current
    const generation = request.generation
    if (mode === 'number') request.lastNumber = key
    dispatch({ type: 'loading', mode })
    request.timer = setTimeout(async () => {
      const controller = new AbortController()
      request.controller = controller
      const params = new URLSearchParams({ application_type: form.application_type, [mode === 'number' ? 'management_number' : 'q']: text })
      try {
        const data = await apiRequest(`/api/approved-applications/equipment-history/?${params}`, { signal: controller.signal })
        if (request.generation !== generation || controller.signal.aborted) return
        dispatch({ type: 'result', data, mode })
      } catch (requestError) {
        if (request.generation !== generation || controller.signal.aborted) return
        if (requestError.status === 401 || requestError.code === 'authentication_required') onUnauthorized()
        request.lastNumber = null
        dispatch({ type: 'error', message: '登録履歴を取得できませんでした。再試行するか、機器情報を手入力してください。' })
      }
    }, delay)
  }

  const setDetail = (key, value) => {
    if (key === 'management_number') invalidateLookup()
    dispatch({ type: 'detail', key, value })
    if (['device_name', 'model_name'].includes(key) && !String(form.details.management_number ?? '').trim()) searchEquipment('name', value, 400)
  }
  const changeType = (value) => {
    invalidateLookup()
    if (equipmentFields.some(([key]) => form.details[key] !== undefined && form.details[key] !== '')) {
      dispatch({ type: 'clear-lookup' })
      setPendingType(value)
      return
    }
    dispatch({ type: 'equipment-type', value })
  }
  const chooseCandidate = (candidate) => {
    invalidateLookup()
    lookupRequest.current.lastNumber = `${form.application_type}:${candidate.details.management_number ?? ''}`
    dispatch({ type: 'candidate', candidate })
  }
  const next = () => { setError(''); setStep(2); window.scrollTo({ top: 0 }) }
  const submit = async () => {
    if (submitting.current) return
    submitting.current = true
    const signal = getSignal()
    setBusy(true); setError('')
    try {
      const payload = JSON.stringify(form)
      if (!submission.current || submission.current.payload !== payload) submission.current = { payload, key: crypto.randomUUID() }
      const body = await apiRequest('/api/approved-applications/', {
        method: 'POST', signal, body: JSON.parse(payload), headers: { 'Idempotency-Key': submission.current.key },
      })
      if (!signal.aborted) onComplete(body)
    } catch (requestError) {
      if (signal.aborted) return
      if (requestError.status === 401 || requestError.code === 'authentication_required') onUnauthorized()
      setError(requestError.message || '登録できませんでした。')
    } finally {
      submitting.current = false
      if (!signal.aborted) setBusy(false)
    }
  }

  const lookupView = <div className="equipment-lookup wide">
    <div role="status" aria-live="polite">
      {needsIdentityCheck && <p>入力中の機器情報が残っています。管理番号と一致するか確認してください。</p>}
      {lookup.status === 'loading' && <p>登録履歴を確認しています…</p>}
      {lookup.status === 'missing' && <p>登録履歴がありません。機器情報を確認・入力してください。</p>}
      {source && <div className="equipment-source"><p>登録済みの機器情報を入力しました。変更できます。</p><small>参照元：{source.reference_number}（{shortDate(source.created_at)}・{OPERATIONS[source.operation_type]?.label}）</small>{operationKey === 'return' && source.related_loan && <p>前回の貸出（参考）：{source.related_loan.reference_number} ／ {source.related_loan.applicant_name || '申請者未入力'} ／ {source.related_loan.usage_start_date || shortDate(source.related_loan.created_at)}</p>}</div>}
      {lookup.status === 'kept' && <p>入力中の機器情報を使用します。</p>}
      {lookup.status === 'candidates' && lookup.candidates.length > 0 && <p>同じ機器を選ぶと、共通項目が入力されます。</p>}
    </div>
    {lookup.status === 'error' && <div className="alert error" role="alert"><div>{lookup.message}{form.details.management_number && <button type="button" className="inline-button" onClick={() => searchEquipment('number', form.details.management_number)}>再試行</button>}</div></div>}
    {lookup.pending && <div className="lookup-overwrite" role="group" aria-label="機器情報の上書き確認"><p>{lookup.pending.reference_number} の機器情報で、入力中の機器情報を置き換えますか？今回の申請内容は保持されます。</p><div><button type="button" className="button secondary" onClick={() => dispatch({ type: 'keep' })}>入力内容を使う</button><button type="button" className="button primary" onClick={() => dispatch({ type: 'confirm' })}>機器情報を置き換える</button></div></div>}
    {lookup.candidates?.length > 0 && <ul className="equipment-candidates" aria-label="登録済みの機器候補">{lookup.candidates.map((candidate) => <li key={candidate.id}><button type="button" onClick={() => chooseCandidate(candidate)}><strong>{candidate.details.management_number || '管理番号なし'} / {candidate.details.device_name || candidate.details.model_name || '機器名未入力'}</strong><span>{shortDate(candidate.created_at)}・{OPERATIONS[candidate.operation_type]?.label} ／ {candidate.applicant_name || '申請者未入力'} ／ {candidate.reference_number}</span></button></li>)}</ul>}
  </div>

  return <main className="flow-page">
    <div className="flow-top"><button className="text-button" onClick={onCancel} disabled={busy}>一覧へ戻る</button><ol className="stepper" aria-label="登録の手順"><li className={step === 1 ? 'active' : ''} aria-current={step === 1 ? 'step' : undefined}>1 内容入力</li><li className={step === 2 ? 'active' : ''} aria-current={step === 2 ? 'step' : undefined}>2 確認</li></ol></div>
    <section className="flow-card">
      <h1>{operation.label}{step === 1 ? '内容を入力' : '内容を確認'}</h1>
      {step === 1 ? <>
        <section className="form-section" aria-labelledby="equipment-heading">
          <h2 className="form-section-title" id="equipment-heading">機器情報</h2>
          <p className="form-section-help">管理番号を入力すると、過去に登録した機器情報が入ります。各項目は変更できます。</p>
          <div className="form-grid">
            <label>機器種別<select value={form.application_type} onChange={(event) => changeType(event.target.value)}>{Object.entries(TYPES).map(([key, type]) => <option key={key} value={key}>{type.label}</option>)}</select></label>
            <label>管理番号<input value={form.details.management_number ?? ''} maxLength={10000} autoComplete="off" onChange={(event) => setDetail('management_number', event.target.value)} onBlur={(event) => searchEquipment('number', event.target.value)} /></label>
            {pendingType && <div className="lookup-overwrite wide" role="group" aria-label="機器種別の変更確認"><p>機器種別を{TYPES[pendingType].label}に変更すると、入力中の機器情報がクリアされます。今回の申請内容は保持されます。</p><div><button type="button" className="button secondary" onClick={() => setPendingType(null)}>変更しない</button><button type="button" className="button primary" onClick={() => { invalidateLookup(); dispatch({ type: 'equipment-type', value: pendingType }); setPendingType(null) }}>機器種別を変更</button></div></div>}
            {(lookup.status || lookup.pending || source || needsIdentityCheck) && lookupView}
            {equipmentFields.filter(([key]) => key !== 'management_number').map((field) => <Field key={field[0]} field={field} value={form.details[field[0]]} onChange={setDetail} />)}
          </div>
        </section>
        <section className="form-section" aria-labelledby="request-heading">
          <h2 className="form-section-title" id="request-heading">今回の申請内容</h2>
          <div className="form-grid">
            <label>申請者氏名<input value={form.applicant_name} onChange={(event) => dispatch({ type: 'top', key: 'applicant_name', value: event.target.value })} /></label>
            <label>所属部署<select value={form.department} onChange={(event) => dispatch({ type: 'top', key: 'department', value: event.target.value })}><option value="">選択しない</option>{DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}</select></label>
            {requestFields.map((field) => <Field key={field[0]} field={field} value={form.details[field[0]]} onChange={setDetail} />)}
            <label className="wide">担当者メモ<textarea rows="3" value={form.notes} onChange={(event) => dispatch({ type: 'top', key: 'notes', value: event.target.value })} /></label>
          </div>
        </section>
      </> : <>
        <section className="review-section"><h2 className="form-section-title">機器情報</h2><dl className="review-list"><div><dt>機器種別</dt><dd>{TYPES[form.application_type].label}</dd></div>{equipmentFields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{displayValue(form.details[key])}</dd></div>)}</dl></section>
        <section className="review-section"><h2 className="form-section-title">今回の申請内容</h2><dl className="review-list"><div><dt>申請者氏名</dt><dd>{displayValue(form.applicant_name)}</dd></div><div><dt>所属部署</dt><dd>{displayValue(form.department)}</dd></div>{requestFields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{displayValue(form.details[key])}</dd></div>)}<div><dt>担当者メモ</dt><dd>{displayValue(form.notes)}</dd></div>{source && <div><dt>参照元の申請</dt><dd>{source.reference_number}</dd></div>}{operationKey === 'return' && source?.related_loan && <div><dt>参考の貸出</dt><dd>{source.related_loan.reference_number}</dd></div>}</dl></section>
        <p className="form-section-help">未入力の項目があっても登録できます。</p>
      </>}
      <p className="request-operator">登録責任者：{operatorName}{operatorName !== operatorEmail && `（${operatorEmail}）`}</p>
      {error && <div className="alert error" role="alert">{error}</div>}
      <div className="flow-actions">{step === 2 && <button className="button secondary" onClick={() => setStep(1)} disabled={busy}>入力に戻る</button>}<span />{step === 1 ? <button className="button primary" onClick={next} disabled={lookup.status === 'loading' || Boolean(lookup.pending) || Boolean(pendingType)}>内容を確認</button> : <button className="button primary" onClick={submit} disabled={busy}>{busy && <LoaderCircle className="spin" />}登録する</button>}</div>
    </section>
  </main>
}
