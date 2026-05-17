import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatEther, parseEther } from "viem";
import { AMM_ADDRESS, YIELD_VAULT_ADDRESS, TOKEN_ADDRESS, TOKEN_ABI, AMM_FACTORY_ABI, AMM_PAIR_ABI } from "./contracts";


export function AMMPanel() {
    const { address, isConnected } = useAccount();
    const { writeContractAsync, data: hash, isPending, error } = useWriteContract();

    const [tab, setTab] = useState("swap");
    const [swapAmount, setSwapAmount] = useState("");
    const [liqAmount0, setLiqAmount0] = useState("");
    const [liqAmount1, setLiqAmount1] = useState("");
    const [uiError, setUiError] = useState("");

    const { data: pairAddress } = useReadContract({
        address: AMM_ADDRESS,
        abi: AMM_FACTORY_ABI,
        functionName: "getPair",
        args: [TOKEN_ADDRESS, YIELD_VAULT_ADDRESS],
        query: { refetchInterval: 1000 }
    });

    const hasPool = pairAddress && pairAddress !== "0x0000000000000000000000000000000000000000";

    const { data: reserves } = useReadContract({
        address: hasPool ? pairAddress : undefined,
        abi: AMM_PAIR_ABI,
        functionName: "getReserves",
        query: { refetchInterval: 1000 }
    });

    const reserve0 = reserves !== undefined ? BigInt(reserves[0]) : 0n;
    const reserve1 = reserves !== undefined ? BigInt(reserves[1]) : 0n;

    const { data: dsaBalance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: "balanceOf",
        args: [address],
        query: { refetchInterval: 1000 }
    });

    const { data: mockBalance } = useReadContract({
        address: YIELD_VAULT_ADDRESS,
        abi: TOKEN_ABI,
        functionName: "balanceOf",
        args: [address],
        query: { refetchInterval: 1000 }
    });

    const { data: lpBalance } = useReadContract({
        address: hasPool ? pairAddress : undefined,
        abi: AMM_PAIR_ABI,
        functionName: "balanceOf",
        args: [address],
        query: { refetchInterval: 1000 }
    });

    const { data: allowanceDsa } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: "allowance",
        args: [address, pairAddress],
        query: { refetchInterval: 1000 }
    });

    const { data: allowanceMock } = useReadContract({
        address: YIELD_VAULT_ADDRESS,
        abi: TOKEN_ABI,
        functionName: "allowance",
        args: [address, pairAddress],
        query: { refetchInterval: 1000 }
    });

    const { data: poolDsaBalance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: "balanceOf",
        args: [pairAddress],
        query: { refetchInterval: 1000 }
    });

    const amountIn = swapAmount ? parseEther(swapAmount) : 0n;

    const { data: amountOut } = useReadContract({
        address: hasPool && swapAmount && parseFloat(swapAmount) > 0 && reserve0 > 0n && reserve1 > 0n ? pairAddress : undefined,
        abi: AMM_PAIR_ABI,
        functionName: "getAmountOut",
        args: [
            swapAmount ? parseEther(swapAmount) : 0n,
            reserve0,
            reserve1
        ],
        query: { refetchInterval: 1000 }
    });

    const safeAllowanceDsa = allowanceDsa !== undefined ? BigInt(allowanceDsa) : 0n;
    const safeAllowanceMock = allowanceMock !== undefined ? BigInt(allowanceMock) : 0n;

    const safePoolDsa = poolDsaBalance !== undefined ? BigInt(poolDsaBalance) : 0n;
    const sentAmount = safePoolDsa > reserve0 ? safePoolDsa - reserve0 : 0n;

    const handleCreatePool = async () => {
        setUiError("");
        try {
            await writeContractAsync({
                address: AMM_ADDRESS,
                abi: AMM_FACTORY_ABI,
                functionName: "createPairCreate2",
                args: [TOKEN_ADDRESS, YIELD_VAULT_ADDRESS],
            });
        } catch (err) {
            console.error("Create pool error:", err);
            setUiError(err.shortMessage || err.message || String(err));
        }
    };

    const handleSwap = async () => {
        if (!swapAmount || !hasPool) return;
        setUiError("");

        try {
            if (sentAmount < amountIn) {
                await writeContractAsync({
                    address: TOKEN_ADDRESS,
                    abi: TOKEN_ABI,
                    functionName: "transfer",
                    args: [pairAddress, amountIn],
                });
            } else {
                await writeContractAsync({
                    address: pairAddress,
                    abi: AMM_PAIR_ABI,
                    functionName: "swap",
                    args: [0n, amountOut || 0n, address],
                });
            }
        } catch (err) {
            console.error("Swap error:", err);
            setUiError(err.shortMessage || err.message || String(err));
        }
    };

    const handleAddLiquidity = async () => {
        if (!liqAmount0 || !liqAmount1 || !hasPool) return;
        const val0 = parseEther(liqAmount0);
        const val1 = parseEther(liqAmount1);
        setUiError("");

        try {
            if (safeAllowanceDsa < val0) {
                await writeContractAsync({
                    address: TOKEN_ADDRESS,
                    abi: TOKEN_ABI,
                    functionName: "approve",
                    args: [pairAddress, val0],
                });
            } else if (safeAllowanceMock < val1) {
                await writeContractAsync({
                    address: YIELD_VAULT_ADDRESS,
                    abi: TOKEN_ABI,
                    functionName: "approve",
                    args: [pairAddress, val1],
                });
            } else {
                await writeContractAsync({
                    address: pairAddress,
                    abi: AMM_PAIR_ABI,
                    functionName: "addLiquidity",
                    args: [val0, val1, address],
                });
            }
        } catch (err) {
            console.error("Add liquidity error:", err);
            setUiError(err.shortMessage || err.message || String(err));
        }
    };

    const getLiquidityButtonText = () => {
        if (isPending) return "Processing...";
        if (!liqAmount0 || !liqAmount1) return "Enter Amounts";
        const val0 = parseEther(liqAmount0);
        const val1 = parseEther(liqAmount1);
        if (safeAllowanceDsa < val0) return "Approve DSA";
        if (safeAllowanceMock < val1) return "Approve Mock Token";
        return "Add Liquidity";
    };

    const getSwapButtonText = () => {
        if (isPending) return "Processing...";
        if (!swapAmount) return "Enter Amount";
        if (sentAmount < amountIn) return "1. Transfer DSA to Pool";
        return "2. Confirm Swap";
    };

    if (!isConnected) return null;

    return (
        <div style={{ padding: "20px", borderRadius: "12px", background: "#1a1a1a", borderTop: "1px solid #333", borderBottom: "1px solid #333", color: "white" }}>
            <h2>AMM Swap & Pools</h2>
            <p style={{ color: "#888", fontSize: "0.9em", marginBottom: "20px" }}>
                Swap tokens instantly or provide liquidity to earn swapping fees.
            </p>

            {!hasPool ? (
                <div style={{ padding: "15px", background: "#222", borderRadius: "8px", textAlign: "center" }}>
                    <p style={{ marginBottom: "12px", fontSize: "0.95em", color: "#888" }}>No active AMM pool found for DSA / yDSA.</p>
                    <button
                        onClick={handleCreatePool}
                        disabled={isPending}
                        style={{ padding: "10px 20px", background: "#3b82f6", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: "bold" }}
                    >
                        {isPending ? "Creating..." : "Initialize Pool (CREATE2)"}
                    </button>
                </div>
            ) : (
                <>
                    <div style={{ display: "flex", gap: "10px", background: "#222", padding: "12px", borderRadius: "8px", marginBottom: "15px", fontSize: "0.85em" }}>
                        <div style={{ flex: 1 }}>
                            <span style={{ color: "#888" }}>Reserves:</span>
                            <div style={{ fontWeight: "bold", marginTop: "3px" }}>
                                {reserves ? formatEther(reserves[0]) : "0"} DSA / {reserves ? formatEther(reserves[1]) : "0"} yDSA
                            </div>
                        </div>
                        <div style={{ flex: 1, textAlign: "right" }}>
                            <span style={{ color: "#888" }}>Your LP balance:</span>
                            <div style={{ fontWeight: "bold", marginTop: "3px", color: "#10b981" }}>
                                {lpBalance ? formatEther(lpBalance) : "0"} LP
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", background: "#222", borderRadius: "8px", padding: "3px", marginBottom: "15px" }}>
                        <button onClick={() => setTab("swap")} style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", cursor: "pointer", background: tab === "swap" ? "#333" : "transparent", color: "white", fontWeight: "bold" }}>Swap</button>
                        <button onClick={() => setTab("liquidity")} style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", cursor: "pointer", background: tab === "liquidity" ? "#333" : "transparent", color: "white", fontWeight: "bold" }}>Pool / Liquidity</button>
                    </div>

                    {tab === "swap" && (
                        <div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85em", color: "#888" }}>
                                    <span>Input (DSA)</span>
                                    <span>Balance: {dsaBalance ? parseFloat(formatEther(dsaBalance)).toFixed(2) : "0"} DSA</span>
                                </div>
                                <input
                                    type="number"
                                    placeholder="Input (DSA)"
                                    value={swapAmount}
                                    onChange={e => setSwapAmount(e.target.value)}
                                    style={{ padding: "12px", background: "#222", border: "1px solid #333", borderRadius: "8px", color: "white" }}
                                />
                                <div style={{ textAlign: "center", color: "#888", fontSize: "1.2em" }}>↓</div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85em", color: "#888" }}>
                                    <span>Output (yDSA)</span>
                                    <span>Balance: {mockBalance ? parseFloat(formatEther(mockBalance)).toFixed(2) : "0"} yDSA</span>
                                </div>
                                <input
                                    type="text"
                                    disabled
                                    placeholder="Output (yDSA)"
                                    value={amountOut ? parseFloat(formatEther(amountOut)).toFixed(4) + " yDSA" : "No liquidity / 0.0000"}
                                    style={{ padding: "12px", background: "#222", border: "1px solid #333", borderRadius: "8px", color: "#888" }}
                                />
                            </div>
                            <button
                                onClick={handleSwap}
                                disabled={isPending || !swapAmount || (sentAmount >= amountIn && (!amountOut || amountOut === 0n))}
                                style={{
                                    width: "100%",
                                    padding: "14px",
                                    background: sentAmount < amountIn ? "#eab308" : "#3b82f6",
                                    border: "none",
                                    borderRadius: "8px",
                                    color: "white",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                {getSwapButtonText()}
                            </button>
                        </div>
                    )}

                    {tab === "liquidity" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85em", color: "#888" }}>
                                    <label>DSA amount</label>
                                    <span>Balance: {dsaBalance ? parseFloat(formatEther(dsaBalance)).toFixed(2) : "0"}</span>
                                </div>
                                <input
                                    type="number"
                                    placeholder="0.0"
                                    value={liqAmount0}
                                    onChange={e => setLiqAmount0(e.target.value)}
                                    style={{ width: "100%", padding: "12px", background: "#222", border: "1px solid #333", borderRadius: "8px", color: "white", boxSizing: "border-box", marginTop: "4px" }}
                                />
                            </div>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85em", color: "#888" }}>
                                    <label>yDSA amount</label>
                                    <span>Balance: {mockBalance ? parseFloat(formatEther(mockBalance)).toFixed(2) : "0"}</span>
                                </div>
                                <input
                                    type="number"
                                    placeholder="0.0"
                                    value={liqAmount1}
                                    onChange={e => setLiqAmount1(e.target.value)}
                                    style={{ width: "100%", padding: "12px", background: "#222", border: "1px solid #333", borderRadius: "8px", color: "white", boxSizing: "border-box", marginTop: "4px" }}
                                />
                            </div>
                            <button
                                onClick={handleAddLiquidity}
                                disabled={isPending || !liqAmount0 || !liqAmount1}
                                style={{
                                    width: "100%",
                                    padding: "14px",
                                    background: getLiquidityButtonText().includes("Approve") ? "#eab308" : "#10b981",
                                    border: "none",
                                    borderRadius: "8px",
                                    color: "white",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    marginTop: "5px",
                                    transition: "all 0.2s"
                                }}
                            >
                                {getLiquidityButtonText()}
                            </button>
                        </div>
                    )}
                </>
            )}

            {hash && <p style={{ color: "#4ade80", fontSize: "0.85em", marginTop: "12px", textAlign: "center" }}>✓ Transaction sent successfully! Hash: {hash.slice(0, 15)}...</p>}
            {uiError && <p style={{ color: "#ff9900", fontSize: "0.85em", marginTop: "12px", textAlign: "center", background: "rgba(255,153,0,0.1)", padding: "8px", borderRadius: "6px", border: "1px solid #ff9900" }}>⚠ UI Warning: {uiError}</p>}
            {error && <p style={{ color: "#ff4d4d", fontSize: "0.85em", marginTop: "12px", textAlign: "center" }}>✕ Error: {error.shortMessage || error.message}</p>}
        </div>
    );
}