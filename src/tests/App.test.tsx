import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BrowserProvider } from 'ethers'
import App from '../App'
import type { ConnectedWallet } from '../types'

jest.mock('../DynamicWallet', () => {
  return function MockedDynamicWallet({ onWalletConnected }: { onWalletConnected: (wallet: ConnectedWallet | null) => void }) {
    const handleConnect = () => {
      const mockWallet: ConnectedWallet = {
        provider: { __mocked: true } as any,
        address: '0x1234567890123456789012345678901234567890',
        wallet: { mockWallet: true }
      }
      onWalletConnected(mockWallet)
    }

    const handleDisconnect = () => {
      onWalletConnected(null)
    }

    return (
      <div data-testid="dynamic-wallet">
        <button data-testid="connect-wallet" onClick={handleConnect}>
          Connect Test Wallet
        </button>
        <button data-testid="disconnect-wallet" onClick={handleDisconnect}>
          Disconnect Test Wallet
        </button>
        Mocked DynamicWallet
      </div>
    )
  }
})

jest.mock('../components/MessageForm', () => {
  return function MockedMessageForm({ 
    provider, 
    walletAddress, 
    wallet 
  }: { 
    provider: BrowserProvider | null
    walletAddress: string
    wallet: unknown 
  }) {
    return (
      <div data-testid="message-form">
        <span data-testid="wallet-address">{walletAddress}</span>
        <span data-testid="provider-status">{provider ? 'Provider Connected' : 'No Provider'}</span>
        <span data-testid="wallet-status">{wallet ? 'Wallet Present' : 'No Wallet'}</span>
      </div>
    )
  }
})

describe('App', () => {
  it('renders DynamicWallet component initially', () => {
    render(<App />)
    expect(screen.getByTestId('dynamic-wallet')).toBeInTheDocument()
  })

  it('does not render MessageForm when no wallet is connected', () => {
    render(<App />)
    expect(screen.queryByTestId('message-form')).not.toBeInTheDocument()
  })

  it('renders MessageForm when wallet is connected', () => {
    render(<App />)
    const connectButton = screen.getByTestId('connect-wallet')
    fireEvent.click(connectButton)

    expect(screen.getByTestId('message-form')).toBeInTheDocument()
    expect(screen.getByTestId('wallet-address')).toHaveTextContent('0x1234567890123456789012345678901234567890')
    expect(screen.getByTestId('provider-status')).toHaveTextContent('Provider Connected')
    expect(screen.getByTestId('wallet-status')).toHaveTextContent('Wallet Present')
  })

  it('hides MessageForm when wallet is disconnected', () => {
    render(<App />)
    
    const connectButton = screen.getByTestId('connect-wallet')
    fireEvent.click(connectButton)
    expect(screen.getByTestId('message-form')).toBeInTheDocument()

    const disconnectButton = screen.getByTestId('disconnect-wallet')
    fireEvent.click(disconnectButton)
    expect(screen.queryByTestId('message-form')).not.toBeInTheDocument()
  })

  it('passes correct props to MessageForm', () => {
    render(<App />)
    
    const connectButton = screen.getByTestId('connect-wallet')
    fireEvent.click(connectButton)
    expect(screen.getByTestId('wallet-address')).toHaveTextContent('0x1234567890123456789012345678901234567890')
    expect(screen.getByTestId('provider-status')).toHaveTextContent('Provider Connected')
    expect(screen.getByTestId('wallet-status')).toHaveTextContent('Wallet Present')
  })

  it('handles wallet connection state changes correctly', () => {
    render(<App />)
    
   
    expect(screen.queryByTestId('message-form')).not.toBeInTheDocument()

 
    const connectButton = screen.getByTestId('connect-wallet')
    fireEvent.click(connectButton)
    expect(screen.getByTestId('message-form')).toBeInTheDocument()


    const disconnectButton = screen.getByTestId('disconnect-wallet')
    fireEvent.click(disconnectButton)
    expect(screen.queryByTestId('message-form')).not.toBeInTheDocument()

  
    fireEvent.click(connectButton)
    expect(screen.getByTestId('message-form')).toBeInTheDocument()
  })
})
