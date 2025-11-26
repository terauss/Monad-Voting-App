'use client';

import { createAppKit } from '@reown/appkit'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum } from '@reown/appkit/networks'

// Get Project ID from https://dashboard.reown.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect may not work properly.');
}

// Custom Monad Testnet network
const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz/'],
    },
    public: {
      http: ['https://testnet-rpc.monad.xyz/'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monadvision.com',
    },
  },
  testnet: true,
}

const monadMainnet = {
  id: 143,
  name: 'Monad Mainnet',
  network: 'monad-mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.monad.xyz'],
    },
    public: {
      http: ['https://rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://monadvision.com/',
    },
  },
  testnet: false,
}

// Network configuration
export const networks = [mainnet, arbitrum, monadTestnet, monadMainnet] as const

// App metadata
const metadata = {
  name: 'Monad voting app',
  description: 'Monad voting app with blockchain voting',
  url: 'https://happy-vote-app.vercel.app',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Create Wagmi adapter
export const wagmiAdapter = new WagmiAdapter({
  projectId: projectId || 'default-project-id',
  networks: networks as any
})

// Create AppKit modal
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: networks as any,
  metadata,
  projectId: projectId || 'default-project-id',
  features: {
    analytics: true
  }
})

// Wallet functions
export const openConnectModal = (): void => {
  modal.open()
}

export const openNetworkModal = (): void => {
  modal.open({ view: 'Networks' })
}

export const closeModal = (): void => {
  modal.close()
}

