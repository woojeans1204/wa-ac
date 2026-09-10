import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteAnalytics } from "@/components/site-analytics";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

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
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <SiteAnalytics />
      </body>
    </html>
  );
}
