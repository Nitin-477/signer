import fetchClient, {
  type RequestInterceptor,
  type ResponseInterceptor,
} from './src/lib/fetchClient'

const attachAuth: RequestInterceptor = async ({ url, options }) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    const nextHeaders: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    }
    options.headers = nextHeaders
  }
  return { url, options }
}

const passthrough: ResponseInterceptor = async (response) => response

fetchClient.addRequestInterceptor(attachAuth)
fetchClient.addResponseInterceptor(passthrough)

export { attachAuth, passthrough }
