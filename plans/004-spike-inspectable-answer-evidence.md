# Plan 004 (design spike): Answers link to the resume section they rely on

> **Executor instructions**: This is a design/spike plan, not a build plan.
> Produce the artifacts in "Deliverables", do not ship UI changes to `main`
> without maintainer review. Update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 3ce391d..HEAD -- src/app/api/chat src/app/resume src/components/typeset-response.tsx src/lib/resume.ts ROADMAP.md`

## Status

- **Priority**: P2 (direction)
- **Effort**: M (spike) / L (full feature) — coarse
- **Risk**: MED — depends on model compliance, which tests cannot establish
- **Depends on**: 002 (link renderer decides how evidence links open)
- **Category**: direction
- **Planned at**: commit `3ce391d`, 2026-11-11

## Why this matters

`ROADMAP.md` priority 1 is "Answers with inspectable evidence": connect answer
claims to the published role, project or section; citations must resolve
against the loaded resume version; "Do not trust model-generated URLs without
resolving them to allowed source identifiers." Today answers carry no sources,
the `/resume` page (`src/app/resume/page.tsx`) renders headings without stable
anchors, and the only verification path is the footer "Check the resume" link.

## Current state

- `src/app/api/chat/prompt.ts` embeds the full `resume.md` in the system prompt.
- `src/lib/resume.ts` fetches `resume.md` and `resume.json` (cached 30 days,
  tag `resume`).
- `src/components/typeset-response.tsx` maps Markdown elements to plain tags
  (headings get no `id`).

## Deliverables

1. **Source identifiers**: derive a stable id per resume section/role from
   `resume.md` headings (e.g. slug of the heading text), and render them as
   `id`s on `/resume`. Unit-test the slugging against a synthetic resume.
2. **Citation syntax**: choose a format the model emits (e.g. `[[source:doordash]]`
   or a Markdown link to `source:<id>`), add it to the prompt, and resolve it
   client-side only against the ids derived from the *same* resume version;
   unknown ids render as plain text. Never render model-supplied URLs as evidence.
3. **Evaluation**: a fixture set of synthetic resumes + recorded (not live)
   model outputs covering sourced, unsupported and adversarial questions.
   No paid model calls in tests.
4. **Write-up**: open questions — resume version identity across the 30-day
   cache, what happens when `/api/revalidate` changes ids mid-conversation,
   and how unsupported answers are labeled.

## Out of scope

Job-description matching (roadmap priority 2), analytics on conversation text
(roadmap: "Do not collect conversation text … by default").

## STOP conditions

- `resume.md` has no stable heading structure to derive ids from — report the
  shape and propose using `resume.json` ids instead.
