import { NextRequest, NextResponse } from "next/server";

const ROUTESCAN =
  "https://api.routescan.io/v2/network/mainnet/evm";

const ROBINHOOD_RPC =
  "https://rpc.mainnet.chain.robinhood.com";

const ROBINHOOD_BLOCKSCOUT =
  "https://robinhoodchain.blockscout.com/api/v2";

const SUPPORTED_CHAINS = [
  {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    routescan: "1",
    dex: "ethereum",
  },
  {
    id: 8453,
    name: "Base",
    symbol: "ETH",
    routescan: "8453",
    dex: "base",
  },
  {
    id: 137,
    name: "Polygon",
    symbol: "POL",
    routescan: "137",
    dex: "polygon",
  },
  {
    id: 42161,
    name: "Arbitrum",
    symbol: "ETH",
    routescan: "42161",
    dex: "arbitrum",
  },
  {
    id: 10,
    name: "Optimism",
    symbol: "ETH",
    routescan: "10",
    dex: "optimism",
  },
  {
    id: 56,
    name: "BNB Chain",
    symbol: "BNB",
    routescan: "56",
    dex: "bsc",
  },
  {
    id: 4663,
    name: "Robinhood Chain",
    symbol: "ETH",
    routescan: "4663",
    dex: "robinhood",
  },
] as const;

const PUBLIC_RPCS: Record<number, string> = {
  1: "https://ethereum.publicnode.com",
  8453: "https://base.publicnode.com",
  137: "https://polygon-bor-rpc.publicnode.com",
  42161: "https://arbitrum-one.publicnode.com",
  10: "https://optimism.publicnode.com",
  56: "https://bsc-dataseed.binance.org",
};

function chainName(chainId: number) {
  return (
    SUPPORTED_CHAINS.find(
      (chain) => chain.id === chainId
    )?.name ?? `Chain ${chainId}`
  );
}

function supportedChain(chainId: number) {
  return SUPPORTED_CHAINS.some(
    (chain) => chain.id === chainId
  );
}

async function getJson(
  url: string,
  init?: RequestInit
): Promise<any> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status}`
    );
  }

  return response.json();
}

async function routescan(
  chainId: string,
  path: string,
  params?: Record<string, string>
) {
  const url = new URL(
    `${ROUTESCAN}/${chainId}${path}`
  );

  if (params) {
    Object.entries(params).forEach(
      ([key, value]) => {
        url.searchParams.set(key, value);
      }
    );
  }

  return getJson(url.toString());
}

async function dexSearch(
  chain: string,
  address: string
) {
  try {
    return await getJson(
      `https://api.dexscreener.com/tokens/v1/${chain}/${address}`
    );
  } catch {
    return [];
  }
}

