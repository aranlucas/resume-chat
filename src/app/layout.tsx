import { cn } from "@/lib/utils";
import "@/styles/globals.css";
import NavBar from "@/components/navbar";
import { TailwindIndicator } from "@/components/tailwind-indicator";
import { Analytics } from "@vercel/analytics/react";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Chat with Lucas",
  description: "Get to know Lucas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn("bg-muted/50 font-sans antialiased", inter.className)}
      >
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
