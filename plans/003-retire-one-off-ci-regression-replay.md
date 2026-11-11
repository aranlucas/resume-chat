# Plan 003: Remove the one-off pre-fix regression replay from CI

> **Executor instructions**: Follow this plan step by step; stop on any STOP
> condition. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 3ce391d..HEAD -- .github/workflows/ci.yml docs/reliability-audit.md`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx / tech-debt
- **Planned at**: commit `3ce391d`, 2026-11-11

## Why this matters

PR #73 added a CI step that, on every run, overwrites the route with the
version from commit `b637993`, runs the "malformed file URLs return 400" tests,
and requires the output to contain exactly `2 failed`. That demonstrated the fix
once; kept permanently it (a) forces `fetch-depth: 0` full-history checkouts,
(b) runs Vitest an extra time before the parallel gates, and (c) breaks CI for
unrelated reasons — renaming that test, adding a third case, or changing an
import the old route lacks makes `grep -q '2 failed'` fail. `AGENTS.md` asks to
"distinguish temporary development scaffolding from checks worth maintaining";
the regression tests themselves remain in `test/app/api/chat/route.test.ts`.

## Current state

- `.github/workflows/ci.yml`: step `Demonstrate malformed-URL regression on the pre-fix route`
  (`git show b637993:src/app/api/chat/route.ts > src/app/api/chat/route.ts` …
  `grep -q '2 failed' /tmp/pre-fix.log`), and `fetch-depth: 0` on checkout.
- `docs/reliability-audit.md` describes that CI demonstration as part of the audit.

## Scope

**In scope**: `.github/workflows/ci.yml`, one sentence in `docs/reliability-audit.md`.
**Out of scope**: the regression tests in `route.test.ts`, every other CI step.

## Steps

1. Delete the demonstration step and the `fetch-depth: 0` line (nothing else
   in the workflow reads history — verify with `grep -n "git " .github/workflows/ci.yml` → no matches).
2. In `docs/reliability-audit.md`, note that the baseline demonstration ran on
   PR #73 and was retired afterwards; the Vitest cases remain.
3. **Verify**: `pnpm exec oxfmt --check .github/workflows/ci.yml` → exit 0; YAML still parses
   (`node -e "require('node:fs').readFileSync('.github/workflows/ci.yml','utf8')"` plus a review of indentation).

## Done criteria

- [ ] `grep -n "b637993\|fetch-depth" .github/workflows/ci.yml` → no matches
- [ ] `pnpm test -- -t "malformed file URLs"` still passes

## STOP conditions

- The maintainer recorded that the replay must stay (check PR #73 discussion if available).
