import type { Metadata } from "next";
import { Chakra_Petch, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/systemix/Providers";
import "./globals.css";
import "@/vendor/transitions/ui-generation.css";
import "@/styles/motion.css";

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const SITE_TITLE = "Systemix: a product studio built on your design system";
const SITE_DESCRIPTION =
  "A free Claude Code plugin. A designer sets it up once; engineers, product and marketing ship through it. The agent reads your rules, code checks the work, and a person makes every call.";

// Runs before first paint. html.js: JavaScript is on. html.motion-ready: it is on and the reader
// has not asked for reduced motion, so entrance states may start hidden (src/styles/motion.css).
// html.motion-settled after --motion-settle shows everything, but only when the page's scripts
// never started (no html.motion-live, set by SectionTrack): otherwise a section scrolled to after
// the first seconds would appear already finished instead of revealing.
const MOTION_BOOT = `(function(){var d=document.documentElement;d.classList.add("js");
if(!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("motion-ready");}
addEventListener("DOMContentLoaded",function(){var t=parseFloat(getComputedStyle(d).getPropertyValue("--motion-settle"))||0;
setTimeout(function(){if(!d.classList.contains("motion-live"))d.classList.add("motion-settled")},t)});})();`;

export const metadata: Metadata = {
  metadataBase: new URL("https://getsystemix.vercel.app"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "Systemix",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-radius="sharp" data-crt="soft">
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      </head>
      <body className={`${chakraPetch.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {/* TVA CRT atmosphere — fixed overlays, tokenized via [data-crt] */}
        <div className="crt-scan" aria-hidden="true" />
        <div className="crt-veil" aria-hidden="true" />
        <div className="crt-sweep" aria-hidden="true" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
