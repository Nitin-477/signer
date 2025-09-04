export async function verifySignatureLazy(message: string, signature: string) {
  const { verifyMessage } = await import('../utils/verifyMessage')
  return verifyMessage({ message, signature })
}
