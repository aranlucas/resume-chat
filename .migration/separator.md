# separator

2026-10-08, transformation engine on the user's own file (legacy `default` style; file matched the stock radix golden apart from formatting). Migrated cleanly; typecheck passes.

## Changed

- `src/components/ui/separator.tsx`
  - `import * as SeparatorPrimitive from "@radix-ui/react-separator"` -> `import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"`; `SeparatorPrimitive.Root` -> callable `SeparatorPrimitive`.
  - `React.forwardRef` + `ComponentPropsWithoutRef` -> plain function typed `SeparatorPrimitive.Props` (ref is a prop in React 19).
  - `decorative` prop dropped (no Base UI equivalent). Added `data-slot="separator"`.
  - Classes kept verbatim.
- Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/separator.tsx` is clean.

## Left alone

- No consumers: `Separator` is not imported anywhere in `src/`, so there are no call sites to sweep.

## Behavior changes

- Radix defaulted `decorative={true}`, rendering `role="none"` (hidden from assistive tech). Base UI always renders `role="separator"` with `aria-orientation`. Any future purely visual divider should use a `<div aria-hidden="true">` / border instead. Not patched, per migration rules.

## Verify by hand

- Nothing renders it today. If you add one: check it draws a 1px rule in both orientations and screen readers announce a separator only where intended.
