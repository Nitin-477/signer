import { useState, useCallback } from 'react'
import DynamicWallet from './DynamicWallet'
import MessageForm from './components/MessageForm'
import type { ConnectedWallet } from './types'
import './App.css'

export default function App() {
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null)

  const handleWalletConnected = useCallback((walletInfo: ConnectedWallet | null) => {
    setWallet(walletInfo)
  }, [])

  return (
    <div>
      <DynamicWallet onWalletConnected={handleWalletConnected} />
      {wallet && (
        <>         
          <MessageForm
            provider={wallet.provider}
            walletAddress={wallet.address}
            wallet={wallet.wallet}
          />
        </>
      )}
    </div>
  )
}
