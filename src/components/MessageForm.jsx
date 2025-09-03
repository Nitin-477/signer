import { useState, useEffect } from "react";

export default function MessageForm({ provider, walletAddress, wallet }) {
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("signHistory");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const saveToHistory = (entry) => {
    const newHistory = [entry, ...history];
    setHistory(newHistory);
    localStorage.setItem("signHistory", JSON.stringify(newHistory));
  };

  const handleSign = async () => {
    if (!message) return;
    setError(null);
    setVerificationResult(null);
    setSignature("");
    setLoading(true);
    try {
      let sig;
        console.log("Signing with:", { provider, wallet });
      if (provider) {
        const signer = await provider.getSigner();
        sig = await signer.signMessage(message);
      }
      else if (wallet?.signMessage) {
        sig = await wallet.signMessage(message);
      } else {
        throw new Error("No signer available yet");
      }

      setSignature(sig);

      const resp = await fetch("http://localhost:3001/verify-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature: sig }),
      });
      const result = await resp.json();
      setVerificationResult(result);

      saveToHistory({
        message,
        signature: sig,
        timestamp: Date.now(),
        walletAddress,
        verification: result,
      });
    } catch (e) {
      console.error(e);
      setError(e?.message || "Signing failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="message-form">
      <div className="sign-section">
        <h2>Sign Message</h2>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter message to sign"
          disabled={loading}
        />
        <button onClick={handleSign} disabled={!message || loading}>
          {loading ? "Signing..." : "Sign Message"}
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
            <b>Valid:</b> {verificationResult.isValid ? "✅" : "❌"}
          </div>
          <div>
            <b>Signer:</b> <code>{verificationResult.signer}</code>
          </div>
          <div>
            <b>Original Message:</b>{" "}
            <code>{verificationResult.originalMessage}</code>
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
                <strong>Signature:</strong>{" "}
                <code>{item.signature.slice(0, 32)}...</code>
              </p>
              <p>
                <strong>Signer (from result):</strong>{" "}
                <code>{item.verification?.signer || "-"}</code>
              </p>
              <p>
                <strong>Time:</strong>{" "}
                {new Date(item.timestamp).toLocaleString()}
              </p>
              {item.verification?.isValid && (
                <p className="verification-status valid">✓ Verified</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
