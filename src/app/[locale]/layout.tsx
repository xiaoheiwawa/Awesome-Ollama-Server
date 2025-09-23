import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { locales } from '@/config';
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import type { Metadata } from "next";
import Script from 'next/script';
import * as React from 'react'
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
    console.error(error);
  }
}

export default async function RootLayout(props: RootLayoutProps) {
  const params = await props.params;

  const {
    children
  } = props;

  const messages = await getMessages(params.locale); // 异步获取 messages
  const now = new Date();

  return (
    <html lang={params.locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JLNZB97S2P"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-JLNZB97S2P');
          `}
        </Script>
        
        <NextIntlClientProvider
          locale={params.locale}
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
