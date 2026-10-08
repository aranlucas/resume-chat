# Resume Chat

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Recruiters and hiring managers evaluating Lucas Arango's engineering experience and fit for a role. They need to understand his background quickly and identify experience relevant to their team.

## Product Purpose

Help visitors understand Lucas's engineering experience, judge his fit for a role, and reach out for an interview through his public profile links.

## Positioning

A personal portfolio that makes Lucas's public resume conversational. Visitors can browse an experience timeline or ask the questions they would ask in an initial hiring conversation. Suggested questions help them explore relevant work, including AI agents.

## Operating Context

- Visitors enter a public web page without signing in.
- They can browse Lucas's profile, experience, education, and public profile links.
- They can start a conversation through a suggested question, an experience entry, or a question they write themselves.
- Answers stream into the conversation. Visitors can stop generation, retry a failed answer, or start a new conversation.
- The public resume is the source of truth. Generated answers can be wrong; visitors should check consequential details against that source.

## Capabilities and Constraints

- Keep the product focused on Lucas's personal portfolio and public resume chat.
- Ground answers in the published resume and acknowledge when it does not contain the answer. Do not invent employers, dates, achievements, or metrics.
- The assistant describes Lucas in third person. Profile and introductory copy may speak in Lucas's own voice.
- Use public profile links for contact. The assistant must not disclose an email address or phone number.
- No account or saved conversation requirement. The existing app has no conversation database; conversations do not need to persist between visits.
- The app uses Next.js, React, and the AI SDK, with server-side OpenRouter model access. Provider availability and rate limits can affect answers.
- Profile data and assistant context come from the public resume service. Resume updates belong in the source resume repository, rather than being invented in this presentation layer.

## Brand Commitments

- Product name: Resume Chat. The conversational assistant is called Ask Lucas.
- Lucas Arango is the subject of the portfolio.
- Keep answers friendly, concise, and specific about experience, scope, technologies, and outcomes supported by the resume.
- Be honest about missing information and model uncertainty.

## Evidence on Hand

- `README.md` documents the product, public resume source, runtime setup, and existing deployment.
- `src/lib/resume.ts` loads the public `resume.json` and `resume.md` documents from the configured resume service and defines the assistant's answer guidelines.
- `src/lib/profile.ts` projects resume data into the profile and experience timeline and supplies existing highlights and suggested questions.
- `src/app/profile-chat.tsx` contains the current profile introduction, suggested questions, conversation controls, and model disclosure.
- `src/app/apple-icon.png`, `src/app/icon.svg`, and `src/app/favicon.ico` provide existing identity assets.
- No testimonials, customer endorsements, or independent performance benchmarks have been confirmed for use in future work.

## Product Principles

1. Make relevant engineering experience easy for a hiring audience to discover.
2. Treat the public resume as the authority for factual claims.
3. Support both browsing and conversation with a low barrier to entry.
4. Make uncertainty and generation failures understandable and recoverable.
5. Help visitors move from understanding Lucas's fit to contacting him through public profile links.

## Open Decisions

- No product-specific accessibility standard or additional inclusion requirements have been established during init.
- New capabilities beyond the confirmed portfolio and resume chat scope require a separate product decision.
