"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContracts,
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import {
  isAddress,
  parseEther,
  parseUnits,
} from "viem";

type Theme = "light" | "dark";
type NetworkFilter = "all" | number;

const networks = [
  { id: 1, name: "Ethereum", symbol: "ETH" },
  { id: 8453, name: "Base", symbol: "ETH" },
  { id: 137, name: "Polygon", symbol: "POL" },
  { id: 42161, name: "Arbitrum", symbol: "ETH" },
  { id: 10, name: "Optimism", symbol: "ETH" },
  { id: 56, name: "BNB Chain", symbol: "BNB" },
];

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      {
        name: "account",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "to",
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

type Token = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
};

type SendAsset = {
  type: "native" | "token";
  symbol: string;
  name: string;
  chainId: number;
  decimals: number;
  address?: `0x${string}`;
  balance: number;
};

const tokensByChain: Record<number, Token[]> = {
  1: [
    {
      symbol: "USDC",
      name: "USD Coin",
      address:
        "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      decimals: 6,
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      address:
        "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
    },
    {
      symbol: "DAI",
      name: "Dai",
      address:
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      decimals: 18,
    },
  ],

  8453: [
    {
      symbol: "USDC",
      name: "USD Coin",
      address:
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      address:
        "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB",
      decimals: 6,
    },
  ],

  137: [
    {
      symbol: "USDC",
      name: "USD Coin",
      address:
        "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      decimals: 6,
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      address:
        "0xc2132D05D31c914a87C6611C10748AaCbBfFf26F",
      decimals: 6,
    },
    {
      symbol: "DAI",
      name: "Dai",
      address:
        "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      decimals: 18,
    },
  ],

  42161: [
    {
      symbol: "USDC",
      name: "USD Coin",
      address:
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      decimals: 6,
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      address:
        "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
      decimals: 6,
    },
    {
      symbol: "DAI",
      name: "Dai",
      address:
        "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
      decimals: 18,
    },
  ],

  10: [
    {
      symbol: "USDC",
      name: "USD Coin",
      address:
        "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      decimals: 6,
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      address:
        "0x94b008aA00579c1307B0EF2c499AD98a8ce58e58",
      decimals: 6,
    },
    {
      symbol: "DAI",
      name: "Dai",
      address:
        "0xDA10009cBd5D07dd0CeCc66161FC93d7c9000da1",
      decimals: 18,
    },
  ],

  56: [
    {
      symbol: "USDC",
      name: "USD Coin",
      address:
        "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      decimals: 18,
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      address:
        "0x55d398326f99059fF775485246999027B3197955",
      decimals: 18,
    },
    {
      symbol: "DAI",
      name: "Dai",
      address:
        "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
      decimals: 18,
    },
  ],
};

