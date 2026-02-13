import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import ChatButton from "@/components/chat/ChatButton";
import ChatWindow from "@/components/chat/ChatWindow";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OPTCG AI Agent - One Piece TCG Deck Builder",
  description: "AI-powered deck building and analysis for One Piece Trading Card Game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen">
            {/* Floating glass navigation */}
            <nav className="fixed top-3 left-4 right-4 z-50 glass-heavy rounded-2xl">
              <div className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <a href="/" className="text-xl font-bold gradient-text">
                    OPTCG AI Agent
                  </a>
                  <div className="bg-white/5 rounded-xl p-1 flex gap-1">
                    <a
                      href="/cards"
                      className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm"
                    >
                      Cards
                    </a>
                    <a
                      href="/deck-builder"
                      className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm"
                    >
                      Deck Builder
                    </a>
                    <a
                      href="/decks"
                      className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm"
                    >
                      Decks
                    </a>
                    <a
                      href="/settings"
                      className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm"
                    >
                      Settings
                    </a>
                  </div>
                </div>
              </div>
            </nav>

            {/* Main content with nav offset */}
            <main className="pt-20 pb-8">{children}</main>
          </div>
          <ChatButton />
          <ChatWindow />
        </Providers>
      </body>
    </html>
  );
}
