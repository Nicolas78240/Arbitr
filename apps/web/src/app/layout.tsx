import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/lib/query-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Arbitr',
  description: 'Plateforme de sélection collective de projets par jury',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <QueryProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster position="bottom-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
