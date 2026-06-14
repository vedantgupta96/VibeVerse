import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Starfield } from "@/components/layout/Starfield";
import { Providers } from "./providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "VibeVerse",
  description:
    "Explore your music taste as a living galaxy — AI playlists, music memories, and your Taste DNA.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Clash Display ships from Fontshare, not Google Fonts */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600&display=swap"
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} min-h-dvh`}
      >
        <Starfield />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
