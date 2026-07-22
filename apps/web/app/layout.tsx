import { Geist, Geist_Mono } from 'next/font/google';
import type { Metadata } from 'next';
import Script from 'next/script';

import { Providers } from '../components/providers';
import { ThemeColorSync } from '../components/theme-color-sync';
import { ThemeProvider } from '../components/theme-provider';
import { ThemeStyleProvider } from '../components/theme-style-provider';
import { THEME_STYLE_INIT_SCRIPT } from '../lib/theme-styles';
import './globals.css';
import '@repo/ui/globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Coinmaester',
    template: '%s · Coinmaester',
  },
  description:
    'Open-source personal finance tracking from transaction emails.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen`}
      >
        <Script
          id="theme-style-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_STYLE_INIT_SCRIPT }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeColorSync />
          <ThemeStyleProvider>
            <Providers>{children}</Providers>
          </ThemeStyleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
