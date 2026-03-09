import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "VALAR Macro Screener",
  description: "Macro Pulse Intelligence System — Professional Macro Risk Terminal",
  openGraph: {
    title: "VALAR Macro Screener",
    description: "Macro Pulse Intelligence System — Professional Macro Risk Terminal",
    type: "website",
    images: ["https://replit.com/public/images/opengraph.png"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@replit",
    title: "VALAR Macro Screener",
    description: "Macro Pulse Intelligence System — Professional Macro Risk Terminal",
    images: ["https://replit.com/public/images/opengraph.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
