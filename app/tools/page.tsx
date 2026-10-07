"use client";

import Link from "next/link";
import { useState } from "react";
import {
  useAccount,
  useSwitchChain,
  useWriteContract,
} from "wagmi";

type Tool = {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: string;
};

const tools: Tool[] = [
  {
    id: "token-scanner",
    icon: "⌕",
    title: "Token Scanner",
    description: "Inspect token contracts and on-chain metadata.",
    category: "Research",
  },
  {
    id: "address-explorer",
    icon: "◉",
    title: "Address Explorer",
    description: "Explore wallet balances across supported networks.",
    category: "Wallet",
  },
  {
    id: "risk-scanner",
    icon: "◇",
    title: "Risk Scanner",
    description: "Check contracts for important security and risk signals.",
    category: "Security",
  },
  {
    id: "gas-tracker",
    icon: "ϟ",
    title: "Gas Tracker",
    description: "Compare live network gas conditions across supported chains.",
    category: "Network",
  },
  {
    id: "transaction-decoder",
    icon: "↗",
    title: "Transaction Decoder",
    description: "Inspect blockchain transaction details.",
    category: "Transactions",
  },
  {
    id: "approval-manager",
    icon: "✓",
    title: "Approval Manager",
    description: "View available token approvals and revoke permissions.",
    category: "Security",
  },
  {
    id: "portfolio-analytics",
    icon: "▥",
    title: "Portfolio Analytics",
    description: "Understand native wallet balances across networks.",
    category: "Portfolio",
  },
];

const networks = [
  { id: 1, name: "Ethereum" },
  { id: 8453, name: "Base" },
  { id: 137, name: "Polygon" },
  { id: 42161, name: "Arbitrum" },
  { id: 10, name: "Optimism" },
  { id: 56, name: "BNB Chain" },
  { id: 4663, name: "Robinhood Chain" },
];

const revokeAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "spender",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
  },
] as const;

function shorten(value: unknown, size = 6) {
  const text = String(value ?? "");

  if (!text) return "—";

  if (text.length <= size + 5) {
    return text;
  }

  return `${text.slice(0, size)}...${text.slice(-4)}`;
}

function formatNumber(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

function getBalanceValue(item: any) {
  if (!item || typeof item !== "object") {
    return "0";
  }

  return (
    item.formatted ??
    item.balance ??
    item.amount ??
    item.nativeBalance ??
    "0"
  );
}

function safeArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function safeObject(value: unknown): Record<string, any> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, any>;
  }

  return {};
}

