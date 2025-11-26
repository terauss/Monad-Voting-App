'use client';

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiAdapter } from '@/lib/walletProvider';

const queryClient = new QueryClient();

interface AppWagmiProviderProps {
  children: React.ReactNode;
}

export function AppWagmiProvider({ children }: AppWagmiProviderProps) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

