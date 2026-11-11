<p align="center">
  <img src="src/app/apple-icon.png" alt="Resume Chat icon" width="96" />
</p>

# Resume Chat

[![CI](https://github.com/aranlucas/resume-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/aranlucas/resume-chat/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/aranlucas/resume-chat)](LICENSE)

Ask about Lucas Arango's public resume at
[hire-lucas.vercel.app](https://hire-lucas.vercel.app/). Answers use the published
resume directly as model context; check consequential claims against the source
resume. See [product constraints](PRODUCT.md) and the [proposed roadmap](ROADMAP.md).

## Setup

1. Sign in at [FreeLLMAPI on Railway](https://freellmapi-production-1175.up.railway.app/keys)
   and copy the unified API key. The chat uses model `auto`, letting FreeLLMAPI
   handle model selection and fallback routing.
2. Copy the env template and fill it in:

```bash
cp .env.template .env.local
```

3. Run locally:

```bash
pnpm install
pnpm dev
```

Open the URL printed by [Portless](https://github.com/vercel-labs/portless):
normally `https://resume-chat.localhost`, with a branch subdomain in linked
worktrees. Its first run may ask for `sudo` to bind port 443 and trust a local
certificate.

## Configuration

| Variable          | Required | Default                                    | Description                              |
| ----------------- | -------- | ------------------------------------------ | ---------------------------------------- |
| `FREELLM_API_KEY` | Yes      | —                                          | FreeLLMAPI unified API key               |
| `RESUME_API_URL`  | No       | `https://resume-api.aranlucas.workers.dev` | Resume API base URL, e.g. a local server |

## Vercel deployment

The existing project is `aranlucas-projects/resume-chat`, served at
[hire-lucas.vercel.app](https://hire-lucas.vercel.app/).

1. Link this checkout: `vercel link --project resume-chat --scope aranlucas-projects`.
2. Set `FREELLM_API_KEY` as a server-only secret for Production, Preview,
   and Development in the project's environment settings.
3. Deploy with `vercel deploy --prod`. Environment changes require a new
   deployment to take effect.
4. Ask a question on the live site and confirm a complete answer streams.

For local development, pull the Development environment with
`vercel env pull .env.local`. Keep `.env.local` untracked. A missing or invalid
`FREELLM_API_KEY` produces the normal provider error stream; there is no local
key preflight check.

## Resume source

The resume lives in [aranlucas/resume](https://github.com/aranlucas/resume) as a
[JSON Resume](https://jsonresume.org/schema), published without private info to
[resume-api.aranlucas.workers.dev](https://resume-api.aranlucas.workers.dev/).
Edit resume facts in that repository. This app loads `resume.md` for assistant
context and the `/resume` page, and `resume.json` for the profile and timeline.
Both are cached for 30 days under the `resume` tag.

The resume deploy calls `POST /api/revalidate`, which returns
`{"revalidated":true}` and marks both documents stale. Refresh happens in the
background on a subsequent visit; visitors may receive the cached version while
it runs. This webhook is deliberately unauthenticated because the resume is
public and the operation only marks cached data stale.

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

## Chat API and operating limits

`POST /api/chat` accepts a JSON body with an AI SDK UI-message `messages` array
and returns the SDK's UI-message event stream. Validated history is converted
directly for the model, including assistant reasoning. Malformed JSON or invalid
message structures return 400 before upstream access. Resume-loading failures
return 503; provider failures produce a generic, retryable error in the stream.

Resume loading has a 10-second deadline and answers are capped at 2,048 tokens.
The chat labels an answer that stops at that cap as possibly cut off, and offers
a retry when a response finishes without any answer text.
The route declares a 60-second platform duration budget. These limits do not
provide deployment-level rate limiting. Model availability, provider rate limits,
and resume-service availability can affect responses.

## Deterministic browser regressions

CI runs tester-army `e2e@0.23.0` with `@e2e-dev/web@0.15.5` against the
synthetic production build (Node ^22.22.3 or >=24.8). It verifies chat
follow-ups, conversation reset, error and empty-answer retry without duplicate
questions, and source-resume navigation. Browser-level API fixtures avoid live
model calls; the existing route suite separately verifies the real SDK/provider
adapter.
No agent steps or model credentials are used. Failure reports, app logs and
browser traces are uploaded as `e2e-evidence`. Tests and builds for this audit
run only in CI. See [the audit](docs/reliability-audit.md) for scope and evidence.
