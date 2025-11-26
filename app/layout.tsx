import type { Metadata } from 'next';
import { AppWagmiProvider } from '@/components/WagmiProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Monad voting app',
  description: 'Monad voting app with blockchain voting',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppWagmiProvider>{children}</AppWagmiProvider>
      </body>
    </html>
  );
}

