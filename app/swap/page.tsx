"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useBalance,
  useChainId,
  useSwitchChain,
  useWalletClient,
  usePublicClient,
} from "wagmi";
import {
  mainnet,
  base,
  polygon,
  arbitrum,
  optimism,
  bsc,
} from "wagmi/chains";
import { formatUnits, parseUnits } from "viem";
import type { Address } from "viem";
import { useTheme } from "../theme-provider";

const NATIVE_TOKEN =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const networks = [
  { chain: mainnet, name: "Ethereum", symbol: "ETH" },
  { chain: base, name: "Base", symbol: "ETH" },
  { chain: polygon, name: "Polygon", symbol: "POL" },
  { chain: arbitrum, name: "Arbitrum", symbol: "ETH" },
  { chain: optimism, name: "Optimism", symbol: "ETH" },
  { chain: bsc, name: "BNB Chain", symbol: "BNB" },
] as const;

const tokenAddresses: Record<number, Partial<Record<string, Address>>> = {
  [mainnet.id]: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  },

  [base.id]: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },

  [polygon.id]: {
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    USDT: "0xc2132D05D31c914a87C6611C10748AaB04B58e8F",
  },

  [arbitrum.id]: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  },

  [optimism.id]: {
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  },

  [bsc.id]: {
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
  },
};

function getTokenDecimals(token: string): number {
  if (token === "USDC" || token === "USDT") {
    return 6;
  }

  if (token === "WBTC") {
    return 8;
  }

  return 18;
}

