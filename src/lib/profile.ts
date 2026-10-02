import { getResume, type JsonResume } from "@/lib/resume";

interface Role {
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

/** Fetch and project the public resume into the data the page displays. */
export async function getProfile() {
  const resume = await getResume();
  return {
    name: resume.basics.name,
    location: resume.basics.location.city,
    links: resume.basics.profiles.map((p) => ({ label: p.network, href: p.url })),
    roles: toRoles(resume),
  };
}

export type Profile = Awaited<ReturnType<typeof getProfile>>;

/** Full-time roles and education; internships are left off the timeline. */
function toRoles(resume: JsonResume): Role[] {
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
