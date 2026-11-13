# Chipped data

Everything "chip" and "nail", as JSON you can chart. `npm run data:publish` copies these files into `public/data/`, so the deployed site serves them at:

| File | Live URL | What's in it |
| --- | --- | --- |
| `entries.json` | https://build40for40.com/chipped/data/entries.json | The catalogue: 30 entries, each with `id`, `label`, `family` (chip/nail), `tone` (serious/silly), `link` (direct/indirect), Ngram phrases, Wikipedia title and any `extra` series |
| `parts/ngram.json` | https://build40for40.com/chipped/data/ngram.json | Google Books Ngram, 1900–2022 yearly. `series[id].values[i]` is the year `from + i`, in occurrences per million words |
| `parts/pageviews.json` | https://build40for40.com/chipped/data/pageviews.json | Wikipedia pageviews. `monthly[title]["YYYYMM"]` from Jul 2015; `daily[title]["YYYYMMDD"]` for the last 60 days (Nvidia, Jensen Huang) |
| `parts/fred.json` | https://build40for40.com/chipped/data/fred.json | FRED series, `series[id].monthly["YYYY-MM"]` and `.annual["YYYY"]`: `VIXCLS` (the VIX, our "nail-biting index"), `IPG3344S` (US chip production), `UNRATE` (unemployment), `USREC` (1 in a recession month), `APU0000718311` (average US price of a 16oz bag of potato chips, dollars, from 1980), `WPU10881201` (producer price index for steel nails, June 2009 = 100) |
| `parts/sp500.json` | https://build40for40.com/chipped/data/sp500.json | The S&P 500 back to 1871, same shape as `fred.json`: `series.SP500` is the index level, `series.SP500_real` is adjusted for inflation and stops at Sep 2023 |
| `parts/nail-prices.json` | https://build40for40.com/chipped/data/nail-prices.json | The real price of iron nails, 1790–2018, from Sichel's "The Price of Nails since 1695". `eras` is the average yearly change in five eras; `index` compounds them into six points, 1790 = 100. Not a yearly series |
| `parts/events.json` | https://build40for40.com/chipped/data/events.json | 19 dated events for annotating charts, each with its source: `thread` is nails, chips, polish or sp500 |
| `parts/neiss.json` | https://build40for40.com/chipped/data/neiss.json | US ER visits by year from CPSC NEISS, by keyword on case notes: nail guns, nail cosmetics, potato chips, wood chippers, poker chips. `estimate` is national, `cases` is raw. Indicative, not official totals |
| `../research/samples/bls-ces-nail-vs-hair-salons-1990-2026.json` | https://build40for40.com/chipped/data/bls-salons.json | BLS jobs in thousands, monthly 1990–Sep 2026: `CEU8081211301` nail salons, `CEU8081211201` hair salons |
| `parts/uk-nail-trade.json` | https://build40for40.com/chipped/data/uk-nail-trade.json | UK imports and exports of manicure and pedicure preparations (HMRC commodity 33043000), monthly from Jan 2000. `series.imports_gbp`, `imports_kg`, `exports_gbp`, `exports_kg`, each with `.monthly["YYYY-MM"]` and `.annual["YYYY"]` (sum of a full year). Trade, not sales |
| `parts/nail-imports-by-country.json` | https://build40for40.com/chipped/data/nail-imports-by-country.json | Imports of manicure and pedicure preparations (HS 330430) by country, 2018–2023, from UN Comtrade. `countries[]` rows with `iso3`, `imports_usd[year]`, `imports_kg[year]`, `population[year]`, `female_share_pct[year]` and the derived `imports_usd_per_woman[year]` |
| `parts/covid-by-country.json` | https://build40for40.com/chipped/data/covid-by-country.json | One row per country for 2020 and 2021: confirmed Covid cases per 100,000 by year end, and the mean and peak of the Oxford lockdown stringency index. `countries[]` keyed by `iso3` |
| `parts/lens-pageviews.json` | https://build40for40.com/chipped/data/lens-pageviews.json | Wikipedia pageviews for the lenses. `byLanguage[]`: 25 language editions mapped to a country, with 2019 and 2020 views of 16 home and outdoor hobby articles. `series[title]`: English monthly and yearly views for dating and self-care topics, from Jul 2015 |
| `parts/uk-women-work.json` | https://build40for40.com/chipped/data/uk-women-work.json | UK women's employment from Eurostat's Labour Force Survey, to 2019. `industries[]`: women employed and their share in each industry section, 2008–2019. `series`: women by occupation group from 1992, including managers (`OC1`) and manual occupations |
| `parts/births-marriage-management.json` | https://build40for40.com/chipped/data/births-marriage-management.json | UK and US yearly births, birth rate, fertility rate, marriage rate and women's share of management jobs, via Our World in Data. `series[<measure>_<GBR or USA>].annual` |
| `parts/uk-selfcare-business.json` | https://build40for40.com/chipped/data/uk-selfcare-business.json | UK turnover, enterprises, value added and employment costs for hair and beauty (SIC 96.02), spas and massage (96.04) and fitness facilities (93.13), yearly 2008–2024, from the ONS Annual Business Survey. `series[sic<code>_<measure>].annual` |
| `parts/uk-nomis.json` | https://build40for40.com/chipped/data/uk-nomis.json | From Nomis. `series[sic<code>_enterprises].annual`: number of UK businesses in hair and beauty (96020), spas and massage (96040) and fitness facilities (93130), 2010–2026. `industries[]`: jobs held by women and by everyone in each industry section, each June 1996–2026. `series[women_...]`: women employed by major occupation group (managers, manual groups and the rest), yearly 2006–2025 |
| `parts/eu-selfcare-business.json` | https://build40for40.com/chipped/data/eu-selfcare-business.json | The same three industries in 33 European countries plus the EU total, 2021–2024, from Eurostat: enterprises, people employed and turnover. `countries[].industries[code][measure][year]`. No UK |
| `parts/england-women-sport.json` | https://build40for40.com/chipped/data/england-women-sport.json | Share and number of women and men in England who are active, fairly active or inactive, yearly 2016–2025, from Sport England's Active Lives Adult Survey. `series[women_active_pct].annual` and friends |
| `parts/uk-grooming-prices.json` | https://build40for40.com/chipped/data/uk-grooming-prices.json | ONS consumer price index for hairdressing and personal grooming (`D7EY`, 2015 = 100), monthly from 1988 |
| `parts/us-protests.json` | https://build40for40.com/chipped/data/us-protests.json | US protest events and estimated crowds from the Crowd Counting Consortium, Jan 2017 to May 2026: `events_all`, `people_all`, and `events_women`, `people_women` for protests tagged women's rights or reproductive rights. Each has `.weekly` (keyed by the Monday), `.monthly` and `.annual` |
| `parts/eating-styles.json` | https://build40for40.com/chipped/data/eating-styles.json | **Hand-coded, not fetched.** 14 countries sorted into hands, chopsticks or cutlery, each with the Wikipedia article it rests on |
| `parts/lenses.json` | https://build40for40.com/chipped/data/lenses.json | An earlier pull of the non-nail side of the lenses, under `lenses.<name>`. Most of it overlaps the lens files above; use those first. Only here: `selfCare.jobs` (US fitness-centre, nail and hair salon jobs, yearly 2005–2025, until `bls-selfcare.json` can be fetched), `protests` daily English "Nail salon" pageviews 2016–2021, and Ngram book counts for dating and promotion phrases in `pride` |

