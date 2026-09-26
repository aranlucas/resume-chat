# Resume Chat

A Next.js chat interface that answers questions about Lucas Arango's resume.
Built on the latest Vercel AI SDK (v7) with a free model via OpenRouter —
no vector database or paid embeddings required. The resume is injected
directly into the system prompt.

## Setup

1. Create a dedicated API key at https://openrouter.ai/keys. The default
   `openrouter/free` router uses available free models; set a $0 credit limit
   on the key to prevent paid usage. Free models have provider rate limits.
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
| `RESUME_API_URL`     | No       | `https://resume-api.aranlucas.workers.dev` | Resume API base URL, e.g. a local `_site` server |
| `OPENROUTER_MODEL`   | No       | `openrouter/free`           | Routes to available free models. Can be overridden with a current OpenRouter model id. See https://openrouter.ai/collections/free-models |

## Vercel deployment

The existing project is `aranlucas-projects/resume-chat`, served at
[hire-lucas.vercel.app](https://hire-lucas.vercel.app/).

1. Link this checkout: `vercel link --project resume-chat --scope aranlucas-projects`.
2. Set `OPENROUTER_API_KEY` as a server-only secret for Production, Preview,
   and Development in the project's environment settings. Set
   `OPENROUTER_MODEL` to `openrouter/free` for those environments.
3. Deploy with `vercel deploy --prod`. Environment changes require a new
   deployment to take effect.
4. Ask a question on the live site and confirm a complete answer streams.

For local development, pull the Development environment with
`vercel env pull .env.local`. Keep `.env.local` untracked. The current app
does not require OpenAI or Pinecone environment variables.

## Resume source

The resume lives in [aranlucas/resume](https://github.com/aranlucas/resume) as a
[JSON Resume](https://jsonresume.org/schema), published without private info to
[resume-api.aranlucas.workers.dev](https://resume-api.aranlucas.workers.dev/).
`src/lib/resume.ts` fetches `resume.md` (the assistant's system prompt) and
`resume.json` (the page's experience timeline) with a 30-day cache tagged
`resume`. The resume repo's deploy calls `POST /api/revalidate` to refresh both right away. To update
the resume, edit it there.

## Verify

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```
