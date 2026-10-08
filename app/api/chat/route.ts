import { NextResponse } from "next/server";

type ImagePart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

type WalletBalance = {
  chainId?: number;
  network?: string;
  symbol?: string;
  balance?: string;
};

type WalletPriceData = {
  eth: number;
  pol: number;
  bnb: number;
};

async function generateGeminiContent(
  contents: string | Array<string | ImagePart>
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured."
    );
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts:
              typeof contents === "string"
                ? [
                    {
                      text: contents,
                    },
                  ]
                : contents.map((item) => {
                    if (typeof item === "string") {
                      return {
                        text: item,
                      };
                    }

                    return {
                      inline_data: {
                        mime_type:
                          item.inlineData.mimeType,
                        data: item.inlineData.data,
                      },
                    };
                  }),
          },
        ],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Gemini REST error:",
      response.status,
      data
    );

    throw new Error(
      typeof data?.error?.message === "string"
        ? data.error.message
        : "Gemini request failed."
    );
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.filter(
        (part: { text?: unknown }) =>
          typeof part?.text === "string"
      )
      ?.map(
        (part: { text: string }) => part.text
      )
      ?.join("") || "";

  if (!text) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  return text;
}

async function getLivePrices(): Promise<WalletPriceData | null> {
  try {
    const response = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbols=%5B%22ETHUSDT%22,%22POLUSDT%22,%22BNBUSDT%22%5D",
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return null;
    }

    const prices: Record<string, number> = {};

    for (const item of data) {
      if (
        item &&
        typeof item.symbol === "string" &&
        typeof item.price === "string"
      ) {
        const price = Number(item.price);

        if (Number.isFinite(price)) {
          prices[item.symbol] = price;
        }
      }
    }

    if (
      !prices.ETHUSDT ||
      !prices.POLUSDT ||
      !prices.BNBUSDT
    ) {
      return null;
    }

    return {
      eth: prices.ETHUSDT,
      pol: prices.POLUSDT,
      bnb: prices.BNBUSDT,
    };
  } catch (error) {
    console.error(
      "Agora price fetch error:",
      error
    );

    return null;
  }
}

