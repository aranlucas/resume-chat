# button

2026-10-08, transformation engine on the user's own file (legacy `default` style: radix golden used for classification only, no base replay). Migrated cleanly; typecheck, lint, tests and build pass.

## Changed

- `src/components/ui/button.tsx`
  - `@radix-ui/react-slot` `Slot` + `asChild` -> real `@base-ui/react/button` primitive (`ButtonPrimitive`), which takes a `render` prop instead of `asChild`.
  - `React.forwardRef` dropped: React 19 passes `ref` as a prop and `ButtonPrimitive.Props` already carries it.
  - `ButtonProps` interface -> `type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>` (export kept; the `asChild` prop is gone).
  - Added `data-slot="button"` to match the base registry convention.
  - Classes kept verbatim. Classification: the file predates the current stock `default` button (no `gap-2` / `[&_svg]` classes); that is kept as-is, not "upgraded".
- Leftover scan: `grep -n "radix-ui\|@radix-ui" src/components/ui/button.tsx` is clean.

## Left alone

- `src/components/theme-toggle.tsx`: the only consumer; uses `type`, `className`, `variant`, `size`, `onClick`, all unchanged. No `asChild` call sites exist in the app.
- `src/components/ui/input.tsx`: plain `<input>`, no radix.

## Behavior changes

- Using `render` with a non-`<button>` element (e.g. `<Button render={<a href=… />}>`) requires `nativeButton={false}` in Base UI, or it warns and applies button semantics. Not exercised anywhere today.
- `className` may now also be a function of state; passing one through `buttonVariants` is not supported by this wrapper (strings only, as before).

## Verify by hand

- Click the theme toggle in the header: theme flips light/dark, icons animate.
- Tab to the toggle: focus ring shows; Enter/Space activate it.
