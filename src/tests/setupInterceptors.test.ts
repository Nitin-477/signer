
jest.mock('../lib/fetchClient', () => ({
  __esModule: true,
  default: {
    addRequestInterceptor: jest.fn(),
    addResponseInterceptor: jest.fn(),
  },
}))

import { attachAuth, passthrough } from '../../setupInterceptors'

describe('setupInterceptor attachAuth', () => {
  const STORAGE_KEY = 'authToken'
  const originalLocalStorage = global.localStorage

  beforeEach(() => {
    let store: Record<string, string> = {}
    const mockStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
      clear: () => {
        store = {}
      },
    }
    // @ts-expect-error override for tests
    global.localStorage = mockStorage
    mockStorage.clear()
    jest.clearAllMocks()
  })

  afterEach(() => {
    global.localStorage = originalLocalStorage
  })

  it('adds Authorization header when token exists', async () => {
    global.localStorage.setItem(STORAGE_KEY, 'abc123')

    const req = { url: '/api/test', options: { method: 'GET', headers: { 'X-Feature': 'Foo' } } }
    const result = await attachAuth(req)

    expect(result.options.headers).toEqual({
      'X-Feature': 'Foo',
      Authorization: 'Bearer abc123',
    })
  })

  it('does not add Authorization header when no token', async () => {
    global.localStorage.removeItem(STORAGE_KEY)

    const req = { url: '/api/test', options: { method: 'GET', headers: { 'X-Feature': 'Foo' } } }
    const result = await attachAuth(req)

    expect(result.options.headers).toEqual({ 'X-Feature': 'Foo' })
  })

  it('creates headers object if none present', async () => {
    global.localStorage.setItem(STORAGE_KEY, 'tok')

    const req = { url: '/api/no-headers', options: { method: 'POST' as const } as any }
    const result = await attachAuth(req)

    expect(result.options.headers).toEqual({ Authorization: 'Bearer tok' })
  })

  it('merges headers without overwriting existing fields', async () => {
    global.localStorage.setItem(STORAGE_KEY, 'zzz')

    const req = {
      url: '/api/merge',
      options: { method: 'PUT', headers: { 'Content-Type': 'application/json' } },
    }
    const result = await attachAuth(req)

    expect(result.options.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer zzz',
    })
  })

  it('overwrites existing Authorization if already set', async () => {
    global.localStorage.setItem(STORAGE_KEY, 'newtok')

    const req = {
      url: '/api/overwrite',
      options: { method: 'PATCH', headers: { Authorization: 'Bearer old' } },
    }
    const result = await attachAuth(req)

    expect(result.options.headers).toEqual({ Authorization: 'Bearer newtok' })
  })

  it('preserves non-string header values by stringifying merge (defensive)', async () => {
    global.localStorage.setItem(STORAGE_KEY, 'abc')
    const req = {
      url: '/api/mixed',
      options: {
        method: 'GET',
        headers: { 'X-Num': (123 as unknown) as any, 'X-Obj': ({ a: 1 } as unknown) as any },
      },
    }
    const result = await attachAuth(req)
    
    expect((result.options.headers as any).Authorization).toBe('Bearer abc')
    expect((result.options.headers as any)['X-Num']).toBe(123)
    expect((result.options.headers as any)['X-Obj']).toEqual({ a: 1 })
  })
})

describe('setupInterceptor passthrough', () => {
  it('returns Response as-is', async () => {
    const value = { hello: 'world' } as unknown as Response
    const out = await passthrough(value)
    expect(out).toBe(value)
  })

  it('returns any value as-is (defensive)', async () => {
    const value = { hello: 'world' }
    // @ts-expect-error: passthrough signature
    const out = await passthrough(value)
    expect(out).toBe(value)
  })
})

describe('setupInterceptor registration side-effects', () => {
  it('registers request/response interceptors on import', async () => {
    jest.resetModules()
    const mocked = await import('../lib/fetchClient')
    const addReq = (mocked.default as any).addRequestInterceptor
    const addRes = (mocked.default as any).addResponseInterceptor

    await import('../../setupInterceptors')

    expect(addReq).toHaveBeenCalled()
    expect(addRes).toHaveBeenCalled()
  })
})
