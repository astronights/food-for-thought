import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const BASE_URL = "https://food-for-thought-kappa.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Food for Thought — Singapore Restaurant Nutrition",
    template: "%s | Food for Thought",
  },
  description:
    "Look up calorie and nutrition info for Singapore restaurants. Build your meal and see live nutrition totals — no sign-up needed.",
  keywords: ["Singapore nutrition", "restaurant calories Singapore", "healthy eating Singapore", "meal nutrition calculator"],
  openGraph: {
    type: "website",
    siteName: "Food for Thought",
    title: "Food for Thought — Singapore Restaurant Nutrition",
    description:
      "Look up calorie and nutrition info for Singapore restaurants. Build your meal and see live nutrition totals — no sign-up needed.",
    url: BASE_URL,
  },
  twitter: {
    card: "summary",
    title: "Food for Thought — Singapore Restaurant Nutrition",
    description: "Look up calorie and nutrition info for Singapore restaurants. No sign-up needed.",
  },
  robots: { index: true, follow: true },
  verification: { google: "hLj2N6fY2BGfe1J9j5U4tr2E_WYzpuAOUgomWDtNF70" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={spaceGrotesk.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
