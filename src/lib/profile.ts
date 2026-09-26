/**
 * Structured highlights from the resume, used by the page itself.
 * Keep in sync with the resume in github.com/aranlucas/resume.
 */
export const PROFILE = {
  name: "Lucas Arango",
  title: "Senior software engineer",
  location: "Seattle",
  email: "aranlucas@gmail.com",
  links: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/lucasarango" },
    { label: "GitHub", href: "https://github.com/aranlucas" },
  ],
};

export interface Role {
  years: string;
  company: string;
  role: string;
  note: string;
  question: string;
}

export const ROLES: Role[] = [
  {
    years: "2023–now",
    company: "DoorDash",
    role: "Senior Software Engineer",
    note: "Led Ask DoorDash's grocery agent from prototype to launch",
    question: "What did Lucas build at DoorDash, and what was the impact?",
  },
  {
    years: "2019–2022",
    company: "AWS IoT",
    role: "Software Development Engineer",
    note: "Launched SiteWise Monitor to GA; moved the console to React",
    question: "What did Lucas ship on the AWS IoT team?",
  },
  {
    years: "2015–2019",
    company: "Amazon",
    role: "Software Development Engineer",
    note: "Built compliance and fraud-investigation systems",
    question: "What did Lucas work on in Amazon Compliance Technologies?",
  },
  {
    years: "2015",
    company: "University of Florida",
    role: "B.S. Computer Engineering, cum laude",
    note: "",
    question: "Where did Lucas go to school?",
  },
];

export const STARTERS = [
  "Why would Lucas be a strong hire for an AI agents team?",
  "How did the Ask DoorDash grocery agent go from prototype to launch?",
  "What's his experience with MCP and agent infrastructure?",
  "What languages and platforms does he work in?",
];
