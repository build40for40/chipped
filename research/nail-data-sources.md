# Nail data sources: what's free, scriptable, and worth it in a 4-hour build

Research date: 2026-11-13. Brief: "Chipped nails: my nails are always chipped." Direction not decided.
Everything here was tested with curl unless it's marked **untested**. Samples are in `research/samples/` (all small).
Reference scripts are in `nerds-of-fashion/datasets/fashion/scripts/`.

## TL;DR ranking (value for time)

| # | Source | Pull time | Adapt from | Why |
|---|---|---|---|---|
| 1 | Google Books Ngram | 5 min | `fetch-ngram.mjs` (as is, swap phrases) | Tested. 1800–2022 curves for polish, varnish, manicure, gel, acrylic, nail art, colour words and "chipped" phrases. Tells the history story. |
| 2 | BLS CES: nail salon vs hair salon employment | 2 min | new ~30 lines (POST JSON) | Tested. Monthly from 1990 to Sep 2026. Nail salon jobs went from **17.8k (1990) to 158.6k (2025)**, about 9x, while hair salons stayed around 360k–410k. COVID dip is visible. A single strong chart. |
| 3 | Wikipedia articles and pageviews | 5–10 min | `fetch-wikipedia.mjs`, `fetch-pantone.mjs` | Tested. Gives the history timeline and quotes, plus monthly pageviews from 2015 (seasonality, the 2019 "Artificial nails" peak, decline since). |
| 4 | California Safe Cosmetics Program (CSCP) | 2 min (one CSV) | new CSV reducer, like `reduce-met.mjs` | Tested. Every reported hazardous ingredient by product, brand and category, including "Nail Products" subcategories, 2009 onward. Works for a "what's in the bottle" or toxic-trio angle. |
| 5 | openFDA cosmetics adverse events (CAERS) | 2 min | new ~20 lines | Tested. 159 reports about nail-branded cosmetics, with reaction counts (nail injury, onycholysis, burning…). Small but makes a vivid "the cost of a manicure" chart. |
| 6 | V&A Collections API | 5 min | `fetch-vam.mjs` | Tested. Manicure 71, nail varnish 118, nail polish 60, nail file 211 objects, with images and dates (17th century to 1950s). Good for a visual "tools through time" strip. |
| 7 | Arctic Shift Reddit archive (r/RedditLaqueristas) | 10–30 min | new | Tested. Search by title works ("chipped" returns real posts); aggregate endpoint timed out. ToS is grey: it's a third-party archive of Reddit content. |
| 8 | Open Beauty Facts | 2 min | new | Tested. Only 146 nail polish products, mostly EU, sparse ingredients. Low value. |
| 9 | The Met | 5 min | `reduce-met.mjs` / new | Tested. **`/v1/search` was retired on 2026-10-01**; use `/v1.1/search?q=&limit=&offset=`. "manicure" returns 283 hits, but they're noisy (fuzzy matches on paintings). Low value. |
| 10 | Google Trends | 5 min by hand | none | No free API. pytrends is dead and the official API is an application-only alpha. Fallback: a person downloads CSVs from trends.google.com. |
| 11 | Polish shade/hex datasets | n/a | n/a | **No good open dataset exists.** Hand-curate one or derive from Ngram colour words. Details below. |
| 12 | Chipping/wear-time science | n/a | hand-entered | **No peer-reviewed open dataset.** The numbers are folk consensus plus patents. Hand-enter about 10 cited figures. |

---

## 1. Google Books Ngram (rank 1)

- **Endpoint:** `https://books.google.com/ngrams/json?content=a,b,c&year_start=1800&year_end=2022&corpus=en&smoothing=0&case_insensitive=true`
- **Format:** JSON array of `{ngram, timeseries[]}`. With `case_insensitive` you also get the case variants plus an `(All)` row.
- **Coverage:** 1800–2022, yearly. Up to about 12 phrases per call. Licence CC BY 3.0, credit Google Books Ngram Viewer.
- **Adapt:** `fetch-ngram.mjs` already batches, caches and retries 429s. Only the phrase list changes.
- **Tested findings** (`samples/ngram-nails.json`, `ngram-polish-colours.json`, `ngram-chipped.json`):
  - `manicure` first appears around 1810 and peaks in 1931 (All). `nail polish` first appears 1829 and peaks in 2015. `nail varnish` (British) is about 8x rarer than `nail polish` and peaks in 2016.
  - `gel nails` takes off from about 1987 and peaks in 2017. `acrylic nails` peaks in 2021. `nail art` peaks in 2015.
  - Colour phrases: red is highest in 2022. Clear peaked in 2008 and is falling. Black, pink and blue rise sharply after 1990. `nude nail polish` is near zero before the 2010s.
  - Chip phrases: `chipped nail polish` grows about 12x from 1960 to 2022 and peaks in 2021. `chipped manicure` only appears recently.
