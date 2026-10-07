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
      return Response.json(
        { error: "Missing swap parameters." },
        { status: 400 }
      );
    }

    const params = new URLSearchParams();

    params.append("chainId", chainId);
    params.append("sellToken", sellToken);
    params.append("buyToken", buyToken);
    params.append("sellAmount", sellAmount);
    params.append("taker", taker);

    const apiKey = process.env.ZEROX_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "ZEROX_API_KEY is missing." },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.0x.org/swap/allowance-holder/quote?" +
        params.toString(),
      {
        headers: {
          "0x-api-key": apiKey,
          "0x-version": "v2",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
         error: data.message ? data.message : "0x quote failed.",
          details: data,
        },
        { status: response.status }
      );
    }

    return Response.json(data);
  } catch (error) {
    console.error("Agora swap error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to get swap quote.",
      },
      { status: 500 }
    );
  }
}