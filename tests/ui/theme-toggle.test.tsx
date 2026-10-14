import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ThemeToggle } from "../../src/components/theme-toggle";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.stubGlobal("matchMedia", (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("theme toggle switches from light to dark and persists the selection", async () => {
  render(
    <ThemeProvider defaultTheme="light" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));

  await waitFor(() => {
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  expect(localStorage.getItem("theme")).toBe("dark");
  expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeDefined();
});

test("theme toggle switches from dark to light", async () => {
  render(
    <ThemeProvider defaultTheme="dark" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));

  await waitFor(() => {
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  expect(localStorage.getItem("theme")).toBe("light");
});
