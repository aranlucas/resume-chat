import { ThemeToggle } from "@/components/theme-toggle";
import { TypesetResponse } from "@/components/typeset-response";
import { getResumeMarkdown } from "@/lib/resume";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Resume · Lucas Arango" };

export default async function Resume() {
  const markdown = await getResumeMarkdown();

  return (
    <main className="mx-auto max-w-176 px-5 pbs-10 pbe-16 sm:px-8 sm:pbs-14">
      <div className="mbe-10 flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-slate hover:text-cobalt">
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
