import type { JsonResume } from "@/lib/resume";

/** Page copy that isn't in the public resume. */
export const PROFILE = {
  email: "aranlucas@gmail.com",
};

export interface Role {
  years: string;
  company: string;
  role: string;
  note: string;
  question: string;
}

// One-liners and suggested questions for the timeline, keyed by company or
// school name in the resume. Entries without one still appear.
const HIGHLIGHTS: Record<string, { note: string; question: string }> = {
  DoorDash: {
    note: "Led Ask DoorDash's grocery agent from prototype to launch",
    question: "What did Lucas build at DoorDash, and what was the impact?",
  },
  "Amazon Web Services (AWS)": {
    note: "Launched SiteWise Monitor to GA; moved the console to React",
    question: "What did Lucas ship on the AWS IoT team?",
  },
  Amazon: {
    note: "Built compliance and fraud-investigation systems",
    question: "What did Lucas work on in Amazon Compliance Technologies?",
  },
  "University of Florida": {
    note: "",
    question: "Where did Lucas go to school?",
  },
};

const year = (yearMonth: string) => yearMonth.slice(0, 4);

const highlight = (name: string) =>
  HIGHLIGHTS[name] ?? { note: "", question: `What did Lucas do at ${name}?` };

export function toProfile(resume: JsonResume) {
  return {
    name: resume.basics.name,
    location: resume.basics.location.city,
    email: PROFILE.email,
    links: resume.basics.profiles.map((p) => ({ label: p.network, href: p.url })),
  };
}

export type Profile = ReturnType<typeof toProfile>;

/** Full-time roles and education; internships are left off the timeline. */
export function toRoles(resume: JsonResume): Role[] {
  const jobs = resume.work
    .filter((job) => !/\bIntern$/.test(job.position))
    .map((job) => ({
      years: `${year(job.startDate)}–${job.endDate ? year(job.endDate) : "now"}`,
      company: job.name,
      role: job.position,
      ...highlight(job.name),
    }));
  const schools = resume.education.map((school) => ({
    years: year(school.endDate),
    company: school.institution,
    role: `${school.studyType} ${school.area}, ${school.score}`,
    ...highlight(school.institution),
  }));
  return [...jobs, ...schools];
}

export const STARTERS = [
  "Why would Lucas be a strong hire for an AI agents team?",
  "How did the Ask DoorDash grocery agent go from prototype to launch?",
  "What's his experience with MCP and agent infrastructure?",
  "What languages and platforms does he work in?",
];