- **Viz angles:** (a) the 200-year rise of "manicure" then "nail polish" then "gel/acrylic"; (b) varnish (UK) vs polish (US) word race; (c) colour-word streamgraph for "___ nail polish"; (d) "chipped" mentions over time vs gel adoption; (e) era annotations from Wikipedia (Cutex 1910s, Revlon 1932, French manicure 1975, gel around 2010); (f) small multiples per technology.

## 2. BLS Current Employment Statistics: nail salons (rank 2)

- **Series:** `CEU8081211301` nail salons (NAICS 812113), `CEU8081211201` beauty salons (812112), `CEU8081210001` personal care services. Thousands of employees, not seasonally adjusted, monthly.
  - Note the supersector prefix is **80** (Other services). The `70` IDs don't exist.
- **Endpoint:** `POST https://api.bls.gov/publicAPI/v1/timeseries/data/` with body `{"seriesid":[...],"startyear":"1990","endyear":"1999"}`. v1 needs no key, allows 10 years per call and 25 calls a day. A GET returns only the last 3 years.
- **Coverage:** Jan 1990 to Sep 2026 (441 months). Public domain.
- **Sample:** `samples/bls-ces-nail-vs-hair-salons-1990-2026.json` holds the full series for both, keyed `YYYY-MM`.
- **Annual averages (thousands):** nail salons 17.8 (1990), 20.3 (2000), 42.9 (2010), 119.3 (2019), 100.4 (2020), 129.7 (2021), 158.6 (2025). Hair salons 358.8, 400.0, 441.6, 456.0, 348.6, 383.9, 409.4.
- **Also available:**
  - OEWS series `OEUN000000000000039509201`: manicurists and pedicurists, national employment, latest year only by API. 2025 = **152,770**.
  - Historical OEWS national files exist on bls.gov, but bls.gov returns 403 to curl without a browser user agent. Download those by hand.
  - Census County Business Patterns (establishments by state) now **needs an API key**, which means signing up. Skip it, or use the bulk ZIP `https://www2.census.gov/programs-surveys/cbp/datasets/2022/cbp22us.zip` (778 KB, returns 200, no key; county and state files are on the same path).
- **Viz angles:** (a) 9x growth line vs a flat hair-salon line; (b) the COVID cliff and recovery; (c) seasonality (a pre-summer bump?); (d) "a nail salon worker for every N Americans"; (e) per-state salon density map from the CBP bulk file; (f) the share of personal-care jobs that are nail jobs.

## 3. Wikipedia: articles and pageviews (rank 3)

- **Articles** (tested, wikitext sizes): Nail polish 30k, Nail art 25k, Artificial nails 27k (Gel nails redirects here), Manicure 13k (French manicure redirects here), Nail salon 13k, Nail technician 11k, Cutex 7k, OPI Products 7k, Revlon 48k, Onychoschizia 3k (the medical term for peeling and splitting nails), Brittle nails redirects to Onychorrhexis. Press-on nails and Russian manicure have no page.
- **Endpoint:** `https://en.wikipedia.org/w/api.php?action=parse&page=Nail_polish&prop=wikitext&format=json&formatversion=2`. Licence CC BY-SA 4.0. Set a User-Agent, as `fetch-wikipedia.mjs` does.
- **Nail polish sections:** History, Ingredients, Types (base, top, gel), In fashion, French manicure, Nail art, Remover, Health concerns, Regulation. Dated facts include henna on pharaohs, Greek women painting nails "dingy pink" in 1810, Antoine de Paris in the 1920s, and whole-nail painting by the 1940s (before that the tip and half-moon were left bare). Enough for a 15–25 event timeline by hand in about 20 minutes.
- **Pageviews:** `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/{Article}/monthly/2015070100/2026103100`. Monthly from Jul 2015. Tested on 5 articles.
  - Nail polish 282k views (2016) down to 97k (2025).
  - Artificial nails peaked in Mar 2019 at 18.8k a month.
  - Manicure peaked in Oct 2020, during lockdown DIY.
  - This is the best free stand-in for Google Trends.
- **Viz angles:** (a) illustrated history timeline; (b) pageview "interest" lines as a Trends substitute; (c) the lockdown DIY spike; (d) a radial calendar of seasonality; (e) brand founding dates (Cutex, Revlon, OPI, Essie) on the Ngram curve.

