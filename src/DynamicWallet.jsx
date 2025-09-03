import { useEffect } from "react";
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

  useEffect(() => {
    if (!onWalletConnected) return;

    if (!primaryWallet) {
      onWalletConnected(null);
      return;
    }

    onWalletConnected({
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
        onWalletConnected({
          provider: ethProvider,
          address: primaryWallet.address,
          wallet: primaryWallet,
        });
      } catch (err) {
        console.error("Provider setup failed:", err);
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
