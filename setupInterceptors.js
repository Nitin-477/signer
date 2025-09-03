
import fetchClient from './lib/fetchClient'

fetchClient.addRequestInterceptor(async ({ url, options }) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    options.headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` }
  }
  return { url, options }
})

fetchClient.addResponseInterceptor(async (response) => {
  return response
})
