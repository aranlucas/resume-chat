# Repository untangle decisions — 2026-11-06

## Scope and baseline (before edits)

- Reviewed application routes, profile projection, resume access, components,
  styling, tests, fixture build, CI, configuration, docs, and tracked assets.
  Bundled agent skills are tool-managed resources, not application modules.
- Started at `2f5d168` with a clean checkout. Preserve prior SDK validation,
  unrestricted valid histories, provider routing, cache semantics and test pruning.
- Tests and builds run only in CI by user instruction. No local baseline test
  result is claimed. Existing CI runs format, lint, typecheck, Vitest and a
  synthetic-resume build. No thread-owned test process was started.

## Design and inventory

1. Keep resume acquisition independent of assistant policy.
   - `lib/resume.ts` mixes fetching/validation/cache with the chat-only prompt.
     Move the prompt beside the chat route; resume-page changes should not require
     reading assistant instructions. Preserve prompt text and cancellation.
2. Remove pass-through interfaces, keep boundaries that own behavior.
   - Initially flagged `lib/utils.ts` as a bare re-export. Review found it is
     the shadcn generator integration point in `components.json`; retain it.
   - `ConversationContent` only forwards props to `StickToBottom.Content`.
     Export that primitive directly under the existing name.
   - Keep `Providers`, `Conversation` and `TypesetResponse`: each owns real
     configuration/styling. Keep the lazy response boundary to defer Streamdown.
3. Use React's default memo comparison for the response's full prop contract.
   - `MessageResponse` accepts every renderer prop but its comparator observes
     only children/className; changing mode or controls can be ignored.
     Keep memoization without the partial comparator.
4. Remove stale scaffolding and implementation-only comments.
   - `public/next.svg` and `public/vercel.svg` have no references.
   - Source/CSS comments that repeat selectors or function bodies add maintenance
     without an independent requirement. Retain external provenance, cache/webhook
     policy, provider constraints and library integration constraints.
5. Review tests last; preserve behavioral coverage.
   - Existing profile, theme and chat tests protect meaningful public behavior,
     including cancellation, malformed inputs and long histories. Keep them.
   - Add a response rerender regression: same text, changed text direction must
     reach the renderer. This catches the partial-comparator bug; exercise the real renderer and React comparison behavior.

## Intentional special cases and deferred churn

- Editorial highlights keyed by employer, internship exclusion and introductory
  copy express portfolio requirements; do not replace with a generic CMS.
- Cache tag/revalidation, 10-second source timeout, provider budget, generic error
  text, hydration gating and isolated Chat instances serve real requirements.
- Streamdown's prose adapters deliberately preserve advanced widgets and shared
  typography. Generated shadcn variants/typeset rules remain coherent upstream
  resources; do not prune arbitrary supported variants during an app refactor.
- ProfileChat's local view functions change with this one page. Splitting them
  into many files would add navigation without a demonstrated independent seam.
- Existing build fixture is repository-specific; no new custom script needed.

## Review and validation

- Implemented inventory items; retained the shadcn utility integration after
  reviewer identified its configured generator alias.
- First static review found no other worthwhile issues. Lint identified a test
  module mock forbidden by repository policy; regression now uses real Streamdown.
- Second static review found the regression assertion targeted the renderer
  root instead of the answer block. Fixed it to inspect the answer's nearest
  direction-bearing ancestor. No other worthwhile issues remained.
- Third independent static recheck confirmed both review fixes and found no
  remaining worthwhile issues.
- Local formatting, lint and diff whitespace checks passed. Tests/builds remain
  CI-only; PR CI results pending.
