import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["test/**/*.test.mjs", "test/**/*.test.ts"],
          globals: false,
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          environment: "jsdom",
          include: ["test/ui/**/*.test.tsx"],
          setupFiles: ["./test/setup.ts"],
          globals: false,
        },
      },
    ],
  },
});
