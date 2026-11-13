#!/usr/bin/env node
// Pulls "the other side" of each of Samira's seven lenses (the non-nail series) into data/parts/lenses.json.
// The nail side (polish imports, UK salons) comes from Samira's pull; US salon jobs are in bls-salons.json.
// Big downloads are cached in data/raw/lenses/. Run: node data/scripts/fetch-lenses.mjs
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cache = join(root, "raw", "lenses");
const outPath = join(root, "parts", "lenses.json");
const UA = "40for40-day10-dataset/1.0 (https://build40for40.com)";
const FROM = 2005;
const TO = 2025;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true, () => false);
const round = (x, d = 4) => (x == null || Number.isNaN(x) ? null : Number(x.toPrecision(d)));

async function get(url, { json = true, tries = 5 } = {}) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA } });
    } catch (err) {
      res = { ok: false, status: `network ${err.message}` };
    }
    if (res.ok) return json ? res.json() : res.text();
    if (res.status === 404) return null;
    if (attempt >= tries) throw new Error(`${url}: HTTP ${res.status}`);
    await sleep(1500 * 2 ** attempt);
  }
}

async function download(url, file) {
  const path = join(cache, file);
  if (!(await exists(path))) {
    console.log(`downloading ${file}`);
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    await writeFile(path, Buffer.from(await res.arrayBuffer()));
  }
  return path;
}

async function* lines(path) {
  yield* createInterface({ input: createReadStream(path), crlfDelay: Infinity });
}

// Splits one CSV or TSV line, honouring double quotes.
function split(line, sep) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') (cur += '"'), i++;
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) out.push(cur), (cur = "");
    else cur += c;
  }
  out.push(cur);
  return out;
}

// World Bank indicator for every country, one value per year. Returns { ISO3: { year: value } } plus names.
async function worldBank(indicator) {
  const data = await get(`https://api.worldbank.org/v2/country/all/indicator/${indicator}?date=${FROM}:${TO}&format=json&per_page=20000`);
  const out = {};
  const names = {};
  for (const r of data[1] ?? []) {
    if (r.value == null || !r.countryiso3code) continue;
    (out[r.countryiso3code] ??= {})[r.date] = round(r.value, 6);
    names[r.countryiso3code] = r.country.value;
  }
  return { out, names };
}

const ngramYears = async (phrases) => {
  const params = new URLSearchParams({ content: phrases.join(","), year_start: String(FROM), year_end: "2022", corpus: "en", smoothing: "0", case_insensitive: "true" });
  const rows = await get(`https://books.google.com/ngrams/json?${params}`);
  const out = {};
  for (const p of phrases) {
    const row = rows.find((r) => !r.parent && r.ngram.replace(/ \(All\)$/, "").toLowerCase() === p.toLowerCase());
    out[p] = row ? Object.fromEntries(row.timeseries.map((v, i) => [String(FROM + i), round(v * 1e6)])) : null;
  }
  return out;
};

