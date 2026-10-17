import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AppProvider } from "@/components/AppProvider";
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
    { media: "(prefers-color-scheme: light)", color: "#f6faf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1413" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AppProvider>
          {/* Pages read URL data (params, pathname) at runtime, so they stream in after the static shell. */}
          <main className="mx-auto min-h-screen max-w-md px-4 pb-28">
            <Suspense fallback={null}>{children}</Suspense>
          </main>
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        </AppProvider>
      </body>
    </html>
  );
}
