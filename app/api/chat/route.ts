import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

type ImagePart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

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

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    if (imageData) {
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp",
      ];

      if (!allowedTypes.includes(imageMimeType)) {
        return NextResponse.json(
          {
            error:
              "Unsupported image type. Please use PNG, JPG, or WEBP.",
          },
          { status: 400 }
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

          return `${role}: ${item.text || ""}`;
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

PREVIOUS CONVERSATION:
${conversationHistory || "No previous conversation."}

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
      prompt += `

LIVE WALLET CONTEXT:

Wallet address: ${wallet.address || "Unavailable"}
Chain ID: ${wallet.chainId || "Unavailable"}
Native balance: ${wallet.balance || "Unavailable"}
Native token: ${wallet.symbol || "Unavailable"}

WALLET RULES:
- If the user asks for their wallet balance, use the live wallet context.
- Give the exact balance provided.
- Never invent or estimate a wallet balance.
- Do not claim you cannot access the wallet when this wallet context is provided.
`;
    }

    const contents: string | Array<string | ImagePart> =
      imageData
        ? [
            prompt,
            {
              inlineData: {
                mimeType: imageMimeType,
                data: imageData,
              },
            },
          ]
        : prompt;

    const response =
      await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents,
      });

    return NextResponse.json({
      response: response.text,
    });
  } catch (error) {
    console.error("Agora AI error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}