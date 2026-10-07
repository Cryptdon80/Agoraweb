"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { parseUnits } from "viem";
import {
  useAccount,
  useChainId,
  useBalance,
  useSendTransaction,
} from "wagmi";
import { parseAgentSwap } from "../lib/agent-swap";
import { useChat } from "../lib/chat-context";
import { saveChatHistory } from "../lib/chat-history";

type Theme = "light" | "dark";

export default function ChatPage() {
  const [theme, setTheme] = useState<Theme>("light");

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { sendTransactionAsync } = useSendTransaction();

  const { data: walletBalance } = useBalance({
    address,
    chainId,
    query: {
      enabled: Boolean(address),
    },
  });

  const { messages, setMessages } = useChat();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedImage, setSelectedImage] = useState<{
    preview: string;
    data: string;
    mimeType: string;
    name: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pendingTransaction, setPendingTransaction] =
    useState<{
      to: `0x${string}`;
      data: `0x${string}`;
      value: bigint;
    } | null>(null);

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
    if (loading) return;

    fileInputRef.current?.click();
  }

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

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

  async function authorizeSwap() {
    if (!pendingTransaction || !isConnected) return;

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

    if (!text || loading) return;

    const imageToSend = selectedImage;

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
      const swap = imageToSend
        ? null
        : parseAgentSwap(text);

      if (swap) {
        if (!isConnected || !address) {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              text:
                "Connect your wallet first, then I can prepare that swap for you.",
            },
          ]);

          return;
        }

        if (!walletBalance) {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              text:
                "I couldn't read your wallet balance yet. Please wait a moment and try again.",
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
                "Your wallet is connected, but it is currently on the wrong network. " +
                "Switch to BNB Chain and try the swap again.",
            },
          ]);

          return;
        }

        const balanceFormatted =
          walletBalance.formatted;

        const balanceSymbol =
          walletBalance.symbol;

        const requestedAmount = parseUnits(
          swap.amount,
          swap.sellDecimals
        );

        if (
          requestedAmount >
          walletBalance.value
        ) {
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              text:
                `Insufficient ${balanceSymbol} balance.\n\n` +
                `Wallet balance: ${balanceFormatted} ${balanceSymbol}\n` +
                `Requested: ${swap.amount} ${swap.sellSymbol}\n\n` +
                `You need more ${balanceSymbol} before I can prepare this swap.`,
            },
          ]);

          return;
        }

        const sellAmount = parseUnits(
          swap.amount,
          swap.sellDecimals
        ).toString();

        const response = await fetch(
          "/api/agent/swap",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chainId: swap.chainId,
              sellToken: swap.sellToken,
              buyToken: swap.buyToken,
              sellAmount,
              taker: address,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Agora couldn't get a swap quote."
          );
        }

        const quote = data.quote;

        const buyAmount = quote.buyAmount
          ? Number(quote.buyAmount) /
            10 ** swap.buyDecimals
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
              quote.transaction.value || "0"
            ),
          });
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
              `I found a live BNB → USDC quote.\n\n` +
              `Wallet balance: ${balanceFormatted} ${balanceSymbol}\n` +
              `Sell: ${swap.amount} BNB\n` +
              `Estimated receive: ${formattedBuyAmount} USDC\n\n` +
              `Network: BNB Chain\n\n` +
              `The quote is ready. I have NOT moved any funds or asked your wallet to approve anything.`,
          },
        ]);

        return;
      }

      const response = await fetch(
        "/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: text,
            history: messages,
            wallet:
              isConnected && walletBalance
                ? {
                    address,
                    chainId,
                    balance:
                      walletBalance.formatted,
                    symbol:
                      walletBalance.symbol,
                  }
                : null,
            imageData:
              imageToSend?.data || null,
            imageMimeType:
              imageToSend?.mimeType || null,
          }),
        }
      );

      const data = await response.json();

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
          text: data.response,
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
              <div className="logo">A</div>

              <div className="brand-copy">
                <strong>AGORA</strong>
                <span>AI & Web3 Agent</span>
              </div>
            </Link>
          </div>

          <div className="header-actions">
            <button
              className="theme-button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              type="button"
            >
              {theme === "light" ? "☾" : "☀"}
            </button>

            <div className="online">
              <span className="online-dot" />
              Online
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

            <span>History</span>
          </Link>
        </div>
      </div>

      <section className="chat-area">
        <div className="chat-inner">
          <div className="intro">
            <div className="intro-logo">A</div>

            <div>
              <h1>Agora</h1>
              <p>
                AI companion for Web3, crypto, and
                beyond.
              </p>
            </div>
          </div>

          <div className="messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "message user-message"
                    : "message assistant-message"
                }
              >
                <div className="bubble">
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Uploaded image"
                      className="message-image"
                    />
                  )}

                  <div>{message.text}</div>
                </div>
              </div>
            ))}

            {pendingTransaction && (
              <div className="swap-authorization-card">
                <div className="swap-authorization-title">
                  Swap ready
                </div>

                <div className="swap-authorization-text">
                  Your swap quote is ready. Review
                  the transaction and authorize it
                  with your wallet.
                </div>

                <button
                  type="button"
                  className="swap-authorization-button"
                  onClick={authorizeSwap}
                  disabled={transactionLoading}
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
          onChange={handleImageChange}
          className="hidden-file-input"
        />

        {selectedImage && (
          <div className="attachment-preview">
            <img
              src={selectedImage.preview}
              alt="Selected image"
            />

            <button
              type="button"
              className="remove-image-button"
              onClick={removeSelectedImage}
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        )}

        <button
          type="button"
          className="attach-button"
          onClick={openImagePicker}
          disabled={loading}
          aria-label="Attach image"
          title="Attach image"
        >
          +
        </button>

        <input
          value={input}
          onChange={(event) =>
            setInput(event.target.value)
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
            loading || !input.trim()
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
          onClick={saveCurrentChat}
        >
          <span className="nav-icon swap-icon" />
          Swap
        </Link>

        <Link
          href="/portfolio"
          className="nav-bubble"
          onClick={saveCurrentChat}
        >
          <span className="nav-icon portfolio-icon" />
          Portfolio
        </Link>

        <Link
          href="/tools"
          className="nav-bubble"
          onClick={saveCurrentChat}
        >
          <span className="nav-icon tools-icon" />
          Tools
        </Link>

        <Link
          href="/explore"
          className="nav-bubble"
          onClick={saveCurrentChat}
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
        }
      `}</style>
    </main>
  );
}