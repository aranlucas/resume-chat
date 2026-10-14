import type { OxfmtConfig } from "oxfmt";
import base from "@aranlucas/oxforge/format-tailwind";

const config: OxfmtConfig = {
  ...base,
  sortTailwindcss: {
    ...base.sortTailwindcss,
    stylesheet: "./src/app/globals.css",
  },
};

export default config;
