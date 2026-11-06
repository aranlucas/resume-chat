# Correctness and reliability audit — 2026-11-06

## Baseline and scope

Started on clean remote default `b637993` after merged refactor #72. Static review
covers every tracked runtime module, configuration, CI, existing tests and fixture
build. No local tests, browser runs or builds are permitted; validation is CI only.

## Inventory and boundaries

- `/`: server-side JSON Resume fetch → Zod schema → profile projection → client
  timeline, starter questions and typed chat. `/resume`: cached Markdown → Streamdown.
- `POST /api/chat`: untrusted JSON → AI SDK UI validation → resume Markdown with
  request cancellation and 10-second deadline → model message conversion → Railway
  OpenAI-compatible provider → SDK SSE → `useChat` transcript/error/retry/stop/reset.
- `POST /api/revalidate`: intentionally public stale-while-revalidate invalidation
  of the shared public resume tag. Both source documents cache for 30 days.
- No authentication, tenants, database, transactions or durable conversation state.
  Each reset owns a separate SDK Chat; secrets remain server-side. Provider errors
  are sanitized. Resume fetch HTTP failures and schema failures propagate rather
  than becoming fabricated successful profiles.
- Theme storage is owned by next-themes; scrolling by use-stick-to-bottom;
  Markdown rendering by Streamdown. No custom transport or persistence layer.
- CI already runs lint, types, Vitest and a synthetic-resume production build.

## Findings recorded before runtime changes

### F1 — malformed file URL escapes the invalid-conversation boundary (medium, high confidence)

Location: `src/app/api/chat/route.ts` conversion outside validation try/catch;
`ai/src/ui/validate-ui-messages.ts` accepts file `url` as a string, while
`ai/src/ui/convert-to-model-messages.ts` constructs `new URL(part.url)`.
Trigger: an otherwise valid user message with a file part whose URL is `not a URL`.
Expected: the documented generic invalid-conversation 400, with no upstream call.
Actual: resume fetch occurs and conversion rejects the route promise, producing
an uncontrolled framework 500. Apply the same invalid-input boundary to SDK
conversion before loading the resume. Keep all successfully converted SDK-valid
histories, including reasoning, files and permissive sizes, unchanged.
Regression: malformed file and reasoning-file URLs, plus existing successful
reasoning/file round trips. CI must demonstrate rejection against baseline.

## Reconciled and rejected hypotheses

- Public revalidation is an explicit documented product decision, not missing auth.
- No app-specific history/token/request limits are required: existing tests and
  README explicitly preserve SDK-valid histories without added restrictions.
- A missing model key intentionally reaches the provider's safe error stream.
- Empty assistant/step-only histories are handled by SDK conversion; existing tests
  preserve them. Do not rewrite streaming state or duplicate SDK checks.
- Contact disclosure and factual accuracy depend on the model prompt; deterministic
  tests cannot establish arbitrary model compliance. No production calls authorized.
- Profile and resume outages render framework errors; no requirement for invented
  fallback content. Server rendering has no account or cross-tenant state.

## Regression framework plan

Published npm metadata verified `e2e@0.23.0` from tester-army/e2e and compatible
`@e2e-dev/web@0.15.5` (peer e2e >=0.22.1 <1; Node ^22.22.3 or >=24.8).
Read current quickstart, CI/GitHub Actions docs and pinned Vite/Expo examples.
Use deterministic supported web locators/actions/assertions without agent/model
credentials. Exercise question → answer → follow-up, provider failure → retry,
and new conversation plus resume navigation, against controlled synthetic fixtures.
Keep existing route/projection/render tests and production fixture build.

## Implementation and verification plan

F1 fixed by performing SDK conversion inside the invalid-input boundary before
any resume/provider access. No new validation policy or public API was added.
Two Vitest cases require generic 400 and zero fetch calls for malformed file and
reasoning-file URLs. CI temporarily restores only the baseline route and requires
both new cases to fail, then restores the fix before the complete existing suite.

Browser journeys use the supported `browser.route` API for deterministic HTTP/SSE
fixtures on the production fixture build. They establish UI state, transport
history, follow-up/reset isolation, retry without duplicate questions, and resume
reading/return navigation. They do not establish model quality, upstream service
availability, or actual chunk timing; the existing route suite tests provider
streaming/cancellation and sanitized errors separately. Existing tests/builds and
CI remain gates. `.e2e/` reports/logs/traces upload even on failure.

Dependencies were selected because the user requested tester-army/e2e; npm metadata
confirms their repository identity, engine requirement and compatible peer range.
Installations used `--ignore-scripts`; no local test/build hooks were executed.

## Independent review

Read-only independent reviewer completed at `5825942` with no remaining concrete
worthwhile findings after challenging F1, runtime boundaries and browser coverage.
Three objections were fixed: unique fixture response IDs with retained-history
assertions; a successful mocked resume fetch so baseline reaches the actual URL
conversion failure; and full checkout history for reliable baseline access.
No local tests/builds were run by either worker. CI result is pending on PR #73.
