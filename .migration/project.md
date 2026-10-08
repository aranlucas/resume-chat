# project

2026-10-08, whole-project Radix -> Base UI migration via the `migrate-radix-to-base` skill (transformation engine; legacy `default` style). Final build matches the baseline.

## Dependency swap

- Added `@base-ui/react@^1.8.0`.
- Removed `@radix-ui/react-separator` and `@radix-ui/react-slot`. No `@radix-ui` entries remain in `package.json` or `pnpm-lock.yaml`.

## App-code sweep

- Searched `src/` outside `components/ui` for `asChild`, `decorative`, and radix imports. No call-site changes were needed; `theme-toggle.tsx` is the only wrapper consumer.

## Result

- Baseline vs final: typecheck, oxlint, oxfmt check, 43/43 tests, and `next build` all pass on both.
- 0 wrappers remain on Radix (`button`, `separator` migrated; `input` never used Radix).

## Flagged, not fixed

- `components.json` keeps `"style": "default"`. There is no `base-default` style, so the CLI still resolves this project as `base: radix` and a future `shadcn add <component>` will deliver Radix variants. Options: switch to a `base-*` style (restyles new components) or migrate new components by hand.
