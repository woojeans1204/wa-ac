import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SITE_URL } from "@/lib/site-url";
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
  metadataBase: new URL(SITE_URL),
  title: "WA:AC",
  description: "Competitive programming match history and growth tracker.",
  verification: {
    google: "5rrYeFhURYKOIoowvkCoNy8HU2-1pw-8RONKU0CvGe4",
  },
  openGraph: {
    type: "website",
    siteName: "WA:AC",
    url: SITE_URL,
    title: "WA:AC",
    description: "Contest history · Training frontier · Upsolve",
    images: [
      {
        url: "/og.png",
        alt: "WA:AC social preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WA:AC",
    description: "Contest history · Training frontier · Upsolve",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg?v=2",
    shortcut: "/favicon.svg?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
