import { renderHook, act } from '@testing-library/react'
import useFetch from '../useFetch'

jest.mock('../../lib/fetchClient', () => {
  const remove = jest.fn()
  const addRequestInterceptor = jest.fn().mockReturnValue(remove)
  const addResponseInterceptor = jest.fn().mockReturnValue(remove)

  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      addRequestInterceptor,
      addResponseInterceptor,
    },
    addRequestInterceptor,
    addResponseInterceptor,
  }
})

import fetchClient, {
  addRequestInterceptor as addGlobalRequest,
  addResponseInterceptor as addGlobalResponse,
} from '../../lib/fetchClient'

describe('useFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('merges options in get', async () => {
    (fetchClient.get as jest.Mock).mockResolvedValue({ ok: true })
    const { result } = renderHook(() =>
      useFetch({ baseUrl: '/api', headers: { 'X-Base': 'A' }, timeout: 1000 })
    )

    await act(async () => {
      await result.current.get('/users', { headers: { 'X-Req': 'B' }, timeout: 2000 })
    })

    expect(fetchClient.get).toHaveBeenCalledWith('/users', {
    baseUrl: '/api',
    headers: { 'X-Req': 'B' },
    timeout: 2000,
    })

  })

  it('merges options in post with body', async () => {
    (fetchClient.post as jest.Mock).mockResolvedValue({ id: 1 })
    const { result } = renderHook(() =>
      useFetch({ headers: { 'Content-Type': 'application/json' } })
    )

   await act(async () => {
    await result.current.post('/users', { name: 'A' }, { headers: { 'X-T': '1' } })
    })

    expect(fetchClient.post).toHaveBeenCalledWith('/users', { name: 'A' }, {
    headers: { 'X-T': '1' },
    })

})

  it('_cleanup removes all registered interceptors and resets refs', () => {
    const removeA = jest.fn()
    const removeB = jest.fn();
    (addGlobalRequest as jest.Mock).mockReturnValueOnce(removeA).mockReturnValueOnce(removeB)
    const removeC = jest.fn();
    const removeD = jest.fn();
    (addGlobalResponse as jest.Mock).mockReturnValueOnce(removeC).mockReturnValueOnce(removeD)

    const { result } = renderHook(() => useFetch())

  
    result.current.addRequest(jest.fn())
    result.current.addRequest(jest.fn())
    result.current.addResponse(jest.fn())
    result.current.addResponse(jest.fn())

    expect(typeof result.current._cleanup).toBe('function')
    result.current._cleanup!()

    expect(removeA).toHaveBeenCalledTimes(1)
    expect(removeB).toHaveBeenCalledTimes(1)
    expect(removeC).toHaveBeenCalledTimes(1)
    expect(removeD).toHaveBeenCalledTimes(1)

    result.current._cleanup!()
    expect(removeA).toHaveBeenCalledTimes(1)
    expect(removeB).toHaveBeenCalledTimes(1)
    expect(removeC).toHaveBeenCalledTimes(1)
    expect(removeD).toHaveBeenCalledTimes(1)
  })

  it('does not mutate the options object reference passed in', async () => {
    const baseOptions = { headers: { A: '1' as string }, timeout: 5 };
    (fetchClient.get as jest.Mock).mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useFetch(baseOptions))

    await act(async () => {
      await result.current.get('/x', { headers: { B: '2' }, timeout: 10 })
    })

    expect(baseOptions).toEqual({ headers: { A: '1' }, timeout: 5 })
  })
})
