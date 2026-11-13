# Chipped data

Everything "chip" and "nail", as JSON you can chart. `npm run data:publish` copies these files into `public/data/`, so the deployed site serves them at:

| File | Live URL | What's in it |
| --- | --- | --- |
| `entries.json` | https://build40for40.com/chipped/data/entries.json | The catalogue: 29 entries, each with `id`, `label`, `family` (chip/nail), `tone` (serious/silly), `link` (direct/indirect), Ngram phrases, Wikipedia title and any `extra` series |
| `parts/ngram.json` | https://build40for40.com/chipped/data/ngram.json | Google Books Ngram, 1900–2022 yearly. `series[id].values[i]` is the year `from + i`, in occurrences per million words |
| `parts/pageviews.json` | https://build40for40.com/chipped/data/pageviews.json | Wikipedia pageviews. `monthly[title]["YYYYMM"]` from Jul 2015; `daily[title]["YYYYMMDD"]` for the last 60 days (Nvidia, Jensen Huang) |
| `parts/fred.json` | https://build40for40.com/chipped/data/fred.json | FRED series, `series[id].monthly["YYYY-MM"]` and `.annual["YYYY"]`: `VIXCLS` (the VIX, our "nail-biting index"), `IPG3344S` (US chip production), `UNRATE` (unemployment), `USREC` (1 in a recession month) |
| `parts/neiss.json` | https://build40for40.com/chipped/data/neiss.json | US ER visits by year from CPSC NEISS, by keyword on case notes: nail guns, nail cosmetics, potato chips, wood chippers, poker chips. `estimate` is national, `cases` is raw. Indicative, not official totals |
| `../research/samples/bls-ces-nail-vs-hair-salons-1990-2026.json` | https://build40for40.com/chipped/data/bls-salons.json | BLS jobs in thousands, monthly 1990–Sep 2026: `CEU8081211301` nail salons, `CEU8081211201` hair salons |

Every entry is keyed by the same `id` across files. The baseline everything is compared against is `chipped-nails`.

## Refreshing

```bash
node data/scripts/fetch-ngram.mjs       # cached in data/raw/, reruns only fetch new phrases
node data/scripts/fetch-pageviews.mjs
node data/scripts/fetch-fred.mjs
node data/scripts/summarise.mjs 1960    # ranks correlations with chipped nails
npm run data:publish
```

`reduce-neiss.mjs` needs the NEISS yearly spreadsheets downloaded by hand; its header says how.

## Pub facts so far

- More Americans go to the ER over manicures and nail products (about 12,000 a year) than over nail guns (7,000–9,000).
- "Chip on your shoulder" tracks chipped nails best, even year on year (rΔ 0.72).
- As "blue chips" fell out of books, chipped nails rose (r −0.76).
- US chip production is up about 5,400-fold since 1972.
- Jensen Huang's Wikipedia page went from about 6,000 views a day to 1.07 million on 12 November 2026, the day he resigned amid reports of an affair with an *alleged* Chinese spy.

## Licences

Ngram CC BY 3.0 (credit Google Books Ngram Viewer). Wikipedia pageviews CC0. FRED: credit the Federal Reserve Bank of St. Louis and each series' source. BLS and NEISS: US government, public domain.