// Monthly or daily Wikipedia pageviews for one article on one language edition.
async function views(lang, title, granularity, start, end) {
  const article = encodeURIComponent(title.replace(/ /g, "_"));
  const data = await get(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.wikipedia/all-access/user/${article}/${granularity}/${start}/${end}`);
  return data ? data.items.map((i) => [i.timestamp.slice(0, 8), i.views]) : null;
}

async function blsAnnual(ids) {
  const out = Object.fromEntries(ids.map((id) => [id, {}]));
  for (let start = FROM; start <= TO; start += 10) {
    const body = { seriesid: ids, startyear: String(start), endyear: String(Math.min(start + 9, TO)) };
    const res = await fetch("https://api.bls.gov/publicAPI/v1/timeseries/data/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json();
    for (const s of j.Results?.series ?? []) {
      const byYear = {};
      for (const d of s.data) if (/^M(0\d|1[0-2])$/.test(d.period)) (byYear[d.year] ??= []).push(Number(d.value));
      for (const [y, xs] of Object.entries(byYear)) if (xs.length === 12) out[s.seriesID][y] = round(xs.reduce((a, b) => a + b) / 12);
    }
  }
  return out;
}

await mkdir(cache, { recursive: true });
const lenses = {};

// ---- Lens 1: pride. Births (World Bank), and dating and promotion talk in books as stand-ins. ----
{
  const births = await worldBank("SP.DYN.CBRT.IN");
  const women = await worldBank("SL.EMP.SMGT.FE.ZS"); // female share of employment in senior and middle management
  const books = await ngramYears(["first date", "online dating", "dating app", "promoted to manager", "glass ceiling"]);
  lenses.pride = {
    note: "Yearly. Births per 1,000 people (World Bank SP.DYN.CBRT.IN). Women's share of senior and middle management, % (World Bank SL.EMP.SMGT.FE.ZS, from ILO, patchy years). No dataset counts dates or promotions, so book mentions per million words stand in.",
    births: { US: births.out.USA, UK: births.out.GBR },
    womenInManagement: { US: women.out.USA, UK: women.out.GBR },
    books,
  };
  console.log("lens 1 pride done");
}

// ---- Lens 2: manual work and sport. Women in industry jobs (World Bank/ILO) and sport talk. ----
{
  const industry = await worldBank("SL.IND.EMPL.FE.ZS"); // % of female employment in industry
  const books = await ngramYears(["women's football", "women's sport", "women's soccer", "women in construction"]);
  lenses.manualAndSport = {
    note: "Yearly. Women employed in industry (mining, manufacturing, construction, utilities) as a % of all employed women, ILO modelled estimates via World Bank SL.IND.EMPL.FE.ZS: the closest free series to 'manual jobs'. No free yearly series of women playing sport covers both countries; Sport England's Active Lives (UK, from 2015) is a manual download. Book mentions stand in.",
    womenInIndustry: { US: industry.out.USA, UK: industry.out.GBR },
    books,
  };
  console.log("lens 2 manual and sport done");
}

// ---- Lens 4: Covid against home and outdoor hobbies, by country. ----
{
  const path = await download("https://catalog.ourworldindata.org/garden/covid/latest/compact/compact.csv", "owid-covid-compact.csv");
  const byCountry = {};
  let head;
  for await (const line of lines(path)) {
    const row = split(line, ",");
    if (!head) {
      head = Object.fromEntries(row.map((h, i) => [h, i]));
      continue;
    }
    const date = row[head.date];
    if (!date.startsWith("2020")) continue;
    const c = (byCountry[row[head.country]] ??= { maxStringency: null, meanStringency: [], casesPerMillion2020: null });
    const s = Number(row[head.stringency_index]);
    if (row[head.stringency_index] !== "" && !Number.isNaN(s)) {
      c.maxStringency = Math.max(c.maxStringency ?? 0, s);
      c.meanStringency.push(s);
    }
    const cases = Number(row[head.total_cases_per_million]);
    if (row[head.total_cases_per_million] !== "" && !Number.isNaN(cases)) c.casesPerMillion2020 = cases;
  }
  for (const c of Object.values(byCountry)) {
    c.meanStringency = c.meanStringency.length ? round(c.meanStringency.reduce((a, b) => a + b) / c.meanStringency.length) : null;
    c.casesPerMillion2020 = round(c.casesPerMillion2020);
  }

  // Hobby interest: Wikipedia pageviews in a language mostly spoken in one country, 2020 against 2019.
  const LANGS = { ja: "Japan", ko: "South Korea", it: "Italy", pl: "Poland", sv: "Sweden", nl: "Netherlands", tr: "Turkey", vi: "Vietnam", th: "Thailand", de: "Germany", fr: "France", pt: "Brazil", es: "Spain", fi: "Finland", cs: "Czechia", el: "Greece", hu: "Hungary", da: "Denmark", no: "Norway", he: "Israel", id: "Indonesia", uk: "Ukraine", ro: "Romania", en: "English speakers" };
  const HOBBIES = { home: ["Nail polish", "Knitting", "Jigsaw puzzle", "Sourdough", "Embroidery"], outdoor: ["Hiking", "Cycling", "Running", "Gardening"] };
  const hobbies = {};
  for (const [kind, titles] of Object.entries(HOBBIES)) {
    for (const title of titles) {
      const ll = await get(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=langlinks&lllimit=500&redirects=1&format=json`);
      const page = Object.values(ll.query.pages)[0];
      const local = Object.fromEntries((page.langlinks ?? []).map((l) => [l.lang, l["*"]]));
      local.en = page.title;
      const row = (hobbies[title] = { kind, byLanguage: {} });
      for (const lang of Object.keys(LANGS)) {
        if (!local[lang]) continue;
        const v = await views(lang, local[lang], "monthly", "2019010100", "2020123100");
        if (!v) continue;
        const sum = (y) => v.filter(([t]) => t.startsWith(y)).reduce((s, [, n]) => s + n, 0);
        const y19 = sum("2019");
        const y20 = sum("2020");
        if (y19 > 0) row.byLanguage[lang] = { title: local[lang], views2019: y19, views2020: y20, change: round((y20 / y19 - 1) * 100, 3) };
        await sleep(60);
      }
      console.log(`  hobby ${title}: ${Object.keys(row.byLanguage).length} languages`);
    }
  }
  lenses.covidHobbies = {
    note: "Per country, 2020. Stringency is the Oxford COVID-19 Government Response Tracker index (0-100), via Our World in Data; casesPerMillion2020 is confirmed cases by 31 Dec 2020. Hobby interest is Wikipedia pageviews in that country's main language, % change 2020 vs 2019: a language is not a country (German covers Austria, Spanish covers Latin America), so treat it as a rough stand-in. Google Trends by country would be better and is a manual download.",
    languages: LANGS,
    covid: Object.fromEntries(Object.entries(byCountry).filter(([, c]) => c.maxStringency != null)),
    hobbies,
  };
  console.log("lens 4 covid hobbies done");
}

