import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import MessageForm from '../MessageForm'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

jest.mock('../../hooks/useFetch', () => {
  const stubs = {
    post: jest.fn(),
    addRequest: jest.fn().mockImplementation(() => () => {}),
    addResponse: jest.fn().mockImplementation(() => () => {}),
  }
  return { __esModule: true, default: () => stubs, __stubs: stubs }
})

type FakeSigner = { signMessage: jest.Mock<Promise<string>, [string]> }
const makeProviderWithSigner = (signature = '0xdeadbeef') => {
  const signer: FakeSigner = { signMessage: jest.fn().mockResolvedValue(signature) }
  return { getSigner: jest.fn().mockResolvedValue(signer), __signer: signer }
}
const makeWallet = (signature = '0xcafebabe') => ({ signMessage: jest.fn().mockResolvedValue(signature) })

const STORAGE_KEY = 'signHistory'

const getSignButton = () => screen.getByRole('button', { name: /sign message/i })
const getSignSection = () =>
  screen.getByRole('heading', { name: /sign message/i }).closest('.sign-section') as HTMLElement
const getVerificationSection = () =>
  document.querySelector('.verification-section') as HTMLElement | null
const getHistoryList = () =>
  screen
    .getByRole('heading', { name: /signing history/i })
    .parentElement!.querySelector('.history-list') as HTMLElement


let consoleErrorSpy: jest.SpyInstance
beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterAll(() => {
  consoleErrorSpy.mockRestore()
})

describe('MessageForm', () => {
  beforeEach(() => {
    window.localStorage.clear()
    jest.clearAllMocks()
  })

  it('renders and disables Sign button when message is empty', () => {
    render(<MessageForm provider={null} walletAddress="0xabc" wallet={null} />)
    const signSection = getSignSection()
    expect(within(signSection).getByRole('button', { name: /sign message/i })).toBeDisabled()
    expect(screen.getByText('Wallet:')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /signing history/i })).toBeInTheDocument()
    expect(screen.getByText('No signed messages yet.')).toBeInTheDocument()
  })

  it('signs via provider.getSigner().signMessage and shows verification result', async () => {
    const provider = makeProviderWithSigner('0xprovider_sig')
    const { __stubs } = require('../../hooks/useFetch')
    __stubs.post.mockResolvedValue({
      isValid: true,
      signer: '0xSigner123',
      originalMessage: 'hello world',
    })

    render(<MessageForm provider={provider as any} walletAddress="0xabc" wallet={null} />)

    fireEvent.change(screen.getByPlaceholderText('Enter message to sign'), {
      target: { value: 'hello world' },
    })
    fireEvent.click(getSignButton())

    await waitFor(() => expect(provider.getSigner).toHaveBeenCalledTimes(1))
    expect(provider.__signer.signMessage).toHaveBeenCalledWith('hello world')

    await waitFor(() => expect(getVerificationSection()).not.toBeNull())
    const ver = getVerificationSection() as HTMLElement
    expect(within(ver).getByText('Valid:')).toBeInTheDocument()
    expect(within(ver).getByText('✅')).toBeInTheDocument()
    expect(within(ver).getByText('Signer:')).toBeInTheDocument()
    expect(within(ver).getAllByText('0xSigner123').length).toBeGreaterThanOrEqual(1)
    expect(within(ver).getByText('Original Message:')).toBeInTheDocument()
    expect(within(ver).getByText('hello world')).toBeInTheDocument()
    
    const savedArr = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)
    expect(Array.isArray(savedArr)).toBe(true)
    expect(savedArr[0].message).toBe('hello world')
    expect(savedArr[0].signature).toBe('0xprovider_sig')
    expect(savedArr[0].verification.isValid).toBe(true)

    expect(screen.getByRole('heading', { name: /signature/i })).toBeInTheDocument()
    expect(screen.getByText('0xprovider_sig')).toBeInTheDocument()
  })

  it('signs via wallet.signMessage when provider is not supplied', async () => {
    const wallet = makeWallet('0xwallet_sig')
    const { __stubs } = require('../../hooks/useFetch')
    __stubs.post.mockResolvedValue({
      isValid: true,
      signer: '0xWalletSigner',
      originalMessage: 'ping',
    })

    render(<MessageForm provider={null} walletAddress="0xwallet" wallet={wallet as any} />)

    fireEvent.change(screen.getByPlaceholderText('Enter message to sign'), {
      target: { value: 'ping' },
    })
    fireEvent.click(getSignButton())

    await waitFor(() => expect(wallet.signMessage).toHaveBeenCalledWith('ping'))
    await waitFor(() => expect(getVerificationSection()).not.toBeNull())

    const ver = getVerificationSection() as HTMLElement
    expect(within(ver).getAllByText('0xWalletSigner').length).toBeGreaterThanOrEqual(1)
    expect(within(ver).getByText('ping')).toBeInTheDocument()

    const savedArr = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)
    expect(Array.isArray(savedArr)).toBe(true)
    expect(savedArr[0].signature).toBe('0xwallet_sig')
    expect(savedArr[0].verification.isValid).toBe(true)
  })

  it('shows error when no signer is available', async () => {
    const { __stubs } = require('../../hooks/useFetch')
    __stubs.post.mockResolvedValue({})

    render(<MessageForm provider={null} walletAddress="0xnone" wallet={null} />)

    fireEvent.change(screen.getByPlaceholderText('Enter message to sign'), {
      target: { value: 'x' },
    })
    fireEvent.click(getSignButton())

    await waitFor(() => expect(screen.getByText('No signer available yet')).toBeInTheDocument())
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('handles signing error and displays message', async () => {
    const provider = {
      getSigner: jest.fn().mockResolvedValue({
        signMessage: jest.fn().mockRejectedValue(new Error('User rejected')),
      }),
    }

    render(<MessageForm provider={provider as any} walletAddress="0xabc" wallet={null} />)

    fireEvent.change(screen.getByPlaceholderText('Enter message to sign'), {
      target: { value: 'fail' },
    })
    fireEvent.click(getSignButton())

    await waitFor(() => expect(screen.getByText('User rejected')).toBeInTheDocument())
  })

  it('handles verification API failure gracefully', async () => {
    const provider = makeProviderWithSigner('0xok')
    const { __stubs } = require('../../hooks/useFetch')
    __stubs.post.mockRejectedValue(new Error('Server down'))

    render(<MessageForm provider={provider as any} walletAddress="0xabc" wallet={null} />)

    fireEvent.change(screen.getByPlaceholderText('Enter message to sign'), {
      target: { value: 'verify this' },
    })
    fireEvent.click(getSignButton())

    await waitFor(() => expect(screen.getByText('Server down')).toBeInTheDocument())
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('adds request/response interceptors with X-Feature header hook wiring', () => {
    render(<MessageForm provider={null} walletAddress="0xabc" wallet={null} />)
    const { __stubs } = require('../../hooks/useFetch')
    expect(__stubs.addRequest).toHaveBeenCalled()
    expect(__stubs.addResponse).toHaveBeenCalled()
  })
})
