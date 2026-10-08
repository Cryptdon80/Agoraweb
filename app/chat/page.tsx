"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseUnits } from "viem";
import {
  useAccount,
  useBalance,
  useChainId,
  useDisconnect,
  useSendTransaction,
} from "wagmi";
import { parseAgentSwap } from "../lib/agent-swap";
import { useChat } from "../lib/chat-context";
import { saveChatHistory } from "../lib/chat-history";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { firebaseAuth } from "../lib/firebase";

type Theme = "light" | "dark";

type PendingTransaction = {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
};

type WalletAsset = {
  chainId: number;
  network: string;
  symbol: string;
  balance: string;
  decimals: number;
  priceUsd: number | null;
  valueUsd: number | null;
  type: "native" | "token";
  address?: string;
};

const TOKEN_ADDRESSES = {
  ethereum: {
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  base: {
    usdt: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  polygon: {
    usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  },
  arbitrum: {
    usdt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  },
  optimism: {
    usdt: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  },
  bnb: {
    usdt: "0x55d398326f99059fF775485246999027B3197955",
    usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  },
} as const;

function cleanNumber(value: string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

function formatAmount(value: string) {
  const number = cleanNumber(value);

  if (number === 0) {
    return "0";
  }

  return number.toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

function formatUsd(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "price unavailable";
  }

  if (value < 0.01 && value > 0) {
    return `$${value.toFixed(4)}`;
  }

  return `$${value.toFixed(2)}`;
}

export default function ChatPage() {
  const [theme, setTheme] = useState<Theme>("light");

  const {
    address,
    isConnected,
    isReconnecting,
  } = useAccount();

  const { disconnect } = useDisconnect();

  const walletReconnecting = isReconnecting;

  const chainId = useChainId();
  const { sendTransactionAsync } = useSendTransaction();

  const walletEnabled = Boolean(
    address &&
      isConnected &&
      !walletReconnecting
  );

  /*
   * Native balances across all supported networks.
   */
  const {
    data: ethereumBalance,
    isLoading: ethereumLoading,
  } = useBalance({
    address,
    chainId: 1,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: baseBalance,
    isLoading: baseLoading,
  } = useBalance({
    address,
    chainId: 8453,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: polygonBalance,
    isLoading: polygonLoading,
  } = useBalance({
    address,
    chainId: 137,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: arbitrumBalance,
    isLoading: arbitrumLoading,
  } = useBalance({
    address,
    chainId: 42161,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: optimismBalance,
    isLoading: optimismLoading,
  } = useBalance({
    address,
    chainId: 10,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: bnbBalance,
    isLoading: bnbLoading,
  } = useBalance({
    address,
    chainId: 56,
    query: {
      enabled: walletEnabled,
    },
  });

  /*
   * USDT balances.
   */
  const {
    data: ethereumUsdtBalance,
    isLoading: ethereumUsdtLoading,
  } = useBalance({
    address,
    chainId: 1,
    token:
      TOKEN_ADDRESSES.ethereum.usdt as `0x${string}`,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: baseUsdtBalance,
    isLoading: baseUsdtLoading,
  } = useBalance({
    address,
    chainId: 8453,
    token:
      TOKEN_ADDRESSES.base.usdt as `0x${string}`,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: polygonUsdtBalance,
    isLoading: polygonUsdtLoading,
  } = useBalance({
    address,
    chainId: 137,
    token:
      TOKEN_ADDRESSES.polygon.usdt as `0x${string}`,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: arbitrumUsdtBalance,
    isLoading: arbitrumUsdtLoading,
  } = useBalance({
    address,
    chainId: 42161,
    token:
      TOKEN_ADDRESSES.arbitrum.usdt as `0x${string}`,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: optimismUsdtBalance,
    isLoading: optimismUsdtLoading,
  } = useBalance({
    address,
    chainId: 10,
    token:
      TOKEN_ADDRESSES.optimism.usdt as `0x${string}`,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: bnbUsdtBalance,
    isLoading: bnbUsdtLoading,
  } = useBalance({
    address,
    chainId: 56,
    token:
      TOKEN_ADDRESSES.bnb.usdt as `0x${string}`,
    query: {
      enabled: walletEnabled,
    },
  });

  /*
   * USDC balances.
   */
  const {
    data: ethereumUsdcBalance,
    isLoading: ethereumUsdcLoading,
  } = useBalance({
    address,
    chainId: 1,
    token:
      TOKEN_ADDRESSES.ethereum.usdc as `0x${string}`,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: baseUsdcBalance,
    isLoading: baseUsdcLoading,
  } = useBalance({
    address,
    chainId: 8453,
    token:
      TOKEN_ADDRESSES.base.usdc as `0x${string}`,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: polygonUsdcBalance,
    isLoading: polygonUsdcLoading,
  } = useBalance({
    address,
    chainId: 137,
    token:
      TOKEN_ADDRESSES.polygon.usdc as `0x${string}`,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: arbitrumUsdcBalance,
    isLoading: arbitrumUsdcLoading,
  } = useBalance({
    address,
    chainId: 42161,
    token:
      TOKEN_ADDRESSES.arbitrum.usdc as `0x${string}`,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: optimismUsdcBalance,
    isLoading: optimismUsdcLoading,
  } = useBalance({
    address,
    chainId: 10,
    token:
      TOKEN_ADDRESSES.optimism.usdc as `0x${string}`,
    query: {
      enabled: walletEnabled,
    },
  });

  const {
    data: bnbUsdcBalance,
    isLoading: bnbUsdcLoading,
  } = useBalance({
    address,
    chainId: 56,
    token:
      TOKEN_ADDRESSES.bnb.usdc as `0x${string}`,
    query: {
      enabled: walletEnabled,
    },
  });

  /*
   * Active network native balance.
   */
  const { data: walletBalance } = useBalance({
    address,
    chainId,
    query: {
      enabled: walletEnabled,
    },
  });

  /*
   * Every supported wallet asset that Agora knows how to read.
   *
   * Zero balances are kept internally so the swap balance checker
   * can always answer accurately.
   */
  const allWalletAssets: WalletAsset[] = [
    {
      chainId: 1,
      network: "Ethereum",
      symbol: "ETH",
      balance: ethereumBalance?.formatted || "0",
      decimals: 18,
      priceUsd: null,
      valueUsd: null,
      type: "native",
    },
    {
      chainId: 1,
      network: "Ethereum",
      symbol: "USDT",
      balance: ethereumUsdtBalance?.formatted || "0",
      decimals: 6,
      priceUsd: 1,
      valueUsd: null,
      type: "token",
      address: TOKEN_ADDRESSES.ethereum.usdt,
    },
    {
      chainId: 1,
      network: "Ethereum",
      symbol: "USDC",
      balance: ethereumUsdcBalance?.formatted || "0",
      decimals: 6,
      priceUsd: 1,
      valueUsd: null,
      type: "token",
      address: TOKEN_ADDRESSES.ethereum.usdc,
    },
    {
      chainId: 8453,
      network: "Base",
      symbol: "ETH",
      balance: baseBalance?.formatted || "0",
      decimals: 18,
      priceUsd: null,
      valueUsd: null,
      type: "native",
    },
    {
      chainId: 8453,
      network: "Base",
      symbol: "USDT",
      balance: baseUsdtBalance?.formatted || "0",
      decimals: 6,
      priceUsd: 1,
      valueUsd: null,
      type: "token",
      address: TOKEN_ADDRESSES.ethereum.usdt,
    },
    {
      chainId: 8453,
      network: "Base",
      symbol: "USDC",
      balance: baseUsdcBalance?.formatted || "0",
      decimals: 6,
      priceUsd: 1,
      valueUsd: null,
      type: "token",
      address: TOKEN_ADDRESSES.base.usdt,
    },
    {
      chainId: 137,
      network: "Polygon",
      symbol: "POL",
      balance: polygonBalance?.formatted || "0",
      decimals: 18,
      priceUsd: null,
      valueUsd: null,
      type: "native",
    },
    {
      chainId: 137,
      network: "Polygon",
      symbol: "USDT",
      balance: polygonUsdtBalance?.formatted || "0",
      decimals: 6,
      priceUsd: 1,
      valueUsd: null,
      type: "token",
      address: TOKEN_ADDRESSES.base.usdc,
    },
    {
      chainId: 137,
      network: "Polygon",
      symbol: "USDC",
      balance: polygonUsdcBalance?.formatted || "0",
      decimals: 6,
      priceUsd: 1,
      valueUsd: null,
      type: "token",
      address: TOKEN_ADDRESSES.polygon.usdt,
    },
    {
      chainId: 42161,
      network: "Arbitrum",
      symbol: "ETH",
      balance: arbitrumBalance?.formatted || "0",
      decimals: 18,
      priceUsd: null,
      valueUsd: null,
      type: "native",
    },
    {
      chainId: 42161,
      network: "Arbitrum",
      symbol: "USDT",
      balance: arbitrumUsdtBalance?.formatted || "0",
      decimals: 6,
      priceUsd: 1,
      valueUsd: null,
      type: "token",
      address: TOKEN_ADDRESSES.polygon.usdc,
    },
    {
      chainId: 42161,
      network: "Arbitrum",
      symbol: "USDC",
      balance: arbitrumUsdcBalance?.formatted || "0",
      decimals: 6,
      priceUsd: 1,
      valueUsd: null,
      type: "token",
      address: TOKEN_ADDRESSES.arbitrum.usdt,
    },
    {
      chainId: 10,
      network: "Optimism",
      symbol: "ETH",
      balance: optimismBalance?.formatted || "0",
      decimals: 18,
      priceUsd: null,
      valueUsd: null,
      type: "native",
    },
    {
      chainId: 10,
      network: "Optimism",
      symbol: "USDT",
      balance: optimismUsdtBalance?.formatted || "0",
      decimals: 6,
      priceUsd: 1,
      valueUsd: null,
      type: "token",
      address: TOKEN_ADDRESSES.arbitrum.usdc,
    },
    {
      chainId: 10,
      network: "Optimism",
      symbol: "USDC",
      balance: optimismUsdcBalance?.formatted || "0",
      decimals: 6,
      priceUsd: 1,
      valueUsd: null,
      type: "token",
      address: TOKEN_ADDRESSES.optimism.usdt,
    },
    {
      chainId: 56,
      network: "BNB Chain",
      symbol: "BNB",
      balance: bnbBalance?.formatted || "0",
      decimals: 18,
      priceUsd: null,
      valueUsd: null,
      type: "native",
    },
    {
      chainId: 56,
      network: "BNB Chain",
      symbol: "USDT",
      balance: bnbUsdtBalance?.formatted || "0",
      decimals: 18,
      priceUsd: 1,
      valueUsd: null,
      type: "token",
      address: TOKEN_ADDRESSES.optimism.usdc,
    },
    {
      chainId: 56,
      network: "BNB Chain",
      symbol: "USDC",
      balance: bnbUsdcBalance?.formatted || "0",
      decimals: 18,
      priceUsd: 1,
      valueUsd: null,
      type: "token",
    },
  ];

  const allWalletBalancesLoading =
    walletEnabled &&
    (
      ethereumLoading ||
      baseLoading ||
      polygonLoading ||
      arbitrumLoading ||
      optimismLoading ||
      bnbLoading ||
      ethereumUsdtLoading ||
      baseUsdtLoading ||
      polygonUsdtLoading ||
      arbitrumUsdtLoading ||
      optimismUsdtLoading ||
      bnbUsdtLoading ||
      ethereumUsdcLoading ||
      baseUsdcLoading ||
      polygonUsdcLoading ||
      arbitrumUsdcLoading ||
      optimismUsdcLoading ||
      bnbUsdcLoading
    );

  const { messages, setMessages } = useChat();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const [accountOpen, setAccountOpen] = useState(false);
  const [googleUser, setGoogleUser] =
    useState<User | null>(null);

  const sessionLockedRef = useRef(false);

  const AGORA_LAST_ACTIVITY_KEY =
    "agora-last-activity";

  const AGORA_SESSION_TIMEOUT =
    60 * 60 * 1000;

  const [selectedImage, setSelectedImage] = useState<{
    preview: string;
    data: string;
    mimeType: string;
    name: string;
  } | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [pendingTransaction, setPendingTransaction] =
    useState<PendingTransaction | null>(null);

  const [transactionLoading, setTransactionLoading] =
    useState(false);

  const [chatId] = useState(
    () =>
      `chat-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`
  );

  function saveCurrentChat() {
    if (messages.length <= 1) {
      return;
    }

    saveChatHistory(chatId, messages);
  }

  function openImagePicker() {
    if (loading) {
      return;
    }

    fileInputRef.current?.click();
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      window.alert(
        "Please choose a PNG, JPG, or WEBP image."
      );

      event.target.value = "";
      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      window.alert(
        "Please choose an image smaller than 10MB."
      );

      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        return;
      }

      const commaIndex = result.indexOf(",");

      if (commaIndex === -1) {
        return;
      }

      const base64Data = result.slice(
        commaIndex + 1
      );

      setSelectedImage({
        preview: result,
        data: base64Data,
        mimeType: file.type,
        name: file.name,
      });
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  }

  function removeSelectedImage() {
    setSelectedImage(null);
  }

  function getSwapBalance(
    swapChainId: number,
    symbol: string,
    tokenAddress?: string
  ) {
    const normalizedSymbol = symbol.toUpperCase();
    const normalizedToken = tokenAddress?.toLowerCase();

    const nativeAddress =
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

    const isNative =
      normalizedToken === nativeAddress;

    const asset = allWalletAssets.find((item) => {
      if (
        item.chainId !== swapChainId ||
        item.symbol.toUpperCase() !== normalizedSymbol
      ) {
        return false;
      }

      if (item.type === "native") {
        return isNative;
      }

      return (
        Boolean(item.address) &&
        Boolean(normalizedToken) &&
        item.address!.toLowerCase() === normalizedToken
      );
    });

    return asset || null;
  }

  async function getLivePrices() {
    const prices: Record<string, number | null> = {
      ETH: null,
      BNB: null,
      POL: null,
    };

    try {
      const symbols = [
        "ETHUSDT",
        "BNBUSDT",
        "POLUSDT",
      ];

      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const response = await fetch(
              `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
              {
                cache: "no-store",
              }
            );

            if (!response.ok) {
              return [symbol, null] as const;
            }

            const data = await response.json();

            const value = Number(data.price);

            if (!Number.isFinite(value)) {
              return [symbol, null] as const;
            }

            return [symbol, value] as const;
          } catch {
            return [symbol, null] as const;
          }
        })
      );

      for (const [symbol, value] of results) {
        if (symbol === "ETHUSDT") {
          prices.ETH = value;
        }

        if (symbol === "BNBUSDT") {
          prices.BNB = value;
        }

        if (symbol === "POLUSDT") {
          prices.POL = value;
        }
      }
    } catch {
      // Keep unavailable prices as null.
    }

    return prices;
  }

  async function buildBalanceMessage() {
    const prices = await getLivePrices();

    const assetsWithValues = allWalletAssets.map(
      (asset) => {
        let priceUsd = asset.priceUsd;

        if (asset.symbol === "ETH") {
          priceUsd = prices.ETH;
        }

        if (asset.symbol === "BNB") {
          priceUsd = prices.BNB;
        }

        if (asset.symbol === "POL") {
          priceUsd = prices.POL;
        }

        const numericBalance = cleanNumber(
          asset.balance
        );

        const valueUsd =
          priceUsd !== null
            ? numericBalance * priceUsd
            : null;

        return {
          ...asset,
          priceUsd,
          valueUsd,
        };
      }
    );

    const nonZeroAssets =
      assetsWithValues.filter(
        (asset) =>
          cleanNumber(asset.balance) > 0
      );

    if (nonZeroAssets.length === 0) {
      return (
        "💰 Wallet balance\n\n" +
        "I couldn't find any non-zero supported token balances in this wallet."
      );
    }

    const totalUsd = nonZeroAssets.reduce(
      (total, asset) =>
        total +
        (asset.valueUsd ?? 0),
      0
    );

    const unavailableCount =
      nonZeroAssets.filter(
        (asset) =>
          asset.valueUsd === null
      ).length;

    const grouped = new Map<
      string,
      WalletAsset[]
    >();

    for (const asset of nonZeroAssets) {
      const current =
        grouped.get(asset.network) || [];

      current.push(asset);

      grouped.set(
        asset.network,
        current
      );
    }

    const sections: string[] = [];

    for (const [
      network,
      assets,
    ] of grouped.entries()) {
      const lines = assets.map(
        (asset) => {
          const amount =
            formatAmount(asset.balance);

          const value =
            asset.valueUsd === null
              ? "price unavailable"
              : formatUsd(
                  asset.valueUsd
                );

          return `• ${asset.symbol}: ${amount} — ${value}`;
        }
      );

      sections.push(
        `${network}\n${lines.join("\n")}`
      );
    }

    let message =
      "💰 Your Agora Wallet Balance\n\n" +
      sections.join("\n\n") +
      "\n\n────────────────\n" +
      `Estimated total: ${formatUsd(totalUsd)} USDT`;

    if (unavailableCount > 0) {
      message +=
        `\n\n⚠️ ${unavailableCount} asset${
          unavailableCount === 1
            ? ""
            : "s"
        } ${
          unavailableCount === 1
            ? "has"
            : "have"
        } no live price available, so the total is an estimate based only on assets with available prices.`;
    }

    return message;
  }

  async function authorizeSwap() {
    if (!pendingTransaction) {
      return;
    }

    if (!isConnected || !address) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            "Your wallet isn't connected. Connect your wallet before authorizing this swap.",
        },
      ]);

      return;
    }

    if (walletReconnecting) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            "Your wallet is reconnecting. Please wait a moment and try again.",
        },
      ]);

      return;
    }

    try {
      setTransactionLoading(true);

      const hash = await sendTransactionAsync({
        to: pendingTransaction.to,
        data: pendingTransaction.data,
        value: pendingTransaction.value,
      });

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            `Swap transaction submitted.\n\n` +
            `Transaction: ${hash}\n\n` +
            `Check your wallet/network for confirmation.`,
        },
      ]);

      setPendingTransaction(null);
    } catch (error) {
      setPendingTransaction(null);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            error instanceof Error
              ? `Swap authorization failed: ${error.message}`
              : "Swap authorization was cancelled or failed.",
        },
      ]);
    } finally {
      setTransactionLoading(false);
    }
  }
  useEffect(() => {
    const saved = localStorage.getItem(
      "agora-theme"
    ) as Theme | null;

    const current =
      saved === "dark" ? "dark" : "light";

    setTheme(current);

    document.documentElement.setAttribute(
      "data-theme",
      current
    );
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (user) => {
        setGoogleUser(user);
      }
    );

    return unsubscribe;
  }, []);

  async function disconnectGoogle() {
    try {
      await signOut(firebaseAuth);
    } catch (error) {
      console.error(
        "Google disconnect failed:",
        error
      );
    }

    setGoogleUser(null);
    setAccountOpen(false);

    if (!isConnected) {
      router.replace("/connect");
    }
  }

  function disconnectWallet() {
    disconnect();
    setAccountOpen(false);

    if (!firebaseAuth.currentUser) {
      router.replace("/connect");
    }
  }

  async function lockAgora() {
    if (sessionLockedRef.current) {
      return;
    }

    sessionLockedRef.current = true;

    localStorage.removeItem(
      AGORA_LAST_ACTIVITY_KEY
    );

    setAccountOpen(false);

    try {
      await signOut(firebaseAuth);
    } catch (error) {
      console.error(
        "Agora lock sign-out failed:",
        error
      );
    }

    disconnect();

    router.replace("/connect");
  }

  useEffect(() => {
    const checkSession = () => {
      const lastActivity = Number(
        localStorage.getItem(
          AGORA_LAST_ACTIVITY_KEY
        ) || "0"
      );

      if (
        lastActivity &&
        Date.now() - lastActivity >=
          AGORA_SESSION_TIMEOUT
      ) {
        void lockAgora();
        return;
      }

      if (!lastActivity) {
        localStorage.setItem(
          AGORA_LAST_ACTIVITY_KEY,
          String(Date.now())
        );
      }
    };

    checkSession();

    const activityEvents = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    let lastWrite = 0;

    const recordActivity = () => {
      const now = Date.now();

      if (now - lastWrite < 30000) {
        return;
      }

      lastWrite = now;

      localStorage.setItem(
        AGORA_LAST_ACTIVITY_KEY,
        String(now)
      );
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(
        eventName,
        recordActivity,
        { passive: true }
      );
    });

    const interval = window.setInterval(
      checkSession,
      30000
    );

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        checkSession();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          recordActivity
        );
      });

      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, []);

  function toggleTheme() {
    const next: Theme =
      theme === "light" ? "dark" : "light";

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

  async function sendMessage(event: FormEvent) {
    event.preventDefault();

    const text = input.trim();

    if (!text || loading) {
      return;
    }

    const imageToSend = selectedImage;

    const walletQuestion =
      /\b(wallet|balance|balances|assets|holdings|portfolio|funds|tokens)\b/i.test(
        text
      );

    const balanceRequest =
      /\b(balance|balances|wallet balance|how much.*(have|hold|own)|what.*(have|hold|own))\b/i.test(
        text
      );

    if (walletQuestion && walletReconnecting) {
      setMessages((current) => [
        ...current,
        {
          role: "user",
          text,
        },
        {
          role: "assistant",
          text:
            "I'm reconnecting your wallet. Give me a moment, then ask me again.",
        },
      ]);

      setInput("");
      setSelectedImage(null);

      return;
    }

    if (
      walletQuestion &&
      !isConnected &&
      !address &&
      !walletReconnecting
    ) {
      setMessages((current) => [
        ...current,
        {
          role: "user",
          text,
        },
        {
          role: "assistant",
          text:
            "Your wallet isn't connected yet. Connect your wallet first, and I'll be able to read the wallet information available to Agora.",
        },
      ]);

      setInput("");
      setSelectedImage(null);

      return;
    }

    if (
      walletQuestion &&
      isConnected &&
      allWalletBalancesLoading
    ) {
      setMessages((current) => [
        ...current,
        {
          role: "user",
          text,
        },
        {
          role: "assistant",
          text:
            "I'm checking your wallet across all supported networks. Give me a moment and ask again.",
        },
      ]);

      setInput("");
      setSelectedImage(null);

      return;
    }

    if (balanceRequest && isConnected) {
      setMessages((current) => [
        ...current,
        {
          role: "user",
          text,
        },
      ]);

      setInput("");
      setSelectedImage(null);
      setLoading(true);

      try {
        const balanceMessage =
          await buildBalanceMessage();

        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            text: balanceMessage,
          },
        ]);
      } catch (error) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            text:
              error instanceof Error
                ? error.message
                : "I couldn't read your wallet balances right now.",
          },
        ]);
      } finally {
        setLoading(false);
      }

      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text,
        ...(imageToSend
          ? {
              image: imageToSend.preview,
            }
          : {}),
      },
    ]);

    setInput("");
    setSelectedImage(null);
    setLoading(true);

    try {
      let swap =
        imageToSend ||
        !/^swap\s+/i.test(text)
          ? null
          : parseAgentSwap(text);
      /*
       * Natural-language "available/all" native swaps.
       * Uses the REAL wallet balance and keeps a small gas reserve.
       */
      if (!imageToSend && !swap) {
        const availableMatch = text
          .trim()
          .match(
            /^swap\s+(?:my\s+)?(?:available|all)\s+(BNB|ETH|POL)\s+(?:to|for)\s+(USDT|USDC)$/i
          );

        if (availableMatch) {
          const sellSymbol =
            availableMatch[1].toUpperCase();

          const buySymbol =
            availableMatch[2].toUpperCase();

          const nativeChainMap: Record<string, number> = {
            BNB: 56,
            ETH: 1,
            POL: 137,
          };

          const tokenMap: Record<
            string,
            Record<string, string>
          > = {
            BNB: {
              USDT: TOKEN_ADDRESSES.bnb.usdt,
              USDC: TOKEN_ADDRESSES.bnb.usdc,
            },
            ETH: {
              USDT: TOKEN_ADDRESSES.ethereum.usdt,
              USDC: TOKEN_ADDRESSES.ethereum.usdc,
            },
            POL: {
              USDT: TOKEN_ADDRESSES.polygon.usdt,
              USDC: TOKEN_ADDRESSES.polygon.usdc,
            },
          };

          const detectedChainId =
            nativeChainMap[sellSymbol];

          const detectedAsset =
            allWalletAssets.find(
              (asset) =>
                asset.chainId === detectedChainId &&
                asset.symbol === sellSymbol &&
                asset.type === "native"
            );

          if (detectedAsset) {
            const available = cleanNumber(
              detectedAsset.balance
            );

            /*
             * Keep some native currency for gas.
             */
            const gasReserve =
              sellSymbol === "BNB"
                ? 0.00001
                : 0.00005;

            const spendable = Math.max(
              0,
              available - gasReserve
            );

            const buyAddress =
              tokenMap[sellSymbol]?.[buySymbol];

            if (spendable > 0 && buyAddress) {
              swap = {
                amount: spendable.toString(),
                sellSymbol,
                buySymbol,
                chainId: detectedChainId,
                sellToken:
                  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                buyToken: buyAddress,
                sellDecimals: 18,
                buyDecimals: 18,
              };
            }
          }
        }
      }

      if (swap) {
        if (
          !isConnected ||
          !address ||
          walletReconnecting
        ) {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              text: walletReconnecting
                ? "Your wallet is reconnecting. Please wait a moment, then I can prepare that swap for you."
                : "Connect your wallet first, then I can prepare that swap for you.",
            },
          ]);

          return;
        }

        if (chainId !== swap.chainId) {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              text:
                `Your wallet is connected to the wrong network.\n\n` +
                `This swap requires BNB Chain.\n` +
                `Current network: ${
                  chainId === 1
                    ? "Ethereum"
                    : chainId === 8453
                      ? "Base"
                      : chainId === 137
                        ? "Polygon"
                        : chainId === 42161
                          ? "Arbitrum"
                          : chainId === 10
                            ? "Optimism"
                            : chainId === 56
                              ? "BNB Chain"
                              : `Chain ${chainId}`
                }\n\n` +
                `Switch networks and try again.`,
            },
          ]);

          return;
        }

        /*
         * CRITICAL SAFETY CHECK:
         *
         * Check the ACTUAL token being sold before asking 0x
         * for a quote. We do NOT use the native gas balance
         * when the user is selling an ERC-20 token.
         */
        const sellAsset =
          getSwapBalance(
            swap.chainId,
            swap.sellSymbol,
            swap.sellToken
          );

        if (!sellAsset) {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              text:
                `I couldn't read your ${swap.sellSymbol} balance on this network, so I won't create a swap transaction.`,
            },
          ]);

          return;
        }

        const availableAmount =
          cleanNumber(
            sellAsset.balance
          );

        const requestedAmountNumber =
          Number(swap.amount);

        if (
          !Number.isFinite(
            requestedAmountNumber
          )
        ) {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              text:
                "I couldn't understand the swap amount. Please enter a valid amount.",
            },
          ]);

          return;
        }

        if (
          availableAmount <
          requestedAmountNumber
        ) {
          const shortfall =
            requestedAmountNumber -
            availableAmount;

          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              text:
                `❌ Insufficient ${swap.sellSymbol} balance.\n\n` +
                `Requested: ${swap.amount} ${swap.sellSymbol}\n` +
                `Available: ${formatAmount(
                  sellAsset.balance
                )} ${swap.sellSymbol}\n` +
                `Shortfall: ${formatAmount(
                  shortfall.toString()
                )} ${swap.sellSymbol}\n\n` +
                `I have NOT requested a quote or created a transaction.`,
            },
          ]);

          return;
        }

        let requestedAmount: bigint;

        try {
          requestedAmount = parseUnits(
            swap.amount,
            swap.sellDecimals
          );
        } catch {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              text:
                "I couldn't understand the swap amount. Please enter a valid amount.",
            },
          ]);

          return;
        }

        const sellAmount =
          requestedAmount.toString();

        const response = await fetch(
          "/api/agent/swap",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              chainId: swap.chainId,
              sellToken:
                swap.sellToken,
              buyToken:
                swap.buyToken,
              sellAmount,
              taker: address,
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Agora couldn't get a swap quote."
          );
        }

        const quote = data.quote;

        if (!quote) {
          throw new Error(
            "Agora couldn't get a valid swap quote."
          );
        }

        /*
         * 0x can also report balance problems in the quote
         * response. Treat those as a hard stop.
         */
        if (
          quote.issues?.balance
        ) {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              text:
                `❌ The swap could not pass the wallet balance check.\n\n` +
                `Requested: ${swap.amount} ${swap.sellSymbol}\n` +
                `Available: ${formatAmount(
                  sellAsset.balance
                )} ${swap.sellSymbol}\n\n` +
                `No transaction was authorized.`,
            },
          ]);

          return;
        }

        const buyAmount =
          quote.buyAmount
            ? Number(
                quote.buyAmount
              ) /
              10 **
                swap.buyDecimals
            : 0;

        if (
          quote.transaction?.to &&
          quote.transaction?.data
        ) {
          setPendingTransaction({
            to: quote.transaction
              .to as `0x${string}`,
            data: quote.transaction
              .data as `0x${string}`,
            value: BigInt(
              quote.transaction
                .value || "0"
            ),
          });
        } else {
          throw new Error(
            "The swap quote did not contain a valid wallet transaction."
          );
        }

        const formattedBuyAmount =
          buyAmount.toLocaleString(
            undefined,
            {
              maximumFractionDigits: 6,
            }
          );

        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            text:
              `I found a live ${swap.sellSymbol} → ${swap.buySymbol} transaction.\n\n` +
              `Sell: ${swap.amount} ${swap.sellSymbol}\n` +
              `Available: ${formatAmount(
                sellAsset.balance
              )} ${swap.sellSymbol}\n` +
              `Estimated receive: ${formattedBuyAmount} ${swap.buySymbol}\n\n` +
              `Network: BNB Chain\n\n` +
              `The transaction is ready. I have NOT moved any funds or asked your wallet to approve anything.`,
          },
        ]);

        return;
      }

      const response = await fetch(
        "/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            message: text,
            history: messages,
            wallet:
              isConnected &&
              address &&
              !walletReconnecting
                ? {
                    connected: true,
                    address:
                      address || null,
                    chainId:
                      chainId || null,
                    balance:
                      walletBalance
                        ?.formatted ||
                      null,
                    symbol:
                      walletBalance?.symbol ||
                      null,
                    balances:
                      allWalletAssets,
                  }
                : null,
            imageData:
              imageToSend?.data ||
              null,
            imageMimeType:
              imageToSend?.mimeType ||
              null,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Agora couldn't process that request."
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            typeof data.response ===
            "string"
              ? data.response
              : "Agora couldn't generate a response.",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "Agora couldn't process that request.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="header-shell">
        <header className="topbar">
          <div className="topbar-left">
            <Link
              href="/"
              className="brand"
              onClick={saveCurrentChat}
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
          </div>

          <div className="header-actions">
            {walletReconnecting && (
              <div className="wallet-status">
                Reconnecting…
              </div>
            )}

            <div className="account-wrap">
              <button
                type="button"
                className="account-button"
                onClick={() =>
                  setAccountOpen(
                    (current) => !current
                  )
                }
                aria-expanded={accountOpen}
                aria-label="Open Agora account"
              >
                <span className="account-avatar">
                  {googleUser?.email?.[0]?.toUpperCase() ||
                    address?.[2]?.toUpperCase() ||
                    "A"}
                </span>

                <span className="account-label">
                  Account
                </span>
              </button>

              {accountOpen && (
                <div className="account-menu">
                  <div className="account-menu-title">
                    Agora Account
                  </div>

                  <div className="account-row">
                    <span>Google</span>
                    <strong>
                      {googleUser?.email ||
                        "Not connected"}
                    </strong>
                  </div>

                  <div className="account-row">
                    <span>Wallet</span>
                    <strong>
                      {address
                        ? `${address.slice(
                            0,
                            6
                          )}…${address.slice(-4)}`
                        : "Not connected"}
                    </strong>
                  </div>

                  <div className="account-divider" />

                  {googleUser && (
                    <button
                      type="button"
                      className="account-action"
                      onClick={() =>
                        void disconnectGoogle()
                      }
                    >
                      Disconnect Google
                    </button>
                  )}

                  {isConnected && (
                    <button
                      type="button"
                      className="account-action"
                      onClick={
                        disconnectWallet
                      }
                    >
                      Disconnect Wallet
                    </button>
                  )}

                  <button
                    type="button"
                    className="account-action account-lock"
                    onClick={() =>
                      void lockAgora()
                    }
                  >
                    Lock Agora
                  </button>
                </div>
              )}
            </div>

            <button
              className="theme-button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              type="button"
            >
              {theme === "light"
                ? "☾"
                : "☀"}
            </button>

            <div className="online">
              <span className="online-dot" />
              {walletReconnecting
                ? "Connecting..."
                : isConnected
                  ? chainId === 1
                    ? "Ethereum"
                    : chainId === 8453
                      ? "Base"
                      : chainId === 137
                        ? "Polygon"
                        : chainId ===
                            42161
                          ? "Arbitrum"
                          : chainId ===
                              10
                            ? "Optimism"
                            : chainId ===
                                56
                              ? "BNB Chain"
                              : `Chain ${chainId}`
                  : "Online"}
            </div>
          </div>
        </header>

        <div className="history-under-header">
          <Link
            href="/history"
            className="history-menu-button"
            onClick={saveCurrentChat}
            title="Chat History"
          >
            <span className="history-grid">
              <span />
              <span />
              <span />
              <span />
            </span>

            <span>
              History
            </span>
          </Link>
        </div>
      </div>

      <section className="chat-area">
        <div className="chat-inner">
          <div className="intro">
            <div className="intro-logo">
              A
            </div>

            <div>
              <h1>Agora</h1>
              <p>
                AI companion for Web3,
                crypto, and beyond.
              </p>
            </div>
          </div>

          <div className="messages">
            {messages.map(
              (message, index) => (
                <div
                  key={index}
                  className={
                    message.role ===
                    "user"
                      ? "message user-message"
                      : "message assistant-message"
                  }
                >
                  <div className="bubble">
                    {message.image && (
                      <img
                        src={
                          message.image
                        }
                        alt="Uploaded image"
                        className="message-image"
                      />
                    )}

                    <div>
                      {message.text}
                    </div>
                  </div>
                </div>
              )
            )}

            {pendingTransaction && (
              <div className="swap-authorization-card">
                <div className="swap-authorization-title">
                  Swap ready
                </div>

                <div className="swap-authorization-text">
                  Your swap quote is
                  ready. Review the
                  transaction and
                  authorize it with your
                  wallet.
                </div>

                <button
                  type="button"
                  className="swap-authorization-button"
                  onClick={
                    authorizeSwap
                  }
                  disabled={
                    transactionLoading
                  }
                >
                  {transactionLoading
                    ? "Waiting for Wallet..."
                    : "Authorize Swap"}
                </button>
              </div>
            )}

            {loading && (
              <div className="message assistant-message">
                <div className="bubble typing">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <form
        className="composer"
        onSubmit={sendMessage}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={
            handleImageChange
          }
          className="hidden-file-input"
        />

        {selectedImage && (
          <div className="attachment-preview">
            <img
              src={
                selectedImage.preview
              }
              alt="Selected image"
            />

            <button
              type="button"
              className="remove-image-button"
              onClick={
                removeSelectedImage
              }
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        )}

        <button
          type="button"
          className="attach-button"
          onClick={
            openImagePicker
          }
          disabled={loading}
          aria-label="Attach image"
          title="Attach image"
        >
          +
        </button>

        <input
          value={input}
          onChange={(event) =>
            setInput(
              event.target.value
            )
          }
          placeholder={
            selectedImage
              ? "Ask Agora about this image..."
              : "Ask Agora anything..."
          }
          disabled={loading}
        />

        <button
          type="submit"
          disabled={
            loading ||
            !input.trim()
          }
          aria-label="Send message"
        >
          <span className="send-icon" />
        </button>
      </form>

      <nav className="navigation">
        <Link
          href="/chat"
          className="nav-bubble active"
        >
          <span className="nav-icon chat-icon" />
          Chat
        </Link>

        <Link
          href="/swap"
          className="nav-bubble"
          onClick={
            saveCurrentChat
          }
        >
          <span className="nav-icon swap-icon" />
          Swap
        </Link>

        <Link
          href="/portfolio"
          className="nav-bubble"
          onClick={
            saveCurrentChat
          }
        >
          <span className="nav-icon portfolio-icon" />
          Portfolio
        </Link>

        <Link
          href="/tools"
          className="nav-bubble"
          onClick={
            saveCurrentChat
          }
        >
          <span className="nav-icon tools-icon" />
          Tools
        </Link>

        <Link
          href="/explore"
          className="nav-bubble"
          onClick={
            saveCurrentChat
          }
        >
          <span className="nav-icon explore-icon" />
          Explore
        </Link>
      </nav>

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

        .logo,
        .intro-logo {
          background: var(--yellow);
          color: #050505;
          display: grid;
          place-items: center;
          font-weight: 900;
        }

        .logo {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          font-size: 21px;
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

        .history-under-header {
          position: fixed !important;
          top: 72px !important;
          right: 28px !important;
          left: auto !important;
          width: auto !important;
          height: 38px !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          z-index: 50 !important;
          background: transparent !important;
        }

        .history-menu-button {
          position: relative !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          width: max-content !important;
          white-space: nowrap !important;
          margin: 0 !important;
          padding: 5px 8px !important;
          border-radius: 8px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
          transition:
            background 0.15s ease,
            color 0.15s ease,
            transform 0.15s ease;
        }

        .history-menu-button:hover {
          background: var(--surface-2);
          color: var(--text);
          transform: translateY(-1px);
        }

        .history-grid {
          width: 16px;
          height: 16px;
          display: grid;
          grid-template-columns: 6px 6px;
          grid-template-rows: 6px 6px;
          gap: 3px;
          flex-shrink: 0;
        }

        .history-grid span {
          display: block;
          width: 6px;
          height: 6px;
          border-radius: 2px;
          background: var(--yellow);
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

        .account-wrap {
          position: relative;
        }

        .account-button {
          min-height: 38px;
          padding: 4px 10px 4px 5px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--surface);
          color: var(--text);
          cursor: pointer;
          transition:
            background 0.15s ease,
            transform 0.15s ease,
            border-color 0.15s ease;
        }

        .account-button:hover {
          background: var(--yellow);
          color: #050505;
          border-color: var(--yellow);
          transform: translateY(-1px);
        }

        .account-avatar {
          width: 29px;
          height: 29px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--yellow);
          color: #050505;
          font-size: 12px;
          font-weight: 900;
        }

        .account-label {
          font-size: 11px;
          font-weight: 800;
        }

        .account-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          z-index: 100;
          width: 310px;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--surface);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.25);
        }

        .account-menu-title {
          margin-bottom: 14px;
          color: var(--text);
          font-size: 13px;
          font-weight: 900;
        }

        .account-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 10px 0;
        }

        .account-row span {
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .account-row strong {
          overflow: hidden;
          color: var(--text);
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .account-divider {
          height: 1px;
          margin: 8px 0;
          background: var(--border);
        }

        .account-action {
          width: 100%;
          min-height: 40px;
          margin-top: 7px;
          padding: 0 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--surface-2);
          color: var(--text);
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
          text-align: left;
          transition:
            background 0.15s ease,
            transform 0.15s ease;
        }

        .account-action:hover {
          background: var(--yellow);
          color: #050505;
          transform: translateY(-1px);
        }

        .account-lock {
          border-color: var(--yellow);
        }

        .wallet-status {
          min-height: 38px;
          display: flex;
          align-items: center;
          padding: 0 10px;
          border-radius: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
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

        .chat-area {
          position: absolute;
          top: 112px;
          bottom: 132px;
          left: 0;
          right: 0;
          overflow-y: auto;
          padding: 70px 14px 35px;
          background: var(--background);
        }

        .chat-inner {
          width: min(850px, 100%);
          margin: 0 auto;
        }

        .intro {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 32px;
        }

        .intro-logo {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          font-size: 22px;
        }

        .intro h1 {
          margin: 0;
          color: var(--text);
          font-size: 22px;
        }

        .intro p {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .messages {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-bottom: 190px;
        }

        .message {
          display: flex;
          width: 100%;
        }

        .assistant-message {
          justify-content: flex-start;
        }

        .user-message {
          justify-content: flex-end;
        }

        .bubble {
          max-width: 78%;
          padding: 14px 17px;
          border-radius: 18px;
          font-size: 15px;
          line-height: 1.55;
          white-space: pre-wrap;
          overflow: hidden;
        }

        .assistant-message .bubble {
          background: var(--surface);
          border: 1px solid var(--border);
          border-bottom-left-radius: 6px;
          color: var(--text);
        }

        .user-message .bubble {
          background: var(--yellow);
          color: #050505;
          border-bottom-right-radius: 6px;
          font-weight: 600;
        }

        .message-image {
          display: block;
          width: min(300px, 100%);
          max-height: 320px;
          object-fit: cover;
          border-radius: 13px;
          margin-bottom: 10px;
        }

        .typing {
          display: flex;
          align-items: center;
          gap: 5px;
          min-width: 55px;
        }

        .typing i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--yellow);
          animation: typing 1s infinite;
        }

        .typing i:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing i:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes typing {
          0%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }

          50% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }

        .composer {
          position: fixed;
          z-index: 30;
          left: 50%;
          bottom: 78px;
          transform: translateX(-50%);
          width: min(850px, calc(100% - 32px));
          min-height: 62px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 7px 6px 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
        }

        .hidden-file-input {
          display: none;
        }

        .attach-button {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          border: 1px solid var(--border) !important;
          border-radius: 13px !important;
          background: var(--surface-2) !important;
          color: var(--text) !important;
          font-size: 24px !important;
          line-height: 1;
          font-weight: 400 !important;
          cursor: pointer;
        }

        .attach-button:hover {
          background: var(--yellow) !important;
          color: #050505 !important;
        }

        .composer input {
          flex: 1;
          min-width: 0;
          height: 48px;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          font-size: 15px;
        }

        .composer input::placeholder {
          color: var(--muted);
          opacity: 1;
        }

        .composer > button:last-child {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border: 0;
          border-radius: 14px;
          background: var(--yellow);
          color: #050505;
          font-size: 20px;
          font-weight: 900;
          cursor: pointer;
        }

        .composer button:disabled {
          opacity: 0.45;
          cursor: default;
        }

        .send-icon {
          position: relative;
          display: inline-block;
          width: 18px;
          height: 18px;
        }

        .send-icon::before {
          content: "";
          position: absolute;
          width: 11px;
          height: 11px;
          left: 2px;
          top: 4px;
          border-top: 3px solid currentColor;
          border-right: 3px solid currentColor;
          transform: rotate(-45deg);
        }

        .send-icon::after {
          content: "";
          position: absolute;
          width: 15px;
          height: 3px;
          left: 1px;
          top: 8px;
          background: currentColor;
          border-radius: 2px;
          transform: rotate(-45deg);
        }

        .attachment-preview {
          position: relative;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
        }

        .attachment-preview img {
          width: 48px;
          height: 48px;
          display: block;
          object-fit: cover;
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .remove-image-button {
          position: absolute !important;
          top: -7px;
          right: -7px;
          width: 20px !important;
          height: 20px !important;
          min-width: 20px;
          padding: 0 !important;
          border: 2px solid var(--surface) !important;
          border-radius: 50% !important;
          background: var(--text) !important;
          color: var(--background) !important;
          font-size: 15px !important;
          line-height: 15px !important;
          cursor: pointer;
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

        .nav-bubble span {
          font-size: 16px;
        }

        .swap-authorization-card {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--surface);
        }

        .swap-authorization-title {
          color: var(--text);
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 7px;
        }

        .swap-authorization-text {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 14px;
        }

        .swap-authorization-button {
          width: 100%;
          min-height: 48px;
          border: 0;
          border-radius: 14px;
          background: var(--yellow);
          color: #050505;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .swap-authorization-button:disabled {
          opacity: 0.55;
          cursor: default;
        }

        @media (max-width: 600px) {
          .topbar {
            height: 68px;
            padding: 0 15px;
          }

          .brand-copy span {
            display: none;
          }

          .history-under-header {
            top: 68px !important;
            right: 15px !important;
            left: auto !important;
            height: 38px !important;
          }

          .chat-area {
            top: 106px;
            bottom: 132px;
            padding: 22px 14px 35px;
          }

          .intro {
            gap: 0;
            margin-bottom: 28px;
          }

          .intro-logo {
            display: none;
          }

          .intro h1 {
            font-size: 22px;
          }

          .intro p {
            margin-top: 5px;
            font-size: 13px;
          }

          .bubble {
            max-width: 90%;
          }

          .composer {
            width: calc(100% - 18px);
            bottom: 68px;
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

          .nav-bubble span {
            font-size: 15px;
          }

          .attachment-preview {
            width: 42px;
            height: 42px;
          }

          .attachment-preview img {
            width: 42px;
            height: 42px;
          }

          .attach-button {
            width: 42px;
            height: 42px;
          }

          .composer > button:last-child {
            width: 44px;
            height: 44px;
          }

          .account-label {
            display: none;
          }

          .account-button {
            width: 38px;
            height: 38px;
            padding: 4px;
            justify-content: center;
          }

          .account-menu {
            position: fixed;
            top: 78px;
            right: 12px;
            left: 12px;
            width: auto;
            max-width: none;
            border-radius: 20px;
          }

          .online {
            display: none;
          }

          .header-actions {
            gap: 7px;
          }
        }
      `}</style>
    </main>
  );
}




