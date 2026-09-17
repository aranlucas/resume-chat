# Resume Chat

A Next.js chat interface that answers questions about Lucas Arango's resume.
Built on the latest Vercel AI SDK (v7) with a free model via OpenRouter —
no vector database or paid embeddings required. The resume (transcribed from
the LaTeX source in `~/Projects/resume/Lucas_Arango_Resume.tex` into
`src/lib/resume.ts`) is injected directly into the system prompt.

## Setup

1. Get a free API key at https://openrouter.ai/keys (free `:free` models cost
   nothing; new accounts get 50 requests/day, 1,000/day after $10 in credits).
2. Copy the env template and fill it in:

```bash
cp .env.template .env.local
```

3. Run locally:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

| Variable           | Required | Default                     | Description                                  |
| ------------------ | -------- | --------------------------- | -------------------------------------------- |
| `OPENROUTER_API_KEY` | Yes      | —                           | OpenRouter API key                           |
| `OPENROUTER_MODEL`   | No       | `openai/gpt-oss-120b:free`  | Any OpenRouter model id, e.g. `openrouter/free` for the auto-router. See https://openrouter.ai/collections/free-models |

To refresh the assistant's knowledge, edit `src/lib/resume.ts` to match the
latest LaTeX resume.

## Verify

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```
