import { web } from "@e2e-dev/web";
import type { E2EConfig } from "e2e";

export default {
  tests: "test/e2e/**/*.e2e.ts",
  targets: [
    {
      engine: web(),
      app: {
        url: "http://127.0.0.1:3000",
        command: {
          executable: "node",
          args: ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1"],
          env: { NEXT_TELEMETRY_DISABLED: "1", FREELLM_API_KEY: "" },
          log: ".e2e/logs/app.log",
        },
      },
    },
  ],
  retries: 0,
} satisfies E2EConfig;
