import { PROFILE } from "@/lib/profile";

// The resume is published from github.com/aranlucas/resume as JSON Resume
// (https://jsonresume.org/schema) plus a Markdown rendering. Both are cached
// for 30 days; the resume repo's deploy calls /api/revalidate to refresh sooner.

export const RESUME_CACHE_TAG = "resume";

const RESUME_API = (
  process.env.RESUME_API_URL ?? "https://resume-api.aranlucas.workers.dev"
).replace(/\/$/, "");

async function fetchResumeFile(file: string): Promise<Response> {
  const res = await fetch(`${RESUME_API}/${file}`, {
    next: { revalidate: 60 * 60 * 24 * 30, tags: [RESUME_CACHE_TAG] },
  });
  if (!res.ok) throw new Error(`GET ${RESUME_API}/${file} → ${res.status}`);
  return res;
}

/** The subset of JSON Resume this app reads. Dates are always "YYYY-MM". */
export type JsonResume = {
  basics: {
    name: string;
    location: { city: string };
    profiles: { network: string; url: string }[];
  };
  work: { name: string; position: string; startDate: string; endDate?: string }[];
  education: {
    institution: string;
    studyType: string;
    area: string;
    score: string;
    endDate: string;
  }[];
};

function isJsonResume(value: unknown): value is JsonResume {
  return typeof value === "object" && value !== null && "basics" in value && "work" in value;
}

export async function getResume(): Promise<JsonResume> {
  const data: unknown = await (await fetchResumeFile("resume.json")).json();
  if (!isJsonResume(data)) throw new Error(`${RESUME_API}/resume.json is not a JSON Resume`);
  return data;
}

/**
 * The resume is small enough (~1.5k tokens) to fit directly in the system
 * prompt, so no vector database or paid embeddings are needed.
 */
export async function getSystemPrompt(): Promise<string> {
  const resume = await (await fetchResumeFile("resume.md")).text();
  return `You are "Ask Lucas", a friendly assistant that answers questions about Lucas Arango's resume and background.

Guidelines:
- Answer using the resume context below. Prefer specific facts: company names, dates, technologies, and outcomes.
- If a question goes beyond the resume, say so honestly and offer what you can infer from related experience. Do not invent employers, dates, or metrics.
- Keep answers concise (2-6 sentences for simple questions). Use short bullet lists for skills, experience, or project questions.
- Speak as an assistant describing Lucas in third person.
- If asked for contact info, share the links and email in the resume.
- The people reading are usually recruiters and hiring managers. Lead with outcomes and scope, and connect experience to what the asker seems to be hiring for.
- Format with light Markdown: **bold** for company or project names, short bullet lists. No headings or tables.

Resume:
${resume}
Contact email: ${PROFILE.email}
`;
}