Every entry is keyed by the same `id` across files. The lens files above are not entries: [`LENSES.md`](LENSES.md) says which of the seven lenses each one serves, what is a stand-in, and what is still missing. The baseline everything is compared against is `chipped-nails`.

## Refreshing

```bash
node data/scripts/fetch-ngram.mjs       # cached in data/raw/, reruns only fetch new phrases
node data/scripts/fetch-pageviews.mjs
node data/scripts/fetch-fred.mjs
node data/scripts/fetch-sp500.mjs
node data/scripts/summarise.mjs 1960    # ranks correlations with chipped nails
# The lens datasets (see LENSES.md). Each caches its downloads in data/raw/; add --fresh to refetch.
node data/scripts/fetch-uk-nail-trade.mjs
node data/scripts/fetch-comtrade-nail-imports.mjs
node data/scripts/fetch-owid-covid.mjs            # downloads about 98 MB
node data/scripts/fetch-lens-pageviews.mjs        # about 400 calls, slow when Wikimedia rate-limits
node data/scripts/fetch-eurostat-lfs.mjs
node data/scripts/fetch-owid-births-work.mjs
node data/scripts/fetch-ons-abs.mjs
node data/scripts/fetch-eurostat-sbs.mjs
node data/scripts/fetch-nomis.mjs
node data/scripts/fetch-sport-england.mjs        # finds the newest workbook on Sport England's data tables page
node data/scripts/fetch-ons-cpi.mjs
node data/scripts/fetch-ccc-protests.mjs          # downloads about 200 MB
node data/scripts/fetch-bls-selfcare.mjs          # not run yet: writes bls-selfcare.json, needs 4 of the 25 keyless BLS calls a day
node data/scripts/build-lenses.mjs      # rewrites src/lenses/data.json, the numbers the seven lens charts draw
npm run data:publish
```

