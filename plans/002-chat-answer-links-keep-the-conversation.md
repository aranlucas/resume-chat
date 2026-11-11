# Plan 002: Links in chat answers open in a new tab instead of discarding the conversation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report. When done, update this plan's row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 3ce391d..HEAD -- src/components/typeset-response.tsx src/components/message-response.tsx test/ui/message-response.test.tsx`
> On any change, compare the excerpts below against the live code; a mismatch is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `3ce391d`, 2026-11-11

## Why this matters

Conversations live only in memory (`PRODUCT.md`: "conversations do not need to
persist between visits"). The system prompt tells the model to share profile
links when asked for contact (`src/app/api/chat/prompt.ts:17`), but the app's
Markdown adapter renders answer links as plain `<a href>` with no `target`, so
clicking one navigates the chat tab away and the whole conversation is lost
unless the browser restores it from the back/forward cache. Every other link in
the chat UI deliberately opens a new tab (`src/app/profile-chat.tsx` lines
185–190, 258–263, 366). Streamdown's own default link renderer adds
`target="_blank" rel="noreferrer"`; the adapter strips that.

## Current state

- `src/components/typeset-response.tsx:27-30, 41`:
  ```tsx
  function plainElement<Tag extends ProseTag>(tag: Tag) {
    return ({ node: _node, className: _className, ...props }: PlainElementProps<Tag>) =>
      createElement(tag, props);
  }
  ...
  a: plainElement("a"),
  ```
- Streamdown 2.7.1 default `a` (`node_modules/streamdown/dist/chunk-*.js`,
  `Ba`): renders `target:"_blank"`, `rel:"noreferrer"`, and treats
  `href === "streamdown:incomplete-link"` (a placeholder for a link that is
  still streaming) specially. The plain adapter renders that placeholder as a
  real `href`.
- `TypesetResponse` is shared by the chat (`MessageResponse`) and the static
  `/resume` page (`src/app/resume/page.tsx`).
- Test pattern: `test/ui/message-response.test.tsx` renders the real Streamdown
  in jsdom (module mocks are forbidden by lint).

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Lint | `pnpm lint` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Tests | `pnpm test --maxWorkers=1` | all pass |
| Build | `NODE_OPTIONS=--max-old-space-size=1200 pnpm build:test` | exit 0 |

## Scope

**In scope**: `src/components/typeset-response.tsx`, `test/ui/message-response.test.tsx`.
**Out of scope**: enabling Streamdown `linkSafety` (a modal is a product
decision), restricting which URLs may appear (that is plan 004's evidence work),
`/resume` page layout.

## Steps

1. Replace `a: plainElement("a")` with a dedicated `a` renderer that drops
   `node`/`className`, renders `target="_blank" rel="noopener noreferrer"`, and
   renders children as plain text (a `<span>`) when `href` is missing or equals
   `"streamdown:incomplete-link"`. Keep it module-level so the components map stays stable.
   **Verify**: `pnpm typecheck` → exit 0.
2. Add UI tests in `test/ui/message-response.test.tsx`: `[GitHub](https://github.com/x)`
   renders a link with `target="_blank"` and `rel` containing `noopener`;
   an unterminated `[GitHub](https://gi` while `mode="streaming"` renders no
   link with the placeholder href. Confirm the first test fails on the original adapter.
   **Verify**: `pnpm test --maxWorkers=1` → all pass.

## Done criteria

- [ ] Lint, typecheck, tests and `build:test` pass
- [ ] `grep -n 'a: plainElement' src/components/typeset-response.tsx` → no match

## STOP conditions

- Streamdown's placeholder href is not `streamdown:incomplete-link` in the installed version.
- The `/resume` page relies on same-tab navigation for in-document anchors
  (`#…` links); if the resume Markdown contains them, keep same-tab for `#` hrefs and report.

## Maintenance notes

If plan 004 adds `/resume#section` evidence links, decide whether internal
links should open in a new tab (keeps the chat) — they should, for the chat.
