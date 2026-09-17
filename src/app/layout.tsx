import { cn } from "@/lib/utils";
import "./globals.css";
import NavBar from "@/components/navbar";
import { TailwindIndicator } from "@/components/tailwind-indicator";
import { Analytics } from "@vercel/analytics/react";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { type ReactNode } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Ask Lucas — Resume Chat",
  description: "Chat with an AI assistant that knows Lucas Arango's resume.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("bg-muted/50 font-sans antialiased", inter.className)}>
        <Providers>
          <main className="flex h-[calc(100dvh)] w-full flex-col">
            <NavBar />
            {children}
          </main>
          <TailwindIndicator />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