export default function PortfolioPage() {
  const [theme, setTheme] = useState<Theme>("light");
  const [hideBalances, setHideBalances] = useState(false);

  const [selectedNetwork, setSelectedNetwork] =
    useState<NetworkFilter>("all");

  const { address } = useAccount();

  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const [nativeBalances, setNativeBalances] = useState<
    Record<number, string>
  >({});

  const [prices, setPrices] =
    useState<Record<string, number>>({});

  const [modal, setModal] = useState<
    "send" | "receive" | null
  >(null);

  const [recipient, setRecipient] =
    useState("");

  const [sendAmount, setSendAmount] =
    useState("");

  const [sendAssetKey, setSendAssetKey] =
    useState("");

  const [sendStatus, setSendStatus] =
    useState("");

  const [sendError, setSendError] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  useEffect(() => {
    async function loadPrices() {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,polygon-ecosystem-token,binancecoin,usd-coin,tether,dai&vs_currencies=usd"
        );

        if (!response.ok) return;

        const data = await response.json();

        setPrices({
          ETH: data.ethereum?.usd ?? 0,
          POL:
            data["polygon-ecosystem-token"]?.usd ??
            0,
          BNB: data.binancecoin?.usd ?? 0,
          USDC: data["usd-coin"]?.usd ?? 0,
          USDT: data.tether?.usd ?? 0,
          DAI: data.dai?.usd ?? 0,
        });
      } catch {
        // Keep last known prices.
      }
    }

    loadPrices();

    const interval = setInterval(
      loadPrices,
      60000
    );

    return () =>
      clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!address) {
      setNativeBalances({});
      return;
    }

    const rpcByChain: Record<
      number,
      string
    > = {
      1: "https://ethereum-rpc.publicnode.com",
      8453:
        "https://base-rpc.publicnode.com",
      137:
        "https://polygon-bor-rpc.publicnode.com",
      42161:
        "https://arbitrum-one-rpc.publicnode.com",
      10:
        "https://optimism-rpc.publicnode.com",
      56:
        "https://bsc-rpc.publicnode.com",
    };

    async function loadNativeBalances() {
      const results: Record<
        number,
        string
      > = {};

      await Promise.all(
        Object.entries(rpcByChain).map(
          async ([chain, rpc]) => {
            try {
              const response =
                await fetch(rpc, {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method:
                      "eth_getBalance",
                    params: [
                      address,
                      "latest",
                    ],
                  }),
                });

              const data =
                await response.json();

              if (data.result) {
                results[
                  Number(chain)
                ] = data.result;
              }
            } catch {
              // Ignore failed networks.
            }
          }
        )
      );

      setNativeBalances(results);
    }

    loadNativeBalances();
  }, [address]);

  const liveTokens =
    Object.entries(
      tokensByChain
    ).flatMap(
      ([networkId, tokens]) =>
        tokens.map((token) => ({
          ...token,
          chainId:
            Number(networkId),
        }))
    );

  const {
    data: tokenBalances,
    isLoading: tokensLoading,
  } = useReadContracts({
    contracts: liveTokens.map(
      (token) => ({
        address: token.address,
        abi: erc20Abi,
        chainId: token.chainId,
        functionName:
          "balanceOf",
        args: address
          ? [address]
          : undefined,
      })
    ),
    query: {
      enabled:
        Boolean(address) &&
        liveTokens.length > 0,
    },
  });

  const visibleTokens =
    liveTokens
      .map((token, index) => {
        const result =
          tokenBalances?.[index];

        if (
          !result ||
          result.status !==
            "success" ||
          typeof result.result !==
            "bigint" ||
          (result as { result?: bigint }).result ===
            BigInt(0)
        ) {
          return null;
        }

        const divisor =
          10 ** token.decimals;

        return {
          ...token,
          balance:
            Number((result as { result?: bigint }).result) /
            divisor,
        };
      })
      .filter(
        (
          token
        ): token is Token & {
          balance: number;
          chainId: number;
        } => token !== null
      );

  const filteredNativeBalances =
    useMemo(() => {
      if (
        selectedNetwork ===
        "all"
      ) {
        return Object.entries(
          nativeBalances
        );
      }

      return Object.entries(
        nativeBalances
      ).filter(
        ([chainId]) =>
          Number(chainId) ===
          selectedNetwork
      );
    }, [
      nativeBalances,
      selectedNetwork,
    ]);

  const filteredTokens =
    useMemo(() => {
      if (
        selectedNetwork ===
        "all"
      ) {
        return visibleTokens;
      }

      return visibleTokens.filter(
        (token) =>
          token.chainId ===
          selectedNetwork
      );
    }, [
      visibleTokens,
      selectedNetwork,
    ]);

  const totalUsd = [
    ...filteredNativeBalances.map(
      ([chainId, raw]) => {
        const network =
          networks.find(
            (item) =>
              item.id ===
              Number(chainId)
          );

        if (!network) return 0;

        const balance =
          Number(BigInt(raw)) /
          1e18;

        return (
          balance *
          (prices[
            network.symbol
          ] ?? 0)
        );
      }
    ),

    ...filteredTokens.map(
      (token) =>
        token.balance *
        (prices[
          token.symbol
        ] ?? 0)
    ),
  ].reduce(
    (total, value) =>
      total + value,
    0
  );

  const selectedNetworkName =
    selectedNetwork ===
    "all"
      ? "All Networks"
      : networks.find(
          (network) =>
            network.id ===
            selectedNetwork
        )?.name ??
        "All Networks";

  const sendAssets =
    useMemo(() => {
      const assets: SendAsset[] =
        [];

      Object.entries(
        nativeBalances
      ).forEach(
        ([chainId, raw]) => {
          const id =
            Number(chainId);

          const network =
            networks.find(
              (item) =>
                item.id === id
            );

          if (
            !network ||
            !raw
          ) {
            return;
          }

          const balance =
            Number(
              BigInt(raw)
            ) / 1e18;

          if (balance <= 0)
            return;

          assets.push({
            type: "native",
            symbol:
              network.symbol,
            name:
              network.name,
            chainId: id,
            decimals: 18,
            balance,
          });
        }
      );

      visibleTokens.forEach(
        (token) => {
          if (
            token.balance <=
            0
          ) {
            return;
          }

          assets.push({
            type: "token",
            symbol:
              token.symbol,
            name:
              token.name,
            chainId:
              token.chainId,
            decimals:
              token.decimals,
            address:
              token.address,
            balance:
              token.balance,
          });
        }
      );

      return assets;
    }, [
      nativeBalances,
      visibleTokens,
    ]);

  const selectedSendAsset =
    sendAssets.find(
      (asset) =>
        `${asset.type}-${asset.chainId}-${asset.address ?? asset.symbol}` ===
        sendAssetKey
    ) ?? sendAssets[0];

  useEffect(() => {
    if (
      modal === "send" &&
      !sendAssetKey &&
      sendAssets.length > 0
    ) {
      const asset =
        sendAssets[0];

      setSendAssetKey(
        `${asset.type}-${asset.chainId}-${asset.address ?? asset.symbol}`
      );
    }
  }, [
    modal,
    sendAssets,
    sendAssetKey,
  ]);

  function toggleTheme() {
    const next: Theme =
      theme === "light"
        ? "dark"
        : "light";

    setTheme(next);

    localStorage.setItem(
      "agora-theme",
      next
    );

    document.documentElement.setAttribute(
      "data-theme",
      next
    );
  }

  function openSend() {
    setSendError("");
    setSendStatus("");
    setRecipient("");
    setSendAmount("");

    if (sendAssets.length > 0) {
      const asset =
        sendAssets[0];

      setSendAssetKey(
        `${asset.type}-${asset.chainId}-${asset.address ?? asset.symbol}`
      );
    }

    setModal("send");
  }

  function openReceive() {
    setCopied(false);
    setModal("receive");
  }

  function closeModal() {
    setModal(null);
    setSendError("");
    setSendStatus("");
  }

  async function copyAddress() {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(
        address
      );

      setCopied(true);

      setTimeout(
        () =>
          setCopied(false),
        1800
      );
    } catch {
      setCopied(false);
    }
  }

  async function handleSend() {
    setSendError("");
    setSendStatus("");

    if (!address) {
      setSendError(
        "Connect your wallet first."
      );
      return;
    }

    if (
      !selectedSendAsset
    ) {
      setSendError(
        "No funded asset is available to send."
      );
      return;
    }

    if (
      !recipient ||
      !isAddress(recipient)
    ) {
      setSendError(
        "Enter a valid recipient wallet address."
      );
      return;
    }

    if (!sendAmount) {
      setSendError(
        "Enter an amount to send."
      );
      return;
    }

    const amount =
      Number(sendAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setSendError(
        "Enter a valid amount."
      );
      return;
    }

    if (
      amount >
      selectedSendAsset.balance
    ) {
      setSendError(
        `Insufficient ${selectedSendAsset.symbol} balance.`
      );
      return;
    }

    try {
      setSendStatus(
        "Preparing wallet..."
      );

      await switchChainAsync({
        chainId:
          selectedSendAsset.chainId,
      });

      setSendStatus(
        "Waiting for wallet approval..."
      );

      if (
        selectedSendAsset.type ===
        "native"
      ) {
        await sendTransactionAsync(
          {
            to: recipient as `0x${string}`,
            value:
              parseEther(
                sendAmount
              ),
            chainId:
              selectedSendAsset.chainId,
          }
        );
      } else {
        if (
          !selectedSendAsset.address
        ) {
          throw new Error(
            "Token contract address is missing."
          );
        }

        await writeContractAsync({
          address:
            selectedSendAsset.address,
          abi: erc20Abi,
          functionName:
            "transfer",
          args: [
            recipient as `0x${string}`,
            parseUnits(
              sendAmount,
              selectedSendAsset.decimals
            ),
          ],
          chainId:
            selectedSendAsset.chainId,
        });
      }

      setSendStatus(
        "Transaction submitted successfully."
      );

      setRecipient("");
      setSendAmount("");

      setTimeout(() => {
        setModal(null);
        setSendStatus("");
      }, 2500);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Transaction failed.";

      if (
        message
          .toLowerCase()
          .includes("user rejected")
      ) {
        setSendError(
          "Transaction was rejected in your wallet."
        );
      } else {
        setSendError(
          message.length > 220
            ? `${message.slice(
                0,
                220
              )}...`
            : message
        );
      }

      setSendStatus("");
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <Link
          href="/chat"
          className="brand"
        >
          <div className="logo">
            A
          </div>

          <div className="brand-copy">
            <strong>
              AGORA
            </strong>

            <span>
              AI & Web3 Agent
            </span>
          </div>
        </Link>

        <div className="header-actions">
          <button
            className="theme-button"
            onClick={
              toggleTheme
            }
            type="button"
            aria-label="Toggle theme"
          >
            {theme ===
            "light"
              ? "☾"
              : "☀"}
          </button>

          <div className="online">
            <span className="online-dot" />
            Online
          </div>
        </div>
      </header>

      <section className="portfolio-area">
        <div className="portfolio-inner">
          <div className="page-heading">
            <div>
              <h1>
                Portfolio
              </h1>

              <p>
                Your Web3 assets
                in one place.
              </p>
            </div>
          </div>

          <section className="network-selector-card">
            <div className="network-selector-copy">
              <span>
                NETWORK
              </span>

              <strong>
                {selectedNetworkName}
              </strong>
            </div>

            <select
              value={
                selectedNetwork
              }
              onChange={(
                event
              ) => {
                const value =
                  event.target
                    .value;

                setSelectedNetwork(
                  value ===
                    "all"
                    ? "all"
                    : Number(value)
                );
              }}
              aria-label="Select network"
            >
              <option value="all">
                All Networks
              </option>

              {networks.map(
                (network) => (
                  <option
                    key={
                      network.id
                    }
                    value={
                      network.id
                    }
                  >
                    {
                      network.name
                    }
                  </option>
                )
              )}
            </select>
          </section>

          <section className="balance-card">
            <div className="balance-label">
              {selectedNetwork ===
              "all"
                ? "TOTAL BALANCE"
                : `${selectedNetworkName.toUpperCase()} BALANCE`}
            </div>

            <div className="balance-row">
              <div className="balance-total">
                {hideBalances
                  ? "••••••"
                  : totalUsd.toLocaleString(
                      undefined,
                      {
                        style:
                          "currency",
                        currency:
                          "USD",
                        maximumFractionDigits: 2,
                      }
                    )}
              </div>

              <button
                type="button"
                className="balance-eye"
                onClick={() =>
                  setHideBalances(
                    (
                      value
                    ) =>
                      !value
                  )
                }
                aria-label={
                  hideBalances
                    ? "Show balance"
                    : "Hide balance"
                }
              >
                ◉
              </button>
            </div>

            <div className="balance-description">
              {selectedNetwork ===
              "all"
                ? "Combined value across all supported networks"
                : `Total value of your ${selectedNetworkName} assets`}
            </div>

            <div className="balance-actions">
              <button
                type="button"
                className="balance-action"
                onClick={
                  openSend
                }
              >
                ↑ Send
              </button>

              <button
                type="button"
                className="balance-action"
                onClick={
                  openReceive
                }
              >
                ↓ Receive
              </button>

              <Link
                href="/swap"
                className="balance-action"
              >
                ↔ Swap
              </Link>
            </div>
          </section>

          <section className="assets-section">
            <div className="section-title-row">
              <div>
                <h2>
                  Assets
                </h2>

                <p>
                  {selectedNetwork ===
                  "all"
                    ? "All assets across your supported networks"
                    : `Assets on ${selectedNetworkName}`}
                </p>
              </div>
            </div>

            <div className="asset-list">
              {tokensLoading && (
                <div className="asset-card">
                  <div className="asset-info">
                    <strong>
                      Loading assets...
                    </strong>

                    <span>
                      Reading your
                      wallet
                    </span>
                  </div>
                </div>
              )}

              {!tokensLoading &&
                filteredNativeBalances.length ===
                  0 &&
                filteredTokens.length ===
                  0 && (
                  <div className="asset-card empty-assets">
                    <div className="asset-info">
                      <strong>
                        No assets
                        found
                      </strong>

                      <span>
                        No supported
                        balances
                        were found
                        on this
                        network.
                      </span>
                    </div>
                  </div>
                )}

              {filteredNativeBalances.map(
                ([
                  chainId,
                  raw,
                ]) => {
                  const network =
                    networks.find(
                      (item) =>
                        item.id ===
                        Number(
                          chainId
                        )
                    );

                  if (
                    !network ||
                    !raw ||
                    raw ===
                      "0x0"
                  ) {
                    return null;
                  }

                  const balance =
                    Number(
                      BigInt(
                        raw
                      )
                    ) /
                    1e18;

                  return (
                    <div
                      className="asset-card"
                      key={`native-${chainId}`}
                    >
                      <div className="asset-icon">
                        {network.symbol.slice(
                          0,
                          1
                        )}
                      </div>

                      <div className="asset-info">
                        <strong>
                          {
                            network.symbol
                          }
                        </strong>

                        <span>
                          {
                            network.name
                          }
                        </span>
                      </div>

                      <div className="asset-amount">
                        <strong>
                          {hideBalances
                            ? "••••••"
                            : balance.toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 6,
                                }
                              )}
                        </strong>

                        <span>
                          {
                            network.symbol
                          }
                        </span>
                      </div>
                    </div>
                  );
                }
              )}

              {filteredTokens.map(
                (token) => {
                  const network =
                    networks.find(
                      (item) =>
                        item.id ===
                        token.chainId
                    );

                  return (
                    <div
                      className="asset-card"
                      key={`token-${token.chainId}-${token.address}`}
                    >
                      <div className="asset-icon">
                        {token.symbol.slice(
                          0,
                          1
                        )}
                      </div>

                      <div className="asset-info">
                        <strong>
                          {
                            token.symbol
                          }
                        </strong>

                        <span>
                          {
                            token.name
                          }

                          {network
                            ? ` · ${network.name}`
                            : ""}
                        </span>
                      </div>

                      <div className="asset-amount">
                        <strong>
                          {hideBalances
                            ? "••••••"
                            : token.balance.toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 6,
                                }
                              )}
                        </strong>

                        <span>
                          {
                            token.symbol
                          }
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>
        </div>
      </section>

      <nav className="navigation">
        <Link
          href="/chat"
          className="nav-bubble"
        >
          <span className="nav-icon chat-icon" />
          Chat
        </Link>

        <Link
          href="/swap"
          className="nav-bubble"
        >
          <span className="nav-icon swap-icon" />
          Swap
        </Link>

        <Link
          href="/portfolio"
          className="nav-bubble active"
        >
          <span className="nav-icon portfolio-icon" />
          Portfolio
        </Link>

        <Link
          href="/tools"
          className="nav-bubble"
        >
          <span className="nav-icon tools-icon" />
          Tools
        </Link>

        <Link
          href="/explore"
          className="nav-bubble"
        >
          <span className="nav-icon explore-icon" />
          Explore
        </Link>
      </nav>

      {modal && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span className="modal-kicker">
                  {modal ===
                  "send"
                    ? "WALLET ACTION"
                    : "YOUR WALLET"}
                </span>

                <h2>
                  {modal ===
                  "send"
                    ? "Send"
                    : "Receive"}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  closeModal
                }
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {modal ===
              "receive" && (
              <div className="receive-content">
                <div className="receive-icon">
                  ↓
                </div>

                <h3>
                  Receive crypto
                </h3>

                <p>
                  Send crypto to
                  this wallet
                  address on a
                  supported
                  network.
                </p>

                {address ? (
                  <>
                    <div className="address-box">
                      <span>
                        {
                          address
                        }
                      </span>
                    </div>

                    <button
                      type="button"
                      className="primary-button"
                      onClick={
                        copyAddress
                      }
                    >
                      {copied
                        ? "✓ Address Copied"
                        : "Copy Wallet Address"}
                    </button>
                  </>
                ) : (
                  <div className="modal-message error">
                    Connect your
                    wallet first
                    to see your
                    receiving
                    address.
                  </div>
                )}

                <div className="receive-warning">
                  Always verify the
                  network before
                  sending funds.
                </div>
              </div>
            )}

            {modal ===
              "send" && (
              <div className="send-content">
                {sendAssets.length >
                0 ? (
                  <>
                    <label className="field-label">
                      ASSET
                    </label>

                    <select
                      className="modal-input"
                      value={
                        selectedSendAsset
                          ? `${selectedSendAsset.type}-${selectedSendAsset.chainId}-${selectedSendAsset.address ?? selectedSendAsset.symbol}`
                          : ""
                      }
                      onChange={(
                        event
                      ) =>
                        setSendAssetKey(
                          event
                            .target
                            .value
                        )
                      }
                    >
                      {sendAssets.map(
                        (
                          asset
                        ) => {
                          const key = `${asset.type}-${asset.chainId}-${asset.address ?? asset.symbol}`;

                          const network =
                            networks.find(
                              (
                                item
                              ) =>
                                item.id ===
                                asset.chainId
                            );

                          return (
                            <option
                              key={
                                key
                              }
                              value={
                                key
                              }
                            >
                              {
                                asset.symbol
                              }{" "}
                              ·{" "}
                              {
                                network?.name ??
                                  ""
                              }{" "}
                              ·{" "}
                              {asset.balance.toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 6,
                                }
                              )}
                            </option>
                          );
                        }
                      )}
                    </select>

                    <div className="send-balance">
                      Available:{" "}
                      <strong>
                        {selectedSendAsset
                          ?.balance.toLocaleString(
                            undefined,
                            {
                              maximumFractionDigits: 6,
                            }
                          )}{" "}
                        {
                          selectedSendAsset?.symbol
                        }
                      </strong>
                    </div>

                    <label className="field-label">
                      RECIPIENT ADDRESS
                    </label>

                    <input
                      className="modal-input"
                      value={
                        recipient
                      }
                      onChange={(
                        event
                      ) =>
                        setRecipient(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="0x..."
                      spellCheck={
                        false
                      }
                    />

                    <label className="field-label">
                      AMOUNT
                    </label>

                    <div className="amount-wrap">
                      <input
                        className="modal-input"
                        value={
                          sendAmount
                        }
                        onChange={(
                          event
                        ) =>
                          setSendAmount(
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="0.00"
                        inputMode="decimal"
                      />

                      <button
                        type="button"
                        className="max-button"
                        onClick={() =>
                          selectedSendAsset &&
                          setSendAmount(
                            String(
                              selectedSendAsset.balance
                            )
                          )
                        }
                      >
                        MAX
                      </button>
                    </div>

                    {sendError && (
                      <div className="modal-message error">
                        {sendError}
                      </div>
                    )}

                    {sendStatus && (
                      <div className="modal-message success">
                        {sendStatus}
                      </div>
                    )}

                    <div className="send-network">
                      <span>
                        Network
                      </span>

                      <strong>
                        {
                          networks.find(
                            (
                              item
                            ) =>
                              item.id ===
                              selectedSendAsset?.chainId
                          )
                            ?.name ??
                            "Unknown"
                        }
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="primary-button"
                      onClick={
                        handleSend
                      }
                      disabled={
                        Boolean(
                          sendStatus
                        )
                      }
                    >
                      {sendStatus
                        ? "Processing..."
                        : `Send ${selectedSendAsset?.symbol ?? ""}`}
                    </button>

                    <p className="modal-footnote">
                      Agora never sends
                      funds without
                      your wallet
                      approval. Your
                      wallet will show
                      the transaction
                      before it is
                      submitted.
                    </p>
                  </>
                ) : (
                  <div className="empty-send">
                    <div className="receive-icon">
                      ↑
                    </div>

                    <h3>
                      Nothing to send
                    </h3>

                    <p>
                      No funded
                      supported
                      assets were
                      found in your
                      connected
                      wallet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
        }

        body {
          font-family: Arial, Helvetica, sans-serif;
        }

        a {
          text-decoration: none;
        }

        button,
        select,
        input {
          font-family: inherit;
        }

        .page {
          width: 100%;
          height: 100dvh;
          overflow: hidden;
          background: var(--background);
          color: var(--text);
        }

        .topbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 20;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          background: var(--background);
          border-bottom: 1px solid var(--border);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          color: var(--text);
        }

        .logo {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: var(--yellow);
          color: #050505;
          font-size: 21px;
          font-weight: 900;
        }

        .brand-copy strong {
          display: block;
          color: var(--text);
          font-size: 14px;
          letter-spacing: 2px;
        }

        .brand-copy span {
          display: block;
          margin-top: 3px;
          color: var(--muted);
          font-size: 10px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .theme-button {
          width: 38px;
          height: 38px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--surface);
          color: var(--text);
          cursor: pointer;
          font-size: 18px;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--text);
          font-size: 12px;
        }

        .online-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--yellow);
        }

        .portfolio-area {
          position: absolute;
          top: 72px;
          bottom: 82px;
          left: 0;
          right: 0;
          overflow-y: auto;
          padding: 38px 20px 50px;
        }

        .portfolio-inner {
          width: min(850px, 100%);
          margin: 0 auto;
        }

        .page-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 20px;
        }

        .page-heading h1 {
          margin: 0;
          font-size: 28px;
          color: var(--text);
        }

        .page-heading p {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .network-selector-card {
          width: 100%;
          min-height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 16px;
          padding: 16px 18px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--surface);
        }

        .network-selector-copy {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .network-selector-copy span {
          color: var(--muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .network-selector-copy strong {
          color: var(--text);
          font-size: 14px;
        }

        .network-selector-card select {
          min-width: 180px;
          height: 42px;
          padding: 0 34px 0 13px;
          border: 1px solid var(--border);
          border-radius: 12px;
          outline: none;
          background: var(--surface-2);
          color: var(--text);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .network-selector-card select:focus {
          border-color: var(--yellow);
        }

        .balance-card {
          width: 100%;
          min-height: 230px;
          padding: 30px 30px 26px;
          border: 1px solid var(--border);
          border-radius: 24px;
          background: var(--surface);
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.09);
        }

        .balance-label {
          color: var(--muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .balance-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 13px;
        }

        .balance-total {
          color: var(--text);
          font-size: clamp(46px, 7vw, 64px);
          line-height: 0.98;
          font-weight: 850;
          letter-spacing: -2px;
        }

        .balance-eye {
          width: 34px !important;
          height: 34px !important;
          min-width: 34px !important;
          margin: 0 !important;
          padding: 0 !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none !important;
          outline: none;
          border-radius: 50%;
          background: transparent !important;
          box-shadow: none !important;
          color: var(--muted);
          font-size: 17px;
          cursor: pointer;
        }

        .balance-eye:hover {
          background: rgba(245, 196, 0, 0.12) !important;
          color: var(--text);
        }

        .balance-description {
          margin-top: 12px;
          color: var(--muted);
          font-size: 11px;
        }

        .balance-actions {
          display: flex;
          gap: 10px;
          margin-top: 26px;
        }

        .balance-action {
          flex: 1;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 15px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--surface-2);
          color: var(--text);
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease;
        }

        .balance-action:hover {
          transform: translateY(-1px);
          border-color: var(--yellow);
        }

        .assets-section {
          margin-top: 30px;
        }

        .section-title-row {
          margin-bottom: 13px;
        }

        .section-title-row h2 {
          margin: 0;
          color: var(--text);
          font-size: 17px;
        }

        .section-title-row p {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 11px;
        }

        .asset-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .asset-card {
          min-height: 76px;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--surface);
        }

        .asset-icon {
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: var(--yellow);
          color: #050505;
          font-weight: 900;
        }

        .asset-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .asset-info strong,
        .asset-amount strong {
          color: var(--text);
          font-size: 13px;
        }

        .asset-info span,
        .asset-amount span {
          color: var(--muted);
          font-size: 10px;
        }

        .asset-amount {
          margin-left: auto;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .empty-assets {
          min-height: 80px;
        }

        .navigation {
          position: fixed;
          z-index: 40;
          left: 50%;
          bottom: 12px;
          transform: translateX(-50%);
          width: min(700px, calc(100% - 24px));
          height: 56px;
          display: flex;
          gap: 5px;
          padding: 6px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
        }

        .nav-bubble {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-width: 0;
          padding: 8px;
          border-radius: 13px;
          color: var(--text);
          font-size: 12px;
          transition:
            background 0.15s ease,
            transform 0.15s ease;
        }

        .nav-bubble:hover {
          background: var(--surface-2);
          transform: translateY(-1px);
        }

        .nav-bubble.active {
          background: var(--yellow);
          color: #050505;
          font-weight: 700;
        }

        .nav-icon {
          position: relative;
          width: 16px;
          height: 16px;
          display: inline-block;
          flex-shrink: 0;
        }

        .chat-icon::before {
          content: "";
          position: absolute;
          inset: 2px;
          border: 2px solid currentColor;
          border-radius: 50%;
        }

        .swap-icon::before {
          content: "↔";
          position: absolute;
          inset: 0;
          font-size: 16px;
          line-height: 16px;
          font-weight: 900;
        }

        .portfolio-icon::before {
          content: "";
          position: absolute;
          left: 2px;
          right: 2px;
          bottom: 2px;
          height: 10px;
          border: 2px solid currentColor;
          border-radius: 2px;
        }

        .tools-icon::before {
          content: "⚙";
          position: absolute;
          inset: 0;
          font-size: 15px;
          line-height: 16px;
        }

        .explore-icon::before {
          content: "";
          position: absolute;
          inset: 2px;
          border: 2px solid currentColor;
          border-radius: 50%;
        }

        .explore-icon::after {
          content: "";
          position: absolute;
          width: 5px;
          height: 5px;
          left: 5px;
          top: 5px;
          border-top: 2px solid currentColor;
          border-right: 2px solid currentColor;
          transform: rotate(45deg);
        }

        /* MODAL */

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(0, 0, 0, 0.62);
          backdrop-filter: blur(8px);
        }

        .modal-card {
          width: min(480px, 100%);
          max-height: calc(100dvh - 40px);
          overflow-y: auto;
          padding: 24px;
          border: 1px solid var(--border);
          border-radius: 24px;
          background: var(--surface);
          color: var(--text);
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .modal-kicker {
          color: var(--yellow);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.8px;
        }

        .modal-header h2 {
          margin: 5px 0 0;
          font-size: 26px;
        }

        .modal-close {
          width: 36px;
          height: 36px;
          border: 1px solid var(--border);
          border-radius: 50%;
          background: var(--surface-2);
          color: var(--text);
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }

        .receive-content,
        .send-content {
          display: flex;
          flex-direction: column;
        }

        .receive-icon {
          width: 56px;
          height: 56px;
          display: grid;
          place-items: center;
          margin-bottom: 15px;
          border-radius: 17px;
          background: var(--yellow);
          color: #050505;
          font-size: 25px;
          font-weight: 900;
        }

        .receive-content h3,
        .empty-send h3 {
          margin: 0;
          font-size: 19px;
        }

        .receive-content p,
        .empty-send p {
          margin: 7px 0 18px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.5;
        }

        .address-box {
          width: 100%;
          padding: 14px;
          margin-bottom: 12px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--surface-2);
          overflow-wrap: anywhere;
        }

        .address-box span {
          color: var(--text);
          font-size: 11px;
          line-height: 1.5;
        }

        .primary-button {
          width: 100%;
          min-height: 48px;
          border: none;
          border-radius: 14px;
          background: var(--yellow);
          color: #050505;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .primary-button:hover {
          filter: brightness(1.04);
          transform: translateY(-1px);
        }

        .primary-button:disabled {
          opacity: 0.55;
          cursor: wait;
          transform: none;
        }

        .receive-warning {
          margin-top: 14px;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.5;
        }

        .field-label {
          margin: 0 0 7px;
          color: var(--muted);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .modal-input {
          width: 100%;
          height: 48px;
          margin-bottom: 15px;
          padding: 0 13px;
          border: 1px solid var(--border);
          border-radius: 13px;
          outline: none;
          background: var(--surface-2);
          color: var(--text);
          font-size: 12px;
        }

        .modal-input:focus {
          border-color: var(--yellow);
        }

        .send-balance {
          margin-top: -8px;
          margin-bottom: 18px;
          color: var(--muted);
          font-size: 10px;
        }

        .send-balance strong {
          color: var(--text);
        }

        .amount-wrap {
          position: relative;
        }

        .amount-wrap .modal-input {
          padding-right: 65px;
        }

        .max-button {
          position: absolute;
          right: 8px;
          top: 8px;
          height: 32px;
          padding: 0 9px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: var(--surface);
          color: var(--yellow);
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .send-network {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin: 14px 0;
          padding: 12px 13px;
          border: 1px solid var(--border);
          border-radius: 13px;
          background: var(--surface-2);
        }

        .send-network span {
          color: var(--muted);
          font-size: 10px;
        }

        .send-network strong {
          color: var(--text);
          font-size: 11px;
        }

        .modal-message {
          margin: 0 0 14px;
          padding: 12px;
          border-radius: 12px;
          font-size: 10px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .modal-message.error {
          border: 1px solid rgba(255, 80, 80, 0.35);
          background: rgba(255, 80, 80, 0.08);
          color: #ff8585;
        }

        .modal-message.success {
          border: 1px solid rgba(245, 196, 0, 0.35);
          background: rgba(245, 196, 0, 0.08);
          color: var(--text);
        }

        .modal-footnote {
          margin: 13px 0 0;
          color: var(--muted);
          font-size: 9px;
          line-height: 1.5;
          text-align: center;
        }

        .empty-send {
          text-align: center;
          padding: 10px 0 4px;
        }

        .empty-send .receive-icon {
          margin-left: auto;
          margin-right: auto;
        }

        @media (max-width: 600px) {
          .topbar {
            height: 68px;
            padding: 0 15px;
          }

          .brand-copy span {
            display: none;
          }

          .portfolio-area {
            top: 68px;
            bottom: 132px;
            padding: 25px 14px 40px;
          }

          .page-heading {
            margin-bottom: 16px;
          }

          .page-heading h1 {
            font-size: 23px;
          }

          .page-heading p {
            font-size: 12px;
          }

          .network-selector-card {
            min-height: 64px;
            padding: 13px;
            gap: 10px;
            border-radius: 16px;
          }

          .network-selector-copy strong {
            font-size: 12px;
          }

          .network-selector-card select {
            min-width: 145px;
            max-width: 48%;
            height: 40px;
            padding-left: 10px;
            padding-right: 25px;
            font-size: 11px;
          }

          .balance-card {
            min-height: 225px;
            padding: 27px 21px 23px;
            border-radius: 21px;
          }

          .balance-label {
            font-size: 10px;
            letter-spacing: 1.6px;
          }

          .balance-row {
            margin-top: 14px;
            gap: 9px;
          }

          .balance-total {
            font-size: clamp(42px, 13vw, 56px);
            letter-spacing: -1.8px;
          }

          .balance-eye {
            width: 32px !important;
            height: 32px !important;
            min-width: 32px !important;
          }

          .balance-description {
            margin-top: 11px;
            line-height: 1.4;
          }

          .balance-actions {
            gap: 7px;
            margin-top: 24px;
          }

          .balance-action {
            min-height: 47px;
            padding: 0 8px;
            border-radius: 13px;
            font-size: 10px;
          }

          .assets-section {
            margin-top: 27px;
          }

          .asset-card {
            min-height: 72px;
            padding: 12px;
            border-radius: 15px;
          }

          .asset-icon {
            width: 40px;
            height: 40px;
          }

          .asset-info strong,
          .asset-amount strong {
            font-size: 12px;
          }

          .asset-info span,
          .asset-amount span {
            font-size: 9px;
          }

          .navigation {
            width: calc(100% - 12px);
            bottom: 7px;
          }

          .nav-bubble {
            flex-direction: column;
            gap: 2px;
            padding: 8px 3px;
            font-size: 9px;
          }

          .nav-icon {
            width: 15px;
            height: 15px;
          }

          .modal-backdrop {
            align-items: flex-end;
            padding: 8px;
          }

          .modal-card {
            width: 100%;
            max-height: calc(100dvh - 16px);
            padding: 20px;
            border-radius: 23px;
          }
        }
      `}</style>
    </main>
  );
}