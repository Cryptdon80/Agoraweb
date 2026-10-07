export const NATIVE_TOKEN =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export const BNB_USDC =
  "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";

export function parseAgentSwap(text: string) {
  const match = text
    .trim()
    .match(
      /^swap\s+([0-9]*\.?[0-9]+)\s+(BNB)\s+(?:to|for)\s+(USDC)$/i
    );

  if (!match) {
    return null;
  }

  return {
    amount: match[1],
    sellSymbol: "BNB",
    buySymbol: "USDC",
    chainId: 56,
    sellToken: NATIVE_TOKEN,
    buyToken: BNB_USDC,
    sellDecimals: 18,
    buyDecimals: 18,
  };
}
