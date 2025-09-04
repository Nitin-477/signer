const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

const defaultHeaders: Record<string, string> = {
  Accept: 'application/json',
}

export type RequestContext = {
  url: string
  options: RequestInit
}

export type RequestInterceptor = (
  ctx: RequestContext
) => Promise<RequestContext> | RequestContext

export type ResponseInterceptor = (
  response: Response
) => Promise<Response> | Response

const requestInterceptors: RequestInterceptor[] = []
const responseInterceptors: ResponseInterceptor[] = []

export function addRequestInterceptor(interceptor: RequestInterceptor) {
  requestInterceptors.push(interceptor)
  return () => {
    const i = requestInterceptors.indexOf(interceptor)
    if (i >= 0) requestInterceptors.splice(i, 1)
  }
}

export function addResponseInterceptor(interceptor: ResponseInterceptor) {
  responseInterceptors.push(interceptor)
  return () => {
    const i = responseInterceptors.indexOf(interceptor)
    if (i >= 0) responseInterceptors.splice(i, 1)
  }
}

async function runRequestInterceptors(url: string, options: RequestInit) {
  let current: RequestContext = { url, options }
  for (const fn of requestInterceptors) {
    const next = await fn(current)
    if (next && typeof next === 'object') current = next
  }
  return current
}

async function runResponseInterceptors(response: Response) {
  let current = response
  for (const fn of responseInterceptors) {
    const next = await fn(current)
    current = next || current
  }
  return current
}

type HttpMethod = 'GET' | 'POST'

export interface CoreOptions extends RequestInit {
  baseUrl?: string
  timeout?: number
}

async function coreRequest<T = unknown>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: CoreOptions = {}
): Promise<T> {
  const base = options.baseUrl || API_BASE
  const isAbsolute = /^https?:\/\//i.test(path)
  const url = isAbsolute ? path : `${base}${path}`

  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...(options.headers as Record<string, string> | undefined),
  }

  const init: RequestInit = { method, headers, ...options }
  delete (init as any).baseUrl
  delete (init as any).timeout

  if (body !== undefined && body !== null && method !== 'GET') {
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
    if (!('Content-Type' in headers)) headers['Content-Type'] = 'application/json'
  }

  const { url: finalUrl, options: finalOptions } = await runRequestInterceptors(url, init)

  const controller = new AbortController()
  const withSignal: RequestInit = { ...finalOptions, signal: finalOptions.signal ?? controller.signal }

  if (typeof options.timeout === 'number' && Number.isFinite(options.timeout)) {
    setTimeout(() => controller.abort(new Error('Request timeout') as any), options.timeout!)
  }

  const res = await fetch(finalUrl, withSignal)
  const processed = await runResponseInterceptors(res)

  if (!processed.ok) {
    const text = await processed.text().catch(() => '')
    const err = new Error(`HTTP ${processed.status}: ${text || processed.statusText}`) as Error & {
      status?: number
      body?: string
    }
    err.status = processed.status
    err.body = text
    throw err
  }

  const ct = processed.headers.get('content-type') || ''
  if (ct.includes('application/json')) return processed.json() as Promise<T>
  return (processed.text() as unknown) as T
}

export interface FetchClient {
  get<T = unknown>(path: string, options?: CoreOptions): Promise<T>
  post<T = unknown>(path: string, body?: unknown, options?: CoreOptions): Promise<T>
  addRequestInterceptor: typeof addRequestInterceptor
  addResponseInterceptor: typeof addResponseInterceptor
}

const fetchClient: FetchClient = {
  get: (path, options) => coreRequest('GET', path, undefined, options),
  post: (path, body, options) => coreRequest('POST', path, body, options),
  addRequestInterceptor,
  addResponseInterceptor,
}

export default fetchClient
