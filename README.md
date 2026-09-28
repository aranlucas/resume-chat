# Resume Chat

Resume Chat is a small Next.js site that lets a recruiter or collaborator ask
natural-language questions about Lucas Arango's public resume. Answers stream
from an OpenRouter chat model whose context is the published resume; the site
does not need a vector database or a separate embedding pipeline.

Try the deployed app at [hire-lucas.vercel.app](https://hire-lucas.vercel.app/).

The public resume service is the source of truth. This application is a
presentation and question-answering layer, so generated answers should be
checked against the source resume before they are used for a hiring decision.

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

## How the request flows

```mermaid
flowchart LR
  Browser[Resume Chat UI] --> Route[src/app/api/chat/route.ts]
  Route --> Resume[src/lib/resume.ts]
  Resume --> API[Public resume API]
  Route --> OpenRouter[OpenRouter model]
  OpenRouter --> Route
  Route --> Browser
```

Resume text and JSON are cached for 30 days with the `resume` cache tag. The
resume repository can call `POST /api/revalidate` after publishing to refresh
the cached content. The chat route validates the incoming request and returns
an error when the server key is missing.

## Source map

- `src/app/page.tsx` and `src/app/profile-chat.tsx` compose the landing page.
- `src/components/conversation.tsx` and `message-response.tsx` render the
  streaming conversation.
- `src/app/api/chat/route.ts` calls the AI SDK with the resume context.
- `src/lib/resume.ts` fetches and validates the public resume documents.
- `src/app/api/revalidate/route.ts` accepts the cache refresh webhook.
- `.env.template` lists the supported runtime settings.

## Status and boundaries

This is a focused portfolio demo backed by a public resume endpoint. It has no
account system, private resume source, conversation database, or paid-model
requirement. Model availability, rate limits, and the freshness of the public
resume service can affect responses.
