import type { Metadata, Viewport } from "next";
import { Fredoka, Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AppProvider } from "@/components/AppProvider";
import { I18nProvider } from "@/i18n";
import { BottomNav } from "@/components/ui";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ripple",
  description: "Turn 'I should help' into 'I helped': personalized, verified, local quests for Markham and York Region.",
  appleWebApp: { capable: true, title: "Ripple", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7ff" },
    { media: "(prefers-color-scheme: dark)", color: "#120a22" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <I18nProvider>
        <AppProvider>
          {/* Pages read URL data (params, pathname) at runtime, so they stream in after the static shell. */}
          <main className="mx-auto min-h-screen max-w-md px-4 pb-28">
            <Suspense fallback={null}>{children}</Suspense>
          </main>
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        </AppProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
