import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { locales } from '@/config';
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import type { Metadata } from "next";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ollama Monitor",
  description: "Ollama Monitor",
};

interface RootLayoutProps {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

async function getMessages(locale: string) {
  try {
    return (await import(`@/i18n/locales/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }
}

export default async function RootLayout({
  children,
  params
}: RootLayoutProps) {
  const resolvedParams = await params;
  const messages = await getMessages(resolvedParams.locale);
  const now = new Date();

  return (
    <html lang={resolvedParams.locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider 
          locale={resolvedParams.locale} 
          messages={messages} 
          timeZone="UTC"
          now={now}
        >
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
