import { useMemo, useRef } from 'react'
import fetchClient, {
  addRequestInterceptor as addGlobalRequest,
  addResponseInterceptor as addGlobalResponse
} from '../lib/fetchClient'

export default function useFetch(options = {}) {
  const localReq = useRef([])
  const localRes = useRef([])

  const addRequest = (fn) => {
    const remove = addGlobalRequest(fn)
    localReq.current.push(remove)
    return remove
  }

  const addResponse = (fn) => {
    const remove = addGlobalResponse(fn)
    localRes.current.push(remove)
    return remove
  }

  const api = useMemo(() => {
    return {
      get: (p, o) => fetchClient.get(p, { ...options, ...o }),
      post: (p, b, o) => fetchClient.post(p, b, { ...options, ...o }),
      put: (p, b, o) => fetchClient.put(p, b, { ...options, ...o }),
      delete: (p, o) => fetchClient.delete(p, { ...options, ...o }),
      addRequest,
      addResponse
    }
  }, [options])

  api._cleanup = () => {
    for (const off of localReq.current) off()
    for (const off of localRes.current) off()
    localReq.current = []
    localRes.current = []
  }

  return api
}
