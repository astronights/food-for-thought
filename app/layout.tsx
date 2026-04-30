import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Food for Thought",
  description: "Look up nutrition info for your favourite Singapore restaurants — no sign-up required.",
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
