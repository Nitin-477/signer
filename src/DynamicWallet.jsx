import { useEffect, useState } from "react";
import {
  DynamicContextProvider,
  useDynamicContext,
} from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ethers } from "ethers";

const DYNAMIC_ID = import.meta.env.VITE_DYNAMIC_ID;

function WalletComponent({ onWalletConnected }) {
  const { primaryWallet, handleLogOut, setShowAuthFlow, loading } =
    useDynamicContext();
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    if (!primaryWallet) return;

    onWalletConnected?.({
      provider: null,
      address: primaryWallet.address,
      wallet: primaryWallet,
    });
    (async () => {
      try {
        const maybeGetProvider = primaryWallet?.connector?.getProvider;
        const eip1193 =
          typeof maybeGetProvider === "function"
            ? await primaryWallet.connector.getProvider()
            : primaryWallet?.connector?.provider;
        if (!eip1193) return;

        const ethProvider = new ethers.BrowserProvider(eip1193);
        setProvider(ethProvider);
        onWalletConnected?.({
          provider: ethProvider,
          address: primaryWallet.address,
          wallet: primaryWallet,
        });
      } catch (error) {
        console.error("Provider setup failed:", error);
      }
    })();
  }, [primaryWallet, onWalletConnected]);

  const handleConnect = () => setShowAuthFlow(true);

  if (loading) {
    return <div>Loading wallet...</div>;
  }

  if (!primaryWallet) {
    return (
      <button
        onClick={handleConnect}
        className="connect-button"
        disabled={loading}
      >
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="wallet-info">      
      <button onClick={handleLogOut} className="disconnect-button">
        Disconnect
      </button>
    </div>
  );
}

export default function DynamicWallet({ onWalletConnected }) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ID,
        walletConnectors: [EthereumWalletConnectors],
        events: {
          onAuthFlowOpen: () => console.log("Auth flow opened"),
          onAuthFlowClose: () => console.log("Auth flow closed"),
          onAuthSuccess: () => console.log("Auth success"),
        },
      }}
    >
      <WalletComponent onWalletConnected={onWalletConnected} />
    </DynamicContextProvider>
  );
}
