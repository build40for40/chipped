# Chipped (Day 10)

Day 10 of 40 for 40, built live on Twitch on Friday 13 November 2026. The problem is "Chipped nails", from <problem owner>. Work is tracked on the Superthread `day10` board and the "Day 10" page.

- **Form factor:** a web app at https://build40for40.com/chipped/.

Shared 40 for 40 context, services and rules live in `../AGENTS.md`.

## Stack

- Vue 3 with `<script setup lang="ts">`, built with Vite.
- Vitest with jsdom and `@vue/test-utils`. Unit tests sit next to their source as `*.test.ts`. Tests for Worker code start with `// @vitest-environment node`.
- `@/` resolves to `src/`.
- The Worker in `worker/` serves the API under `/chipped/api/*`. Everything else under `/chipped/` is a static file from `dist/chipped/`.
- Claude goes through the Vercel AI SDK (`ai` and `@ai-sdk/anthropic`, model `claude-sonnet-5-5`). `POST /chipped/api/ask` streams structured output with `streamText` and `Output.object`, and the page reads it with `useObject` from `@ai-sdk/vue`. The zod schemas both sides share live in `src/ask/schema.ts`. Without an `ANTHROPIC_API_KEY` the endpoint answers 503.
- Pass `onError` to every `streamText` and log only the error name: the default handler logs the whole request, which holds what the user typed.
- In the browser, build API URLs from `import.meta.env.BASE_URL` (`${import.meta.env.BASE_URL}api/...`), never a hard-coded `/api`.

## Commands

- `npm run dev`: Vite on port 5173 plus `wrangler dev` on 8787, with Vite proxying `/chipped/api` to the Worker. Open http://localhost:5173/chipped/. Copy `.dev.vars.example` to `.dev.vars` and add an `ANTHROPIC_API_KEY` first.
- `npm run fake`: Vite only, with `dev/fake-api.ts` standing in for the Worker, so the page clicks through with no key. Answers are canned, and production builds leave it out.
- `npm test`: unit tests.
- `npm run build`: type-check with `vue-tsc`, then build to `dist/chipped/`.
- `npm run deploy`: build, then deploy to production as the `40for40` wrangler profile. CI does this on every push to `main`, so it's only needed by hand before CI has its token.
- Run wrangler as `npm run wrangler -- <args>`, never `npx wrangler`.

## Hosting

- A Cloudflare Worker named `chipped` serves `dist/` as static assets on the `build40for40.com/chipped` and `build40for40.com/chipped/*` routes. Those routes run before the site's Worker, which owns the rest of the domain.
- Vite builds with `base: '/chipped/'` into `dist/chipped/`, so the asset paths match the URL path. `run_worker_first` sends only `/chipped/api/*` to the Worker code.
- CI (`.github/workflows/ci.yml`) tests and builds every push and PR. Pushes to `main` deploy to production. PRs upload a preview version and comment its public `workers.dev` link, which is named after the branch.
- Deploys need the `CLOUDFLARE_API_TOKEN` secret on the repo. Without it CI still tests and builds, and skips deploying.
- The Worker needs the `ANTHROPIC_API_KEY` Cloudflare secret, set once with `npm run wrangler -- secret put ANTHROPIC_API_KEY`. Every Worker secret is listed, with an empty value, in `.dev.vars.example`.

## The problem

My nails are always chipped

## What we're building

<The MVP in a few bullets, and what was cut.>

## Decided

<Product and design decisions as the team makes them. Leave out anything still open.>
