import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const { setTheme, useTheme } = vi.hoisted(() => ({
  setTheme: vi.fn(),
  useTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({ useTheme }));

import { ThemeToggle } from "../../src/components/theme-toggle";

beforeEach(() => {
  setTheme.mockClear();
  useTheme.mockReturnValue({ setTheme, resolvedTheme: "light" });
});

test("theme toggle switches from the resolved light theme to dark", () => {
  render(<ThemeToggle />);

  fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));

  expect(setTheme).toHaveBeenCalledWith("dark");
});
