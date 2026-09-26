/**
 * Static resume context, transcribed from ~/Projects/resume/Lucas_Arango_Resume.tex.
 * The resume is small enough (~1.5k tokens) to fit directly in the system
 * prompt, so no vector database or paid embeddings are needed.
 */
export const RESUME_CONTEXT = `# Lucas Arango — Senior Software Engineer
Phone: (786) 259-7659 | Email: aranlucas@gmail.com
LinkedIn: linkedin.com/in/lucasarango | GitHub: github.com/aranlucas | Site: lucasarango.space

## Summary
Senior software engineer with 10+ years at DoorDash, AWS, and Amazon, building AI agent platforms and cloud services. Led Ask DoorDash's grocery agent from prototype to launch; own shared agent infrastructure and set reliability standards across teams.

## Experience

### DoorDash — Seattle, WA — Senior Software Engineer (Oct 2023 – Present)
- Prototyped and led engineering for Ask DoorDash's grocery agent, launched June 2026. It converts recipe links and photos into personalized carts across roughly 800,000 products, increasing average order totals.
- Own New Verticals agent infrastructure and reliability, including the grocery agent and shared Model Context Protocol (MCP) tools used by the restaurant agent, DoorDash's ChatGPT integration, and developer CLI.
- Wrote the agent-platform strategy and secured leadership support to expand from external MCP grocery ordering to the in-app Assistant, coordinating delivery across engineering, ML, product, and design.
- Built DashMart's integration-test framework on isolated test tenants and migrated execution from Jenkins to Buildkite on Kubernetes. Set org-wide performance standards with golden-path SLOs and blocking CI regression gates.
- Mentor New Verticals engineers on agent architecture and MCP tool design. Drive adoption of Claude Code and Codex with architecture and security review before merge.

### Amazon Web Services (AWS) — Seattle, WA — Software Development Engineer, AWS IoT (Jul 2019 – Jul 2022)
- Built the AWS IoT SiteWise Monitor control plane (Go, DynamoDB, API Gateway), announced at re:Invent; led operational readiness review and launched the service to general availability.
- Cut AWS IoT Console release lead time from weeks to days by leading the Angular-to-React migration and establishing microfrontends with independent CDK deployment pipelines for 5+ sub-teams.
- Designed SSO federation for SiteWise Monitor and built Synthetics canaries that caught console regressions before release.

### Amazon — Seattle, WA — Software Development Engineer, Compliance Technologies (Jul 2015 – Jul 2019)
- Built a case-management platform for anti-money-laundering and identity-theft investigations using Ruby on Rails and Java Spring, with end-to-end encryption, granular access controls, and audit logging.
- Led design and development of suspicious-transaction reporting (STR/SAR) systems for the Luxembourg Financial Intelligence Unit and UK National Crime Agency, meeting requirements for Amazon payments in both markets.

### Internships (2013 – 2014)
- Amazon (Seattle, WA) — Software Development Engineer Intern: integrated Kindle Unlimited books into Goodreads (Goodreads is an Amazon product; this was an Amazon internship).
- BlackBerry (Sunrise, FL) — Software Development Engineer Intern: tested BlackBerry handheld software (smoke, regression, GUI). Sunrise, FL is a city, not an employer.

## Selected Projects

### Multi-Agent Platform (Personal Project) — github.com/aranlucas/agents
- Build and operate Go agents with Google ADK behind a Go gateway on Railway, using Cloudflare D1 for sessions and R2 for artifacts; Next.js/CopilotKit and Expo clients share agent state through AG-UI streaming.
- Built a wellness agent that delegates to grocery and fitness agents through Google ADK task orchestration and shared typed state. The platform's grocery agent inspired the Ask DoorDash prototype.

## Education
- University of Florida, Gainesville, FL — B.S., Computer Engineering, cum laude (May 2015)

## Skills
- Languages: Java, Kotlin, TypeScript, Go, Python, Ruby, SQL
- Platforms: AWS, CDK, DynamoDB, Cloudflare D1/R2, Docker, Kubernetes, Buildkite
- Web/Mobile: React, Next.js, Expo, Java Spring, Ruby on Rails
- AI/Agents: Google ADK, MCP, AG-UI, CopilotKit, Claude Code, Codex
`;

export const SYSTEM_PROMPT = `You are "Ask Lucas", a friendly assistant that answers questions about Lucas Arango's resume and background.

Guidelines:
- Answer using the resume context below. Prefer specific facts: company names, dates, technologies, and outcomes.
- If a question goes beyond the resume, say so honestly and offer what you can infer from related experience. Do not invent employers, dates, or metrics.
- Keep answers concise (2-6 sentences for simple questions). Use short bullet lists for skills, experience, or project questions.
- Speak as an assistant describing Lucas in third person.
- If asked for contact info, share what's in the resume header.
- The people reading are usually recruiters and hiring managers. Lead with outcomes and scope, and connect experience to what the asker seems to be hiring for.
- Format with light Markdown: **bold** for company or project names, short bullet lists. No headings or tables.

Resume:
${RESUME_CONTEXT}`;
