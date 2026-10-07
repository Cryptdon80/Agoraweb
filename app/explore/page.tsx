"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

type AgentId =
  | "research"
  | "code"
  | "market"
  | "content";

type Agent = {
  id: AgentId;
  icon: string;
  title: string;
  description: string;
  tags: string[];
};

type MarketCoin = {
  name: string;
  symbol: string;
  price: number;
  change24h: number | null;
};

type MarketStats = {
  marketCap: number;
  volume: number;
  btcDominance: number;
  activeCryptos: number;
};

const agents: Agent[] = [
  {
    id: "research",
    icon: "⌕",
    title: "Research Agent",
    description:
      "Research Web3, crypto, AI, blockchain projects, protocols and technology.",
    tags: ["Research", "Web3"],
  },
  {
    id: "code",
    icon: "</>",
    title: "Code Assistant",
    description:
      "Build and debug websites, apps, APIs, smart contracts and software.",
    tags: ["Developer", "Code"],
  },
  {
    id: "market",
    icon: "↗",
    title: "Market Analyst",
    description:
      "See today's broader crypto market and understand the conditions traders are watching.",
    tags: ["Live Market", "Analysis"],
  },
  {
    id: "content",
    icon: "✎",
    title: "Content Creator",
    description:
      "Create posts, threads, articles, captions and marketing content.",
    tags: ["Writing", "Social"],
  },
];

const tools = [
  {
    icon: "◈",
    title: "Token Scanner",
    description:
      "Inspect token information across supported networks.",
    href: "/tools",
  },
  {
    icon: "⌕",
    title: "Address Explorer",
    description:
      "Explore wallet activity, balances and transactions.",
    href: "/tools",
  },
  {
    icon: "◇",
    title: "Risk Scanner",
    description:
      "Check token verification and available liquidity signals.",
    href: "/tools",
  },
  {
    icon: "⛽",
    title: "Gas Tracker",
    description:
      "Check current gas conditions across supported networks.",
    href: "/tools",
  },
  {
    icon: "▣",
    title: "Transaction Decoder",
    description:
      "Understand what a transaction is trying to execute.",
    href: "/tools",
  },
  {
    icon: "✓",
    title: "Approval Manager",
    description:
      "Inspect token approvals connected to your wallet.",
    href: "/tools",
  },
  {
    icon: "▥",
    title: "Portfolio Analytics",
    description:
      "Analyze the assets in your connected wallet.",
    href: "/portfolio",
  },
];

function formatMoney(value: number) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }

  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1) {
    return `$${value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;
  }

  return `$${value.toFixed(6)}`;
}

function formatPercent(value: number | null) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(
    2
  )}%`;
}

