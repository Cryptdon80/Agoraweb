export const NATIVE_TOKEN =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const BNB_USDC =
  "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";

const BSC_USDT =
  "0x55d398326f99059fF775485246999027B3197955";

export function parseAgentSwap(text: string) {
  const match = text
    .trim()
    .match(
      /^swap\s+([0-9]*\.?[0-9]+)\s+(USDT|BNB|USDC)\s+(?:to|for)\s+(BNB|USDT|USDC)$/i
    );

  if (!match) {
    return null;
  }

  const amount = match[1];
  const sellSymbol = match[2].toUpperCase();
  const buySymbol = match[3].toUpperCase();

  if (sellSymbol === buySymbol) {
    return null;
  }

  /*
   * BNB Chain / 0x
   *
   * BNB  = native token
   * USDT = BEP-20 USDT
   * USDC = native USDC on BNB Chain
   */
  const tokens: Record<
    string,
    {
      address: string;
      decimals: number;
    }
  > = {
    BNB: {
      address: NATIVE_TOKEN,
      decimals: 18,
    },
    USDT: {
      address: BSC_USDT,
      decimals: 18,
    },
    USDC: {
      address: BNB_USDC,
      decimals: 18,
    },
  };

  const sell = tokens[sellSymbol];
  const buy = tokens[buySymbol];

  if (!sell || !buy) {
    return null;
  }

  return {
    amount,
    sellSymbol,
    buySymbol,
    chainId: 56,
    sellToken: sell.address,
    buyToken: buy.address,
    sellDecimals: sell.decimals,
    buyDecimals: buy.decimals,
  };
}