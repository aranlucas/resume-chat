# Plan 001: Answers that end without text offer a retry, and cut-off answers say so

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 3ce391d..HEAD -- src/app/profile-chat.tsx test/ui test/e2e/chat.e2e.ts test/app/api/chat/route.test.ts README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `3ce391d`, 2026-11-11

## Why this matters

The chat only offers "Try again" when the request **errors**. A response can
also *finish successfully with no answer text*: the provider returns an empty
completion, a reasoning model spends the route's 2,048-token cap on reasoning,
or the visitor presses Stop before the first word. In all of these the AI SDK
sets `status: "ready"` with no `error`, the assistant message renders as
nothing, and the visitor is left looking at their own question with no answer,
no explanation and no retry — they must retype the question. Separately, an
answer that stops at the token cap (`finishReason: "length"`) is presented as
if it were complete. `PRODUCT.md` makes "uncertainty and generation failures
understandable and recoverable" a product principle, and `ROADMAP.md` priority 4
asks for "a recoverable chat error … retry does not duplicate their question".

## Current state

- `src/app/profile-chat.tsx` — the whole chat page (client component).
  - Line 22: `const createChat = () => new Chat({ transport: new DefaultChatTransport({ api: "/api/chat" }) });`
    — no `onFinish`, so the finish reason is discarded.
  - Lines 339–373, `Transcript`:
    ```tsx
    const isWaiting =
      (status === "submitted" || status === "streaming") &&
      !(last?.role === "assistant" && hasText(last));
    ...
    {isWaiting && <Thinking />}
    {error && ( <div className="mbs-4 text-17px text-danger" role="alert"> ... Try again ... read the resume </div> )}
    ```
    Retry UI exists only when `error` is set.
  - Lines 396–398, `Message`: `if (!hasText(message)) { return null; }` — an
    assistant message without text renders nothing.
- `src/app/api/chat/route.ts:54` — `maxOutputTokens: 2_048`.
- AI SDK (`node_modules/ai/dist/index.js`, `Chat.makeRequestImpl`): a stream
  that completes normally ends in `this.setStatus({ status: "ready" })` with no
  error; `onFinish` receives `{ message, isAbort, isError, finishReason }`.
  `regenerate()` drops a trailing assistant message (or keeps a trailing user
  message) and resubmits, so it never duplicates the question.
- Evidence that empty assistant messages really occur: the route suite's
  history fixtures (`test/app/api/chat/route.test.ts`) include
  `{ id: "stopped-answer", parts: [{ type: "step-start" }] }`,
  `{ id: "empty-answer", parts: [] }` and a "reasoning only" answer.
- Conventions: tests use Vitest; UI tests live in `test/ui/*.test.tsx` (jsdom,
  real Streamdown — module mocks are forbidden by lint); browser journeys live
  in `test/e2e/chat.e2e.ts` and use `browser.route` fixtures with AI SDK wire
  events. Lint (oxlint + Oxforge) forbids inline object types, `Record<string, unknown>`,
  unexplained `as` casts and `async` functions without `await`.

## Commands you will need

| Purpose   | Command                                           | Expected on success |
|-----------|---------------------------------------------------|---------------------|
| Install   | `pnpm install --frozen-lockfile`                  | exit 0              |
| Format    | `pnpm format:check`                               | exit 0              |
| Lint      | `pnpm lint`                                       | exit 0              |
| Typecheck | `pnpm typecheck`                                  | exit 0              |
| Tests     | `pnpm test --maxWorkers=1`                        | all pass            |
| Build     | `NODE_OPTIONS=--max-old-space-size=1200 pnpm build:test` | exit 0       |
| E2E       | `E2E_TELEMETRY_DISABLED=1 pnpm exec e2e run --reporter list` (after build) | all pass |

## Scope

**In scope**: `src/app/profile-chat.tsx`, `test/ui/profile-chat.test.tsx`
(create), `test/app/api/chat/route.test.ts` (append one test),
`test/e2e/chat.e2e.ts` (append one journey), `README.md` (two sentences).

**Out of scope**: `src/app/api/chat/route.ts` (the finish reason already
reaches the client; no server change needed), the token cap value, Streamdown
rendering, any persistence of conversations.

## Steps

### Step 1: Capture the finish reason per answer

Give `createChat` an `onCutOff(messageId)` callback, call it from the Chat's
`onFinish` when `finishReason === "length" && !isAbort && !isError`. In
`ProfileChat`, hold `const [cutOffId, setCutOffId] = useState<string>()` and
create chats with `createChat(setCutOffId)` (initial state and "New conversation").

### Step 2: Render recovery states in `Transcript`

- Extract the existing error block into a `Recovery({ onRetry, children })`
  component (same markup, `role="alert"`).
- `isUnanswered = status === "ready" && !(last is an assistant message with text)`
  → `<Recovery>No answer came through.</Recovery>`.
- When `status === "ready"`, the last message has text and `last.id === cutOffId`
  → a muted `role="status"` note: "This answer reached the length limit and may
  be cut off. Ask a narrower follow-up for the rest."
- An `error` keeps showing only the error (status is `"error"`, not `"ready"`).

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Tests

- `test/ui/profile-chat.test.tsx`: render `ProfileChat` with a synthetic
  profile, stub `ResizeObserver` (jsdom has none; `use-stick-to-bottom` needs
  it), spy on `fetch` returning AI SDK wire events. Cases: empty reply and
  reasoning-only `length` reply → alert "No answer came through", Try again
  sends `["user"]` only and shows the recovered answer once; a `length` answer
  shows the cut-off note which disappears after a normal follow-up; a complete
  answer shows no notice; a 503 shows exactly one alert (the server's).
- `route.test.ts`: provider `finish_reason: "length"` → UI stream contains
  `"finishReason":"length"` (the contract the client relies on).
- `chat.e2e.ts`: empty-answer journey mirroring the existing retry journey.

**Verify**: run the new UI test against the original component
(`git show 3ce391d:src/app/profile-chat.tsx`) → the empty, reasoning-only and
cut-off cases fail; restore the fix → all pass.

## Done criteria

- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck` exit 0
- [ ] `pnpm test --maxWorkers=1` passes, including the 5 new UI tests and 1 new route test
- [ ] `pnpm build:test` exits 0; `pnpm exec e2e run` passes 4/4 journeys
- [ ] Only in-scope files changed

## STOP conditions

- `onFinish` in the installed AI SDK no longer exposes `finishReason`.
- `regenerate()` duplicates the user question in the request history.
- Rendering `ProfileChat` in jsdom needs a module mock (lint forbids it).

## Maintenance notes

- If the app adds tool calls or non-text answer parts, `hasText` decides what
  counts as "answered" — revisit `isUnanswered` then.
- If `maxOutputTokens` changes, the cut-off note still keys off the provider's
  finish reason, not the number.
- A stop before the first word also shows "No answer came through" with a retry;
  that is deliberate (the question is otherwise stranded).
