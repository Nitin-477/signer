import { useState, useEffect, useMemo } from 'react'
import type { BrowserProvider, Signer } from 'ethers'
import useFetch from '../hooks/useFetch'

const STORAGE_KEY = 'signHistory'

type VerifyResponse = {
  isValid: boolean
  signer: string
  originalMessage: string
}

type HistoryEntry = {
  message: string
  signature: string
  timestamp: number
  walletAddress?: string
  verification?: VerifyResponse
}

type ExternalWallet = {
  signMessage?: (msg: string | Uint8Array) => Promise<string>
}

interface Props {
  provider?: BrowserProvider | { getSigner: () => Promise<Signer> } | null
  walletAddress?: string
  wallet?: ExternalWallet | null
}

export default function MessageForm({ provider, walletAddress, wallet }: Props) {
  const [message, setMessage] = useState<string>('')
  const [signature, setSignature] = useState<string>('')
  const [verificationResult, setVerificationResult] = useState<VerifyResponse | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const api = useFetch()

  useEffect(() => {
    const offReq = api.addRequest(({ url, options }) => {
      options.headers = { ...(options.headers || {}), 'X-Feature': 'MessageSign' }
      return { url, options }
    })
    const offRes = api.addResponse((res) => res)
    return () => {
      offReq()
      offRes()
    }
  }, [api])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setHistory(JSON.parse(saved) as HistoryEntry[])
    } catch {
      setHistory([])
    }
  }, [])

  const saveToHistory = (entry: HistoryEntry) => {
    const next = [entry, ...history]
    setHistory(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const isMessageEmpty = useMemo(() => message.trim().length === 0, [message])

  const handleSign = async () => {
    if (isMessageEmpty) return
    setError(null)
    setVerificationResult(null)
    setSignature('')
    setLoading(true)
    try {
      let sig: string
      if (provider && 'getSigner' in provider) {
        const signer = await provider.getSigner()
        sig = await signer.signMessage(message)
      } else if (wallet?.signMessage) {
        sig = await wallet.signMessage(message)
      } else {
        throw new Error('No signer available yet')
      }
      setSignature(sig)
      const result = await api.post<VerifyResponse>('/verify-signature', {
        message,
        signature: sig,
      })
      setVerificationResult(result)
      saveToHistory({
        message,
        signature: sig,
        timestamp: Date.now(),
        walletAddress,
        verification: result,
      })
      setMessage('')
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Signing failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="message-form">
      <div className="sign-section">
        <h2>Sign Message</h2>
        <div className="connected">
          <b>Wallet:</b> <code>{walletAddress}</code>
        </div>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter message to sign"
          disabled={loading}
        />
        <button onClick={handleSign} disabled={isMessageEmpty || loading}>
          {loading ? 'Signing...' : 'Sign Message'}
        </button>
        {error && <div className="error">{error}</div>}
      </div>
      {signature && (
        <div className="signature-section">
          <h3>Signature</h3>
          <code>{signature}</code>
        </div>
      )}
      {verificationResult && (
        <div className="verification-section">
          <h3>Verification Result</h3>
          <div>
            <b>Valid:</b> {verificationResult.isValid ? '✅' : '❌'}
          </div>
          <div>
            <b>Signer:</b> <code>{verificationResult.signer}</code>
          </div>
          <div>
            <b>Original Message:</b> <code>{verificationResult.originalMessage}</code>
          </div>
        </div>
      )}
      <div className="history-section">
        <h2>Signing History</h2>
        <div className="history-list">
          {history.length === 0 && <div>No signed messages yet.</div>}
          {history.map((item, i) => (
            <div key={i} className="history-item">
              <p>
                <strong>Message:</strong> {item.message}
              </p>
              <p>
                <strong>Signature:</strong> <code>{item.signature.slice(0, 32)}...</code>
              </p>
              <p>
                <strong>Signer (from result):</strong> <code>{item.verification?.signer || '-'}</code>
              </p>
              <p>
                <strong>Time:</strong> {new Date(item.timestamp).toLocaleString()}
              </p>
              {item.verification?.isValid && (
                <p className="verification-status valid">✓ Verified</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
