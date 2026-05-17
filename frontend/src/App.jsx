import { WagmiProvider, createConfig, http, useAccount } from "wagmi";
import { ConnectKitProvider, ConnectKitButton } from "connectkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Governance } from "./Governance";
import { CreateProposal } from "./Proposals";
import { ProposalList } from "./ProposalList";
import { Toaster } from "react-hot-toast";
import { injected } from "wagmi/connectors";
import { useState } from "react";
import { YieldVault } from "./YieldVault";

const queryClient = new QueryClient();

const anvilChain = {
  id: 31337,
  name: "Foundry",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
};

const config = createConfig({
  chains: [anvilChain],
  multiInjectedProviderDiscovery: false,
  connectors: [injected()],
  transports: {
    [anvilChain.id]: http("http://127.0.0.1:8545"),
  },
});

function NetworkGuard({ children }) {
  const { chainId, isConnected } = useAccount();
  if (isConnected && chainId !== 31337) {
    return (
      <div style={{ padding: "20px", textAlign: "center", background: "#ff4d4d", color: "white", margin: "20px 0", borderRadius: "8px" }}>
        <h2> Wrong Network</h2>
        <p>Please switch your MetaMask to the local Foundry network (Chain ID: 31337).</p>
      </div>
    );
  }
  return children;
}

function App() {
  const [activeTab, setActiveTab] = useState("governance");

  return (
    <WagmiProvider config={config}>
      <Toaster position="top-right" />
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="dark" options={{ disableENS: true, avoidExplicitEnabling: true }}>
          <div style={{ padding: "20px", fontFamily: "sans-serif", backgroundColor: "#121212", minHeight: "100vh", color: "white" }}>
            <header style={{ textAlign: "center", marginBottom: "30px", marginTop: "40px" }}>
              <h1 style={{ margin: 0, fontSize: "2.5em" }}>DSA Dashboard</h1>

              <div style={{ display: "inline-flex", background: "#1a1a1a", padding: "4px", borderRadius: "20px", marginTop: "20px" }}>
                <button
                  onClick={() => setActiveTab("governance")}
                  style={{
                    padding: "10px 24px",
                    background: activeTab === "governance" ? "#3b82f6" : "transparent",
                    color: "white",
                    border: "none",
                    borderRadius: "16px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    transition: "all 0.3s"
                  }}
                >
                  DAO Governance
                </button>
                <button
                  onClick={() => setActiveTab("defi")}
                  style={{
                    padding: "10px 24px",
                    background: activeTab === "defi" ? "#3b82f6" : "transparent",
                    color: "white",
                    border: "none",
                    borderRadius: "16px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    transition: "all 0.3s"
                  }}
                >
                  DeFi Hub
                </button>
              </div>
            </header>

            <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
              <NetworkGuard>
                {activeTab === "governance" ? (
                  <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>
                    <div style={{ flex: "0 0 350px", display: "flex", flexDirection: "column", gap: "15px" }}>
                      <div style={{ alignSelf: "flex-start" }}>
                        <ConnectKitButton />
                      </div>
                      <Governance />
                      <CreateProposal />
                    </div>
                    <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "20px" }}>
                      <ProposalList />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>
                    <div style={{ flex: "1" }}>
                      <YieldVault />
                    </div>
                  </div>
                )}
              </NetworkGuard>
            </main>
          </div>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}


export default App;
