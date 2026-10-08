import { ThemeToggle } from "@/components/theme-toggle";
import { TypesetResponse } from "@/components/typeset-response";
import { getResumeMarkdown } from "@/lib/resume";
import type { Metadata } from "next";
import Link from "next/link";

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
      <TypesetResponse mode="static" controls={false}>
        {markdown}
      </TypesetResponse>
    </main>
  );
}
