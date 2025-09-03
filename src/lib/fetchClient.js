
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

const defaultHeaders = {
  Accept: 'application/json'
}

const requestInterceptors = []
const responseInterceptors = []

export function addRequestInterceptor(interceptor) {
  requestInterceptors.push(interceptor)
  return () => {
    const i = requestInterceptors.indexOf(interceptor)
    if (i >= 0) requestInterceptors.splice(i, 1)
  }
}

export function addResponseInterceptor(interceptor) {
  responseInterceptors.push(interceptor)
  return () => {
    const i = responseInterceptors.indexOf(interceptor)
    if (i >= 0) responseInterceptors.splice(i, 1)
  }
}

async function runRequestInterceptors(url, options) {
  let current = { url, options }
  for (const fn of requestInterceptors) {
    const next = await fn(current)
    if (next && typeof next === 'object') current = next
  }
  return current
}

async function runResponseInterceptors(response) {
  let current = response
  for (const fn of responseInterceptors) {
    const next = await fn(current)
    current = next || current
  }
  return current
}

async function coreRequest(method, path, body, options = {}) {
  const base = options.baseUrl || API_BASE
  const isAbsolute = /^https?:\/\//i.test(path)
  const url = isAbsolute ? path : `${base}${path}`

  const headers = { ...defaultHeaders, ...(options.headers || {}) }
  const init = { method, headers, ...options }
  delete init.baseUrl
  delete init.timeout

  if (body !== undefined && body !== null && method !== 'GET') {
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
    if (!('Content-Type' in headers)) headers['Content-Type'] = 'application/json'
  }

  const { url: finalUrl, options: finalOptions } = await runRequestInterceptors(url, init)

  const controller = new AbortController()
  if (!finalOptions.signal) finalOptions.signal = controller.signal
  if (options.timeout && Number.isFinite(options.timeout)) {
    setTimeout(() => controller.abort(new Error('Request timeout')), options.timeout)
  }

  const res = await fetch(finalUrl, finalOptions)

  const processed = await runResponseInterceptors(res)

  if (!processed.ok) {
    const text = await processed.text().catch(() => '')
    const err = new Error(`HTTP ${processed.status}: ${text || processed.statusText}`)
    err.status = processed.status
    err.body = text
    throw err
  }

  const ct = processed.headers.get('content-type') || ''
  if (ct.includes('application/json')) return processed.json()
  return processed.text()
}

const fetchClient = {
  get: (path, options) => coreRequest('GET', path, undefined, options),
  post: (path, body, options) => coreRequest('POST', path, body, options),
  addRequestInterceptor,
  addResponseInterceptor
}

export default fetchClient
