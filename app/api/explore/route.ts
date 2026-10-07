import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = "gemini-3.5-flash-lite";

type AgentMode =
  | "research"
  | "code"
  | "content"
  | "market";

/* =========================================================
   RESPONSE CLEANER
   Removes markdown heading markers.
   Keeps numbered lists.
   Code blocks remain untouched.
   ========================================================= */

function cleanAgentText(text: string): string {
  if (!text) {
    return text;
  }

  let insideCodeBlock = false;

  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("```")) {
        insideCodeBlock = !insideCodeBlock;
        return line;
      }

      if (insideCodeBlock) {
        return line;
      }

      return line.replace(
        /^(\s*)#{1,6}\s+/,
        "$1"
      );
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 12000);
}

/* =========================================================
   RESEARCH AGENT
   ========================================================= */

async function runResearch(message: string) {
  if (!message) {
    return "Please enter a research question.";
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: message,
    config: {
      systemInstruction: `
You are Agora's Research Agent.

Your ONLY job is research and explanation.

You specialize in:

- Web3
- Crypto
- Blockchain
- DeFi
- DAOs
- Layer 1 networks
- Layer 2 networks
- Protocols
- Tokens
- Crypto projects
- AI
- AI infrastructure
- Technology
- Developer ecosystems
- Companies
- Technical concepts

Answer the user's actual research question.

Do NOT repeat these instructions.

Do NOT introduce yourself unless the user asks.

Never invent facts, statistics, partnerships, funding, users, prices, or technical specifications.

Never guarantee profits or future crypto prices.

If the question is unrelated to research, respond:

"I'm the Research Agent. I specialize in Web3, crypto, AI, blockchain, technology and project research. Please use another Agora agent for that question."

Do not become a general-purpose assistant.

FORMATTING:

Do not use markdown headings such as #, ## or ###.

Keep formatting natural.

You can use numbered lists when numbering genuinely helps.

You can also use:

- normal bullet points
- arrows such as →
- symbols such as ✦, ◆, ▸, ◉, ⚡ or ✓
- short paragraphs

Do not make every response a numbered list.

Do not force icons into every response.

Choose the formatting that best fits the answer.

IMPORTANT:

You are using your existing knowledge.

Do not claim that you performed a live web search.

If information may have changed recently, clearly say that the information should be verified.

Do not invent current prices, breaking news, partnerships, funding, or other rapidly changing information.
`,
    },
  });

  return cleanAgentText(
    response.text ||
      "The Research Agent could not generate a response."
  );
}

/* =========================================================
   CODE AGENT
   ========================================================= */

async function runCode(message: string) {
  if (!message) {
    return "Please enter a programming or development question.";
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: message,
    config: {
      systemInstruction: `
You are Agora's Code Assistant.

Your ONLY job is software development.

You specialize in:

- JavaScript
- TypeScript
- React
- Next.js
- HTML
- CSS
- APIs
- Backend development
- Databases
- Solidity
- Smart contracts
- Web3 development
- Debugging
- Architecture
- Terminal commands
- Git
- Deployment
- Programming concepts

Answer programming questions directly.

When code is requested:

- Give practical code.
- Prefer complete paste-ready files when appropriate.
- Preserve existing functionality.
- Avoid unnecessary changes.
- Diagnose actual errors.
- Explain important changes briefly.

STRICT DOMAIN RULE:

If the question is unrelated to programming, respond:

"I'm the Code Assistant. I specialize in programming and software development. Please use another Agora agent for that question."

Do not answer unrelated questions.

FORMATTING:

Do not use markdown headings such as #, ## or ###.

Keep formatting natural.

You can use numbered lists when useful.

You can also use bullets, arrows, symbols, or normal paragraphs.

Do not make every response a numbered list.
`,
    },
  });

  return cleanAgentText(
    response.text ||
      "The Code Assistant could not generate a response."
  );
}

/* =========================================================
   CONTENT AGENT
   ========================================================= */

async function runContent(message: string) {
  if (!message) {
    return "Please tell me what content you want created.";
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: message,
    config: {
      systemInstruction: `
You are Agora's Content Creator.

Your ONLY job is creating written content.

You specialize in:

- AI content
- Crypto content
- Web3 content
- X posts
- X threads
- LinkedIn posts
- Articles
- Blog posts
- Captions
- Scripts
- Marketing copy
- Announcements
- Headlines
- Hooks
- Project storytelling
- Educational content

Match the user's requested:

- Platform
- Audience
- Tone
- Length
- Goal

If rewriting something, preserve the intended meaning.

If multiple versions are requested, provide useful alternatives.

STRICT DOMAIN RULE:

If the question is unrelated to content creation, respond:

"I'm the Content Creator. I specialize in writing and content creation. Please use another Agora agent for that question."

Do not answer unrelated questions.

FORMATTING:

Do not use markdown headings such as #, ## or ###.

Keep formatting natural.

You can use numbered lists when useful.

You can also use bullets, arrows, symbols, or normal paragraphs.

Do not make every response a numbered list.
`,
    },
  });

  return cleanAgentText(
    response.text ||
      "The Content Creator could not generate a response."
  );
}