async function robinhoodRpc(
  method: string,
  params: any[] = []
) {
  return getJson(ROBINHOOD_RPC, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
}

async function publicRpc(
  chainId: number,
  method: string,
  params: any[] = []
) {
  const rpc = PUBLIC_RPCS[chainId];

  if (!rpc) {
    throw new Error(
      `No public RPC configured for chain ${chainId}`
    );
  }

  return getJson(rpc, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
}

function decodeAbiString(
  value: string | null | undefined
) {
  if (!value || value === "0x") {
    return null;
  }

  try {
    const hex = value.slice(2);

    if (hex.length < 128) {
      return null;
    }

    const offset = parseInt(
      hex.slice(0, 64),
      16
    );

    const length = parseInt(
      hex.slice(offset * 2, offset * 2 + 64),
      16
    );

    const start =
      offset * 2 + 64;

    const textHex = hex.slice(
      start,
      start + length * 2
    );

    return (
      Buffer.from(
        textHex,
        "hex"
      )
        .toString("utf8")
        .replace(/\0/g, "")
        .trim() || null
    );
  } catch {
    return null;
  }
}

function decodeBytes32(
  value: string | null | undefined
) {
  if (!value || value === "0x") {
    return null;
  }

  try {
    const hex = value
      .slice(2)
      .replace(/0+$/, "");

    if (!hex) {
      return null;
    }

    return (
      Buffer.from(
        hex,
        "hex"
      )
        .toString("utf8")
        .replace(/\0/g, "")
        .trim() || null
    );
  } catch {
    return null;
  }
}

async function readRobinhoodTokenMetadata(
  address: string
) {
  try {
    const data = await getJson(
      `${ROBINHOOD_BLOCKSCOUT}/tokens/${address}`
    );

    if (data?.address_hash) {
      return {
        name: data.name ?? null,
        symbol: data.symbol ?? null,
        decimals:
          data.decimals != null
            ? Number(data.decimals)
            : null,
        totalSupply:
          data.total_supply ?? null,
        holders:
          data.holders_count ?? null,
        type:
          data.type ?? "ERC-20",
      };
    }
  } catch {}

  try {
    const [
      nameResult,
      symbolResult,
      decimalsResult,
    ] = await Promise.all([
      robinhoodRpc("eth_call", [
        {
          to: address,
          data: "0x06fdde03",
        },
        "latest",
      ]),
      robinhoodRpc("eth_call", [
        {
          to: address,
          data: "0x95d89b41",
        },
        "latest",
      ]),
      robinhoodRpc("eth_call", [
        {
          to: address,
          data: "0x313ce567",
        },
        "latest",
      ]),
    ]);

    const name =
      decodeAbiString(
        nameResult?.result
      ) ??
      decodeBytes32(
        nameResult?.result
      );

    const symbol =
      decodeAbiString(
        symbolResult?.result
      ) ??
      decodeBytes32(
        symbolResult?.result
      );

    let decimals: number | null = null;

    if (decimalsResult?.result) {
      try {
        decimals = parseInt(
          decimalsResult.result,
          16
        );
      } catch {
        decimals = null;
      }
    }

    return {
      name,
      symbol,
      decimals,
      totalSupply: null,
      holders: null,
      type: "ERC-20",
    };
  } catch {
    return {
      name: null,
      symbol: null,
      decimals: null,
      totalSupply: null,
      holders: null,
      type: "ERC-20",
    };
  }
}

async function readRobinhoodContract(
  address: string
) {
  try {
    return await getJson(
      `${ROBINHOOD_BLOCKSCOUT}/smart-contracts/${address}`
    );
  } catch {
    return null;
  }
}

function getBestPair(pairs: any) {
  const pairList = Array.isArray(pairs)
    ? pairs
    : [];

  return (
    [...pairList].sort(
      (a: any, b: any) =>
        Number(
          b?.liquidity?.usd ?? 0
        ) -
        Number(
          a?.liquidity?.usd ?? 0
        )
    )[0] ?? null
  );
}

function calculateSignalScore({
  verified,
  hasSource,
  liquidityUsd,
  hasMetadata,
}: {
  verified: boolean | null;
  hasSource: boolean | null;
  liquidityUsd: number | null;
  hasMetadata: boolean | null;
}) {
  const knownSignals = [
    verified !== null,
    hasSource !== null,
    liquidityUsd !== null,
    hasMetadata !== null,
  ].filter(Boolean).length;

  if (knownSignals < 2) {
    return null;
  }

  let score = 50;

  if (verified === true) {
    score += 20;
  } else if (verified === false) {
    score -= 20;
  }

  if (hasSource === true) {
    score += 15;
  } else if (hasSource === false) {
    score -= 15;
  }

  if (liquidityUsd !== null) {
    if (liquidityUsd >= 100000) {
      score += 15;
    } else if (liquidityUsd >= 10000) {
      score += 5;
    } else if (liquidityUsd > 0) {
      score -= 10;
    } else {
      score -= 15;
    }
  }

  if (hasMetadata === true) {
    score += 5;
  } else if (hasMetadata === false) {
    score -= 5;
  }

  return Math.max(
    0,
    Math.min(100, score)
  );
}

function scoreLabel(
  score: number | null
) {
  if (score === null) {
    return "UNKNOWN";
  }

  if (score >= 70) {
    return "LOW";
  }

  if (score >= 45) {
    return "MEDIUM";
  }

  return "HIGH";
}

async function tokenScan(
  address: string,
  chainId: number
) {
  const chain =
    SUPPORTED_CHAINS.find(
      (item) => item.id === chainId
    );

  if (!chain) {
    throw new Error(
      "Unsupported network"
    );
  }

  if (chainId === 4663) {
    const [
      token,
      pairs,
    ] = await Promise.all([
      readRobinhoodTokenMetadata(
        address
      ),
      dexSearch(
        "robinhood",
        address
      ),
    ]);

    const bestPair =
      getBestPair(pairs);

    return {
      type: "token",
      chainId: 4663,
      network: "Robinhood Chain",
      address,
      name:
        token?.name ??
        "Unknown token",
      symbol:
        token?.symbol ??
        "UNKNOWN",
      decimals:
        token?.decimals ??
        18,
      token,
      contract: address,
      market: bestPair
        ? {
            priceUsd:
              bestPair.priceUsd ??
              null,
            marketCap:
              bestPair.marketCap ??
              null,
            fdv:
              bestPair.fdv ??
              null,
            liquidityUsd:
              bestPair.liquidity?.usd ??
              null,
            volume24h:
              bestPair.volume?.h24 ??
              null,
            priceChange24h:
              bestPair.priceChange?.h24 ??
              null,
            dex:
              bestPair.dexId ??
              null,
            pairAddress:
              bestPair.pairAddress ??
              null,
          }
        : null,
    };
  }

  const [
    tokenInfo,
    source,
    pairs,
  ] = await Promise.all([
    routescan(
      chain.routescan,
      "/etherscan/api",
      {
        module: "token",
        action: "tokeninfo",
        contractaddress: address,
      }
    ),
    routescan(
      chain.routescan,
      "/etherscan/api",
      {
        module: "contract",
        action: "getsourcecode",
        address,
      }
    ),
    dexSearch(
      chain.dex,
      address
    ),
  ]);

  const rawToken =
    tokenInfo?.result?.[0] ??
    null;

  const rawContract =
    source?.result?.[0] ??
    null;

  const bestPair =
    getBestPair(pairs);

  return {
    type: "token",
    chainId,
    network: chain.name,
    address,
    name:
      rawToken?.name ??
      rawToken?.tokenName ??
      rawToken?.TokenName ??
      "Unknown token",
    symbol:
      rawToken?.symbol ??
      rawToken?.Symbol ??
      "UNKNOWN",
    decimals:
      rawToken?.decimals != null
        ? Number(
            rawToken.decimals
          )
        : rawToken?.Decimals != null
        ? Number(
            rawToken.Decimals
          )
        : null,
    token: rawToken,
    contract: address,
    contractInfo: rawContract,
    market: bestPair
      ? {
          priceUsd:
            bestPair.priceUsd ??
            null,
          marketCap:
            bestPair.marketCap ??
            null,
          fdv:
            bestPair.fdv ??
            null,
          liquidityUsd:
            bestPair.liquidity?.usd ??
            null,
          volume24h:
            bestPair.volume?.h24 ??
            null,
          priceChange24h:
            bestPair.priceChange?.h24 ??
            null,
          dex:
            bestPair.dexId ??
            null,
          pairAddress:
            bestPair.pairAddress ??
            null,
        }
      : null,
  };
}

function formatNativeBalance(
  rawBalance: unknown
) {
  try {
    const value = BigInt(
      String(rawBalance ?? "0")
    );

    const decimals =
      BigInt(10) ** BigInt(18);

    const whole =
      value / decimals;

    const fraction =
      value % decimals;

    const fractionText =
      fraction
        .toString()
        .padStart(18, "0")
        .replace(/0+$/, "");

    if (!fractionText) {
      return whole.toString();
    }

    return `${whole}.${fractionText}`;
  } catch {
    return "0";
  }
}

async function getChainNativeBalance(
  chain: (typeof SUPPORTED_CHAINS)[number],
  address: string
) {
  if (chain.id === 4663) {
    try {
      const data =
        await robinhoodRpc(
          "eth_getBalance",
          [
            address,
            "latest",
          ]
        );

      const rawBalance =
        data?.result ?? "0x0";

      const balanceWei =
        BigInt(rawBalance);

      return {
        chainId: chain.id,
        network: chain.name,
        symbol: chain.symbol,
        balance:
          balanceWei.toString(),
        formatted:
          formatNativeBalance(
            balanceWei.toString()
          ),
        unavailable: false,
      };
    } catch (error) {
      console.error(
        `Robinhood balance lookup failed:`,
        error
      );

      return {
        chainId: chain.id,
        network: chain.name,
        symbol: chain.symbol,
        balance: "0",
        formatted: "0",
        unavailable: true,
      };
    }
  }

  const rpc =
    PUBLIC_RPCS[chain.id];

  if (!rpc) {
    return {
      chainId: chain.id,
      network: chain.name,
      symbol: chain.symbol,
      balance: "0",
      formatted: "0",
      unavailable: true,
    };
  }

  try {
    const data =
      await publicRpc(
        chain.id,
        "eth_getBalance",
        [
          address,
          "latest",
        ]
      );

    if (data?.error) {
      throw new Error(
        data.error.message ??
          "RPC balance request failed"
      );
    }

    const rawBalance =
      data?.result ?? "0x0";

    const balanceWei =
      BigInt(rawBalance);

    return {
      chainId: chain.id,
      network: chain.name,
      symbol: chain.symbol,
      balance:
        balanceWei.toString(),
      formatted:
        formatNativeBalance(
          balanceWei.toString()
        ),
      unavailable: false,
    };
  } catch (error) {
    console.error(
      `Balance lookup failed for ${chain.name}:`,
      error
    );

    return {
      chainId: chain.id,
      network: chain.name,
      symbol: chain.symbol,
      balance: "0",
      formatted: "0",
      unavailable: true,
    };
  }
}

async function addressExplorer(
  address: string
) {
  const balanceChains =
    SUPPORTED_CHAINS.filter(
      (chain) =>
        chain.id !== 4663
    );

  const balances =
    await Promise.all(
      balanceChains.map(
        (chain) =>
          getChainNativeBalance(
            chain,
            address
          )
      )
    );

  const [
    holdings,
    transactions,
  ] = await Promise.all([
    routescan(
      "all",
      `/address/${address}/erc20-holdings`,
      {
        limit: "100",
      }
    ),
    routescan(
      "all",
      `/address/${address}/transactions`,
      {
        categories: "evm_tx",
        sort: "desc",
        limit: "25",
      }
    ),
  ]);

  const realHoldings =
    Array.isArray(
      holdings?.items
    )
      ? holdings.items.filter(
          (item: any) =>
            supportedChain(
              Number(
                item.chainId
              )
            )
        )
      : [];

  const realTransactions =
    Array.isArray(
      transactions?.items
    )
      ? transactions.items
          .filter(
            (item: any) =>
              supportedChain(
                Number(
                  item.chainId
                )
              )
          )
          .slice(0, 25)
      : [];

  return {
    type: "address",
    address,
    balances,
    holdings:
      realHoldings.map(
        (item: any) => ({
          ...item,
          network:
            chainName(
              Number(
                item.chainId
              )
            ),
        })
      ),
    gasBalances: balances,
    transactions:
      realTransactions.map(
        (item: any) => ({
          ...item,
          network:
            chainName(
              Number(
                item.chainId
              )
            ),
        })
      ),
  };
}

async function riskScan(
  address: string,
  chainId: number
) {
  const chain =
    SUPPORTED_CHAINS.find(
      (item) => item.id === chainId
    );

  if (!chain) {
    throw new Error(
      "Unsupported network"
    );
  }

  if (chainId === 4663) {
    const [
      token,
      contractInfo,
      pairs,
    ] = await Promise.all([
      readRobinhoodTokenMetadata(
        address
      ),
      readRobinhoodContract(
        address
      ),
      dexSearch(
        "robinhood",
        address
      ),
    ]);

    const bestPair =
      getBestPair(pairs);

    const liquidityUsd =
      bestPair
        ? Number(
            bestPair?.liquidity?.usd ??
              0
          )
        : 0;

    const hasMetadata =
      Boolean(
        token?.name ||
        token?.symbol
      );

    const verified =
      contractInfo?.is_verified ===
        true ||
      contractInfo?.is_fully_verified ===
        true;

    const hasSource =
      Boolean(
        contractInfo?.source_code ||
        contractInfo?.sourceCode
      );

    const score =
      calculateSignalScore({
        verified:
          contractInfo
            ? verified
            : null,
        hasSource:
          contractInfo
            ? hasSource
            : null,
        liquidityUsd,
        hasMetadata,
      });

    const warnings: string[] = [];

    if (
      contractInfo &&
      !verified
    ) {
      warnings.push(
        "Contract does not appear to be verified on the available explorer."
      );
    }

    if (
      contractInfo &&
      !hasSource
    ) {
      warnings.push(
        "Verified source code was not returned."
      );
    }

    if (
      liquidityUsd <= 0
    ) {
      warnings.push(
        "No meaningful DEX liquidity was found."
      );
    } else if (
      liquidityUsd < 10000
    ) {
      warnings.push(
        "DEX liquidity is relatively low."
      );
    }

    if (!hasMetadata) {
      warnings.push(
        "Token metadata could not be resolved."
      );
    }

    if (!contractInfo) {
      warnings.push(
        "Contract verification data was not available from the explorer."
      );
    }

    return {
      type: "risk",
      network:
        "Robinhood Chain",
      address,
      level:
        scoreLabel(score),
      score,
      scoreType:
        score !== null
          ? "signal-based"
          : "insufficient-data",
      verified:
        contractInfo
          ? verified
          : null,
      hasSource:
        contractInfo
          ? hasSource
          : null,
      liquidityUsd,
      warnings,
      token,
      contract: address,
      contractInfo,
    };
  }

  const [
    source,
    tokenInfo,
    pairs,
  ] = await Promise.all([
    routescan(
      chain.routescan,
      "/etherscan/api",
      {
        module: "contract",
        action: "getsourcecode",
        address,
      }
    ),
    routescan(
      chain.routescan,
      "/etherscan/api",
      {
        module: "token",
        action: "tokeninfo",
        contractaddress: address,
      }
    ),
    dexSearch(
      chain.dex,
      address
    ),
  ]);

  const contract =
    source?.result?.[0] ??
    null;

  const token =
    tokenInfo?.result?.[0] ??
    null;

  const pairList =
    Array.isArray(pairs)
      ? pairs
      : [];

  const liquidity =
    pairList.reduce(
      (
        total: number,
        pair: any
      ) =>
        Math.max(
          total,
          Number(
            pair?.liquidity?.usd ??
              0
          )
        ),
      0
    );

  const sourceText =
    typeof contract?.SourceCode ===
    "string"
      ? contract.SourceCode.trim()
      : "";

  const abiText =
    typeof contract?.ABI ===
    "string"
      ? contract.ABI.trim()
      : "";

  const verified =
    Boolean(
      abiText &&
      abiText !==
        "Contract source code not verified"
    ) &&
    Boolean(sourceText);

  const hasSource =
    Boolean(sourceText);

  const hasMetadata =
    Boolean(
      token?.name ||
      token?.tokenName ||
      token?.TokenName ||
      token?.symbol ||
      token?.Symbol
    );

  const score =
    calculateSignalScore({
      verified,
      hasSource,
      liquidityUsd:
        liquidity,
      hasMetadata,
    });

  const warnings: string[] = [];

  if (!verified) {
    warnings.push(
      "Contract source does not appear to be verified."
    );
  }

  if (!hasSource) {
    warnings.push(
      "Verified source code was not returned."
    );
  }

  if (liquidity <= 0) {
    warnings.push(
      "No meaningful DEX liquidity was found."
    );
  } else if (
    liquidity < 10000
  ) {
    warnings.push(
      "DEX liquidity is relatively low."
    );
  }

  if (!hasMetadata) {
    warnings.push(
      "Token metadata was not returned by the explorer."
    );
  }

  return {
    type: "risk",
    network: chain.name,
    address,
    level:
      scoreLabel(score),
    score,
    scoreType:
      score !== null
        ? "signal-based"
        : "insufficient-data",
    verified,
    hasSource,
    liquidityUsd:
      liquidity,
    warnings,
    token,
    contract: address,
    contractInfo: contract,
  };
}

/* =========================================================
   GAS TRACKER
   Uses direct eth_gasPrice RPC calls.
   Does NOT use Routescan gasoracle.
   ========================================================= */

async function gasTracker() {
  const results =
    await Promise.all(
      SUPPORTED_CHAINS.map(
        async (chain) => {
          try {
            const data =
              chain.id === 4663
                ? await robinhoodRpc(
                    "eth_gasPrice"
                  )
                : await publicRpc(
                    chain.id,
                    "eth_gasPrice"
                  );

            if (data?.error) {
              throw new Error(
                data.error.message ??
                  "Gas RPC failed"
              );
            }

            const raw =
              data?.result ?? "0x0";

            const wei =
              BigInt(raw);

            const gwei =
              Number(wei) / 1e9;

            return {
              chainId: chain.id,
              network: chain.name,
              symbol: chain.symbol,
              gasPriceGwei:
                Number.isFinite(gwei)
                  ? Number(
                      gwei.toFixed(6)
                    )
                  : null,
              status:
                gwei > 0
                  ? "live"
                  : "unavailable",
            };
          } catch (error) {
            console.error(
              `Gas lookup failed for ${chain.name}:`,
              error
            );

            return {
              chainId: chain.id,
              network: chain.name,
              symbol: chain.symbol,
              gasPriceGwei: null,
              status: "unavailable",
            };
          }
        }
      )
    );

  return {
    type: "gas",
    items: results,
    networks: results,
    updatedAt:
      new Date().toISOString(),
  };
}

async function decodeTransaction(
  hash: string
) {
  const data =
    await routescan(
      "all",
      `/transactions/${hash}`
    );

  return {
    type: "transaction",
    transaction: data,
  };
}

async function approvals(
  address: string
) {
  const data =
    await routescan(
      "all",
      `/address/${address}/erc20-approvals`,
      {
        sort:
          "timestamp,desc",
        limit: "100",
      }
    );

  const items =
    Array.isArray(
      data?.items
    )
      ? data.items.filter(
          (item: any) =>
            supportedChain(
              Number(
                item.chainId
              )
            )
        )
      : [];

  const normalized =
    items.map(
      (item: any) => ({
        ...item,
        network:
          chainName(
            Number(
              item.chainId
            )
          ),
      })
    );

  return {
    type: "approvals",
    address,
    items: normalized,
    approvals: normalized,
  };
}

async function portfolioAnalytics(
  address: string
) {
  const [
    holdings,
    transfers,
  ] = await Promise.all([
    routescan(
      "all",
      `/address/${address}/erc20-holdings`,
      {
        limit: "100",
      }
    ),
    routescan(
      "all",
      `/address/${address}/erc20-transfers`,
      {
        direction: "all",
        excludeZeroValue:
          "true",
        sort: "desc",
        limit: "50",
      }
    ),
  ]);

  const nativeBalances =
    await Promise.all(
      SUPPORTED_CHAINS
        .filter(
          (chain) =>
            chain.id !== 4663
        )
        .map(
          (chain) =>
            getChainNativeBalance(
              chain,
              address
            )
        )
    );

  const filteredHoldings =
    Array.isArray(
      holdings?.items
    )
      ? holdings.items.filter(
          (item: any) =>
            supportedChain(
              Number(
                item.chainId
              )
            )
        )
      : [];

  const filteredTransfers =
    Array.isArray(
      transfers?.items
    )
      ? transfers.items.filter(
          (item: any) =>
            supportedChain(
              Number(
                item.chainId
              )
            )
        )
      : [];

  const tokenValue =
    filteredHoldings.reduce(
      (
        total: number,
        item: any
      ) =>
        total +
        Number(
          item.tokenValueInUsd ??
            0
        ),
      0
    );

  const totalTransfers =
    filteredTransfers.length;

  const activeNativeNetworks =
    nativeBalances.filter(
      (item) =>
        !item.unavailable &&
        Number(
          item.formatted
        ) > 0
    );

  const networkCount =
    new Set(
      [
        ...filteredHoldings,
        ...activeNativeNetworks,
      ].map(
        (item: any) =>
          Number(
            item.chainId
          )
      )
    ).size;

  return {
    type: "analytics",
    address,
    tokenValue,
    totalTransfers,
    networkCount,

    holdings:
      filteredHoldings.map(
        (item: any) => ({
          ...item,
          network:
            chainName(
              Number(
                item.chainId
              )
            ),
        })
      ),

    gasBalances:
      nativeBalances,

    transfers:
      filteredTransfers.map(
        (item: any) => ({
          ...item,
          network:
            chainName(
              Number(
                item.chainId
              )
            ),
        })
      ),
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const action =
      searchParams.get(
        "action"
      );

    const address =
      searchParams.get(
        "address"
      );

    const contract =
      searchParams.get(
        "contract"
      );

    const chainId =
      Number(
        searchParams.get(
          "chainId"
        )
      );

    const hash =
      searchParams.get(
        "hash"
      );

    if (
      action === "token"
    ) {
      if (
        !contract ||
        !chainId
      ) {
        return NextResponse.json(
          {
            error:
              "Contract address and network are required.",
          },
          {
            status: 400,
          }
        );
      }

      return NextResponse.json(
        await tokenScan(
          contract,
          chainId
        )
      );
    }

    if (
      action === "address"
    ) {
      if (!address) {
        return NextResponse.json(
          {
            error:
              "Wallet address is required.",
          },
          {
            status: 400,
          }
        );
      }

      return NextResponse.json(
        await addressExplorer(
          address
        )
      );
    }

    if (
      action === "risk"
    ) {
      if (
        !contract ||
        !chainId
      ) {
        return NextResponse.json(
          {
            error:
              "Contract address and network are required.",
          },
          {
            status: 400,
          }
        );
      }

      return NextResponse.json(
        await riskScan(
          contract,
          chainId
        )
      );
    }

    if (
      action === "gas"
    ) {
      return NextResponse.json(
        await gasTracker()
      );
    }

    if (
      action === "transaction"
    ) {
      if (!hash) {
        return NextResponse.json(
          {
            error:
              "Transaction hash is required.",
          },
          {
            status: 400,
          }
        );
      }

      return NextResponse.json(
        await decodeTransaction(
          hash
        )
      );
    }

    if (
      action === "approvals"
    ) {
      if (!address) {
        return NextResponse.json(
          {
            error:
              "Wallet address is required.",
          },
          {
            status: 400,
          }
        );
      }

      return NextResponse.json(
        await approvals(
          address
        )
      );
    }

    if (
      action === "analytics"
    ) {
      if (!address) {
        return NextResponse.json(
          {
            error:
              "Wallet address is required.",
          },
          {
            status: 400,
          }
        );
      }

      return NextResponse.json(
        await portfolioAnalytics(
          address
        )
      );
    }

    return NextResponse.json(
      {
        error:
          "Unknown Tools action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "Agora Tools API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Tools request failed.",
      },
      {
        status: 500,
      }
    );
  }
}