export default function SwapPage() {
  const { theme, toggleTheme } = useTheme();

  const { address } = useAccount();

  const chainId = useChainId();

  const { switchChain } = useSwitchChain();

  const { data: walletClient } = useWalletClient();

  const publicClient = usePublicClient();

  const [amount, setAmount] = useState("");

  const [swapConfirmed, setSwapConfirmed] = useState(false);

  const [showReview, setShowReview] = useState(false);

  const [fromToken, setFromToken] = useState("ETH");

  const [toToken, setToToken] = useState("USDC");

  const [showNetwork, setShowNetwork] = useState(false);

  const [quote, setQuote] = useState<any>(null);

  const [quoteLoading, setQuoteLoading] = useState(false);

  const [quoteError, setQuoteError] = useState("");

  const [transactionLoading, setTransactionLoading] =
    useState(false);

  const [transactionStatus, setTransactionStatus] =
    useState("");

  const [transactionHash, setTransactionHash] =
    useState("");

  const selectedNetwork = useMemo(
    () =>
      networks.find(
        (item) => item.chain.id === chainId
      ) ?? networks[0],
    [chainId]
  );

  const isSupportedNetwork = networks.some(
    (item) => item.chain.id === chainId
  );

  const nativeSymbol = selectedNetwork.symbol;

  const tokenOptions = useMemo(
    () =>
      [
        ...new Set([
          nativeSymbol,
          "USDC",
          "USDT",
          "DAI",
          "WBTC",
        ]),
      ],
    [nativeSymbol]
  );

  useEffect(() => {
    if (!isSupportedNetwork) {
      return;
    }

    setFromToken((current) => {
      if (current === nativeSymbol) {
        return current;
      }

      const currentDeployment =
        tokenAddresses[chainId]?.[current];

      if (currentDeployment) {
        return current;
      }

      return nativeSymbol;
    });
  }, [
    chainId,
    nativeSymbol,
    isSupportedNetwork,
  ]);

  const isNativeFrom =
    fromToken === nativeSymbol;

  const selectedTokenAddress =
    tokenAddresses[chainId]?.[fromToken];

  const {
    data: balance,
    isLoading: balanceLoading,
    isError: balanceError,
  } = useBalance({
    address,
    chainId,
    token: isNativeFrom
      ? undefined
      : selectedTokenAddress,
  });

  const hasTokenDeployment =
    isNativeFrom ||
    Boolean(selectedTokenAddress);

  const tokenBalance = Number(
    balance?.formatted ?? 0
  );

  const displayedBalance =
    balance &&
    Number.isFinite(tokenBalance)
      ? `${tokenBalance.toFixed(6)} ${balance.symbol}`
      : `0.000000 ${fromToken}`;

  const amountNumber = Number(amount);

  const validAmount =
    amount.trim() !== "" &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    amountNumber <= tokenBalance &&
    hasTokenDeployment &&
    Boolean(balance) &&
    fromToken !== toToken;

  const insufficientBalance =
    Number.isFinite(amountNumber) &&
    amountNumber > tokenBalance &&
    amount.trim() !== "";

  function chooseNetwork(id: number) {
    switchChain({
      chainId: id,
    });

    const nextNetwork =
      networks.find(
        (item) => item.chain.id === id
      ) ?? networks[0];

    setFromToken(nextNetwork.symbol);
    setToToken("USDC");
    setShowNetwork(false);
    setAmount("");
    setQuote(null);
    setQuoteError("");
    setTransactionStatus("");
    setTransactionHash("");
  }

  function swapTokens() {
    const oldFrom = fromToken;

    setFromToken(toToken);
    setToToken(oldFrom);
    setAmount("");
    setQuote(null);
    setQuoteError("");
    setTransactionStatus("");
    setTransactionHash("");
  }

  function setPercentage(percent: number) {
    if (!balance) {
      return;
    }

    const nextAmount =
      tokenBalance * percent;

    if (!Number.isFinite(nextAmount)) {
      return;
    }

    setAmount(nextAmount.toString());
    setQuote(null);
    setQuoteError("");
    setTransactionStatus("");
    setTransactionHash("");
  }

  function setMax() {
    if (!balance) {
      return;
    }

    setAmount(balance.formatted);
    setQuote(null);
    setQuoteError("");
    setTransactionStatus("");
    setTransactionHash("");
  }

  async function getQuote() {
    if (
      !address ||
      !validAmount ||
      !isSupportedNetwork
    ) {
      return;
    }

    setQuoteLoading(true);
    setQuoteError("");
    setQuote(null);
    setTransactionStatus("");
    setTransactionHash("");

    try {
      const sellToken = isNativeFrom
        ? NATIVE_TOKEN
        : selectedTokenAddress;

      const buyToken =
        toToken === nativeSymbol
          ? NATIVE_TOKEN
          : tokenAddresses[chainId]?.[toToken];

      if (!sellToken || !buyToken) {
        throw new Error(
          `This ${fromToken} → ${toToken} pair is not configured on ${selectedNetwork.name}.`
        );
      }

      const sellDecimals =
        balance?.decimals ?? 18;

      const sellAmount = parseUnits(
        amount,
        sellDecimals
      ).toString();

      const response = await fetch(
        "/api/swap",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            chainId,
            sellToken,
            buyToken,
            sellAmount,
            taker: address,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to get swap quote."
        );
      }

      if (
        data.liquidityAvailable === false
      ) {
        throw new Error(
          "No liquidity is available for this swap."
        );
      }

      if (data.issues?.balance) {
        throw new Error(
          `Insufficient ${fromToken} balance for this swap.`
        );
      }

      setQuote(data);
    } catch (error) {
      setQuoteError(
        error instanceof Error
          ? error.message
          : "Unable to get swap quote."
      );
    } finally {
      setQuoteLoading(false);
    }
  }

  const quotedBuyAmount =
    quote?.buyAmount && toToken
      ? formatUnits(
          BigInt(quote.buyAmount),
          getTokenDecimals(toToken)
        )
      : null;

  const quotedGasFee =
    quote?.transaction?.gas &&
    quote?.transaction?.gasPrice
      ? formatUnits(
          BigInt(
            quote.transaction.gas
          ) *
            BigInt(
              quote.transaction.gasPrice
            ),
          18
        )
      : null;

  const quotedRate =
    quotedBuyAmount &&
    amountNumber > 0
      ? (
          Number(quotedBuyAmount) /
          amountNumber
        ).toFixed(6)
      : null;

  async function continueToWallet() {
    if (
      !walletClient ||
      !publicClient ||
      !address ||
      !quote
    ) {
      setQuoteError(
        "Your wallet is not ready. Please reconnect your wallet and try again."
      );
      return;
    }

    try {
      setTransactionLoading(true);
      setTransactionStatus(
        "Preparing transaction..."
      );
      setQuoteError("");
      setTransactionHash("");

      const transaction =
        quote.transaction;

      if (
        !transaction?.to ||
        !transaction?.data
      ) {
        throw new Error(
          "The swap quote did not contain executable transaction data."
        );
      }

      if (!isNativeFrom) {
        const allowanceIssue =
          quote.issues?.allowance;

        if (allowanceIssue) {
          const spender =
            allowanceIssue.spender ||
            quote.allowanceTarget;

          if (!spender) {
            throw new Error(
              "0x did not provide a valid token approval address."
            );
          }

          if (!selectedTokenAddress) {
            throw new Error(
              "The selected token address is unavailable."
            );
          }

          setTransactionStatus(
            `Approve ${fromToken} in your wallet...`
          );

          const approvalAmount =
            parseUnits(
              amount,
              balance?.decimals ??
                getTokenDecimals(
                  fromToken
                )
            );

          const approvalHash =
            await walletClient.writeContract(
              {
                address:
                  selectedTokenAddress,

                abi: ERC20_APPROVE_ABI,

                functionName:
                  "approve",

                args: [
                  spender as Address,
                  approvalAmount,
                ],

                chain:
                  selectedNetwork.chain,

                account: address,
              }
            );

          setTransactionHash(
            approvalHash
          );

          setTransactionStatus(
            "Waiting for token approval..."
          );

          await publicClient.waitForTransactionReceipt(
            {
              hash: approvalHash,
            }
          );
        }
      }

      setTransactionStatus(
        "Confirm the swap in your wallet..."
      );

      const swapHash =
        await walletClient.sendTransaction({
          account: address,

          chain:
            selectedNetwork.chain,

          to: transaction.to as Address,

          data: transaction.data,

          value: transaction.value
            ? BigInt(
                transaction.value
              )
            : undefined,
        });

      setTransactionHash(
        swapHash
      );

      setTransactionStatus(
        "Waiting for blockchain confirmation..."
      );

      const receipt =
        await publicClient.waitForTransactionReceipt(
          {
            hash: swapHash,
          }
        );

      if (receipt.status !== "success") {
        throw new Error(
          "The swap transaction was reverted."
        );
      }

      setTransactionStatus(
        "Swap confirmed successfully."
      );
      setSwapConfirmed(true);

      setTimeout(() => {
        setShowReview(false);
        setAmount("");
        setQuote(null);
        setQuoteError("");
        setTransactionStatus("");
        setTransactionHash("");
        setSwapConfirmed(false);
      }, 1500);
    } catch (error) {
      console.error(
        "Agora swap transaction error:",
        error
      );

      setTransactionStatus("");

      setQuoteError(
        error instanceof Error
          ? error.message
          : "Transaction was rejected or failed."
      );
    } finally {
      setTransactionLoading(false);
    }
  }

  return (
    <main
      className={`page ${theme}`}
      style={{
        minHeight: "100vh",
        background:
          "var(--background)",
        color: "var(--text)",
      }}
    >
      <header className="topbar">
        <Link
          href="/"
          className="brand"
        >
          <div className="logo">
            A
          </div>

          <span>Agora</span>
        </Link>

        <div className="top-actions">
          <button
            type="button"
            className="theme-button"
            onClick={toggleTheme}
          >
            {theme === "dark"
              ? "☀️"
              : "🌙"}
          </button>

          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted,
            }) => {
              const connected =
                mounted &&
                account &&
                chain;

              return (
                <div>
                  {!connected ? (
                    <button
                      type="button"
                      className="connect-button"
                      onClick={
                        openConnectModal
                      }
                    >
                      Connect Wallet
                    </button>
                  ) : chain.unsupported ? (
                    <button
                      type="button"
                      className="connect-button"
                      onClick={
                        openChainModal
                      }
                    >
                      Wrong Network
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="connect-button"
                      onClick={
                        openAccountModal
                      }
                    >
                      {account.displayName}
                    </button>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </header>

      <section className="content">
        <div className="heading">
          <div>
            <h1>Swap</h1>

            <p>
              Swap assets securely through
              Agora.
            </p>
          </div>

          <button
            type="button"
            className="network-pill"
            onClick={() =>
              setShowNetwork(
                !showNetwork
              )
            }
          >
            <span className="status-dot" />

            {selectedNetwork.name}

            <span>⌄</span>
          </button>
        </div>

        {showNetwork && (
          <div className="network-menu">
            {networks.map((item) => (
              <button
                type="button"
                key={item.chain.id}
                className="network-option"
                onClick={() =>
                  chooseNetwork(
                    item.chain.id
                  )
                }
              >
                <span>
                  {item.name}
                </span>

                <small>
                  {item.symbol}
                </small>
              </button>
            ))}
          </div>
        )}

        <div className="swap-card">
          <div className="token-box">
            <div className="token-top">
              <span>From</span>

              <button
                type="button"
                className="balance-button"
                disabled={!balance}
                onClick={setMax}
              >
                Balance:{" "}
                {balanceLoading
                  ? "Loading..."
                  : !hasTokenDeployment
                    ? "Token unavailable"
                    : balanceError
                      ? "Unable to load"
                      : balance
                        ? displayedBalance
                        : `0.000000 ${fromToken}`}
              </button>
            </div>

            <div className="token-row">
              <input
                value={amount}
                onChange={(e) => {
                  setAmount(
                    e.target.value
                  );
                  setQuote(null);
                  setQuoteError("");
                  setTransactionStatus(
                    ""
                  );
                  setTransactionHash(
                    ""
                  );
                }}
                placeholder="0.0"
                inputMode="decimal"
              />

              <select
                value={fromToken}
                onChange={(e) => {
                  setFromToken(
                    e.target.value
                  );
                  setAmount("");
                  setQuote(null);
                  setQuoteError("");
                  setTransactionStatus(
                    ""
                  );
                  setTransactionHash(
                    ""
                  );
                }}
              >
                {tokenOptions.map(
                  (token) => (
                    <option
                      key={token}
                      value={token}
                    >
                      {token}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="quick-amounts">
              <button
                type="button"
                disabled={!balance}
                onClick={() =>
                  setPercentage(0.25)
                }
              >
                25%
              </button>

              <button
                type="button"
                disabled={!balance}
                onClick={() =>
                  setPercentage(0.5)
                }
              >
                50%
              </button>

              <button
                type="button"
                disabled={!balance}
                onClick={() =>
                  setPercentage(0.75)
                }
              >
                75%
              </button>

              <button
                type="button"
                disabled={!balance}
                onClick={setMax}
              >
                MAX
              </button>
            </div>

            {!isNativeFrom &&
              !hasTokenDeployment && (
                <div className="token-message">
                  {fromToken} is not
                  configured on{" "}
                  {
                    selectedNetwork.name
                  }{" "}
                  yet.
                </div>
              )}

            {insufficientBalance && (
              <div className="token-error">
                Insufficient{" "}
                {fromToken} balance.
              </div>
            )}

            {fromToken ===
              toToken && (
              <div className="token-error">
                From and To tokens
                must be different.
              </div>
            )}
          </div>

          <button
            type="button"
            className="swap-arrow"
            onClick={swapTokens}
          >
            ↓
          </button>

          <div className="token-box">
            <div className="token-top">
              <span>To</span>

              <span className="estimated">
                Estimated amount
              </span>
            </div>

            <div className="token-row">
              <div className="estimated-value">
                {quote?.buyAmount
                  ? quotedBuyAmount
                  : validAmount
                    ? "Quote after review"
                    : "0.0"}
              </div>

              <select
                value={toToken}
                onChange={(e) => {
                  setToToken(
                    e.target.value
                  );
                  setQuote(null);
                  setQuoteError("");
                  setTransactionStatus(
                    ""
                  );
                  setTransactionHash(
                    ""
                  );
                }}
              >
                {tokenOptions.map(
                  (token) => (
                    <option
                      key={token}
                      value={token}
                    >
                      {token}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="details">
            <div>
              <span>Network</span>

              <strong>
                {selectedNetwork.name}
              </strong>
            </div>

            <div>
              <span>Rate</span>

              <strong>
                {quotedRate
                  ? `1 ${fromToken} ≈ ${quotedRate} ${toToken}`
                  : "—"}
              </strong>
            </div>

            <div>
              <span>
                Network fee
              </span>

              <strong>
                {quotedGasFee
                  ? `≈ ${Number(
                      quotedGasFee
                    ).toFixed(
                      8
                    )} ${nativeSymbol}`
                  : "Shown after quote"}
              </strong>
            </div>

            <div>
              <span>
                Agora fee
              </span>

              <strong>
                0 for now
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="review-button"
            disabled={
              !address ||
              !isSupportedNetwork ||
              !validAmount ||
              quoteLoading
            }
            onClick={async () => {
              setShowReview(true);
              await getQuote();
            }}
          >
            {!address
              ? "Connect wallet to continue"
              : !isSupportedNetwork
                ? "Switch to a supported network"
                : !hasTokenDeployment
                  ? `${fromToken} unavailable`
                  : insufficientBalance
                    ? "Insufficient balance"
                    : fromToken ===
                        toToken
                      ? "Choose different tokens"
                      : !validAmount
                        ? "Enter an amount"
                        : quoteLoading
                          ? "Getting real quote..."
                          : "Review Swap"}
          </button>

          <div className="security-note">
            🔒 Agora never moves funds
            without your wallet
            approval.
          </div>
        </div>
      </section>

      <nav className="bottom-nav">
        <Link href="/chat">
          Chat
        </Link>

        <Link
          href="/swap"
          className="active"
        >
          Swap
        </Link>

        <Link href="/portfolio">
          Portfolio
        </Link>

        <Link href="/tools">
          Tools
        </Link>

        <Link href="/explore">
          Explore
        </Link>
      </nav>

      {showReview && (
        <div className="review-overlay">
          <div className="review-panel">
            <button
              type="button"
              className="review-close"
              onClick={() =>
                setShowReview(false)
              }
            >
              ×
            </button>

            <div className="review-title">
              Review Swap
            </div>

            <div className="review-subtitle">
              Check the real quote
              before continuing.
            </div>

            <div className="review-row">
              <span>From</span>

              <strong>
                {amount}{" "}
                {fromToken}
              </strong>
            </div>

            <div className="review-row">
              <span>To</span>

              <strong>
                {quoteLoading
                  ? "Getting quote..."
                  : quotedBuyAmount
                    ? `${quotedBuyAmount} ${toToken}`
                    : "—"}
              </strong>
            </div>

            <div className="review-row">
              <span>Network</span>

              <strong>
                {selectedNetwork.name}
              </strong>
            </div>

            <div className="review-row">
              <span>Rate</span>

              <strong>
                {quotedRate
                  ? `1 ${fromToken} ≈ ${quotedRate} ${toToken}`
                  : "—"}
              </strong>
            </div>

            <div className="review-row">
              <span>
                Network fee
              </span>

              <strong>
                {quotedGasFee
                  ? `≈ ${Number(
                      quotedGasFee
                    ).toFixed(
                      8
                    )} ${nativeSymbol}`
                  : "—"}
              </strong>
            </div>

            <div className="review-row">
              <span>
                Agora fee
              </span>

              <strong>
                0 for now
              </strong>
            </div>

            {quoteError && (
              <div className="review-error">
                {quoteError}
              </div>
            )}

            {transactionStatus && (
              <div className="transaction-status">
                {transactionStatus}
              </div>
            )}

            {transactionHash && (
              <div className="transaction-hash">
                Transaction:{" "}
                {transactionHash.slice(
                  0,
                  10
                )}
                ...
                {transactionHash.slice(
                  -8
                )}
              </div>
            )}

            <div className="review-warning">
              Agora will not move your
              funds without your wallet
              authorization. The
              transaction will be shown
              to your wallet before
              anything is sent.
            </div>

            <button
              type="button"
              className="confirm-button"
              disabled={
                !quote ||
                quoteLoading ||
                transactionLoading ||
                Boolean(quoteError)
              }
              onClick={
                continueToWallet
              }
            >
              {quoteLoading
                ? "Getting Quote..."
                : transactionLoading
                  ? transactionStatus ||
                    "Waiting for Wallet..."
                  : transactionStatus ===
                      "Swap confirmed successfully."
                    ? "Swap Confirmed ✓"
                    : quote
                      ? "Continue to Wallet"
                      : "Waiting for Quote"}
            </button>

            <button
              type="button"
              className="cancel-button"
              disabled={
                transactionLoading
              }
              onClick={() =>
                setShowReview(false)
              }
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding-bottom: 110px;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: color-mix(
            in srgb,
            var(--background) 92%,
            transparent
          );
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text);
          text-decoration: none;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .logo {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: var(--yellow);
          color: #050505;
          font-weight: 900;
          box-shadow: 0 8px 25px
            rgba(245, 196, 0, 0.18);
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .theme-button,
        .connect-button,
        .network-pill,
        .balance-button,
        .quick-amounts button,
        .network-option,
        .swap-arrow,
        .review-button,
        .confirm-button,
        .cancel-button {
          border: 0;
          cursor: pointer;
        }

        .theme-button {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--surface-2);
          color: var(--text);
          border: 1px solid var(--border);
        }

        .connect-button {
          min-height: 42px;
          padding: 0 16px;
          border-radius: 999px;
          background: var(--yellow);
          color: #050505;
          font-weight: 800;
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .connect-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px
            rgba(245, 196, 0, 0.2);
        }

        .content {
          width: min(720px, calc(100% - 32px));
          margin: 0 auto;
          padding: 42px 0 30px;
        }

        .heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .heading h1 {
          margin: 0;
          font-size: clamp(32px, 6vw, 48px);
          letter-spacing: -1.5px;
        }

        .heading p {
          margin: 8px 0 0;
          color: var(--muted);
        }

        .network-pill {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px 15px;
          border-radius: 999px;
          background: var(--surface-2);
          color: var(--text);
          border: 1px solid var(--border);
          font-weight: 700;
          white-space: nowrap;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 10px
            rgba(74, 222, 128, 0.45);
        }

        .network-menu {
          position: relative;
          z-index: 10;
          display: grid;
          gap: 6px;
          padding: 8px;
          margin-bottom: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: 0 20px 50px
            rgba(0, 0, 0, 0.2);
        }

        .network-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 13px 14px;
          border-radius: 12px;
          background: transparent;
          color: var(--text);
          text-align: left;
        }

        .network-option:hover {
          background: var(--surface-2);
        }

        .network-option small {
          color: var(--muted);
        }

        .swap-card {
          padding: 18px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 28px;
          box-shadow: 0 25px 80px
            rgba(0, 0, 0, 0.12);
        }

        .token-box {
          padding: 18px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 20px;
        }

        .token-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 700;
        }

        .balance-button {
          max-width: 75%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding: 5px 9px;
          border-radius: 999px;
          background: transparent;
          color: var(--muted);
          font-size: 12px;
        }

        .balance-button:hover:not(:disabled) {
          background: var(--border);
          color: var(--text);
        }

        .token-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
        }

        .token-row input {
          min-width: 0;
          flex: 1;
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          font-size: clamp(28px, 6vw, 42px);
          font-weight: 700;
        }

        .token-row input::placeholder {
          color: var(--muted);
        }

        .token-row select {
          min-width: 100px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 14px;
          outline: 0;
          background: var(--background);
          color: var(--text);
          font-weight: 800;
        }

        .quick-amounts {
          display: flex;
          gap: 7px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .quick-amounts button {
          padding: 7px 12px;
          border-radius: 999px;
          background: var(--background);
          color: var(--text);
          border: 1px solid var(--border);
          font-size: 12px;
          font-weight: 800;
        }

        .quick-amounts button:hover:not(:disabled) {
          border-color: var(--yellow);
          transform: translateY(-1px);
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .token-message,
        .token-error {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
        }

        .token-message {
          background: rgba(245, 196, 0, 0.08);
          color: var(--muted);
        }

        .token-error,
        .review-error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .swap-arrow {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          margin: -1px auto;
          position: relative;
          z-index: 2;
          border-radius: 50%;
          background: var(--yellow);
          color: #050505;
          font-size: 20px;
          font-weight: 900;
          border: 4px solid var(--surface);
          transition: transform 0.15s ease;
        }

        .swap-arrow:hover {
          transform: rotate(180deg);
        }

        .estimated {
          font-size: 12px;
        }

        .estimated-value {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: clamp(24px, 5vw, 36px);
          font-weight: 700;
        }

        .details {
          display: grid;
          gap: 1px;
          margin-top: 18px;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 18px;
        }

        .details > div {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 13px 15px;
          background: var(--surface-2);
        }

        .details span {
          color: var(--muted);
        }

        .details strong {
          text-align: right;
          font-size: 13px;
        }

        .review-button {
          width: 100%;
          min-height: 56px;
          margin-top: 18px;
          border-radius: 17px;
          background: var(--yellow);
          color: #050505;
          font-weight: 900;
          font-size: 15px;
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .review-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px
            rgba(245, 196, 0, 0.18);
        }

        .security-note {
          margin-top: 14px;
          color: var(--muted);
          text-align: center;
          font-size: 12px;
        }

        .bottom-nav {
          position: fixed;
          left: 50%;
          bottom: 18px;
          z-index: 30;
          display: flex;
          gap: 6px;
          width: max-content;
          max-width: calc(100% - 24px);
          padding: 7px;
          transform: translateX(-50%);
          border: 1px solid var(--border);
          border-radius: 999px;
          background: color-mix(
            in srgb,
            var(--surface) 94%,
            transparent
          );
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 50px
            rgba(0, 0, 0, 0.2);
        }

        .bottom-nav a {
          padding: 10px 15px;
          border-radius: 999px;
          color: var(--muted);
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          transition:
            background 0.15s ease,
            color 0.15s ease,
            transform 0.15s ease;
        }

        .bottom-nav a:hover {
          color: var(--text);
          transform: translateY(-2px);
        }

        .bottom-nav a.active {
          background: var(--yellow);
          color: #050505;
        }

        .review-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(0, 0, 0, 0.68);
          backdrop-filter: blur(10px);
        }

        .review-panel {
          position: relative;
          width: min(470px, 100%);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 25px;
          border: 1px solid var(--border);
          border-radius: 26px;
          background: var(--surface);
          color: var(--text);
          box-shadow: 0 30px 100px
            rgba(0, 0, 0, 0.45);
        }

        .review-close {
          position: absolute;
          top: 15px;
          right: 15px;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          background: var(--surface-2);
          color: var(--text);
          cursor: pointer;
          font-size: 20px;
        }

        .review-title {
          padding-right: 45px;
          font-size: 25px;
          font-weight: 900;
        }

        .review-subtitle {
          margin-top: 7px;
          margin-bottom: 22px;
          color: var(--muted);
          font-size: 13px;
        }

        .review-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 13px 0;
          border-bottom: 1px solid var(--border);
        }

        .review-row span {
          color: var(--muted);
          font-size: 13px;
        }

        .review-row strong {
          text-align: right;
          font-size: 14px;
        }

        .review-error {
          margin-top: 16px;
          padding: 12px;
          border-radius: 13px;
          font-size: 13px;
          line-height: 1.45;
        }

        .transaction-status {
          margin-top: 16px;
          padding: 12px;
          border: 1px solid
            rgba(245, 196, 0, 0.35);
          border-radius: 13px;
          background: rgba(245, 196, 0, 0.08);
          color: var(--text);
          font-size: 13px;
          font-weight: 700;
        }

        .transaction-hash {
          margin-top: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--muted);
          font-size: 11px;
          font-family: monospace;
        }

        .review-warning {
          margin-top: 18px;
          padding: 13px;
          border-radius: 14px;
          background: var(--surface-2);
          color: var(--muted);
          font-size: 12px;
          line-height: 1.55;
        }

        .confirm-button {
          width: 100%;
          min-height: 53px;
          margin-top: 16px;
          border-radius: 15px;
          background: var(--yellow);
          color: #050505;
          font-weight: 900;
        }

        .confirm-button:hover:not(:disabled) {
          box-shadow: 0 12px 30px
            rgba(245, 196, 0, 0.2);
          transform: translateY(-1px);
        }

        .cancel-button {
          width: 100%;
          min-height: 45px;
          margin-top: 9px;
          border-radius: 14px;
          background: transparent;
          color: var(--muted);
          border: 1px solid var(--border);
          font-weight: 700;
        }

        .cancel-button:hover:not(:disabled) {
          color: var(--text);
          background: var(--surface-2);
        }

        @media (max-width: 600px) {
          .topbar {
            padding: 14px 15px;
          }

          .content {
            width: min(
              100% - 20px,
              720px
            );
            padding-top: 28px;
          }

          .heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .network-pill {
            width: 100%;
            justify-content: space-between;
          }

          .swap-card {
            padding: 12px;
            border-radius: 22px;
          }

          .token-box {
            padding: 14px;
          }

          .token-row select {
            min-width: 82px;
          }

          .bottom-nav {
            width: calc(100% - 18px);
            justify-content: space-between;
          }

          .bottom-nav a {
            padding: 9px 10px;
            font-size: 12px;
          }

          .review-panel {
            padding: 20px;
          }
        }
      `}</style>
    </main>
  );
}