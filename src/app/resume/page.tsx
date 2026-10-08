import { ThemeToggle } from "@/components/theme-toggle";
import { getResumeMarkdown } from "@/lib/resume";
import type { Metadata } from "next";
import Link from "next/link";
import { Streamdown } from "streamdown";

export const metadata: Metadata = { title: "Resume · Lucas Arango" };

export default async function Resume() {
  const markdown = await getResumeMarkdown();

  return (
    <main className="mx-auto max-w-[44rem] px-5 pt-10 pb-16 sm:px-8 sm:pt-14">
      <div className="mb-10 flex items-center justify-between gap-4">
        <Link href="/" className="text-slate hover:text-cobalt text-sm">
          ← Ask Lucas
        </Link>
        <ThemeToggle />
      </div>
      <Streamdown
        mode="static"
        controls={false}
        linkSafety={{ enabled: false }}
        className="answer resume text-ink text-[17px] leading-relaxed"
      >
        {markdown}
      </Streamdown>
    </main>
  );
}
