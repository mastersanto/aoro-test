import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Self-hosted by next/font — no runtime request to Google, and each face
// declares a fallback stack so a font failure degrades rather than reflows
// into an unreadable layout (VR-5).
const displaySans = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["Segoe UI", "system-ui", "-apple-system", "sans-serif"],
});

const figureMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: "Polymarket Widget",
  description: "Browse Polymarket prediction markets, get AI help choosing one, and place a bet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${displaySans.variable} ${figureMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