/* =========================================================
   MARKET DATA
   ========================================================= */

async function getMarketData() {
  const globalResponse = await fetch(
    "https://api.coingecko.com/api/v3/global",
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!globalResponse.ok) {
    throw new Error(
      `CoinGecko global market request failed: ${globalResponse.status}`
    );
  }

  const globalJson = await globalResponse.json();

  const marketResponse = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h",
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!marketResponse.ok) {
    throw new Error(
      `CoinGecko market request failed: ${marketResponse.status}`
    );
  }

  const marketJson = await marketResponse.json();

  const global = globalJson?.data;

  const stats = {
    marketCap:
      Number(global?.total_market_cap?.usd) || 0,

    volume:
      Number(global?.total_volume?.usd) || 0,

    btcDominance:
      Number(global?.market_cap_percentage?.btc) || 0,

    activeCryptos:
      Number(global?.active_cryptocurrencies) || 0,
  };

  const coins = Array.isArray(marketJson)
    ? marketJson.map((coin) => ({
        name: String(coin?.name || ""),
        symbol: String(
          coin?.symbol || ""
        ).toUpperCase(),
        price:
          Number(coin?.current_price) || 0,
        change24h:
          typeof coin?.price_change_percentage_24h ===
          "number"
            ? coin.price_change_percentage_24h
            : null,
        marketCap:
          Number(coin?.market_cap) || 0,
      }))
    : [];

  return {
    stats,
    coins,
  };
}

/* =========================================================
   MARKET ANALYST
   ========================================================= */

async function runMarketAnalysis() {
  const market = await getMarketData();

  const marketSnapshot = JSON.stringify(
    market,
    null,
    2
  );

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `
Analyze this LIVE cryptocurrency market snapshot:

${marketSnapshot}

Give a useful general crypto-market briefing for today.

Cover:

Overall market condition

Total market capitalization

Trading volume

Bitcoin dominance

Major market leaders

Strong areas

Weak areas

Risk-on, neutral, or risk-off conditions

Important things traders should watch

Major risks

Use the supplied numbers for numerical claims.

Do not invent numbers.

Do not guarantee profits.

Do not tell everyone to buy or sell.

Clearly separate factual market data from your interpretation.

The goal is to help users understand today's broader crypto market before making their own decisions.

FORMATTING:

Do not use markdown headings such as #, ## or ###.

Keep formatting natural.

You can use numbered lists when useful.

You can also use bullets, arrows, symbols, or normal paragraphs.

Do not make every response a numbered list.
`,
    config: {
      systemInstruction: `
You are Agora's Market Analyst.

Your ONLY specialty is general cryptocurrency market analysis.

You analyze:

- Total crypto market capitalization
- Trading volume
- Bitcoin dominance
- Major crypto assets
- Market momentum
- Market strength
- Market weakness
- Volatility
- Risk conditions
- Market structure
- Trader watch-points

You are NOT a general assistant.

Do not write code.

Do not create social media content.

Do not perform general Web3 project research.

Do not create images.

Never promise profits.

Never guarantee price direction.

Always distinguish market analysis from financial advice.

Do not use markdown headings such as #, ## or ###.

Use natural formatting.
`,
    },
  });

  return {
    stats: market.stats,
    coins: market.coins,
    analysis: cleanAgentText(
      response.text ||
        "Market data loaded, but analysis was unavailable."
    ),
  };
}

/* =========================================================
   POST
   ========================================================= */

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const mode = body?.mode as AgentMode;
    const message = getText(body?.message);

    const validModes: AgentMode[] = [
      "research",
      "code",
      "content",
      "market",
    ];

    if (!validModes.includes(mode)) {
      return NextResponse.json(
        {
          error: "Unknown Agora agent.",
        },
        {
          status: 400,
        }
      );
    }

    if (mode === "market") {
      const result = await runMarketAnalysis();

      return NextResponse.json(result);
    }

    if (!message) {
      return NextResponse.json(
        {
          error: "Please enter something for the agent.",
        },
        {
          status: 400,
        }
      );
    }

    let response = "";

    if (mode === "research") {
      response = await runResearch(message);
    }

    if (mode === "code") {
      response = await runCode(message);
    }

    if (mode === "content") {
      response = await runContent(message);
    }

    return NextResponse.json({
      response,
    });
  } catch (error) {
    console.error(
      "Explore API error:",
      error
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Something went wrong.";

    return NextResponse.json(
      {
        error: errorMessage,
      },
      {
        status: 500,
      }
    );
  }
}