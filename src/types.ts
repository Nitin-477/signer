import type { BrowserProvider } from 'ethers'

export type ConnectedWallet = {
  provider: BrowserProvider | null
  address: string
  wallet?: unknown
}
