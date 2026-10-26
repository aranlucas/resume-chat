# Resume Chat feature roadmap

Updated 2026-10-26. Proposed portfolio improvements after Digits/MCP priorities.
No recruiter-conversion or hiring-impact measurement is currently established.

## Starting point

Baseline: `8bc372481288139af75dcd366366aeb68334453b`, described in the
[README](README.md). The app presents Lucas's public resume and streams answers
using that published resume as context. The resume repository owns the facts;
this app has no private candidate database or account system.

Target user: a recruiter or collaborator checking a specific experience claim
and deciding whether to start a conversation.

## Priorities

### 1. Answers with inspectable evidence

Connect answer claims to the relevant published role, project or resume section,
and make unsupported questions easy to distinguish from sourced answers.

Acceptance: citations resolve against the loaded resume version, a user can open
the cited evidence, and missing facts are acknowledged rather than invented.
Do not trust model-generated URLs without resolving them to allowed source
identifiers. Test unsupported and adversarial questions with synthetic resumes.

### 2. An evidence-based role conversation

Let a visitor paste role requirements and see relevant published experience,
unknowns and suggested questions for Lucas. Make this a structured conversation,
not an opaque candidate score or automated hiring decision.

Acceptance: requirement matches cite resume evidence; absence of a resume claim
is labeled unknown, not proof of inability; pasted job text cannot override the
app's instructions. Explain what text is sent to the model before submission.

### 3. A clear next step for an interested visitor

Offer a compact, user-reviewed summary of the experience discussed and a link
to the contact method already published in the resume.

Acceptance: the visitor chooses what to copy or download; no message is sent
automatically; private contact information is never inferred. Contact intent is
a useful signal, but an outbound click is not proof of a qualified lead.

### 4. Useful browsing when chat is unavailable

Keep source-based navigation, common-question entry points and the experience
timeline useful during model failures. Show resume freshness and a recoverable
chat error without presenting old content as newly verified.

Acceptance: a visitor can still find relevant source evidence when the model
fails; retry does not duplicate their question; unavailable resume data does not
produce a fabricated profile. Reuse the existing streaming and failure paths.

## First release and evidence

Start with priority 1. Observe five consented recruiter/collaborator tasks using
questions they would actually ask. Record whether they find relevant evidence,
time to verify it, unsupported answers and whether they choose a next step.
Establish that baseline before setting a conversion target. Do not collect
conversation text or pasted job descriptions for analytics by default.

Use the existing fixture-backed build and test runner for sourced/unsupported
answers, source-version changes and provider failures. Keep content edits in
`aranlucas/resume`; avoid creating a second editable resume in this repository.
