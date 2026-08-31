import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://ps-matchlog-prizehunter.awj120400.chatgpt.site"),
  title: "PS Matchlog",
  description: "Competitive programming match history and growth tracker.",
  openGraph: {
    title: "PS Matchlog",
    description: "Contest history · Training frontier · Upsolve",
    images: [
      {
        url: "https://ps-matchlog-prizehunter.awj120400.chatgpt.site/og.png",
        alt: "PS Matchlog social preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PS Matchlog",
    description: "Contest history · Training frontier · Upsolve",
    images: ["https://ps-matchlog-prizehunter.awj120400.chatgpt.site/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
