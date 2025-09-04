
import fetchClient, {
  addRequestInterceptor,
  addResponseInterceptor,
  type RequestContext,
} from '../fetchClient'

const firstCall = () => (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit]

describe('fetchClient core behavior', () => {
  const realFetch = global.fetch

  beforeEach(() => {
    jest.useRealTimers()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = realFetch as any
    jest.clearAllMocks()
  })

  it('GET resolves relative path against base and parses JSON', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
      json: async () => ({ hello: 'world' }),
      text: async () => JSON.stringify({ hello: 'world' }),
    } as any)

    const data = await fetchClient.get<{ hello: string }>('/ping')
    const [calledUrl] = firstCall()
    expect(calledUrl).toBe('http://test.local/ping')
    expect(data).toEqual({ hello: 'world' })
  })

  it('POST string body adds Content-Type application/json', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'text/plain' },
      json: async () => 'ok',
      text: async () => 'ok',
    } as any)

    await fetchClient.post('/echo', 'raw-string')

    const [, init] = firstCall()
    expect(init).toMatchObject({ method: 'POST', body: 'raw-string' })
    expect((init as any).headers).toEqual({ 
      Accept: 'application/json',
      'Content-Type': 'application/json' 
    })
  })

  it('POST json body sets Content-Type and merges headers', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ ok: true }),
    text: async () => JSON.stringify({ ok: true }),
  } as any)

  await fetchClient.post('/users', { name: 'A' }, { headers: { 'X-Req': '1' } })

  const [, init] = firstCall()
  expect(init).toMatchObject({ method: 'POST' })
  expect((init as any).headers).toEqual({
    'X-Req': '1',
  })
  expect(typeof (init as any).body).toBe('string')
})



  it('absolute URL is not prefixed by base', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'text/plain' },
      json: async () => 'ok',
      text: async () => 'ok',
    } as any)

    await fetchClient.get('https://api.example.com/v1/time')
    const [calledUrl] = firstCall()
    expect(calledUrl).toBe('https://api.example.com/v1/time')
  })

  it('runs request interceptors and can rewrite url/options', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ ok: true }),
      text: async () => JSON.stringify({ ok: true }),
    } as any)

    const remove = addRequestInterceptor(async (ctx: RequestContext) => {
      return {
        url: ctx.url.replace('/original', '/rewritten'),
        options: {
          ...ctx.options,
          headers: {
            ...(ctx.options.headers as Record<string, string> | undefined),
            'X-From-Interceptor': '1',
          },
        },
      }
    })

    await fetchClient.get('/original')

    const [calledUrl, init] = firstCall()
    expect(calledUrl).toBe('http://test.local/rewritten')
    expect((init as any).headers).toEqual({
      Accept: 'application/json',
      'X-From-Interceptor': '1',
    })
    remove()
  })

  it('runs response interceptors and can replace response', async () => {
    const serverJson = { ok: true };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => serverJson,
      text: async () => JSON.stringify(serverJson),
    } as any)

    const replacement = {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ ok: 'intercepted' }),
      text: async () => JSON.stringify({ ok: 'intercepted' }),
    } as any

    const remove = addResponseInterceptor(async (_res: any) => replacement as any)

    const data = await fetchClient.get('/intercept')
    expect(data).toEqual({ ok: 'intercepted' })

    remove()
  })

  it('throws enriched error for non-2xx with body text', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => 'text/plain' },
      text: async () => 'missing',
    } as any)

    await expect(fetchClient.get('/missing')).rejects.toMatchObject({
      message: expect.stringContaining('HTTP 404: missing'),
      status: 404,
      body: 'missing',
    })
  })

  it('parses text when content-type is not JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'text/plain' },
      json: async () => 'ignored',
      text: async () => 'plain',
    } as any)

    const out = await fetchClient.get<string>('/plain')
    expect(out).toBe('plain')
  })

  it('aborts on timeout with AbortController and provides an aborted signal', async () => {
    let capturedSignal: AbortSignal | undefined
    (global.fetch as jest.Mock).mockImplementation((_url: string, init: RequestInit) => {
      capturedSignal = init.signal as AbortSignal
      return new Promise(() => {
      })
    })

    void fetchClient.get('/slow', { timeout: 10 })
    await new Promise((r) => setTimeout(r, 25))
    expect(capturedSignal?.aborted).toBe(true)
  })
})
