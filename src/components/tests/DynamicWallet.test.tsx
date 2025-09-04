
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('@dynamic-labs/sdk-react-core', () => ({
  __esModule: true,
  DynamicContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDynamicContext: jest.fn(),
}))

jest.mock('@dynamic-labs/ethereum', () => ({
  __esModule: true,
  EthereumWalletConnectors: [],
}))
const browserProviderCtor = jest.fn().mockReturnValue({ __mocked: true })

jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers')
  return {
    ...actual,
    BrowserProvider: function MockedBrowserProvider(..._args: any[]) {
      return browserProviderCtor()
    } as any,
  }
})
import DynamicWallet from '../components/DynamicWallet'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { BrowserProvider } from 'ethers'

const mockUseDynamic = useDynamicContext as unknown as jest.Mock

describe('DynamicWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state', () => {
    mockUseDynamic.mockReturnValue({
      primaryWallet: null,
      loading: true,
      setShowAuthFlow: jest.fn(),
      handleLogOut: jest.fn(),
    })

    render(<DynamicWallet onWalletConnected={jest.fn()} />)
    expect(screen.getByText('Loading wallet...')).toBeInTheDocument()
  })

  it('renders Connect Wallet when disconnected and triggers auth flow', () => {
    const setShowAuthFlow = jest.fn()
    mockUseDynamic.mockReturnValue({
      primaryWallet: null,
      loading: false,
      setShowAuthFlow,
      handleLogOut: jest.fn(),
    })

    render(<DynamicWallet onWalletConnected={jest.fn()} />)
    const btn = screen.getByRole('button', { name: /connect wallet/i })
    expect(btn).toBeEnabled()
    fireEvent.click(btn)
    expect(setShowAuthFlow).toHaveBeenCalledWith(true)
  })

 it('calls onWalletConnected with null then with a non-null provider (async)', async () => {
  const onWalletConnected = jest.fn()

  const eip1193 = {
    request: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
    removeListener: jest.fn(),
  }

  const fakeConnector = {
    getProvider: jest.fn().mockResolvedValue(eip1193),
    provider: eip1193,
  }
  const primaryWallet = { address: '0xabc123', connector: fakeConnector }

  mockUseDynamic.mockReturnValue({
    primaryWallet,
    loading: false,
    setShowAuthFlow: jest.fn(),
    handleLogOut: jest.fn(),
  })

  render(<DynamicWallet onWalletConnected={onWalletConnected} />)

  await waitFor(() => {
    expect(onWalletConnected).toHaveBeenCalledWith({
      provider: null,
      address: '0xabc123',
      wallet: primaryWallet,
    })
  })

  const flushMicrotasks = async () => {
    await new Promise((r) => process.nextTick(r))
    await Promise.resolve()
  }
  await flushMicrotasks()

  await waitFor(() => {
    expect(
      onWalletConnected.mock.calls.some(
        ([arg]) => arg && arg.address === '0xabc123' && arg.provider && typeof arg.provider === 'object'
      )
    ).toBe(true)
  })
})

  it('renders Disconnect when connected and invokes logout', () => {
    const handleLogOut = jest.fn()
    mockUseDynamic.mockReturnValue({
      primaryWallet: { address: '0xabc', connector: {} },
      loading: false,
      setShowAuthFlow: jest.fn(),
      handleLogOut,
    })

    render(<DynamicWallet onWalletConnected={jest.fn()} />)
    const btn = screen.getByRole('button', { name: /disconnect/i })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(handleLogOut).toHaveBeenCalled()
  })
})
