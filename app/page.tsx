"use client";

import { FormEvent, useEffect, useState } from "react";

type Message = {
  role: "user" | "assistant";
  text: string;
};

const initialMessages: Message[] = [
  {
    role: "assistant",
    text: "Welcome to Agora. What would you like to build today?",
  },
];

function AgoraLogo() {
  return (
    <div className="logo-mark" aria-label="Agora">
      <svg viewBox="0 0 48 48" role="img">
        <path
          d="M24 4L44 42H35.5L30.8 32.7H17.2L12.5 42H4L24 4ZM24 17L20.7 25H27.3L24 17Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [active, setActive] = useState("Chat");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("agora-theme");

    if (savedTheme === "light") {
      setDarkMode(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("agora-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = input.trim();

    if (!text || loading) return;

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: data.response,
        },
      ]);
    } catch (error) {
      console.error(error);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "Something went wrong while connecting to Agora. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function quickPrompt(text: string) {
    setInput(text);
  }

  return (
    <main className={darkMode ? "app dark" : "app light"}>
      <aside className="sidebar">
        <div className="brand">
          <AgoraLogo />

          <div>
            <div className="brand-name">AGORA</div>
            <div className="brand-subtitle">Chat. Swap. Build.</div>
          </div>
        </div>

        <nav className="navigation">
          {[
            ["Chat", "◌"],
            ["Swap", "⇄"],
            ["Portfolio", "▣"],
            ["Tools", "⊞"],
            ["Explore", "◉"],
          ].map(([name, icon]) => (
            <button
              key={name}
              className={active === name ? "nav-item active" : "nav-item"}
              onClick={() => setActive(name)}
            >
              <span>{icon}</span>
              {name}
            </button>
          ))}
        </nav>

        <div className="recent">
          <div className="section-label">Recent Chats</div>

          <button onClick={() => quickPrompt("Swap 50 USDT to SOL")}>
            <span>▣</span>
            <div>
              <strong>Swap USDT to SOL</strong>
              <small>2 min ago</small>
            </div>
          </button>

          <button onClick={() => quickPrompt("What are the current crypto market trends?")}>
            <span>▣</span>
            <div>
              <strong>Current market trends</strong>
              <small>12 min ago</small>
            </div>
          </button>

          <button onClick={() => quickPrompt("What are the best DeFi platforms?")}>
            <span>▣</span>
            <div>
              <strong>Best DeFi platforms</strong>
              <small>28 min ago</small>
            </div>
          </button>
          <button onClick={() => quickPrompt("Help me build a simple dApp")}>
            <span>▣</span>
            <div>
              <strong>Build a simple dApp</strong>
              <small>1 hr ago</small>
            </div>
          </button>
        </div>

        <div className="profile">
          <div className="avatar">D</div>

          <div className="profile-info">
            <strong>Donjayy</strong>
            <span>Web3 Explorer</span>
          </div>

          <button className="settings">⚙</button>
        </div>

        <div className="online">
          <span></span>
          Online · Ready to help
        </div>
      </aside>

      <section className="chat-area">
        <header className="chat-header">
          <div>
            <h1>Good evening, Donjayy 👋</h1>
            <p>Your AI companion for Web3, crypto, and beyond.</p>
          </div>

          <button
            className="theme-toggle"
            onClick={() => setDarkMode((current) => !current)}
            aria-label="Toggle theme"
          >
            <span>☀</span>
            <span className={darkMode ? "selected" : ""}>☾</span>
          </button>
        </header>

        <div className="messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "message-row user-row"
                  : "message-row"
              }
            >
              {message.role === "assistant" && (
                <div className="message-logo">
                  <AgoraLogo />
                </div>
              )}

              <div
                className={
                  message.role === "user"
                    ? "message user-message"
                    : "message assistant-message"
                }
              >
                {message.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row">
              <div className="message-logo">
                <AgoraLogo />
              </div>

              <div className="message assistant-message typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>

        <div className="composer-area">
          <form className="composer" onSubmit={sendMessage}>
            <button
              type="button"
              className="plus-button"
              onClick={() => setInput("")}
            >
              +
            </button>

            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Agora anything..."
              disabled={loading}
            />

            <button
              className="send-button"
              type="submit"
              disabled={loading || !input.trim()}
            >
              ↗
            </button>
          </form>

          <div className="quick-actions">
            <button onClick={() => quickPrompt("Swap 50 USDT to SOL")}>
              ⇄ Swap assets
            </button>

            <button onClick={() => quickPrompt("Check the current price of SOL")}>
              ◈ Check prices
            </button>

            <button onClick={() => quickPrompt("Show me my portfolio")}>
              ▣ Show portfolio
            </button>

            <button onClick={() => quickPrompt("Explore DeFi opportunities")}>
              ◉ Explore DeFi
            </button>
          </div>
        </div>
      </section>

      <aside className="right-panel">
        <section className="card">
          <div className="card-title">
            <span>⇄</span>
            <strong>Quick Swap</strong>
            <button>⚙</button>
          </div>
          <div className="token-box">
            <small>From</small>
            <div className="token-line">
              <span className="token-icon green">₮</span>
              <strong>USDT</strong>
              <span className="amount">50</span>
            </div>
            <small>≈ $50.00</small>
          </div>

          <div className="swap-arrow">⇅</div>

          <div className="token-box">
            <small>To</small>
            <div className="token-line">
              <span className="token-icon purple">S</span>
              <strong>SOL</strong>
              <span className="amount">0.7224</span>
            </div>
            <small>≈ $49.87</small>
          </div>

          <button
            className="swap-button"
            onClick={() => quickPrompt("Swap 50 USDT to SOL")}
          >
            Swap Now
          </button>

          <p className="swap-note">
            Agora will always show the quote and fees before asking you to
            authorize a transaction.
          </p>
        </section>

        <section className="card">
          <div className="card-title">
            <span>▣</span>
            <strong>Your Portfolio</strong>
          </div>

          <div className="balance">
            <small>Total Balance</small>
            <div>
              $482.32 <span>+2.14% (24h)</span>
            </div>
          </div>

          <div className="asset">
            <span className="token-icon purple">S</span>
            <div>
              <strong>SOL</strong>
              <small>2.3412</small>
            </div>
            <b>+3.21%</b>
          </div>

          <div className="asset">
            <span className="token-icon green">₮</span>
            <div>
              <strong>USDT</strong>
              <small>289.45</small>
            </div>
            <b>+0.01%</b>
          </div>

          <div className="asset">
            <span className="token-icon orange">₿</span>
            <div>
              <strong>BTC</strong>
              <small>0.0156</small>
            </div>
            <b>+1.87%</b>
          </div>

          <button className="view-link">View portfolio →</button>
        </section>

        <section className="card">
          <div className="card-title">
            <span>◉</span>
            <strong>Tools</strong>
          </div>

          <button className="tool">◉ Create Token</button>
          <button className="tool">⌁ Find Opportunities</button>
          <button className="tool">⌁ Analyze Portfolio</button>
          <button className="tool">◈ Check Gas Fees</button>
        </section>

        <div className="tagline">
          <div>✧</div>
          <strong>Smarter moves.<br />Bigger opportunities.</strong>
          <span>Agora makes Web3 simple.</span>
        </div>
      </aside>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          font-family: Arial, Helvetica, sans-serif;
        }

        body {
          overflow: hidden;
        }

        button,
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .app {
          --yellow: #f5c400;
          --yellow-soft: rgba(245, 196, 0, 0.12);
          --bg: #050505;
          --panel: #0c0d0f;
          --panel-2: #111317;
          --border: #282b30;
          --text: #f5f5f5;
          --muted: #92969f;

          min-height: 100vh;
          height: 100vh;
          display: grid;
          grid-template-columns: 274px minmax(0, 1fr) 300px;
          background: var(--bg);
          color: var(--text);
          transition: 0.25s ease;
        }

        .app.light {
          --bg: #ffffff;
          --panel: #ffffff;
          --panel-2: #f7f7f7;
          --border: #dedede;
          --text: #111111;
          --muted: #6f7379;
        }
          .sidebar {
          border-right: 1px solid var(--border);
          padding: 25px 15px 18px;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: var(--bg);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 15px 25px;
        }

        .logo-mark {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          color: var(--text);
          flex: 0 0 auto;
        }

        .logo-mark svg {
          width: 100%;
          height: 100%;
        }

        .brand-name {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .brand-subtitle {
          margin-top: 3px;
          color: var(--muted);
          font-size: 11px;
        }

        .navigation {
          display: grid;
          gap: 5px;
        }

        .nav-item {
          border: 0;
          background: transparent;
          color: var(--text);
          text-align: left;
          padding: 12px 14px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 14px;
        }

        .nav-item span {
          width: 18px;
          font-size: 20px;
        }

        .nav-item:hover,
        .nav-item.active {
          background: var(--panel-2);
        }

        .recent {
          margin-top: 30px;
          border-top: 1px solid var(--border);
          padding-top: 20px;
        }

        .section-label {
          color: var(--muted);
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .recent button {
          width: 100%;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border: 0;
          background: transparent;
          color: var(--text);
          padding: 9px 4px;
          text-align: left;
        }

        .recent button > span {
          font-size: 15px;
        }

        .recent strong {
          display: block;
          font-size: 12px;
          font-weight: 500;
        }

        .recent small {
          display: block;
          color: var(--muted);
          font-size: 10px;
          margin-top: 3px;
        }

        .profile {
          margin-top: auto;
          border-top: 1px solid var(--border);
          padding-top: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          width: 35px;
          height: 35px;
          border-radius: 50%;
          background: var(--panel-2);
          border: 1px solid var(--border);
          display: grid;
          place-items: center;
          font-weight: 700;
        }

        .profile-info {
          flex: 1;
        }

        .profile-info strong,
        .profile-info span {
          display: block;
        }

        .profile-info strong {
          font-size: 12px;
        }

        .profile-info span {
          color: var(--muted);
          font-size: 10px;
          margin-top: 3px;
        }

        .settings {
          border: 0;
          background: transparent;
          color: var(--muted);
        }

        .online {
          margin-top: 9px;
          color: var(--muted);
          font-size: 10px;
          padding-left: 45px;
        }

        .online span {
          width: 7px;
          height: 7px;
          display: inline-block;
          border-radius: 50%;
          background: #23e57a;
          margin-right: 5px;
        }

        .chat-area {
          min-width: 0;
          display: flex;
          flex-direction: column;
          background: var(--bg);
        }

        .chat-header {
          min-height: 108px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 35px;
        }
          .chat-header h1 {
          margin: 0;
          font-size: 24px;
        }

        .chat-header p {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .theme-toggle {
          border: 1px solid var(--border);
          background: var(--panel-2);
          color: var(--text);
          border-radius: 22px;
          padding: 7px 11px;
          display: flex;
          gap: 8px;
        }

        .theme-toggle .selected {
          color: var(--yellow);
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 25px 35px 15px;
        }

        .message-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .user-row {
          justify-content: flex-end;
        }

        .message-logo {
          width: 38px;
          height: 38px;
          border: 1px solid var(--border);
          border-radius: 50%;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .message-logo .logo-mark {
          width: 23px;
          height: 23px;
        }

        .message {
          max-width: min(720px, 78%);
          padding: 15px 18px;
          border: 1px solid var(--border);
          border-radius: 15px;
          line-height: 1.55;
          font-size: 14px;
          white-space: pre-wrap;
        }

        .assistant-message {
          background: var(--panel);
        }

        .user-message {
          background: var(--panel-2);
        }

        .typing {
          display: flex;
          gap: 4px;
          padding: 19px;
        }

        .typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--muted);
          animation: bounce 1s infinite alternate;
        }

        .typing span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes bounce {
          to {
            transform: translateY(-5px);
            opacity: 0.45;
          }
        }

        .composer-area {
          padding: 10px 35px 25px;
        }

        .composer {
          height: 55px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--panel);
          display: flex;
          align-items: center;
          padding: 6px;
        }

        .composer input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          padding: 0 10px;
        }

        .composer input::placeholder {
          color: var(--muted);
        }

        .plus-button,
        .send-button {
          width: 41px;
          height: 41px;
          border: 0;
          border-radius: 50%;
          display: grid;
          place-items: center;
        }

        .plus-button {
          background: transparent;
          color: var(--muted);
          font-size: 24px;
        }

        .send-button {
          background: var(--text);
          color: var(--bg);
          font-size: 18px;
        }

        .send-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .quick-actions {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-top: 10px;
        }

        .quick-actions button {
          white-space: nowrap;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: var(--panel);
          color: var(--muted);
          padding: 8px 12px;
          font-size: 11px;
        }

        .quick-actions button:hover {
          color: var(--text);
          border-color: var(--yellow);
        }

        .right-panel {
          border-left: 1px solid var(--border);
          padding: 25px 15px;
          overflow-y: auto;
          background: var(--bg);
          /* AGORA THEME OVERRIDES */

.page {
  background: var(--background) !important;
  color: var(--text);
}

.topbar {
  background: var(--background) !important;
  border-bottom: 1px solid var(--border) !important;
}

.chat-area {
  background: var(--background);
}

.intro p {
  color: var(--muted) !important;
}

.assistant-message .bubble {
  background: var(--surface) !important;
  border-color: var(--border) !important;
  color: var(--text) !important;
}

.composer {
  background: var(--surface) !important;
  border-color: var(--border) !important;
}

.composer input {
  color: var(--text) !important;
}

.composer input::placeholder {
  color: var(--muted) !important;
}

.navigation {
  background: var(--surface) !important;
  border-color: var(--border) !important;
}

.nav-bubble {
  color: var(--muted) !important;
}

.nav-bubble:hover {
  background: var(--surface-2) !important;
  color: var(--text) !important;
}

.nav-bubble.active {
  background: var(--yellow) !important;
  color: #050505 !important;
}

.theme-button {
  background: var(--surface) !important;
  border-color: var(--border) !important;
  color: var(--text) !important;
}

.online {
  color: var(--muted) !important;
}

.brand span {
  color: var(--muted) !important;
}

:root[data-theme="light"] .page {
  background: #ffffff !important;
}

:root[data-theme="light"] .topbar {
  background: #ffffff !important;
}

:root[data-theme="light"] .composer {
  background: #ffffff !important;
}

:root[data-theme="light"] .navigation {
  background: #ffffff !important;
}

:root[data-theme="light"] .assistant-message .bubble {
  background: #f7f7f7 !important;
  color: #111111 !important;
}
          `}</style>
    </main>
  );
}
