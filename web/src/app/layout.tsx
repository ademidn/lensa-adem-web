import type { Metadata, Viewport } from "next";
import "./globals.css";

// ─── Metadata ─────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Lensa Adem — Regulasi Lingkungan Hidup Indonesia",
  description:
    "Platform konsultasi regulasi pengelolaan lingkungan hidup Indonesia. Temukan informasi dari UU, PP, Permen, dan Perpres secara akurat dan terpercaya.",
  keywords: [
    "regulasi lingkungan hidup",
    "AMDAL",
    "hukum lingkungan indonesia",
    "peraturan menteri lingkungan",
    "pengelolaan sampah",
  ],
};

// ─── Viewport ─────────────────────────────────────────────
// Prevents iOS from zooming on input focus

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

// ─── Root Layout ──────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        {/* Font preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Lora: answer body + citation previews (authoritative) */}
        {/* DM Sans: UI chrome + metadata (clean, readable)       */}
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap"
          rel="stylesheet"
        />
      </head>

      <body>
        {children}
      </body>
    </html>
  );
}