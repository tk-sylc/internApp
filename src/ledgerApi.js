import { useEffect, useRef, useState } from 'react'

export function useBeforeUnload(shouldWarn) {
  useEffect(() => {
    if (!shouldWarn) return undefined
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [shouldWarn])
}

function csrfToken() {
  return document.cookie.split('; ').find((row) => row.startsWith('csrftoken='))?.split('=')[1] ?? ''
}

export async function apiRequest(url, { method = 'GET', body, signal, download = false, headers = {} } = {}) {
  const response = await fetch(url, {
    method, signal, credentials: 'same-origin', cache: 'no-store',
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { 'X-CSRFToken': csrfToken() } : {}), ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (response.ok && download) return response
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const messages = Object.values(data.fields ?? data).flat()
    const error = new Error(typeof data.detail === 'string' ? data.detail : messages.find((value) => typeof value === 'string') || '処理に失敗しました。時間をおいて再度お試しください。')
    error.status = response.status
    error.code = data.code
    throw error
  }
  return data
}

export function useApiResource(url, refresh, onUnauthorized) {
  const [result, setResult] = useState({})
  const requestKey = `${url}|${refresh}`
  useEffect(() => {
    if (!url) return undefined
    const controller = new AbortController()
    apiRequest(url, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setResult({ key: requestKey, data })
    }).catch((error) => {
      if (controller.signal.aborted) return
      if ((error.status === 401 || error.code === 'authentication_required')) onUnauthorized?.()
      setResult({ key: requestKey, error: error.message })
    })
    return () => controller.abort()
  }, [url, requestKey, onUnauthorized])
  const current = result.key === requestKey ? result : {}
  return { data: current.data, error: current.error, loading: Boolean(url) && !current.data && !current.error }
}

export function useActionSignal() {
  const controller = useRef(null)
  useEffect(() => {
    controller.current = new AbortController()
    return () => controller.current.abort()
  }, [])
  return () => controller.current.signal
}
