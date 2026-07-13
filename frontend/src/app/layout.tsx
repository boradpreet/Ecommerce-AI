import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ChatSupportAgent } from "src/components/chat-support/chat-support-agent";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Voqly AI | Enterprise Onboarding",
  description: "Create your automated AI Voice Calling Agents in under 2 minutes. Glassmorphic enterprise SaaS portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${inter.variable} font-sans bg-neutral-950 text-white antialiased min-h-screen selection:bg-slate-900 selection:text-white`}
      >
        {children}
        <ChatSupportAgent />
      </body>
    </html>
  );
}

