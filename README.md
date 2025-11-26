# Happy Vote App - Next.js

A blockchain voting application built with Next.js, React, TypeScript, and Three.js.

## Features

- 🎨 Modern 3D UI with Three.js animations
- 🔗 Wallet connection (MetaMask & WalletConnect)
- 🌐 Multi-network support (Monad Testnet & Mainnet)
- 📊 Real-time voting and leaderboard
- 🌓 Dark/Light theme toggle
- 📱 Fully responsive design

## Getting Started

### Prerequisites

- Node.js 18+ and npm 8+

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_TESTNET_CONTRACT_ADDRESS=0x7fB4F5Fc2a6f2FAa86F5F37EAEE8A0db820ad9E0
NEXT_PUBLIC_MAINNET_CONTRACT_ADDRESS=your_mainnet_contract_address
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── layout.tsx       # Root layout with providers
│   ├── page.tsx         # Main page component
│   └── globals.css      # Global styles
├── components/
│   ├── WagmiProvider.tsx    # Wagmi & React Query provider
│   └── ThreeBackground.tsx  # 3D background component
├── lib/
│   ├── walletProvider.ts    # Wallet connection logic
│   ├── abi.json             # Testnet contract ABI
│   └── abiMainnet.json      # Mainnet contract ABI
├── public/
│   └── background.mp4       # Video background
└── package.json
```

## Environment Variables

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Your WalletConnect Project ID (get from [Reown Dashboard](https://dashboard.reown.com))
- `NEXT_PUBLIC_TESTNET_CONTRACT_ADDRESS` - Testnet contract address (optional)
- `NEXT_PUBLIC_MAINNET_CONTRACT_ADDRESS` - Mainnet contract address (optional)

## Build

```bash
npm run build
# or
yarn build
```

## Deployment

The app is ready to be deployed on Vercel, Netlify, or any platform that supports Next.js.

## Migration from Create React App

This project has been migrated from Create React App to Next.js. Key changes:

- Environment variables: `REACT_APP_*` → `NEXT_PUBLIC_*`
- File structure: `src/` → `app/`, `components/`, `lib/`
- Routing: React Router → Next.js App Router
- Build system: react-scripts → Next.js

## License

MIT
