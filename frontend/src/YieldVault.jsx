import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatEther, parseEther, parseAbi } from "viem";
import { TOKEN_ADDRESS, YIELD_VAULT_ADDRESS, TOKEN_ABI, VAULT_ABI } from "./contracts";

export function YieldVault() {
    const { address, isConnected } = useAccount();
    const { writeContract, data: hash, isPending, error } = useWriteContract();

    const [amount, setAmount] = useState("");
    const [tab, setTab] = useState("deposit");

    const { data: dsaBalance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: "balanceOf",
        args: [address],
        query: { refetchInterval: 1000 }
    });

    const { data: sharesBalance } = useReadContract({
        address: YIELD_VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "balanceOf",
        args: [address],
        query: { refetchInterval: 1000 }
    });

    const { data: totalVaultAssets } = useReadContract({
        address: YIELD_VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "totalAssets",
        query: { refetchInterval: 1000 }
    });

    const { data: previewValue } = useReadContract({
        address: YIELD_VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "previewRedeem",
        args: [sharesBalance || 0n],
        query: { refetchInterval: 1000 }
    });

    const { data: allowance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: "allowance",
        args: [address, YIELD_VAULT_ADDRESS],
        query: { refetchInterval: 1000 }
    });

    const safeAllowance = allowance !== undefined ? BigInt(allowance) : 0n;

    const handleAction = async () => {
        if (!amount || parseFloat(amount) <= 0) return;
        const parsedAmount = parseEther(amount);

        if (tab === "deposit") {
            if (safeAllowance < parsedAmount) {
                writeContract({
                    address: TOKEN_ADDRESS,
                    abi: TOKEN_ABI,
                    functionName: "approve",
                    args: [YIELD_VAULT_ADDRESS, parsedAmount],
                });
            } else {
                writeContract({
                    address: YIELD_VAULT_ADDRESS,
                    abi: VAULT_ABI,
                    functionName: "deposit",
                    args: [parsedAmount, address],
                });
            }
        } else {
            writeContract({
                address: YIELD_VAULT_ADDRESS,
                abi: VAULT_ABI,
                functionName: "redeem",
                args: [parsedAmount, address, address],
            });
        }
    };

    if (!isConnected) return null;

    const needsApprove = tab === "deposit" && safeAllowance < (amount ? parseEther(amount) : 0n);

    return (
        <div style={{ padding: "20px", borderRadius: "12px", background: "#1a1a1a", borderTop: "1px solid #333", borderBottom: "1px solid #333", color: "white" }}>
            <h2>Yield Vault (ERC-4626)</h2>
            <p style={{ color: "#888", fontSize: "0.9em", marginBottom: "20px" }}>
                Stake your DSA tokens in the yield-aggregating vault to mint yDSA.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                <div style={{ background: "#222", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ color: "#888", fontSize: "0.8em" }}>Total Assets Deployed</div>
                    <div style={{ fontSize: "1.2em", fontWeight: "bold", marginTop: "4px" }}>
                        {totalVaultAssets ? formatEther(totalVaultAssets) : "0"} DSA
                    </div>
                </div>
                <div style={{ background: "#222", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ color: "#888", fontSize: "0.8em" }}>Your Shares (yDSA)</div>
                    <div style={{ fontSize: "1.2em", fontWeight: "bold", marginTop: "4px" }}>
                        {sharesBalance ? formatEther(sharesBalance) : "0"} yDSA
                    </div>
                </div>
                <div style={{ background: "#222", padding: "12px", borderRadius: "8px", gridColumn: "span 2" }}>
                    <div style={{ color: "#888", fontSize: "0.8em" }}>Current Staked Value</div>
                    <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#38bdf8", marginTop: "4px" }}>
                        {previewValue ? formatEther(previewValue) : "0"} DSA
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", background: "#222", borderRadius: "8px", padding: "3px", marginBottom: "15px" }}>
                <button onClick={() => setTab("deposit")} style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", cursor: "pointer", background: tab === "deposit" ? "#333" : "transparent", color: "white", fontWeight: "bold" }}>Deposit</button>
                <button onClick={() => setTab("withdraw")} style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", cursor: "pointer", background: tab === "withdraw" ? "#333" : "transparent", color: "white", fontWeight: "bold" }}>Withdraw</button>
            </div>

            <div style={{ marginBottom: "15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85em", color: "#888", marginBottom: "5px" }}>
                    <span>Amount</span>
                    <span>Max: {tab === "deposit" ? (dsaBalance ? formatEther(dsaBalance) : "0") : (sharesBalance ? formatEther(sharesBalance) : "0")}</span>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <input
                        type="number"
                        placeholder="0.0"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        style={{ flex: 1, padding: "12px", background: "#222", border: "1px solid #333", borderRadius: "8px", color: "white", fontSize: "1.1em" }}
                    />
                    <button
                        onClick={() => {
                            if (tab === "deposit") setAmount(dsaBalance ? formatEther(dsaBalance) : "0");
                            else setAmount(sharesBalance ? formatEther(sharesBalance) : "0");
                        }}
                        style={{ padding: "0 15px", background: "#333", border: "none", borderRadius: "8px", color: "#3b82f6", cursor: "pointer", fontWeight: "bold" }}
                    >
                        MAX
                    </button>
                </div>
            </div>

            <button
                onClick={handleAction}
                disabled={isPending || !amount}
                style={{
                    width: "100%",
                    padding: "14px",
                    backgroundColor: needsApprove ? "#f59e0b" : "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "1.1em",
                    transition: "background 0.2s"
                }}
            >
                {isPending ? "Pending Tx..." : needsApprove ? "Approve DSA" : tab === "deposit" ? "Deposit DSA" : "Withdraw shares"}
            </button>

            {hash && <p style={{ color: "#4ade80", fontSize: "0.85em", marginTop: "12px", textAlign: "center" }}>✓ Transaction sent successfully! Hash: {hash.slice(0, 15)}...</p>}
            {error && <p style={{ color: "#ff4d4d", fontSize: "0.85em", marginTop: "12px", textAlign: "center" }}>✕ Error: {error.shortMessage || error.message}</p>}
        </div>
    );
}