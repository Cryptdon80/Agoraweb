import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const chainId = String(body.chainId);
    const sellToken = String(body.sellToken);
    const buyToken = String(body.buyToken);
    const sellAmount = String(body.sellAmount);
    const taker = String(body.taker);

    if (
      !body.chainId ||
      !body.sellToken ||
      !body.buyToken ||
      !body.sellAmount ||
      !body.taker
    ) {
      return NextResponse.json(
        {
          error: "Missing swap parameters.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey = process.env.ZEROX_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "ZEROX_API_KEY is missing.",
        },
        {
          status: 500,
        }
      );
    }

    const params = new URLSearchParams();

    params.append("chainId", chainId);
    params.append("sellToken", sellToken);
    params.append("buyToken", buyToken);
    params.append("sellAmount", sellAmount);
    params.append("taker", taker);

    const response = await fetch(
      "https://api.0x.org/swap/allowance-holder/quote?" +
        params.toString(),
      {
        method: "GET",
        headers: {
          "0x-api-key": apiKey,
          "0x-version": "v2",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.message || "0x quote failed.",
          details: data,
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      success: true,

      quote: {
        chainId: data.chainId,
        sellToken: data.sellToken,
        buyToken: data.buyToken,
        sellAmount: data.sellAmount,
        buyAmount: data.buyAmount,
        minBuyAmount: data.minBuyAmount,

        fees: data.fees || null,
        totalNetworkFee: data.totalNetworkFee || null,

        issues: data.issues || null,

        transaction: data.transaction
          ? {
              to: data.transaction.to,
              data: data.transaction.data,
              value: data.transaction.value,
              gas: data.transaction.gas,
              gasPrice: data.transaction.gasPrice,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Agora agent swap error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create swap quote.",
      },
      {
        status: 500,
      }
    );
  }
}