## 4. California Safe Cosmetics Program: Chemicals in Cosmetics (rank 4)

- **Dataset:** https://data.chhs.ca.gov/dataset/chemicals-in-cosmetics. CSV at `.../resource/57da6c9a-41a7-44b0-ab8d-815ff2cd5913/download/cscpopendata.csv`. It redirects to a signed S3 URL, so use `curl -L`. A HEAD request returns 403; a GET works.
- **Columns:** ProductName, CompanyName, BrandName, PrimaryCategory ("Nail Products"), SubCategory (for example "Artificial Nails and Related Products"; polish and enamel are also present), ChemicalName, CasNumber, InitialDateReported, MostRecentDateReported, DiscontinuedDate, ChemicalDateRemoved.
- **Size:** about 115k rows statewide (**untested**: full size not checked; the first 400 KB held 328 nail rows). 2009 to present. Open data under CHHS terms (free reuse, cite CDPH).
- **Sample:** `samples/cscp-nail-sample.csv` (60 nail rows: OPI, titanium dioxide, D&C Red etc).
- **Viz angles:** (a) which reportable chemicals are in nail products (titanium dioxide, formaldehyde, toluene, DBP: the "toxic trio" and the "3-free/5-free/10-free" marketing story); (b) chemicals reported and then removed over time; (c) brand by chemical matrix; (d) nail products vs other categories.

## 5. openFDA cosmetics adverse events (rank 5)

- **Endpoint:** `https://api.fda.gov/food/event.json?search=products.industry_name:"Cosmetics"+AND+products.name_brand:nail&count=reactions.exact`. No key needed for light use. Public domain.
- **Coverage:** cosmetics events from 2001 to 2026. Only **159** of them have "nail" in the brand name, so add a search on `products.name_brand:(polish OR gel OR lacquer OR manicure)` to widen it.
- **Top reactions (tested):** nail injury 18, pain in extremity 16, burning 15, onycholysis 15, chemical injury 14, onychomycosis 13. See `samples/openfda-nail-reactions.json`.
- **Viz angles:** (a) a body-map or icon grid of reactions; (b) reports per year; (c) gel/acrylic products vs plain polish. Caveat: the reports are unverified and can't be used to estimate rates.

## 6. V&A Collections API (rank 6)

- **Endpoint:** `https://api.vam.ac.uk/v2/objects/search?q=manicure&page_size=100`. The `info.record_count` field gives totals.
- **Totals:** manicure 71, nail varnish 118, nail polish 60, nail buffer 5, nail file 211.
- **Items include:** manicure sets (1670–80), manicure implements (late 18th century), manicure cases (around 1950), and lots of photographs.
- **Licence:** data is free to reuse; images are non-commercial with credit. The `fetch-vam.mjs` image and IIIF logic carries over.
- **Viz angles:** a museum "tools of the manicure" image strip by century; an object-type count by century.

## 7. Reddit r/RedditLaqueristas via Arctic Shift (rank 7, caution)

- **Endpoint:** `https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=RedditLaqueristas&title=chipped&after=2015-01-01&limit=100&fields=title,created_utc,score,num_comments`
  - Works with no key (sample in `samples/reddit-laqueristas-chipped.json`).
  - `/search/aggregate` needs `after`/`before` and timed out for us. Rate-limit politely.
- **Licence and ToS:** Reddit content belongs to its users, and Reddit's data terms restrict bulk use. Use aggregates and counts only; don't republish post text. The official Reddit API needs OAuth (an account), so it's out.
- **Viz angles:** (a) "chip" and "peel" complaint posts per month; (b) top remedies mentioned in titles (base coat, oil, dehydrator, gel); (c) a word cloud of chip-related titles. Medium effort, medium risk.

## 8–9. Low value: Open Beauty Facts and the Met

- **Open Beauty Facts:** `https://world.openbeautyfacts.org/api/v2/search?categories_tags_en=nail-polishes&fields=...`. 146 products, ODbL, mostly EU, sparse ingredients. Skip.
- **The Met:**
  - Search is now at `https://collectionapi.metmuseum.org/public/collection/v1.1/search?q=manicure&limit=20` (v1 retired 2026-10-01). 283 hits, mostly false positives.
  - Objects are at `/v1/objects/{id}`, licensed CC0 where `isPublicDomain` is true.
  - **Fix needed in `reduce-met.mjs`'s sibling scripts if they call the v1 search.** `reduce-met.mjs` itself uses the CSV, which is still fine.

