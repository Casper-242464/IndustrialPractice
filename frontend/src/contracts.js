import { parseAbi } from "viem";

export const TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const AMM_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
export const LENDING_POOL_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
export const YIELD_VAULT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
export const TIMELOCK_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
export const GOVERNOR_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F";

export const VAULT_ABI = parseAbi([
    "function deposit(uint256 assets, address receiver) returns (uint256)",
    "function redeem(uint256 shares, address receiver, address owner) returns (uint256)",
    "function totalAssets() view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
    "function previewDeposit(uint256 assets) view returns (uint256)",
    "function previewRedeem(uint256 shares) view returns (uint256)",
    "function asset() view returns (address)"
]);

export const AMM_FACTORY_ABI = parseAbi([
    "function getPair(address tokenA, address tokenB) view returns (address)",
    "function createPair(address tokenA, address tokenB) returns (address)",
    "function createPairCreate2(address tokenA, address tokenB) returns (address)",
    "function allPairsLength() view returns (uint256)"
]);

export const AMM_PAIR_ABI = parseAbi([
    "function getReserves() view returns (uint256 reserve0, uint256 reserve1)",
    "function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) pure returns (uint256 amountOut)",
    "function addLiquidity(uint256 amount0, uint256 amount1, address to) returns (uint256)",
    "function removeLiquidity(uint256 liquidity, address to) returns (uint256, uint256)",
    "function swap(uint256 amount0Out, uint256 amount1Out, address to)",
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function token0() view returns (address)",
    "function token1() view returns (address)"
]);

export const TOKEN_ABI = parseAbi([
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function delegate(address delegatee)",
    "function getVotes(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function delegates(address account) view returns (address)",
    "function totalSupply() view returns (uint256)"
]);

export const GOVERNOR_ABI = parseAbi([
    "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)",
    "function castVote(uint256 proposalId, uint8 support) returns (uint256)",
    "function state(uint256 proposalId) view returns (uint8)",
    "function hasVoted(uint256 proposalId, address account) view returns (bool)",
    "function queue(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)",
    "function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)"
]);

export const PROPOSAL_STATES = [
    "Pending",   // 0
    "Active",    // 1
    "Canceled",  // 2
    "Defeated",  // 3
    "Succeeded", // 4
    "Queued",    // 5
    "Expired",   // 6
    "Executed"   // 7
];