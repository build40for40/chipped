# Borrowed, not wired in

Copied from `build40for40/nerds-of-fashion` (Day 9) as reference. Nothing here is imported, built or tested. Move a file into `src/` or `worker/` when the day needs it, then delete what's left over before shipping.

| Path | What it is |
| --- | --- |
| `src/views/` | 18 chart views (stream, spiral, cycle, arcs, colour, board, words, silhouette, globe and more), each drawn as SVG |
| `src/viewkit.ts`, `view.ts`, `stage.ts`, `Stage.vue`, `ViewHost.vue`, `tip.ts`, `registry.ts`, `route.ts` | The view framework: how a view is declared, mounted, tooltipped and kept in the URL's query string |
| `src/drawSpec.ts`, `Draw.vue` + `worker/nerds.ts` | "Draw your own": Claude turns a question into a chart spec (never numbers), and the browser draws it from the static data |
| `src/intent/` + `worker/intent.ts`, `worker/classifier.ts` | Search bar that picks the best view for a query (Jev, with a keyword fallback) and its PostHog events |
| `src/posthog.ts` | Cookieless PostHog loader, as on the site |
| `src/style.css`, `NerdsApp.vue`, `data.ts` | Yesterday's Tailwind tokens, app shell and data loader, for shape only |
| `worker/index.ts` | Yesterday's Worker routes, rate limit and edge cache |
| `datasets/scripts/` | Data pipeline: Ngram, Wikipedia, V&A, Met, Pantone, trend normalising and the comeback forecast |
| `ci.yml` | Yesterday's CI, which also pushed Worker secrets from GitHub org secrets on deploy |

Yesterday's extra dependencies: `d3-geo`, `d3-shape`, `@anthropic-ai/sdk`, `tailwindcss` + `@tailwindcss/vite`. The template uses the Vercel AI SDK instead of `@anthropic-ai/sdk`, and has no Tailwind yet.
