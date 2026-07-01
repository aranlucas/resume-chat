"use client";

import Icon from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        setTheme(theme === "light" ? "dark" : "light");
      }}
    >
      <Icon name="sun" className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Icon
        name="moon"
        className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
