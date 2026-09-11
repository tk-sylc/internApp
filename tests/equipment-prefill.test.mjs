import test from 'node:test'
import assert from 'node:assert/strict'
import { entryReducer, initialEntry } from '../src/equipmentPrefill.js'
import { getEquipmentFields } from '../src/formConfig.js'

const candidate = (kind = 'pc', details = {}) => ({
  id: 10, application_type: kind, reference_number: 'ENTRY-SOURCE', operation_type: 'loan',
  details: { management_number: 'PC-001', ...details }, related_loan: { id: 9 },
})

for (const kind of ['pc', 'phone', 'lan', 'memory']) {
  for (const operation of ['purchase', 'loan', 'return', 'disposal']) {
    test(`${kind}/${operation}: only equipment information is reused`, () => {
      let state = initialEntry(operation)
      state = entryReducer(state, { type: 'equipment-type', value: kind })
      const common = Object.fromEntries(getEquipmentFields(kind).map(([key]) => [key, `saved-${key}`]))
      const source = candidate(kind, { ...common, purpose: 'old purpose', location: 'old place', quantity: 5, usage_start_date: '2026-01-01', usage_end_date: '2026-01-02', condition: 'old', disposal_reason: 'old', acquisition_method: 'old', virus_check: 'old' })
      const result = entryReducer(state, { type: 'result', mode: 'number', data: { match: source } })
      assert.deepEqual(result.form.details, common)
      assert.equal(result.form.applicant_name, '')
      assert.equal(result.form.department, '')
      assert.equal(result.form.notes, '')
      assert.equal(result.form.related_loan, operation === 'return' ? 9 : null)
      assert.deepEqual(state.form.details, {})
    })
  }
}

test('manual request input survives confirmed replacement; old equipment values do not leak', () => {
  let state = initialEntry('loan')
  state.form = { ...state.form, applicant_name: '今回の申請者', department: '営業部', notes: '今回のメモ', details: { management_number: 'PC-002', device_name: '手入力のPC', ram_gb: 32, os: 'old OS', purpose: '今回の目的', usage_start_date: '2026-09-11', quantity: 1 } }
  const before = structuredClone(state.form)
  state = entryReducer(state, { type: 'result', mode: 'number', data: { match: candidate('pc', { device_name: '呼び出したPC', ram_gb: 16 }) } })
  assert.deepEqual(state.form, before)
  assert.ok(state.lookup.pending)
  state = entryReducer(state, { type: 'confirm' })
  assert.equal(state.form.details.device_name, '呼び出したPC')
  assert.equal(state.form.details.os, undefined)
  assert.equal(state.form.details.purpose, before.details.purpose)
  assert.equal(state.form.applicant_name, before.applicant_name)
  assert.equal(state.form.notes, before.notes)
  state = entryReducer(state, { type: 'detail', key: 'ram_gb', value: 64 })
  assert.equal(state.form.details.ram_gb, 64)
})

test('lookup transitions and keep preserve visible provenance and saved references', () => {
  let state = entryReducer(initialEntry('return'), { type: 'candidate', candidate: candidate('pc', { management_number: '', device_name: '旧PC' }) })
  for (const action of [{ type: 'loading', mode: 'name' }, { type: 'error', message: 'offline' }, { type: 'result', mode: 'name', data: { candidates: [] } }, { type: 'clear-lookup' }]) {
    state = entryReducer(state, action)
    assert.equal(state.source.id, state.form.source_application)
    assert.equal(state.source.related_loan.id, state.form.related_loan)
  }
  state = entryReducer(state, { type: 'detail', key: 'ram_gb', value: '32' })
  state = entryReducer(state, { type: 'candidate', candidate: candidate('pc', { ram_gb: 16 }) })
  state = entryReducer(state, { type: 'keep' })
  assert.equal(state.form.details.ram_gb, '32')
  assert.equal(state.source.id, 10)
})

test('identity changes unlink provenance and warn before old specifications are reused', () => {
  let state = entryReducer(initialEntry('return'), { type: 'candidate', candidate: candidate('pc', { device_name: 'PC', ram_gb: 16 }) })
  state = entryReducer(state, { type: 'detail', key: 'management_number', value: 'NEW' })
  state = entryReducer(state, { type: 'result', mode: 'number', data: { match: null } })
  assert.equal(state.source, null)
  assert.equal(state.form.related_loan, null)
  assert.equal(state.form.source_application, null)
  assert.equal(state.needsIdentityCheck, true)
  assert.equal(state.form.details.ram_gb, 16)
  state = entryReducer(state, { type: 'top', key: 'applicant_name', value: '今回' })
  state = entryReducer(state, { type: 'equipment-type', value: 'phone' })
  assert.deepEqual(state.form.details, {})
  assert.equal(state.form.applicant_name, '今回')
  assert.equal(state.needsIdentityCheck, false)
})

test('zero values are retained and wrong-type candidates cannot overwrite fields', () => {
  const state = initialEntry('purchase')
  const unchanged = entryReducer(state, { type: 'candidate', candidate: candidate('phone') })
  assert.equal(unchanged, state)
  const result = entryReducer(state, { type: 'candidate', candidate: candidate('pc', { ram_gb: 0, cpu_ghz: 0 }) })
  assert.equal(result.form.details.ram_gb, 0)
  assert.equal(result.form.details.cpu_ghz, 0)
})