function getNumericBalance(
  balances: WalletBalance[],
  chainId: number
): number {
  const network = balances.find(
    (item) => item.chainId === chainId
  );

  if (
    !network ||
    typeof network.balance !== "string"
  ) {
    return 0;
  }

  const value = Number(network.balance);

  return Number.isFinite(value) ? value : 0;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const message = body.message;
    const wallet = body.wallet;

    const history = Array.isArray(body.history)
      ? body.history
      : [];

    const imageData =
      typeof body.imageData === "string"
        ? body.imageData
        : "";

    const imageMimeType =
      typeof body.imageMimeType === "string"
        ? body.imageMimeType
        : "";

    if (
      !message ||
      typeof message !== "string"
    ) {
      return NextResponse.json(
        {
          error: "Message is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (imageData) {
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp",
      ];

      if (
        !allowedTypes.includes(imageMimeType)
      ) {
        return NextResponse.json(
          {
            error:
              "Unsupported image type. Please use PNG, JPG, or WEBP.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const conversationHistory = history
      .slice(-20)
      .map(
        (item: {
          role?: string;
          text?: string;
        }) => {
          const role =
            item.role === "assistant"
              ? "Agora"
              : "User";

          return `${role}: ${
            item.text || ""
          }`;
        }
      )
      .join("\n\n");

    let prompt = `
You are Agora, an intelligent AI Web3 assistant.

You are having an ongoing conversation with the user.

IMPORTANT CONVERSATION RULES:
- Remember and use the previous conversation provided below.
- Understand references such as "it", "that", "they", "continue", "go on", and "what about that".
- When the user says "continue", continue the most recent relevant topic instead of starting a new unrelated answer.
- Do not pretend to forget something that appears in the conversation history.
- Do not invent facts that are not available.
- Never claim that you performed a transaction unless the application actually did so.
- Do not use markdown heading markers such as #, ##, or ###.
- Use natural paragraphs, bullets, numbered lists, arrows, or other readable formatting when appropriate.
- Do not make every answer a numbered list. Vary the formatting naturally.

PREVIOUS CONVERSATION:
${
  conversationHistory ||
  "No previous conversation."
}

CURRENT USER MESSAGE:
${message}
`;

    if (imageData) {
      prompt += `

IMAGE CONTEXT:
The user attached an image and is asking a question about it.

Analyze the attached image carefully and answer the user's question based on what is actually visible.
Do not invent details that cannot be determined from the image.
If something is unclear or unreadable, say so.
`;
    }

    if (wallet) {
      const balances: WalletBalance[] =
        Array.isArray(wallet.balances)
          ? wallet.balances
          : [];

      const getBalance = (
        chainId: number
      ) => {
        const network = balances.find(
          (item) =>
            item.chainId === chainId
        );

        if (!network) {
          return "Unavailable";
        }

        const balance =
          typeof network.balance ===
          "string"
            ? network.balance
            : "Unavailable";

        const symbol =
          typeof network.symbol ===
          "string"
            ? network.symbol
            : "";

        return symbol
          ? `${balance} ${symbol}`
          : balance;
      };

      const prices =
        await getLivePrices();

      let usdtValues: {
        ethereum: number;
        base: number;
        polygon: number;
        arbitrum: number;
        optimism: number;
        bnb: number;
        total: number;
      } | null = null;

      if (prices) {
        const ethereum =
          getNumericBalance(
            balances,
            1
          ) * prices.eth;

        const base =
          getNumericBalance(
            balances,
            8453
          ) * prices.eth;

        const polygon =
          getNumericBalance(
            balances,
            137
          ) * prices.pol;

        const arbitrum =
          getNumericBalance(
            balances,
            42161
          ) * prices.eth;

        const optimism =
          getNumericBalance(
            balances,
            10
          ) * prices.eth;

        const bnb =
          getNumericBalance(
            balances,
            56
          ) * prices.bnb;

        usdtValues = {
          ethereum,
          base,
          polygon,
          arbitrum,
          optimism,
          bnb,
          total:
            ethereum +
            base +
            polygon +
            arbitrum +
            optimism +
            bnb,
        };
      }

      const formatUsdt = (
        value: number
      ) => {
        return value.toFixed(6);
      };

      prompt += `

LIVE WALLET CONTEXT:

Wallet address:
${wallet.address || "Unavailable"}

Active Chain ID:
${wallet.chainId || "Unavailable"}

The connected wallet address is the same wallet across all supported networks.

SUPPORTED NETWORK BALANCES:

Ethereum:
${getBalance(1)}

Base:
${getBalance(8453)}

Polygon:
${getBalance(137)}

Arbitrum:
${getBalance(42161)}

Optimism:
${getBalance(10)}

BNB Chain:
${getBalance(56)}
`;

      if (prices && usdtValues) {
        prompt += `

LIVE MARKET PRICES:

ETH:
${prices.eth} USDT

POL:
${prices.pol} USDT

BNB:
${prices.bnb} USDT

ESTIMATED USDT VALUES:

Ethereum ETH:
${formatUsdt(
  usdtValues.ethereum
)} USDT

Base ETH:
${formatUsdt(
  usdtValues.base
)} USDT

Polygon POL:
${formatUsdt(
  usdtValues.polygon
)} USDT

Arbitrum ETH:
${formatUsdt(
  usdtValues.arbitrum
)} USDT

Optimism ETH:
${formatUsdt(
  usdtValues.optimism
)} USDT

BNB Chain BNB:
${formatUsdt(
  usdtValues.bnb
)} USDT

TOTAL ESTIMATED NATIVE-ASSET VALUE:
${formatUsdt(
  usdtValues.total
)} USDT
`;
      } else {
        prompt += `

LIVE MARKET PRICES:
Unavailable right now.

Do not invent a USDT conversion if live prices are unavailable.
`;
      }

      prompt += `

WALLET BALANCE RULES:

- If the user asks "my balance", "my wallet balance", "my balances", "what do I have", "what assets do I have", or asks for their overall wallet holdings, use ALL available supported network balances.
- Never answer an overall wallet-balance question using only the currently active network.
- Never add ETH, POL, and BNB raw amounts together as if they were the same asset.
- If live USDT values are available, you may use the calculated USDT values supplied above.
- If the user asks "in USDT", "how much is that in USDT", "what is my balance worth", "what's my portfolio worth", or similar, give the TOTAL ESTIMATED NATIVE-ASSET VALUE in USDT.
- When giving the USDT total, make clear that it is an estimated value based on live market prices.
- Do not claim that the user actually holds that amount of USDT.
- "Worth in USDT" and "actual USDT token balance" are different things.
- If the user asks for their actual USDT holdings, do NOT use the portfolio value. Say that actual USDT token balances require token-balance data.
- If a network balance is 0, report 0 rather than saying the wallet has no balance data.
- If the user asks about BNB or BNB Chain, use the BNB Chain balance above.
- If the user asks about Ethereum, use the Ethereum balance above.
- If the user asks about Base, use the Base balance above.
- If the user asks about Polygon or POL, use the Polygon balance above.
- If the user asks about Arbitrum, use the Arbitrum balance above.
- If the user asks about Optimism, use the Optimism balance above.
- Never tell the user to switch networks just to read a balance that is already supplied here.
- The active Chain ID only tells you which network the wallet interface is currently connected to. It does NOT limit the balance information available to you.
- Never invent, estimate, or guess a wallet balance.
- If a particular network says "Unavailable", clearly say that balance could not be read instead of guessing.
- If a wallet address is provided, do not claim that the wallet is disconnected.
`;
    }

    const contents:
      | string
      | Array<string | ImagePart> =
      imageData
        ? [
            prompt,
            {
              inlineData: {
                mimeType:
                  imageMimeType,
                data: imageData,
              },
            },
          ]
        : prompt;

    const response =
      await generateGeminiContent(
        contents
      );

    return NextResponse.json({
      response,
    });
  } catch (error) {
    console.error(
      "Agora AI error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}