export default function ExplorePage() {
  const [theme, setTheme] =
    useState<Theme>("dark");

  const [activeAgent, setActiveAgent] =
    useState<AgentId | null>(null);

  const [message, setMessage] =
    useState("");

  const [response, setResponse] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [marketLoading, setMarketLoading] =
    useState(false);

  const [marketError, setMarketError] =
    useState("");

  const [marketStats, setMarketStats] =
    useState<MarketStats | null>(null);

  const [marketCoins, setMarketCoins] =
    useState<MarketCoin[]>([]);

  const [marketAnalysis, setMarketAnalysis] =
    useState("");

  const selectedAgent =
    agents.find(
      (agent) => agent.id === activeAgent
    ) ?? null;

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        "agora-theme"
      );

    if (
      saved === "light" ||
      saved === "dark"
    ) {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "agora-theme",
      theme
    );
  }, [theme]);

  useEffect(() => {
    if (activeAgent !== "market") {
      return;
    }

    let cancelled = false;

    async function loadMarket() {
      setMarketLoading(true);
      setMarketError("");

      try {
        const res = await fetch(
          "/api/explore",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              mode: "market",
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
              "Unable to load market data."
          );
        }

        if (cancelled) {
          return;
        }

        setMarketStats(
          data.stats ?? null
        );

        setMarketCoins(
          Array.isArray(data.coins)
            ? data.coins
            : []
        );

        setMarketAnalysis(
          data.analysis || ""
        );
      } catch (err) {
        if (!cancelled) {
          setMarketError(
            err instanceof Error
              ? err.message
              : "Unable to load market data."
          );
        }
      } finally {
        if (!cancelled) {
          setMarketLoading(false);
        }
      }
    }

    loadMarket();

    const timer =
      window.setInterval(
        loadMarket,
        60_000
      );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeAgent]);

  function openAgent(id: AgentId) {
    setActiveAgent(id);
    setMessage("");
    setResponse("");
    setError("");
    setMarketError("");
  }

  function closeAgent() {
    setActiveAgent(null);
    setMessage("");
    setResponse("");
    setError("");
    setMarketError("");
  }

  async function runTextAgent() {
    if (
      !activeAgent ||
      activeAgent === "market"
    ) {
      return;
    }

    const trimmed =
      message.trim();

    if (!trimmed) {
      return;
    }

    setLoading(true);
    setError("");
    setResponse("");

    try {
      const res = await fetch(
        "/api/explore",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            mode: activeAgent,
            message: trimmed,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "The agent could not respond."
        );
      }

      setResponse(
        data.response || ""
      );
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

  return (
    <main
      className={`page ${theme}`}
    >
      <header className="topbar">
        <Link
          href="/"
          className="brand"
        >
          <div className="logo">
            A
          </div>

          <div className="brand-text">
            <strong>AGORA</strong>

            <span>
              AI & Web3 Agent
            </span>
          </div>
        </Link>

        <div className="header-right">
          <button
            type="button"
            className="theme-toggle"
            onClick={() =>
              setTheme(
                theme === "dark"
                  ? "light"
                  : "dark"
              )
            }
          >
            {theme === "dark"
              ? "☀"
              : "☾"}
          </button>

          <div className="online-pill">
            <span />
            Online
          </div>
        </div>
      </header>

      <div className="content">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              EXPLORE AGORA
            </span>

            <h1>
              Discover{" "}
              <b>Agora.</b>
              <br />
              Find the right agent.
            </h1>

            <p>
              Specialized AI agents and
              Web3 tools for research,
              creation, development,
              market analysis and content.
            </p>

            <div className="hero-search">
              <span>⌕</span>

              <span>
                Explore agents, tools and
                experiences...
              </span>

              <b>→</b>
            </div>
          </div>

          <div className="hero-visual">
            <div className="orbit orbit-a" />
            <div className="orbit orbit-b" />

            <div className="hero-a">
              A
            </div>

            <div className="float float-a">
              ✦
            </div>

            <div className="float float-b">
              ↗
            </div>

            <div className="float float-c">
              ⌕
            </div>

            <div className="float float-d">
              &lt;/&gt;
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">
                SPECIALIZED AI
              </span>

              <h2>
                Featured Agents
              </h2>

              <p>
                Every agent has a specific
                job.
              </p>
            </div>

            <span className="count">
              4 AGENTS
            </span>
          </div>

          <div className="agent-grid">
            {agents.map((agent) => (
              <button
                type="button"
                className="agent-card"
                key={agent.id}
                onClick={() =>
                  openAgent(agent.id)
                }
              >
                <div className="agent-top">
                  <div className="agent-icon">
                    {agent.icon}
                  </div>

                  <span className="agent-status">
                    <i />
                    Online
                  </span>
                </div>

                <h3>
                  {agent.title}
                </h3>

                <p>
                  {agent.description}
                </p>

                <div className="tags">
                  {agent.tags.map(
                    (tag) => (
                      <span key={tag}>
                        {tag}
                      </span>
                    )
                  )}
                </div>

                <div className="agent-open">
                  Open Agent
                  <b>→</b>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">
                WEB3 UTILITIES
              </span>

              <h2>
                Agora Tools
              </h2>

              <p>
                Real tools connected to
                the Agora ecosystem.
              </p>
            </div>

            <Link
              href="/tools"
              className="outline-button"
            >
              All Tools →
            </Link>
          </div>

          <div className="tool-grid">
            {tools.map((tool) => (
              <Link
                href={tool.href}
                key={tool.title}
                className="tool-card"
              >
                <div className="tool-icon">
                  {tool.icon}
                </div>

                <h3>
                  {tool.title}
                </h3>

                <p>
                  {tool.description}
                </p>

                <span>
                  Open →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="community">
          <div>
            <span className="eyebrow">
              COMMUNITY
            </span>

            <h2>
              Stay connected to Agora.
            </h2>

            <p>
              Follow updates and connect
              with the Agora community.
            </p>
          </div>

          <div className="community-actions">
            <a
              href="https://x.com/Agoraweb_"
              target="_blank"
              rel="noreferrer"
              className="community-button"
            >
              <strong>𝕏</strong>

              <span>
                <b>X</b>

                <small>
                  @Agoraweb_
                </small>
              </span>

              <em>→</em>
            </a>

            <a
              href="https://discord.com/users/crypt_don"
              target="_blank"
              rel="noreferrer"
              className="community-button"
            >
              <strong>◉</strong>

              <span>
                <b>Discord</b>

                <small>
                  crypt_don
                </small>
              </span>

              <em>→</em>
            </a>
          </div>
        </section>

        <section className="build-banner">
          <div>
            <span className="eyebrow">
              THE AGORA VISION
            </span>

            <h2>
              Chat. Swap. Build.
              Explore.
            </h2>

            <p>
              One workspace connecting
              AI agents, Web3 tools and
              your wallet.
            </p>
          </div>

          <Link
            href="/chat"
            className="primary-button"
          >
            Start Building →
          </Link>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">
                ROADMAP
              </span>

              <h2>
                Coming Soon
              </h2>

              <p>
                More Agora experiences are
                being built.
              </p>
            </div>
          </div>

          <div className="coming-grid">
            <div className="coming-card">
              <span>01</span>

              <h3>
                Agent Marketplace
              </h3>

              <p>
                Discover specialized
                community-built agents.
              </p>

              <small>
                COMING SOON
              </small>
            </div>

            <div className="coming-card">
              <span>02</span>

              <h3>
                More Networks
              </h3>

              <p>
                Expand Agora's multi-chain
                coverage.
              </p>

              <small>
                COMING SOON
              </small>
            </div>

            <div className="coming-card">
              <span>03</span>

              <h3>
                Agent Creation
              </h3>

              <p>
                Build specialized agents
                inside Agora.
              </p>

              <small>
                COMING SOON
              </small>
            </div>

            <div className="coming-card">
              <span>04</span>

              <h3>
                Developer Platform
              </h3>

              <p>
                Connect your own tools and
                agents.
              </p>

              <small>
                COMING SOON
              </small>
            </div>
          </div>
        </section>
      </div>

      <nav className="bottom-nav">
        <Link href="/chat">
          <span>◌</span>
          Chat
        </Link>

        <Link href="/swap">
          <span>⇄</span>
          Swap
        </Link>

        <Link href="/portfolio">
          <span>▣</span>
          Portfolio
        </Link>

        <Link href="/tools">
          <span>⊞</span>
          Tools
        </Link>

        <Link
          href="/explore"
          className="active"
        >
          <span>◉</span>
          Explore
        </Link>
      </nav>

      {selectedAgent && (
        <div className="modal-overlay">
          <div className="modal">
            <button
              type="button"
              className="close-button"
              onClick={closeAgent}
            >
              ×
            </button>

            <div className="modal-icon">
              {selectedAgent.icon}
            </div>

            <span className="eyebrow">
              AGORA AGENT
            </span>

            <h2>
              {selectedAgent.title}
            </h2>

            <p className="modal-description">
              {selectedAgent.description}
            </p>

            {selectedAgent.id ===
              "market" && (
              <div className="market-panel">
                {marketLoading && (
                  <div className="loading">
                    Loading today's
                    cryptocurrency market...
                  </div>
                )}

                {marketError && (
                  <div className="error">
                    {marketError}
                  </div>
                )}

                {marketStats && (
                  <>
                    <div className="market-stats">
                      <div>
                        <span>
                          Market Cap
                        </span>

                        <strong>
                          {formatMoney(
                            marketStats.marketCap
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          24h Volume
                        </span>

                        <strong>
                          {formatMoney(
                            marketStats.volume
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          BTC Dominance
                        </span>

                        <strong>
                          {marketStats.btcDominance.toFixed(
                            2
                          )}
                          %
                        </strong>
                      </div>

                      <div>
                        <span>
                          Active Assets
                        </span>

                        <strong>
                          {marketStats.activeCryptos.toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    <div className="market-list">
                      {marketCoins.map(
                        (coin) => (
                          <div
                            className="market-row"
                            key={
                              coin.symbol
                            }
                          >
                            <div>
                              <strong>
                                {
                                  coin.name
                                }
                              </strong>

                              <small>
                                {
                                  coin.symbol
                                }
                              </small>
                            </div>

                            <strong>
                              {formatMoney(
                                coin.price
                              )}
                            </strong>

                            <span
                              className={
                                coin.change24h !==
                                  null &&
                                coin.change24h >=
                                  0
                                  ? "green"
                                  : "red"
                              }
                            >
                              {formatPercent(
                                coin.change24h
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    <div className="analysis">
                      <span>
                        AGORA MARKET VIEW
                      </span>

                      <p>
                        {marketAnalysis ||
                          "Analysis is loading..."}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {selectedAgent.id !==
              "market" && (
              <div className="text-agent">
                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target.value
                    )
                  }
                  placeholder={
                    selectedAgent.id ===
                    "research"
                      ? "Ask about a Web3 project, protocol, AI technology or crypto topic..."
                      : selectedAgent.id ===
                          "code"
                        ? "Ask about code, bugs, APIs, websites, apps or development..."
                        : "Tell me what content you want to create..."
                  }
                />

                {error && (
                  <div className="error">
                    {error}
                  </div>
                )}

                {response && (
                  <div className="response">
                    {response}
                  </div>
                )}

                <button
                  type="button"
                  className="primary-button full"
                  onClick={
                    runTextAgent
                  }
                  disabled={
                    loading ||
                    !message.trim()
                  }
                >
                  {loading
                    ? "Working..."
                    : "Ask Agent →"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          --yellow: #f5c400;
          --bg: #050505;
          --surface: #111214;
          --surface2: #191a1c;
          --border: #292929;
          --text: #ffffff;
          --muted: #969696;

          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          padding-bottom: 105px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .page.light {
          --bg: #ffffff;
          --surface: #f7f7f7;
          --surface2: #eeeeee;
          --border: #dddddd;
          --text: #111111;
          --muted: #666666;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          border-bottom: 1px solid var(--border);
          background: var(--bg);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text);
          text-decoration: none;
        }

        .logo {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: var(--yellow);
          color: #050505;
          font-size: 22px;
          font-weight: 1000;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-text strong {
          font-size: 17px;
        }

        .brand-text span {
          margin-top: 2px;
          color: var(--muted);
          font-size: 10px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .theme-toggle {
          width: 39px;
          height: 39px;
          border: 1px solid var(--border);
          border-radius: 50%;
          background: var(--surface);
          color: var(--text);
          cursor: pointer;
        }

        .online-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 13px;
          border: 1px solid var(--border);
          border-radius: 999px;
          color: var(--muted);
          font-size: 11px;
        }

        .online-pill span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #31d67a;
        }

        .content {
          width: min(1160px, calc(100% - 30px));
          margin: auto;
        }

        .hero {
          min-height: 390px;
          display: grid;
          grid-template-columns: 1fr 0.8fr;
          align-items: center;
          gap: 30px;
          border-bottom: 1px solid var(--border);
        }

        .eyebrow {
          color: var(--yellow);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .16em;
        }

        .hero h1 {
          margin: 13px 0;
          font-size: clamp(40px, 6vw, 68px);
          line-height: .96;
          letter-spacing: -.05em;
        }

        .hero h1 b {
          color: var(--yellow);
        }

        .hero-copy > p {
          max-width: 600px;
          margin: 0 0 24px;
          color: var(--muted);
          line-height: 1.6;
          font-size: 14px;
        }

        .hero-search {
          width: min(550px, 100%);
          height: 53px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 11px 0 17px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--surface);
          color: var(--muted);
          font-size: 12px;
        }

        .hero-search > span:first-child {
          color: var(--yellow);
          font-size: 23px;
        }

        .hero-search > span:nth-child(2) {
          flex: 1;
        }

        .hero-search b {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: var(--yellow);
          color: #050505;
        }

        .hero-visual {
          position: relative;
          min-height: 310px;
          display: grid;
          place-items: center;
        }

        .hero-a {
          width: 140px;
          height: 140px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(245,196,0,.4);
          border-radius: 34px;
          background: var(--surface);
          color: var(--yellow);
          font-size: 80px;
          font-weight: 1000;
          box-shadow: 0 0 70px rgba(245,196,0,.13);
          z-index: 2;
        }

        .orbit {
          position: absolute;
          width: 340px;
          height: 150px;
          border: 1px solid rgba(245,196,0,.28);
          border-radius: 50%;
        }

        .orbit-a {
          transform: rotate(-20deg);
        }

        .orbit-b {
          transform: rotate(35deg);
          opacity: .55;
        }

        .float {
          position: absolute;
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          border-radius: 15px;
          background: var(--surface2);
          color: var(--yellow);
          font-weight: 900;
          z-index: 3;
        }

        .float-a {
          top: 30px;
          left: 22%;
        }

        .float-b {
          top: 34px;
          right: 16%;
        }

        .float-c {
          bottom: 35px;
          left: 27%;
        }

        .float-d {
          bottom: 30px;
          right: 22%;
        }

        .section {
          padding: 40px 0 5px;
        }

        .section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 17px;
        }

        .section-head h2 {
          margin: 7px 0 4px;
          font-size: 23px;
        }

        .section-head p {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
        }

        .count {
          color: var(--yellow);
          font-size: 10px;
          font-weight: 900;
        }

        .agent-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .agent-card {
          min-height: 255px;
          padding: 17px;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: var(--surface);
          color: var(--text);
          text-align: left;
          cursor: pointer;
          transition: .18s ease;
        }

        .agent-card:hover {
          transform: translateY(-5px);
          border-color: rgba(245,196,0,.55);
        }

        .agent-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .agent-icon,
        .tool-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(245,196,0,.32);
          border-radius: 13px;
          background: var(--surface2);
          color: var(--yellow);
          font-weight: 900;
        }

        .agent-status {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--muted);
          font-size: 9px;
        }

        .agent-status i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #31d67a;
        }

        .agent-card h3,
        .tool-card h3 {
          margin: 17px 0 7px;
          font-size: 16px;
        }

        .agent-card p,
        .tool-card p {
          min-height: 60px;
          margin: 0;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.55;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin: 12px 0;
        }

        .tags span {
          padding: 5px 8px;
          border-radius: 999px;
          background: var(--surface2);
          color: var(--muted);
          font-size: 8px;
        }

        .agent-open,
        .tool-card > span {
          color: var(--yellow);
          font-size: 11px;
          font-weight: 900;
        }

        .agent-open {
          display: flex;
          justify-content: space-between;
        }

        .outline-button {
          padding: 9px 14px;
          border: 1px solid var(--yellow);
          border-radius: 999px;
          color: var(--yellow);
          text-decoration: none;
          font-size: 10px;
          font-weight: 900;
        }

        .tool-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .tool-card {
          padding: 17px;
          border: 1px solid var(--border);
          border-radius: 19px;
          background: var(--surface);
          color: var(--text);
          text-decoration: none;
          transition: .18s ease;
        }

        .tool-card:hover {
          transform: translateY(-4px);
          border-color: rgba(245,196,0,.4);
        }

        .tool-card p {
          min-height: 43px;
          margin-bottom: 12px;
        }

        .community {
          margin-top: 40px;
          padding: 28px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 25px;
          border: 1px solid var(--border);
          border-radius: 23px;
          background: var(--surface);
        }

        .community h2 {
          margin: 8px 0;
          font-size: 27px;
        }

        .community p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }

        .community-actions {
          display: grid;
          gap: 10px;
        }

        .community-button {
          min-height: 68px;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 12px 15px;
          border: 1px solid var(--border);
          border-radius: 17px;
          background: var(--surface2);
          color: var(--text);
          text-decoration: none;
          cursor: pointer;
          text-align: left;
        }

        .community-button > strong {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: var(--yellow);
          color: #050505;
        }

        .community-button span {
          flex: 1;
        }

        .community-button b,
        .community-button small {
          display: block;
        }

        .community-button small {
          margin-top: 3px;
          color: var(--muted);
          font-size: 10px;
        }

        .community-button em {
          color: var(--yellow);
          font-size: 10px;
          font-style: normal;
          font-weight: 900;
        }

        .build-banner {
          margin-top: 40px;
          padding: 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-radius: 23px;
          background: var(--yellow);
          color: #050505;
        }

        .build-banner h2 {
          margin: 8px 0;
          font-size: 27px;
        }

        .build-banner p {
          margin: 0;
          opacity: .7;
          font-size: 13px;
        }

        .primary-button {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border: 0;
          border-radius: 999px;
          background: #050505;
          color: white;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
        }

        .primary-button.full {
          width: 100%;
          margin-top: 12px;
        }

        .coming-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .coming-card {
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 19px;
          background: var(--surface);
        }

        .coming-card > span {
          color: var(--yellow);
          font-size: 10px;
        }

        .coming-card h3 {
          margin: 14px 0 6px;
          font-size: 15px;
        }

        .coming-card p {
          min-height: 34px;
          margin: 0 0 13px;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.5;
        }

        .coming-card small {
          color: var(--yellow);
          font-size: 8px;
          font-weight: 900;
        }

        .bottom-nav {
          position: fixed;
          left: 50%;
          bottom: 15px;
          z-index: 50;
          transform: translateX(-50%);
          display: flex;
          gap: 5px;
          padding: 7px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--surface);
          box-shadow: 0 15px 50px rgba(0,0,0,.3);
        }

        .bottom-nav a {
          min-width: 78px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          border-radius: 999px;
          color: var(--muted);
          text-decoration: none;
          font-size: 10px;
          font-weight: 900;
          transition: .18s ease;
        }

        .bottom-nav a:hover,
        .bottom-nav a.active {
          background: var(--yellow);
          color: #050505;
          transform: translateY(-2px);
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(0,0,0,.76);
          backdrop-filter: blur(10px);
        }

        .modal {
          position: relative;
          width: min(720px, 100%);
          max-height: calc(100vh - 36px);
          overflow-y: auto;
          padding: 27px;
          border: 1px solid var(--border);
          border-radius: 26px;
          background: var(--surface);
          box-shadow: 0 30px 100px rgba(0,0,0,.45);
        }

        .close-button {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 38px;
          height: 38px;
          border: 1px solid var(--border);
          border-radius: 50%;
          background: var(--surface2);
          color: var(--text);
          font-size: 22px;
          cursor: pointer;
        }

        .modal-icon {
          width: 57px;
          height: 57px;
          display: grid;
          place-items: center;
          margin-bottom: 17px;
          border-radius: 17px;
          background: var(--yellow);
          color: #050505;
          font-size: 23px;
          font-weight: 900;
        }

        .modal h2 {
          margin: 7px 0;
          font-size: 28px;
        }

        .modal-description {
          margin: 0 0 20px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.55;
        }

        .text-agent textarea {
          width: 100%;
          min-height: 145px;
          resize: vertical;
          padding: 15px;
          border: 1px solid var(--border);
          border-radius: 17px;
          outline: none;
          background: var(--surface2);
          color: var(--text);
        }

        .text-agent textarea:focus {
          border-color: var(--yellow);
        }

        .response,
        .error,
        .loading,
        .analysis {
          margin-top: 13px;
          padding: 15px;
          border-radius: 15px;
          background: var(--surface2);
          color: var(--text);
          font-size: 12px;
          line-height: 1.65;
          white-space: pre-wrap;
        }

        .error {
          color: #ff7272;
        }

        .market-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .market-stats > div {
          padding: 13px;
          border-radius: 14px;
          background: var(--surface2);
        }

        .market-stats span,
        .market-stats strong {
          display: block;
        }

        .market-stats span {
          color: var(--muted);
          font-size: 9px;
        }

        .market-stats strong {
          margin-top: 6px;
          font-size: 13px;
        }

        .market-list {
          margin-top: 12px;
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
        }

        .market-row {
          display: grid;
          grid-template-columns: 1fr 130px 75px;
          gap: 10px;
          align-items: center;
          padding: 12px 14px;
          border-bottom: 1px solid var(--border);
          font-size: 12px;
        }

        .market-row:last-child {
          border-bottom: 0;
        }

        .market-row div strong,
        .market-row div small {
          display: block;
        }

        .market-row small {
          margin-top: 3px;
          color: var(--muted);
          font-size: 9px;
        }

        .green {
          color: #31d67a;
        }

        .red {
          color: #ff6666;
        }

        .analysis {
          margin-top: 13px;
        }

        .analysis > span {
          color: var(--yellow);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .analysis p {
          margin: 8px 0 0;
        }

        @media (max-width: 950px) {
          .hero {
            grid-template-columns: 1fr;
            padding: 45px 0;
          }

          .hero-visual {
            min-height: 250px;
          }

          .agent-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .tool-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .coming-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 650px) {
          .topbar {
            height: 64px;
            padding: 0 14px;
          }

          .brand-text span,
          .online-pill {
            display: none;
          }

          .content {
            width: calc(100% - 22px);
          }

          .hero h1 {
            font-size: 40px;
          }

          .hero-visual {
            min-height: 200px;
            transform: scale(.82);
          }

          .agent-grid,
          .tool-grid,
          .coming-grid {
            grid-template-columns: 1fr;
          }

          .community {
            grid-template-columns: 1fr;
            padding: 22px;
          }

          .build-banner {
            flex-direction: column;
            align-items: flex-start;
          }

          .bottom-nav {
            width: calc(100% - 12px);
            bottom: 6px;
            justify-content: space-between;
          }

          .bottom-nav a {
            min-width: 0;
            flex: 1;
            padding: 10px 5px;
            font-size: 9px;
          }

          .bottom-nav a span {
            display: none;
          }

          .modal {
            padding: 21px;
          }

          .market-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .market-row {
            grid-template-columns: 1fr 85px;
          }

          .market-row > span {
            grid-column: 2;
            text-align: right;
          }
        }
      `}</style>
    </main>
  );
}