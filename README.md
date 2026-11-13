# Chipped

A 40 for 40 app: <one line on what it does>. Built with Vue 3, TypeScript and Vite, and served by a Cloudflare Worker.

## Today: Day 10

<Who it's for and the problem it solves, in a sentence or two.>

What we're building today:

1. **<First step>.** <What the user does.>
2. **<Second step>.** <What they get back.>

## Develop

```sh
npm install
cp .dev.vars.example .dev.vars   # then add your ANTHROPIC_API_KEY
npm run dev                      # Vite and the Worker API together, at http://localhost:5173/chipped/
npm run fake                     # or the page with a fake API, no key needed
```

## Check

```sh
npm test          # unit tests, colocated as *.test.ts
npm run build     # type-check and production build
```

## Deploy

Live at https://build40for40.com/chipped/. Merging to `main` deploys it, and every pull request gets a public preview link in a comment.