## 10. Google Trends

- The official API is an alpha that needs an application, and pytrends no longer works reliably.
- **Fastest legal option:** a person opens trends.google.com, compares up to 5 terms (for example gel nails, acrylic nails, press on nails, nail art, chrome nails), and clicks download CSV for worldwide 2004–present. About 5 minutes.
- Otherwise use Wikipedia pageviews (section 3).

## 11. Polish shade and hex datasets: none worth using

- A GitHub search turned up only tiny, unlicensed scrape projects:
  - `justintime123/nail-polish-dataset-creation` (MIT, but it has no data files)
  - `narucalo/nail_polish_dataset` (one 13 KB CSV, no licence)
  - `msmarroquin/polished-python` (two tiny best-seller JSONs)
- Kaggle needs a login, so it's out of scope.
- Brand sites (OPI, Essie, Zoya, Holo Taco) are Shopify stores. Their public `/products.json` exposes shade names and sometimes swatch images, but their ToS generally forbid scraping. **Not recommended.**
- **Alternatives:**
  - Hand-curate about 30–60 iconic shades with an eyedropped hex: OPI "Big Apple Red", "Lincoln Park After Dark", "Bubble Bath"; Chanel "Rouge Noir" (1994); Essie "Ballet Slippers"; Revlon "Cherries in the Snow" (1953). Cite each.
  - Reuse Pantone Colour of the Year from `fetch-pantone.mjs`.
  - Map Ngram colour phrases to representative hexes.
  - Use the Pudding's makeup-shades data (TidyTuesday 2021-03-30, `allShades.csv`) as a format template only. It covers foundation, not polish.

## 12. Chipping and wear-time science: no open dataset; hand-enter cited figures

**Consensus figures** (secondary sources):

| Product | Wear before chipping | Source |
|---|---|---|
| Regular polish | about 5–7 days | Yahoo/experts; r/RedditLaqueristas |
| Gel | about 14 days | CND, salon educators |
| Brand gel claims | up to 21 days | Manucurist |
| Dip powder | about 3–4 weeks | **untested**, typical salon claim |
| Acrylic | 2–3 weeks to infill | **untested**, typical salon claim |

**Primary sources worth citing:**

- USPTO nail enamel patents 5863523 and 6126952. Small wear panels (about 10 people) scored at days 3–10, with percentage differences in wear and gloss.
- A 1990s cosmetic-chemistry trade article (library.scconline.org) saying lab tests correlate poorly with real wear.
- Chen et al., "Nail damage from gel polish manicure", J Cosmet Dermatol 2012: nail-plate thinning after gel removal. **Untested; verify before citing.**
- Zhivagui et al., Nature Communications 2023 (open access, CC BY): UV nail-dryer lamps damaged DNA in cultured cells.
- PubMed E-utilities (tested) gives counts for a "research interest" sparkline: `"nail polish"[tiab]` 544 papers, gel manicure/gel nail 52, nail cosmetics 96. Endpoint: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=...&retmode=json`.

**Viz angles:**

- (a) A "days until first chip" bar or survival-curve illustration by product type: regular, regular with top coat, gel, dip, acrylic.
- (b) An interactive "why polish chips" explainer: nail flex, water swelling the keratin, oils, film thickness, edge wrap. Physics, no dataset needed.
- (c) Trade-offs: wear days vs removal damage vs UV exposure vs cost.
- (d) A user quiz ("your habits mean your polish lasts N days") built on rule-based figures.

## Other options noted, not pursued

- **UK ONS:** CPI item indices and price quotes (OGL) might include a nail varnish or manicure item. ONS search found only paint-varnish manufacturing series. Price quotes dataset: `/economy/inflationandpriceindices/datasets/consumerpriceindicescpiandretailpricesindexrpiitemindicesandpricequotes` (**untested** for nail items).
- **US Census CBP by state:** see section 2 (bulk ZIP, no key).
- **Wikidata SPARQL for nail polish brands and founding years:** our query returned 0 rows. Hand-list them from Wikipedia instead.

## Suggested 4-hour combo

The quickest path to a coherent story: Ngram for the history and the "chipped" phrase curve, BLS salon jobs for the boom, Wikipedia for the timeline and pageviews, and a hand-entered wear-time table for the chipping explainer. That's under 30 minutes of data pulling, almost all adapted from `fetch-ngram.mjs` and `fetch-wikipedia.mjs` plus a 30-line BLS fetcher. Add CSCP or openFDA if the angle turns to "what gel and chemicals do to your nails."
