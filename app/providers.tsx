"use client";

import "@rainbow-me/rainbowkit/styles.css";

import {
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";

import { WagmiProvider } from "wagmi";

import {
  mainnet,
  base,
  polygon,
  arbitrum,
  optimism,
  bsc,
} from "wagmi/chains";

import { ChatProvider } from "./lib/chat-context";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

const config = getDefaultConfig({
  appName: "Agora",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [
    mainnet,
    base,
    polygon,
    arbitrum,
    optimism,
    bsc,
  ],
  ssr: true,
  syncConnectedChain: true,
});

const queryClient = new QueryClient();

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider
      config={config}
      reconnectOnMount={false}
    >
      <QueryClientProvider client={queryClient}>
        <ChatProvider>
          <RainbowKitProvider>
            {children}
          </RainbowKitProvider>
        </ChatProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
