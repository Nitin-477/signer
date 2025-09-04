import { expectTypeOf } from 'expect-type'
import type { BrowserProvider } from 'ethers'
import type { ConnectedWallet } from '../types'

test('ConnectedWallet typing compiles', () => {
  expectTypeOf<ConnectedWallet>().toMatchTypeOf<{
    provider: BrowserProvider | null
    address: string
    wallet?: unknown
  }>()

  const bad1: ConnectedWallet = { provider: null }

  const bad2: ConnectedWallet = { provider: 'nope' as any, address: '0xabc' }

  const ok1: ConnectedWallet = { provider: null, address: '0xabc' }
  const ok2: ConnectedWallet = { provider: {} as BrowserProvider, address: '0xdef', wallet: {} }
  void ok1; void ok2; void bad1; void bad2
})
