import { Geist, Geist_Mono } from 'next/font/google';
import type { Metadata } from 'next';

import { Providers } from '../components/providers';
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
  title: 'Coinmaester',
  description: 'AI-powered personal finance tracker',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_STYLE_INIT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeStyleProvider>
            <Providers>{children}</Providers>
          </ThemeStyleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
