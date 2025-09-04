import { useMemo, useRef } from 'react'
import fetchClient, {
  addRequestInterceptor as addGlobalRequest,
  addResponseInterceptor as addGlobalResponse,
  type RequestInterceptor,
  type ResponseInterceptor,
} from '../lib/fetchClient'

export interface UseFetchOptions {
  headers?: Record<string, string>
  baseUrl?: string
  timeout?: number
}

type RemoveFn = () => void

export default function useFetch(options: UseFetchOptions = {}) {
  const localReq = useRef<RemoveFn[]>([])
  const localRes = useRef<RemoveFn[]>([])

  const addRequest = (fn: RequestInterceptor): RemoveFn => {
    const remove = addGlobalRequest(fn)
    localReq.current.push(remove)
    return remove
  }

  const addResponse = (fn: ResponseInterceptor): RemoveFn => {
    const remove = addGlobalResponse(fn)
    localRes.current.push(remove)
    return remove
  }

  const api = useMemo(() => {
    return {
      get: <T = unknown>(p: string, o?: UseFetchOptions) => fetchClient.get<T>(p, { ...options, ...o }),
      post: <T = unknown>(p: string, b?: unknown, o?: UseFetchOptions) => fetchClient.post<T>(p, b, { ...options, ...o }),
      addRequest,
      addResponse,
    }
  }, [options]);
 (api as any)._cleanup = () => {
      for (const off of localReq.current) off()
      for (const off of localRes.current) off()
      localReq.current = []
      localRes.current = []
    }

  return api as {
    get<T = unknown>(p: string, o?: UseFetchOptions): Promise<T>
    post<T = unknown>(p: string, b?: unknown, o?: UseFetchOptions): Promise<T>
    addRequest(fn: RequestInterceptor): RemoveFn
    addResponse(fn: ResponseInterceptor): RemoveFn
    _cleanup?: () => void
  }
}
