import { getEquipmentFields, getRequestFields, newForm } from './formConfig.js'

export const initialEntry = (operation) => ({ form: newForm(operation), lookup: {}, source: null, needsIdentityCheck: false })
const isFilled = (value) => value !== undefined && value !== null && value !== ''

export function copyEquipment(form, candidate) {
  const keys = new Set(getEquipmentFields(form.application_type).map(([key]) => key))
  const details = Object.fromEntries(Object.entries(form.details).filter(([key]) => !keys.has(key)))
  for (const key of keys) {
    if (isFilled(candidate.details[key])) details[key] = candidate.details[key]
  }
  return {
    ...form, details, source_application: candidate.id,
    related_loan: form.operation_type === 'return' ? candidate.related_loan?.id ?? null : null,
  }
}

function conflictsWithInput(form, candidate, mode) {
  return getEquipmentFields(form.application_type).some(([key]) => {
    if (key === 'management_number' || (mode === 'name' && ['device_name', 'model_name'].includes(key))) return false
    const value = form.details[key]
    return isFilled(value) && String(value) !== String(candidate.details[key] ?? '')
  })
}

function receiveCandidate(state, candidate, mode, confirmed = false) {
  if (candidate.application_type !== state.form.application_type) return state
  if (!confirmed && conflictsWithInput(state.form, candidate, mode)) {
    return { ...state, lookup: { pending: candidate, mode } }
  }
  return { form: copyEquipment(state.form, candidate), lookup: { status: 'applied' }, source: candidate, needsIdentityCheck: false }
}

export function entryReducer(state, action) {
  switch (action.type) {
    case 'top':
      return { ...state, form: { ...state.form, [action.key]: action.value } }
    case 'detail': {
      const identityChanged = action.key === 'management_number'
      return {
        form: { ...state.form, details: { ...state.form.details, [action.key]: action.value },
          ...(identityChanged ? { source_application: null, related_loan: null } : {}) },
        lookup: identityChanged ? {} : state.lookup,
        source: identityChanged ? null : state.source,
        needsIdentityCheck: identityChanged
          ? getEquipmentFields(state.form.application_type).some(([key]) => key !== 'management_number' && isFilled(state.form.details[key]))
          : state.needsIdentityCheck,
      }
    }
    case 'equipment-type': {
      const requestKeys = new Set(getRequestFields(action.value, state.form.operation_type).map(([key]) => key))
      return { form: { ...state.form, application_type: action.value,
        details: Object.fromEntries(Object.entries(state.form.details).filter(([key]) => requestKeys.has(key))),
        source_application: null, related_loan: null }, lookup: {}, source: null, needsIdentityCheck: false }
    }
    case 'loading': return { ...state, lookup: { status: 'loading', mode: action.mode } }
    case 'result':
      if (action.mode === 'number' && action.data.match) return receiveCandidate(state, action.data.match, action.mode)
      return { ...state, lookup: { status: action.mode === 'number' ? 'missing' : 'candidates', candidates: action.data.candidates ?? [] } }
    case 'candidate': return receiveCandidate(state, action.candidate, 'name')
    case 'confirm': return state.lookup.pending ? receiveCandidate(state, state.lookup.pending, state.lookup.mode, true) : state
    case 'keep': return { ...state, lookup: { status: 'kept' } }
    case 'clear-lookup': return { ...state, lookup: {} }
    case 'error': return { ...state, lookup: { status: 'error', message: action.message } }
    default: return state
  }
}
