import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import EnvBanner from '@/components/core/banners/env-banner';
import ReactQueryProvider from '@/components/core/providers/react-query-provider';
import { Provider } from '@/components/ui/provider';
import { routing } from '@/localization/routing';
import type { Locale } from '@/types/Locale';

/**
 * Metadata for each page, can be overridden by page-specific metadata (e.g., in page.tsx)
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://tonsite.be'), // base url
  title: {
    default: 'Website', // default title
    template: '%s – Website', // template for page titles
  },
  description: 'Default description for the website',
  openGraph: {
    siteName: 'Website',
    locale: 'fr_BE',
    type: 'website',
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) notFound();

  // Passe les messages au client (pour les Client Components)
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Provider>
          <NextIntlClientProvider messages={messages}>
            <EnvBanner />
            <ReactQueryProvider>{children}</ReactQueryProvider>
          </NextIntlClientProvider>
        </Provider>
      </body>
    </html>
  );
}
