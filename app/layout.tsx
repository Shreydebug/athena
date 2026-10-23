import type { Metadata } from "next";
import { Pixelify_Sans, Silkscreen, JetBrains_Mono, IBM_Plex_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const pixel = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const jbMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plexmono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const fraunces = Fraunces({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  "# ATHENA — Crime Against Women in India, 2001–2021",
  description:
    "Neo intelligence console for exploring, comparing and forecasting crime trends across India (2001–2021).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pixel.variable} ${silkscreen.variable} ${jbMono.variable} ${plexMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="console-bg" aria-hidden />
        <div className="console-grid" aria-hidden />
        <div className="console-radar" aria-hidden />
        <div className="pixel-dots" aria-hidden />
        <div className="console-noise" aria-hidden />
        {children}
      </body>
    </html>
  );
}