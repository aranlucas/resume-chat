<p align="center">
  <img src="src/app/apple-icon.png" alt="Resume Chat icon" width="96" />
</p>

# Resume Chat · Ask the resume, skip the PDF hunt

[![CI](https://github.com/aranlucas/resume-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/aranlucas/resume-chat/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/aranlucas/resume-chat)](LICENSE)

Resume Chat turns Lucas Arango's public resume into a quick conversation. A
recruiter or collaborator can ask a plain-language question and watch an
OpenRouter answer stream back with the published resume in context—no vector
database or embedding pipeline required.

> **Try the useful question:** “What did Lucas build with Go?” Ask it, get a
> grounded answer, then open the source resume when the detail matters.

Try the deployed app at [hire-lucas.vercel.app](https://hire-lucas.vercel.app/).

The public resume service is the source of truth. This application is a
presentation and question-answering layer, so generated answers should be
checked against the source resume before they are used for a hiring decision.

## Setup

1. Create a dedicated API key at https://openrouter.ai/keys. The default
   chain of free models (see `src/app/api/chat/route.ts`) answers with
   reasoning turned off for speed; set a $0 credit limit
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

Open [https://resume-chat.localhost](https://resume-chat.localhost). `pnpm dev` runs through [Portless](https://github.com/vercel-labs/portless) (a dev dependency); its first run may ask for `sudo` to bind port 443 and trust a local certificate.

## Configuration

| Variable             | Required | Default                                    | Description                                                                                                                              |
| -------------------- | -------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY` | Yes      | —                                          | OpenRouter API key                                                                                                                       |
| `RESUME_API_URL`     | No       | `https://resume-api.aranlucas.workers.dev` | Resume API base URL, e.g. a local `_site` server                                                                                         |

## Vercel deployment

The existing project is `aranlucas-projects/resume-chat`, served at
[hire-lucas.vercel.app](https://hire-lucas.vercel.app/).

1. Link this checkout: `vercel link --project resume-chat --scope aranlucas-projects`.
2. Set `OPENROUTER_API_KEY` as a server-only secret for Production, Preview,
   and Development in the project's environment settings.
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
pnpm test
pnpm build:test
```

`pnpm test` exercises profile projection, request validation, and resume and
provider failures with a mocked model and synthetic resume data.
`pnpm build:test` (also used by CI) prerenders against a loopback fixture server
with the model key cleared. Its build output contains a fictional profile and
is only for verification; use `pnpm build` for a production build.

The public chat endpoint accepts a JSON body of up to 128,000 characters with
user and assistant messages. Only their text reaches the model; other roles and
parts are dropped or rejected, and invalid requests return a safe 400 before
loading the resume or calling a model. Resume loading has a 10-second deadline,
answers are capped at 2,048 tokens, and the function stops after 60 seconds.
Failures before streaming return a safe 503; failures after streaming starts
use the same message in the SDK error stream.
These per-request limits do not replace deployment-level rate limiting.

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
the cached content. The chat route validates supported conversation content with
Zod and returns 400 for malformed or oversized requests. A missing server key or
unavailable resume returns 503; model errors during streaming produce a retryable
error in the chat.

## Source map

- `src/app/page.tsx` and `src/app/profile-chat.tsx` compose the landing page.
- `src/components/conversation.tsx` and `message-response.tsx` render the
  streaming conversation.
- `src/app/api/chat/route.ts` validates the conversation, picks the free models, and streams the answer.
- `src/lib/resume.ts` fetches and validates the public resume documents.
- `src/lib/profile.ts` provides the profile and experience timeline ready for the page to render.
- `src/app/api/revalidate/route.ts` accepts the cache refresh webhook.
- `.env.template` lists the supported runtime settings.

## Status and boundaries

This is a focused portfolio demo backed by a public resume endpoint. It has no
account system, private resume source, conversation database, or paid-model
requirement. Model availability, rate limits, and the freshness of the public
resume service can affect responses.