`node data/scripts/fetch-lenses.mjs` refreshes `lenses.json` (about 5 minutes; it caches a 185 MB Covid file and a 37 MB protest file in `data/raw/lenses/`).

`reduce-neiss.mjs` needs the NEISS yearly spreadsheets downloaded by hand; its header says how.

## Pub facts so far

- More Americans go to the ER over manicures and nail products (about 12,000 a year) than over nail guns (7,000–9,000).
- "Chip on your shoulder" tracks chipped nails best, even year on year (rΔ 0.72).
- As "blue chips" fell out of books, chipped nails rose (r −0.76).
- US chip production is up about 5,400-fold since 1972.
- A bag of potato chips went from $2.04 in 1980 to $6.71 in 2025, and tracks the S&P 500 with r 0.91. Both just go up, so check the year-on-year figure before repeating it.
- A nail cost about ten times more in 1790 than in 1930, in real terms. Since 1930 the price has roughly quadrupled.
- Jensen Huang's Wikipedia page went from about 6,000 views a day to 1.07 million on 12 November 2026, the day he resigned amid reports of an affair with an *alleged* Chinese spy.

## What the lens data says so far (US nail salon jobs, 2005–2025, from `lenses.json`)

- **Self care:** when gyms hire, nail salons hire. Fitness-centre jobs track nail-salon jobs even year on year and before Covid (rΔ 0.86), far more than hair salons do (0.34).
- **Covid hobbies:** painting your nails didn't boom. Across 22 languages, the median change in "Nail polish" views in 2020 was +1%, unrelated to how strict lockdown was (r 0.11). Sourdough was +78%, jigsaws +34%. Turkish shows +1,240%, but from 653 views, so ignore it.
- **Protests:** salon interest does rise in the weeks after the big women's protests, but they all fall in January, and salon interest rises every spring anyway. The lag is the season, not the march.
- **Pride:** births fell as salon jobs rose (r −0.95), and women's share of management rose with them (0.96), but year on year both links mostly vanish: three things changing over 20 years.

## Licences

Ngram CC BY 3.0 (credit Google Books Ngram Viewer). Wikipedia pageviews CC0. FRED: credit the Federal Reserve Bank of St. Louis and each series' source. BLS and NEISS: US government, public domain. S&P 500: Robert Shiller's dataset via `datasets/s-and-p-500` (Open Data Commons PDDL). Nail prices: figures from Sichel, NBER Working Paper 29617, Table 1. Events: Sichel's data appendix and Wikipedia (CC BY-SA 4.0), reworded. Lens files: HMRC and ONS under the Open Government Licence v3.0; Eurostat and Our World in Data CC BY 4.0; UN Comtrade free with credit; Crowd Counting Consortium CC0; Sport England with credit; World Bank CC BY 4.0; BLS public domain; each file's `source` and `licence` fields have the detail.
