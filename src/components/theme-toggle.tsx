"use client";

import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const label =
    mounted && resolvedTheme
      ? `Switch to ${resolvedTheme === "light" ? "dark" : "light"} theme`
      : "Toggle theme";

  return (
    <Button
      type="button"
      className="relative"
      variant="ghost"
      size="icon-lg"
      onClick={() => {
        setTheme(resolvedTheme === "light" ? "dark" : "light");
      }}
    >
      <SunIcon
        aria-hidden="true"
        className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
      />
      <MoonIcon
        aria-hidden="true"
        className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
      />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
