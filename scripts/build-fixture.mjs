// CI must never load the owner's real resume or call a model while prerendering.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";

const resume = {
  basics: {
    name: "Fictional Candidate",
    location: { city: "Example City" },
    profiles: [{ network: "Example", url: "https://example.com" }],
  },
  work: [{ name: "Example Company", position: "Engineer", startDate: "2020-01" }],
  education: [
    {
      institution: "Example University",
      studyType: "BS",
      area: "Computing",
      score: "4.0",
      endDate: "2019-05",
    },
  ],
};
const server = createServer((request, response) => {
  if (request.url === "/resume.json") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(resume));
  } else if (request.url === "/resume.md") {
    response.end("# Fictional Candidate\nBuilt synthetic demonstration systems.");
  } else {
    response.writeHead(404).end();
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
try {
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "build", ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        RESUME_API_URL: `http://127.0.0.1:${server.address().port}`,
        OPENROUTER_API_KEY: "",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  );
  const [code] = await once(child, "exit");
  process.exitCode = code ?? 1;
} finally {
  server.closeAllConnections();
  server.close();
}