// ---- Lens 5: female population per country, to turn polish imports into "per woman". ----
{
  const pop = await worldBank("SP.POP.TOTL.FE.IN");
  const latest = {};
  for (const [iso, years] of Object.entries(pop.out)) {
    const y = Object.keys(years).sort().at(-1);
    latest[iso] = { name: pop.names[iso], year: Number(y), women: years[y] };
  }
  lenses.handsOrCutlery = {
    note: "Female population by country, latest year (World Bank SP.POP.TOTL.FE.IN). Divide manicure product imports (UN Comtrade 330430, from Samira's pull) by this for 'per woman'. Includes World Bank regional aggregates, whose ISO3 codes aren't countries (e.g. WLD, EUU). Eating method has no dataset and needs hand coding with a source per country.",
    femalePopulation: latest,
  };
  console.log("lens 5 female population done");
}

// ---- Lens 6: self care. US jobs in fitness centres vs nail salons, plus books and pageviews for each kind. ----
{
  const bls = await blsAnnual(["CEU7071394001", "CEU8081211301", "CEU8081211201"]);
  const books = await ngramYears(["yoga", "Pilates", "gym membership", "massage", "day spa", "nail salon"]);
  const titles = ["Yoga as exercise", "Pilates", "Gym", "Massage", "Day spa", "Nail salon"];
  const pageviews = {};
  for (const t of titles) {
    const v = await views("en", t, "monthly", "2015070100", "2025123100");
    if (!v) continue;
    const byYear = {};
    for (const [ts, n] of v) byYear[ts.slice(0, 4)] = (byYear[ts.slice(0, 4)] ?? 0) + n;
    delete byYear["2015"]; // half a year
    pageviews[t] = byYear;
  }
  lenses.selfCare = {
    note: "Yearly. US jobs in thousands, annual average of monthly, not seasonally adjusted (BLS CES): CEU7071394001 fitness and recreational sports centres, CEU8081211301 nail salons, CEU8081211201 hair salons. No US jobs series for yoga, Pilates, massage or spas alone, so book mentions (per million words, to 2022) and English Wikipedia pageviews (2016-2025) stand in for each.",
    jobs: { fitnessCentres: bls.CEU7071394001, nailSalons: bls.CEU8081211301, hairSalons: bls.CEU8081211201 },
    books,
    pageviews,
  };
  console.log("lens 6 self care done");
}

// ---- Lens 7: protests. US protest events (Crowd Counting Consortium) and daily nail-salon interest. ----
{
  const path = await download("https://dataverse.harvard.edu/api/access/datafile/10808404", "ccc_compiled_20172020.tab");
  let head;
  const events = [];
  const monthly = {};
  for await (const line of lines(path)) {
    const row = split(line, "\t");
    if (!head) {
      head = Object.fromEntries(row.map((h, i) => [h.trim(), i]));
      console.log(`  protest columns: ${Object.keys(head).join(", ")}`);
      continue;
    }
    const date = row[head.date];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) continue;
    const size = Number(row[head.size_mean] ?? "");
    const claims = (row[head.claims] ?? "").toLowerCase();
    const women = /\bwom[ae]n|feminis|reproductive|abortion|roe v|#metoo|gender equality|planned parenthood/.test(claims);
    const m = (monthly[date.slice(0, 7)] ??= { events: 0, womenEvents: 0, womenTurnout: 0 });
    m.events++;
    if (women) {
      m.womenEvents++;
      if (!Number.isNaN(size)) m.womenTurnout += size;
    }
    if (women && size >= 10000) events.push({ date, place: `${row[head.locality] ?? ""}, ${row[head.state] ?? ""}`.replace(/^, /, ""), size: Math.round(size) });
  }
  // Big days: total women's-issue turnout per date, top 15.
  const byDay = {};
  for (const e of events) byDay[e.date] = (byDay[e.date] ?? 0) + e.size;
  const bigDays = Object.entries(byDay).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([date, turnout]) => ({ date, turnout })).sort((a, b) => a.date.localeCompare(b.date));

  const daily = await views("en", "Nail salon", "daily", "2016010100", "2021123100");
  lenses.protests = {
    note: "US protests 2017-2020 from the Crowd Counting Consortium (Harvard Dataverse, CC0). 'Women' means the claims mention women, feminism, abortion or reproductive rights, #MeToo or gender equality: a keyword match, not the protesters' gender. bigDays is the 15 dates with the most women's-issue turnout (sum of mean size estimates, events of 10,000+). There is no weekly salon sales series; daily English Wikipedia views of 'Nail salon' stand in, so sum them into weeks for the event study.",
    monthly,
    bigDays,
    nailSalonDailyViews: daily ? Object.fromEntries(daily) : null,
  };
  console.log(`lens 7 protests done: ${bigDays.length} big days`);
}

lenses.byIndustry = {
  note: "Lens 3 has no data: nobody publishes who wears nail polish at work. Run a poll (industry + 'do you wear polish at work?'), then weight by women employed per industry: ONS EMP13 (UK, manual download from ons.gov.uk).",
};

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify({ fetched: new Date().toISOString(), lenses }) + "\n");
console.log(`wrote ${outPath}`);
