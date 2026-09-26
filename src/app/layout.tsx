import "./globals.css";
import { TailwindIndicator } from "@/components/tailwind-indicator";
import { Analytics } from "@vercel/analytics/react";
import { Schibsted_Grotesk } from "next/font/google";
import { Providers } from "./providers";
import { type ReactNode } from "react";

const schibsted = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted" });

export const metadata = {
  title: "Lucas Arango — Ask about my work",
  description:
    "Senior software engineer building AI agents at DoorDash. Ask an agent anything about his experience.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={schibsted.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <TailwindIndicator />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
