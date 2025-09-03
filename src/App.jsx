import { useState, useCallback } from "react";
import DynamicWallet from "./DynamicWallet";
import MessageForm from "./components/MessageForm";
import "./App.css";

export default function App() {
  const [wallet, setWallet] = useState(null);

  const handleWalletConnected = useCallback((walletInfo) => {
    setWallet(walletInfo);
  }, []);

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
  );
}
