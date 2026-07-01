import { createRequire } from "node:module";
import tailwindcss from "eslint-plugin-tailwindcss";

const require = createRequire(import.meta.url);
const nextPlugin = require("@next/eslint-plugin-next");

const config = [
  {
    ignores: [".next/**", "node_modules/**", "out/**"],
  },
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  tailwindcss.configs.recommended,
  {
    settings: {
      tailwindcss: {
        callees: ["cn"],
      },
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];

export default config;