export default function ToolsPage() {
  const { address, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [activeTool, setActiveTool] =
    useState<Tool | null>(null);

  const [search, setSearch] = useState("");
  const [network, setNetwork] =
    useState("All Networks");

  const [contractAddress, setContractAddress] =
    useState("");

  const [walletAddress, setWalletAddress] =
    useState("");

  const [txHash, setTxHash] = useState("");

  const [selectedChain, setSelectedChain] =
    useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [result, setResult] =
    useState<any>(null);

  const [revoking, setRevoking] =
    useState("");

  const filteredTools = tools.filter((tool) => {
    const value = search.toLowerCase().trim();

    if (!value) return true;

    return (
      tool.title.toLowerCase().includes(value) ||
      tool.description.toLowerCase().includes(value) ||
      tool.category.toLowerCase().includes(value)
    );
  });

  function openTool(tool: Tool) {
    setActiveTool(tool);
    setResult(null);
    setError("");
    setLoading(false);

    if (
      tool.id === "address-explorer" ||
      tool.id === "approval-manager" ||
      tool.id === "portfolio-analytics"
    ) {
      setWalletAddress(address ?? "");
    }
  }

  function closeTool() {
    setActiveTool(null);
    setResult(null);
    setError("");
    setLoading(false);
  }

  async function runTool() {
    if (!activeTool) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      let url = "";

      if (activeTool.id === "token-scanner") {
        if (!contractAddress.trim()) {
          throw new Error(
            "Paste a token contract address first."
          );
        }

        url =
          `/api/tools?action=token` +
          `&contract=${encodeURIComponent(
            contractAddress.trim()
          )}` +
          `&chainId=${selectedChain}`;
      }

      if (activeTool.id === "address-explorer") {
        if (!walletAddress.trim()) {
          throw new Error(
            "Enter a wallet address first."
          );
        }

        url =
          `/api/tools?action=address` +
          `&address=${encodeURIComponent(
            walletAddress.trim()
          )}`;
      }

      if (activeTool.id === "risk-scanner") {
        if (!contractAddress.trim()) {
          throw new Error(
            "Paste a contract address first."
          );
        }

        url =
          `/api/tools?action=risk` +
          `&contract=${encodeURIComponent(
            contractAddress.trim()
          )}` +
          `&chainId=${selectedChain}`;
      }

      if (activeTool.id === "gas-tracker") {
        url = "/api/tools?action=gas";
      }

      if (activeTool.id === "transaction-decoder") {
        if (!txHash.trim()) {
          throw new Error(
            "Paste a transaction hash first."
          );
        }

        url =
          `/api/tools?action=transaction` +
          `&hash=${encodeURIComponent(
            txHash.trim()
          )}`;
      }

      if (activeTool.id === "approval-manager") {
        if (!walletAddress.trim()) {
          throw new Error(
            "Enter a wallet address first."
          );
        }

        url =
          `/api/tools?action=approvals` +
          `&address=${encodeURIComponent(
            walletAddress.trim()
          )}`;
      }

      if (activeTool.id === "portfolio-analytics") {
        if (!walletAddress.trim()) {
          throw new Error(
            "Enter a wallet address first."
          );
        }

        url =
          `/api/tools?action=analytics` +
          `&address=${encodeURIComponent(
            walletAddress.trim()
          )}`;
      }

      if (!url) {
        throw new Error(
          "This tool is not configured yet."
        );
      }

      const response = await fetch(url, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Tool request failed."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function revokeApproval(approval: any) {
    if (!isConnected) {
      setError(
        "Connect your wallet before revoking an approval."
      );
      return;
    }

    const chainId = Number(
      approval?.chainId
    );

    const token =
      approval?.tokenAddress;

    const spender =
      approval?.spender?.id ||
      approval?.spender;

    if (!chainId || !token || !spender) {
      setError(
        "This approval does not contain enough information to revoke safely."
      );
      return;
    }

    try {
      const key = `${chainId}-${token}-${spender}`;

      setRevoking(key);
      setError("");

      await switchChainAsync({
        chainId,
      });

      await writeContractAsync({
        address: token,
        abi: revokeAbi,
        functionName: "approve",
        args: [
          spender as `0x${string}`,
          BigInt(0),
        ],
        chainId,
      });

      await runTool();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Revoke transaction was not completed."
      );
    } finally {
      setRevoking("");
    }
  }

  const warningItems =
    safeArray(result?.warnings);

  const gasItems =
    safeArray(result?.items);

  const balanceItems =
    safeArray(result?.balances);

  const approvalItems =
    safeArray(result?.items);

  const analyticsItems =
    safeArray(result?.networks);

  const checkObject =
    safeObject(result?.checks);

  const checkEntries =
    Object.entries(checkObject);

  return (
    <main className="tools-page">
      <style jsx global>{`
        :root {
          --agora-yellow: #f5c400;
          --agora-black: #050505;
          --agora-surface: #111214;
          --agora-surface-2: #191a1c;
          --agora-border: #292929;
          --agora-text: #ffffff;
          --agora-muted: #929292;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: var(--agora-black);
          color: var(--agora-text);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        button,
        input,
        select {
          font: inherit;
        }

        .tools-page {
          min-height: 100vh;
          padding-bottom: 110px;
          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(245, 196, 0, 0.08),
              transparent 32%
            ),
            var(--agora-black);
        }

        .tools-shell {
          width: min(1080px, 100%);
          margin: 0 auto;
          padding: 0 20px;
        }

        .agora-header {
          height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--agora-border);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .brand-mark {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: var(--agora-yellow);
          color: #050505;
          font-size: 20px;
          font-weight: 900;
          box-shadow:
            0 8px 24px
            rgba(245, 196, 0, 0.12);
        }

        .brand-name {
          font-size: 15px;
          line-height: 1;
          font-weight: 850;
          letter-spacing: 0.08em;
        }

        .brand-subtitle {
          margin-top: 5px;
          color: #8c8c8c;
          font-size: 10px;
          white-space: nowrap;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .theme-button {
          width: 36px;
          height: 36px;
          border: 1px solid var(--agora-border);
          border-radius: 50%;
          background: var(--agora-surface);
          color: white;
          cursor: pointer;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #9d9d9d;
          font-size: 11px;
        }

        .online-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #48d597;
          box-shadow:
            0 0 10px
            rgba(72, 213, 151, 0.55);
        }

        .tools-intro {
          padding: 34px 0 22px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--agora-yellow);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .eyebrow-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--agora-yellow);
        }

        .tools-title {
          margin: 9px 0 0;
          font-size: clamp(31px, 6vw, 48px);
          line-height: 1.02;
          letter-spacing: -0.045em;
          font-weight: 850;
        }

        .tools-description {
          max-width: 620px;
          margin: 12px 0 0;
          color: #949494;
          font-size: 14px;
          line-height: 1.65;
        }

        .tools-controls {
          display: flex;
          gap: 10px;
          margin: 8px 0 22px;
        }

        .search-wrap {
          position: relative;
          flex: 1;
        }

        .search-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #777;
          font-size: 18px;
        }

        .search-input,
        .network-select {
          width: 100%;
          height: 50px;
          border: 1px solid var(--agora-border);
          border-radius: 16px;
          outline: none;
          background: var(--agora-surface);
          color: white;
        }

        .search-input {
          padding: 0 16px 0 43px;
        }

        .network-select {
          min-width: 150px;
          padding: 0 13px;
        }

        .search-input:focus,
        .network-select:focus {
          border-color: rgba(245, 196, 0, 0.6);
          box-shadow:
            0 0 0 3px
            rgba(245, 196, 0, 0.06);
        }

        .tools-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .tool-card {
          min-height: 188px;
          position: relative;
          overflow: hidden;
          padding: 21px;
          border: 1px solid var(--agora-border);
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.025),
              transparent 50%
            ),
            var(--agora-surface);
          cursor: pointer;
          text-align: left;
          color: white;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .tool-card:hover {
          transform: translateY(-3px);
          border-color: rgba(245, 196, 0, 0.45);
          box-shadow:
            0 16px 35px
            rgba(0, 0, 0, 0.22);
        }

        .tool-card:active {
          transform: scale(0.985);
        }

        .tool-icon {
          width: 45px;
          height: 45px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: rgba(245, 196, 0, 0.11);
          border: 1px solid rgba(245, 196, 0, 0.17);
          color: var(--agora-yellow);
          font-size: 25px;
          font-weight: 700;
        }

        .tool-category {
          margin-top: 17px;
          color: var(--agora-yellow);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .tool-title {
          margin-top: 5px;
          font-size: 18px;
          font-weight: 800;
        }

        .tool-description {
          max-width: 360px;
          margin-top: 7px;
          color: #898989;
          font-size: 12px;
          line-height: 1.55;
        }

        .tool-arrow {
          position: absolute;
          right: 19px;
          top: 20px;
          color: #777;
          font-size: 19px;
        }

        .bottom-nav {
          position: fixed;
          z-index: 50;
          left: 50%;
          bottom: 14px;
          transform: translateX(-50%);
          width: min(calc(100% - 24px), 620px);
          padding: 7px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 4px;
          border: 1px solid #2b2b2b;
          border-radius: 20px;
          background: rgba(17, 18, 20, 0.94);
          backdrop-filter: blur(18px);
          box-shadow:
            0 18px 50px
            rgba(0, 0, 0, 0.45);
        }

        .nav-item {
          height: 49px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          color: #858585;
          font-size: 11px;
          font-weight: 700;
          transition: 0.18s ease;
        }

        .nav-item:hover {
          color: white;
          background: rgba(255, 255, 255, 0.04);
        }

        .nav-item.active {
          color: #050505;
          background: var(--agora-yellow);
          box-shadow:
            0 6px 18px
            rgba(245, 196, 0, 0.18);
        }

        .workspace-backdrop {
          position: fixed;
          z-index: 100;
          inset: 0;
          padding: 14px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(9px);
        }

        .workspace {
          width: min(700px, 100%);
          max-height: calc(100vh - 28px);
          overflow-y: auto;
          padding: 24px;
          border: 1px solid #303030;
          border-radius: 28px;
          background: #111214;
          box-shadow:
            0 30px 80px
            rgba(0, 0, 0, 0.6);
        }

        .workspace-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .workspace-heading {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .workspace-icon {
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          color: #050505;
          background: var(--agora-yellow);
          font-size: 24px;
          font-weight: 800;
        }

        .workspace-title {
          margin: 0;
          font-size: 21px;
          font-weight: 850;
        }

        .workspace-category {
          margin-top: 4px;
          color: var(--agora-yellow);
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .close-workspace {
          width: 38px;
          height: 38px;
          border: 1px solid #303030;
          border-radius: 50%;
          background: #191a1c;
          color: white;
          cursor: pointer;
          font-size: 18px;
        }

        .workspace-description {
          margin: 20px 0;
          color: #909090;
          font-size: 13px;
          line-height: 1.65;
        }

        .form-grid {
          display: grid;
          gap: 11px;
        }

        .workspace-label {
          display: block;
          margin-bottom: 7px;
          color: #888;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .workspace-input {
          width: 100%;
          height: 50px;
          padding: 0 14px;
          border: 1px solid #303030;
          border-radius: 13px;
          outline: none;
          background: #191a1c;
          color: white;
        }

        .workspace-input:focus {
          border-color: rgba(245, 196, 0, 0.65);
        }

        .workspace-action {
          width: 100%;
          height: 50px;
          margin-top: 3px;
          border: 0;
          border-radius: 14px;
          background: var(--agora-yellow);
          color: #050505;
          font-weight: 850;
          cursor: pointer;
        }

        .workspace-action:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        .error-box {
          margin-top: 12px;
          padding: 13px;
          border: 1px solid rgba(255, 91, 91, 0.3);
          border-radius: 14px;
          background: rgba(255, 91, 91, 0.07);
          color: #ff9b9b;
          font-size: 12px;
          line-height: 1.5;
        }

        .result-box {
          margin-top: 15px;
          padding: 16px;
          border: 1px solid var(--agora-border);
          border-radius: 18px;
          background: var(--agora-surface-2);
        }

        .result-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 13px;
        }

        .result-title {
          font-size: 14px;
          font-weight: 800;
        }

        .result-subtitle {
          margin-top: 4px;
          color: #777;
          font-size: 10px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .stat {
          padding: 12px;
          border: 1px solid #292929;
          border-radius: 13px;
          background: #111214;
        }

        .stat-label {
          color: #707070;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .stat-value {
          margin-top: 5px;
          font-size: 14px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .status-pill {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(245, 196, 0, 0.12);
          color: var(--agora-yellow);
          font-size: 9px;
          font-weight: 800;
        }

        .list {
          display: grid;
          gap: 8px;
        }

        .list-item {
          padding: 13px;
          border: 1px solid #292929;
          border-radius: 14px;
          background: #111214;
        }

        .list-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .list-title {
          font-size: 12px;
          font-weight: 800;
        }

        .list-muted {
          margin-top: 4px;
          color: #777;
          font-size: 10px;
        }

        .revoke-button {
          min-width: 74px;
          height: 34px;
          padding: 0 10px;
          border: 1px solid rgba(245, 196, 0, 0.35);
          border-radius: 10px;
          background: rgba(245, 196, 0, 0.08);
          color: var(--agora-yellow);
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .revoke-button:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        .gas-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #292929;
        }

        .gas-row:last-child {
          border-bottom: 0;
        }

        .gas-name {
          font-size: 12px;
          font-weight: 800;
        }

        .gas-value {
          margin-top: 4px;
          color: #777;
          font-size: 10px;
        }

        .empty {
          padding: 20px 0;
          color: #777;
          font-size: 12px;
          text-align: center;
        }

        .warning {
          padding: 12px;
          border: 1px solid rgba(245, 196, 0, 0.2);
          border-radius: 13px;
          background: rgba(245, 196, 0, 0.05);
          color: #cfcfcf;
          font-size: 11px;
          line-height: 1.5;
        }

        .result-note {
          margin-top: 12px;
          padding: 11px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.025);
          color: #777;
          font-size: 10px;
          line-height: 1.5;
        }

        @media (max-width: 650px) {
          .tools-shell {
            padding: 0 15px;
          }

          .agora-header {
            height: 70px;
          }

          .tools-intro {
            padding: 28px 0 19px;
          }

          .tools-title {
            font-size: 34px;
          }

          .tools-controls {
            flex-direction: column;
          }

          .network-select {
            width: 100%;
          }

          .tools-grid {
            grid-template-columns: 1fr;
            gap: 11px;
          }

          .tool-card {
            min-height: 164px;
            padding: 19px;
            border-radius: 20px;
          }

          .bottom-nav {
            bottom: 10px;
            width: calc(100% - 18px);
            border-radius: 18px;
          }

          .nav-item {
            height: 47px;
            font-size: 10px;
          }

          .workspace {
            padding: 19px;
            border-radius: 24px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (min-width: 900px) {
          .tools-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .tool-card:last-child {
            grid-column: span 3;
          }
        }
      `}</style>

      <div className="tools-shell">
        <header className="agora-header">
          <Link href="/" className="brand">
            <div className="brand-mark">A</div>

            <div>
              <div className="brand-name">
                AGORA
              </div>

              <div className="brand-subtitle">
                AI &amp; Web3 Agent
              </div>
            </div>
          </Link>

          <div className="header-right">
            <button
              type="button"
              className="theme-button"
              aria-label="Theme"
            >
              ☀
            </button>

            <div className="online">
              <span className="online-dot" />
              Online
            </div>
          </div>
        </header>

        <section className="tools-intro">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Agora Tools
          </div>

          <h1 className="tools-title">
            Your Web3 toolbox.
          </h1>

          <p className="tools-description">
            Live blockchain utilities for
            inspecting, understanding and
            managing Web3 activity.
          </p>
        </section>

        <div className="tools-controls">
          <div className="search-wrap">
            <span className="search-icon">
              ⌕
            </span>

            <input
              className="search-input"
              placeholder="Search tools..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <select
            className="network-select"
            value={network}
            onChange={(event) => {
              const value =
                event.target.value;

              setNetwork(value);

              const found =
                networks.find(
                  (item) =>
                    item.name === value
                );

              if (found) {
                setSelectedChain(
                  found.id
                );
              }
            }}
          >
            <option value="All Networks">
              All Networks
            </option>

            {networks.map((item) => (
              <option
                key={item.id}
                value={item.name}
              >
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <section className="tools-grid">
          {filteredTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className="tool-card"
              onClick={() =>
                openTool(tool)
              }
            >
              <span className="tool-arrow">
                ↗
              </span>

              <div className="tool-icon">
                {tool.icon}
              </div>

              <div className="tool-category">
                {tool.category}
              </div>

              <div className="tool-title">
                {tool.title}
              </div>

              <div className="tool-description">
                {tool.description}
              </div>
            </button>
          ))}
        </section>
      </div>

      {activeTool && (
        <div
          className="workspace-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeTool();
            }
          }}
        >
          <section className="workspace">
            <div className="workspace-top">
              <div className="workspace-heading">
                <div className="workspace-icon">
                  {activeTool.icon}
                </div>

                <div>
                  <h2 className="workspace-title">
                    {activeTool.title}
                  </h2>

                  <div className="workspace-category">
                    {activeTool.category}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="close-workspace"
                onClick={closeTool}
              >
                ×
              </button>
            </div>

            <p className="workspace-description">
              {activeTool.description}
            </p>

            <div className="form-grid">
              {(activeTool.id ===
                "token-scanner" ||
                activeTool.id ===
                  "risk-scanner") && (
                <>
                  <div>
                    <label className="workspace-label">
                      Network
                    </label>

                    <select
                      className="workspace-input"
                      value={selectedChain}
                      onChange={(event) =>
                        setSelectedChain(
                          Number(
                            event.target.value
                          )
                        )
                      }
                    >
                      {networks.map(
                        (item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="workspace-label">
                      Contract address
                    </label>

                    <input
                      className="workspace-input"
                      placeholder="0x..."
                      value={contractAddress}
                      onChange={(event) =>
                        setContractAddress(
                          event.target.value
                        )
                      }
                    />
                  </div>
                </>
              )}

              {(activeTool.id ===
                "address-explorer" ||
                activeTool.id ===
                  "approval-manager" ||
                activeTool.id ===
                  "portfolio-analytics") && (
                <div>
                  <label className="workspace-label">
                    Wallet address
                  </label>

                  <input
                    className="workspace-input"
                    placeholder="0x..."
                    value={walletAddress}
                    onChange={(event) =>
                      setWalletAddress(
                        event.target.value
                      )
                    }
                  />

                  {isConnected &&
                    address && (
                      <div
                        className="workspace-description"
                        style={{
                          margin: "8px 0 0",
                        }}
                      >
                        Connected wallet:{" "}
                        {shorten(address)}
                      </div>
                    )}
                </div>
              )}

              {activeTool.id ===
                "transaction-decoder" && (
                <div>
                  <label className="workspace-label">
                    Transaction hash
                  </label>

                  <input
                    className="workspace-input"
                    placeholder="0x..."
                    value={txHash}
                    onChange={(event) =>
                      setTxHash(
                        event.target.value
                      )
                    }
                  />
                </div>
              )}

              <button
                type="button"
                className="workspace-action"
                disabled={loading}
                onClick={runTool}
              >
                {loading
                  ? "Working..."
                  : activeTool.id ===
                    "gas-tracker"
                  ? "Load Live Gas"
                  : activeTool.id ===
                    "token-scanner"
                  ? "Scan Token"
                  : activeTool.id ===
                    "address-explorer"
                  ? "Explore Address"
                  : activeTool.id ===
                    "risk-scanner"
                  ? "Check Risk"
                  : activeTool.id ===
                    "transaction-decoder"
                  ? "Inspect Transaction"
                  : activeTool.id ===
                    "approval-manager"
                  ? "Load Approvals"
                  : "Open Analytics"}
              </button>
            </div>

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            {result &&
              typeof result === "object" && (
                <div className="result-box">
                  {/* TOKEN SCANNER */}
                  {result.type === "token" && (
                    <>
                      <div className="result-heading">
                        <div>
                          <div className="result-title">
                            {result.name ||
                              "Unknown token"}
                          </div>

                          <div className="result-subtitle">
                            {result.network ||
                              "Unknown network"}
                          </div>
                        </div>

                        <span className="status-pill">
                          LIVE
                        </span>
                      </div>

                      <div className="stats-grid">
                        <div className="stat">
                          <div className="stat-label">
                            Symbol
                          </div>

                          <div className="stat-value">
                            {result.symbol ||
                              "—"}
                          </div>
                        </div>

                        <div className="stat">
                          <div className="stat-label">
                            Decimals
                          </div>

                          <div className="stat-value">
                            {result.decimals ??
                              "—"}
                          </div>
                        </div>

                        <div className="stat">
                          <div className="stat-label">
                            Contract
                          </div>

                          <div className="stat-value">
                            {shorten(
  typeof result.contract === "string"
    ? result.contract
    : result.contract?.address || ""
)
                            }
                          </div>
                        </div>

                        <div className="stat">
                          <div className="stat-label">
                            Chain
                          </div>

                          <div className="stat-value">
                            {result.chainId ??
                              "—"}
                          </div>
                        </div>
                      </div>

                      <div className="result-note">
                        Agora is reading the token
                        metadata directly from the
                        blockchain. This scanner does
                        not invent market price,
                        liquidity or holder data.
                      </div>
                    </>
                  )}

                  {/* RISK SCANNER */}
                  {result.type === "risk" && (
                    <>
                      <div className="result-heading">
                        <div>
                          <div className="result-title">
                            Risk assessment
                          </div>

                          <div className="result-subtitle">
                            {result.network ||
                              "Unknown network"}
                          </div>
                        </div>

                        <span className="status-pill">
                          CHECKED
                        </span>
                      </div>

                      <div className="stats-grid">
                        <div className="stat">
                          <div className="stat-label">
                            Score
                          </div>

                          <div className="stat-value">
                            {result.score ??
                              "—"}
                          </div>
                        </div>

                        <div className="stat">
                          <div className="stat-label">
                            Contract
                          </div>

                          <div className="stat-value">
                            {shorten(
                              result.contract
                            )}
                          </div>
                        </div>
                      </div>

                      {warningItems.length >
                        0 && (
                        <div
                          className="list"
                          style={{
                            marginTop: 12,
                          }}
                        >
                          {warningItems.map(
                            (
                              warning,
                              index
                            ) => (
                              <div
                                key={`${String(
                                  warning
                                )}-${index}`}
                                className="list-item"
                              >
                                <div className="list-title">
                                  ⚠{" "}
                                  {String(
                                    warning
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {checkEntries.length >
                        0 && (
                        <div
                          className="list"
                          style={{
                            marginTop: 12,
                          }}
                        >
                          {checkEntries.map(
                            ([
                              key,
                              value,
                            ]) => (
                              <div
                                key={key}
                                className="list-item"
                              >
                                <div className="list-title">
                                  {key}
                                </div>

                                <div className="list-muted">
                                  {typeof value ===
                                  "object"
                                    ? JSON.stringify(
                                        value
                                      )
                                    : String(
                                        value
                                      )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      <div className="result-note">
                        Risk checks are based on the
                        on-chain contract information
                        available to Agora's scanner.
                        They are not a guarantee that a
                        contract is safe.
                      </div>
                    </>
                  )}

                  {/* GAS TRACKER */}
                  {result.type === "gas" && (
                    <>
                      <div className="result-heading">
                        <div>
                          <div className="result-title">
                            Live Gas Tracker
                          </div>

                          <div className="result-subtitle">
                            Supported networks
                          </div>
                        </div>

                        <span className="status-pill">
                          LIVE
                        </span>
                      </div>

                      {gasItems.length >
                      0 ? (
                        <div className="list">
                          {gasItems.map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                key={`${item?.chainId ?? index}`}
                                className="gas-row"
                              >
                                <div>
                                  <div className="gas-name">
                                    {item?.network ||
                                      "Network"}
                                  </div>

                                  <div className="gas-value">
                                    {item?.symbol ||
                                      "Native"}
                                  </div>
                                </div>

                                <div
                                  className="gas-value"
                                  style={{
                                    textAlign:
                                      "right",
                                  }}
                                >
                                  {item?.status ===
                                    "live" &&
                                  typeof item?.gasPriceGwei ===
                                    "number"
                                    ? `${item.gasPriceGwei.toFixed(
                                        4
                                      )} Gwei`
                                    : "Unavailable"}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="empty">
                          No gas data available.
                        </div>
                      )}

                      {result.updatedAt && (
                        <div className="result-note">
                          Updated{" "}
                          {new Date(
                            result.updatedAt
                          ).toLocaleString()}
                        </div>
                      )}
                    </>
                  )}

                  {/* ADDRESS EXPLORER */}
                  {result.type === "address" && (
                    <>
                      <div className="result-heading">
                        <div>
                          <div className="result-title">
                            Wallet Explorer
                          </div>

                          <div className="result-subtitle">
                            {shorten(
                              result.address,
                              8
                            )}
                          </div>
                        </div>

                        <span className="status-pill">
                          LIVE
                        </span>
                      </div>

                      <div className="stats-grid">
                        <div className="stat">
                          <div className="stat-label">
                            Wallet
                          </div>

                          <div className="stat-value">
                            {shorten(
                              result.address,
                              8
                            )}
                          </div>
                        </div>

                        <div className="stat">
                          <div className="stat-label">
                            Networks
                          </div>

                          <div className="stat-value">
                            {balanceItems.length}
                          </div>
                        </div>
                      </div>

                      <div
                        className="workspace-description"
                        style={{
                          margin:
                            "14px 0 10px",
                        }}
                      >
                        Native balances across
                        Agora's supported
                        networks.
                      </div>

                      {balanceItems.length >
                      0 ? (
                        <div className="list">
                          {balanceItems.map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                key={`${item?.chainId ?? index}-${item?.symbol ?? "native"}`}
                                className="list-item"
                              >
                                <div className="list-top">
                                  <div>
                                    <div className="list-title">
                                      {item?.network ||
                                        "Network"}
                                    </div>

                                    <div className="list-muted">
                                      {item?.symbol ||
                                        "Native asset"}
                                    </div>
                                  </div>

                                  <div className="list-title">
                                    {formatNumber(
                                      getBalanceValue(
                                        item
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="empty">
                          No native balances found on
                          the supported networks.
                        </div>
                      )}
                    </>
                  )}

                  {/* APPROVAL MANAGER */}
                  {result.type ===
                    "approvals" && (
                    <>
                      <div className="result-heading">
                        <div>
                          <div className="result-title">
                            Approval Manager
                          </div>

                          <div className="result-subtitle">
                            {shorten(
                              result.address,
                              8
                            )}
                          </div>
                        </div>

                        <span className="status-pill">
                          SCANNED
                        </span>
                      </div>

                      {approvalItems.length >
                      0 ? (
                        <div className="list">
                          {approvalItems.map(
                            (
                              item,
                              index
                            ) => {
                              const spender =
                                item?.spender
                                  ?.id ||
                                item?.spender ||
                                "";

                              const key = `${item?.chainId ?? index}-${item?.tokenAddress ?? "token"}-${spender}`;

                              return (
                                <div
                                  key={key}
                                  className="list-item"
                                >
                                  <div className="list-top">
                                    <div>
                                      <div className="list-title">
                                        {item?.tokenSymbol ||
                                          item?.tokenName ||
                                          "Token approval"}
                                      </div>

                                      <div className="list-muted">
                                        {item?.network ||
                                          "Network"}
                                        {" · "}
                                        Spender:{" "}
                                        {shorten(
                                          spender
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      className="revoke-button"
                                      disabled={
                                        revoking ===
                                        key
                                      }
                                      onClick={() =>
                                        revokeApproval(
                                          item
                                        )
                                      }
                                    >
                                      {revoking ===
                                      key
                                        ? "..."
                                        : "Revoke"}
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      ) : (
                        <div className="empty">
                          {result.message ||
                            "No indexed approvals were returned by this tool yet."}
                        </div>
                      )}
                    </>
                  )}

                  {/* TRANSACTION */}
                  {result.type ===
                    "transaction" && (
                    <>
                      <div className="result-heading">
                        <div>
                          <div className="result-title">
                            Transaction Inspector
                          </div>

                          <div className="result-subtitle">
                            {result.network ||
                              "Unknown network"}
                          </div>
                        </div>

                        <span className="status-pill">
                          {result.receipt
                            ?.status === "0x0" ||
                          result.receipt
                            ?.status === 0
                            ? "FAILED"
                            : result.receipt
                                ?.status ===
                                "0x1" ||
                              result.receipt
                                ?.status === 1
                            ? "SUCCESS"
                            : "FOUND"}
                        </span>
                      </div>

                      <div className="stats-grid">
                        <div className="stat">
                          <div className="stat-label">
                            Chain
                          </div>

                          <div className="stat-value">
                            {result.chainId ??
                              "—"}
                          </div>
                        </div>

                        <div className="stat">
                          <div className="stat-label">
                            Status
                          </div>

                          <div className="stat-value">
                            {result.receipt
                              ?.status ===
                              "0x0" ||
                            result.receipt
                              ?.status === 0
                              ? "Failed"
                              : result.receipt
                                  ?.status ===
                                  "0x1" ||
                                result.receipt
                                  ?.status ===
                                  1
                              ? "Success"
                              : result.transaction
                                ? "Found"
                                : "Unknown"}
                          </div>
                        </div>

                        <div className="stat">
                          <div className="stat-label">
                            From
                          </div>

                          <div className="stat-value">
                            {shorten(
                              result
                                .transaction
                                ?.from
                            )}
                          </div>
                        </div>

                        <div className="stat">
                          <div className="stat-label">
                            To
                          </div>

                          <div className="stat-value">
                            {shorten(
                              result
                                .transaction
                                ?.to
                            )}
                          </div>
                        </div>

                        <div className="stat">
                          <div className="stat-label">
                            Value
                          </div>

                          <div className="stat-value">
                            {result.transaction
                              ?.value
                              ? String(
                                  result
                                    .transaction
                                    .value
                                )
                              : "0"}
                          </div>
                        </div>

                        <div className="stat">
                          <div className="stat-label">
                            Gas Used
                          </div>

                          <div className="stat-value">
                            {result.receipt
                              ?.gasUsed
                              ? String(
                                  result
                                    .receipt
                                    .gasUsed
                                )
                              : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="result-note">
                        Transaction data was read
                        directly from the blockchain.
                      </div>
                    </>
                  )}

                  {/* PORTFOLIO ANALYTICS */}
                  {result.type ===
                    "analytics" && (
                    <>
                      <div className="result-heading">
                        <div>
                          <div className="result-title">
                            Portfolio Analytics
                          </div>

                          <div className="result-subtitle">
                            {shorten(
                              result.address,
                              8
                            )}
                          </div>
                        </div>

                        <span className="status-pill">
                          LIVE
                        </span>
                      </div>

                      <div className="stats-grid">
                        <div className="stat">
                          <div className="stat-label">
                            Networks
                          </div>

                          <div className="stat-value">
                            {analyticsItems.length}
                          </div>
                        </div>

                        <div className="stat">
                          <div className="stat-label">
                            Native Balance
                          </div>

                          <div className="stat-value">
                            {result.totalNativeUnits ??
                              "0"}
                          </div>
                        </div>
                      </div>

                      {analyticsItems.length >
                      0 ? (
                        <div
                          className="list"
                          style={{
                            marginTop: 12,
                          }}
                        >
                          {analyticsItems.map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                key={`${item?.chainId ?? index}-${item?.network ?? "network"}`}
                                className="list-item"
                              >
                                <div className="list-top">
                                  <div>
                                    <div className="list-title">
                                      {item?.network ||
                                        "Network"}
                                    </div>

                                    <div className="list-muted">
                                      {item?.symbol ||
                                        "Native asset"}
                                    </div>
                                  </div>

                                  <div className="list-title">
                                    {formatNumber(
                                      getBalanceValue(
                                        item
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div
                          className="empty"
                          style={{
                            marginTop: 12,
                          }}
                        >
                          No network analytics
                          available.
                        </div>
                      )}

                      {result.message && (
                        <div
                          className="warning"
                          style={{
                            marginTop: 12,
                          }}
                        >
                          {String(
                            result.message
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {![
                    "token",
                    "risk",
                    "gas",
                    "address",
                    "approvals",
                    "transaction",
                    "analytics",
                  ].includes(result.type) && (
                    <div className="empty">
                      The tool returned data in an
                      unsupported format.
                    </div>
                  )}
                </div>
              )}
          </section>
        </div>
      )}

      <nav
        className="bottom-nav"
        aria-label="Main navigation"
      >
        <Link
          href="/chat"
          className="nav-item"
        >
          Chat
        </Link>

        <Link
          href="/swap"
          className="nav-item"
        >
          Swap
        </Link>

        <Link
          href="/portfolio"
          className="nav-item"
        >
          Portfolio
        </Link>

        <Link
          href="/tools"
          className="nav-item active"
        >
          Tools
        </Link>

        <Link
          href="/explore"
          className="nav-item"
        >
          Explore
        </Link>
      </nav>
    </main>
  );
}