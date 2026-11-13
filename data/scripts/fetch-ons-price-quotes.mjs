#!/usr/bin/env node
// Reads the ONS consumer price "price quotes" files (the individual shop prices behind the CPI) and writes
// data/parts/uk-manicure-prices.json: the median and mean quoted price and the number of quotes, each month,
// for two items: 520331 BASIC MANICURE and 520250 NAIL VARNISH BOTTLE. Real quoted prices only, no index numbers.
//
// The ONS dataset page links one file per month (per quarter or per year for older ones; csv, zip, zip of zips
// and one xlsx). Each file is 10 to 40 MB and there are about 110 of them, so instead of keeping 2.5 GB the script
// keeps only the header and the untouched rows for our two items, in data/raw/ons-price-quotes/<file>.csv.
// A rerun only downloads files it has no extract for. Add --fresh to download everything again.
//
// Which quotes count: the ones the ONS used in that month's index, with a price above zero.
//   Files to January 2025: validity 3 (validated by system) or 4 (accepted by ONS staff). The ONS glossary says only these are used.
//   Files from February 2025 (the layout with a CS_ID column): VALIDITY is True ("quote included in the current month's index").
//   The April 2025 file is a spreadsheet, where True is stored as 1.
// Everything else (temporarily out of stock, missing, not validated) is dropped.
// Run: node data/scripts/fetch-ons-price-quotes.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { parseCsv, readXlsx, root, round, sleep, UA, writePart, colNum } from "./lens-lib.mjs";

const PAGE = "https://www.ons.gov.uk/economy/inflationandpriceindices/datasets/consumerpriceindicescpiandretailpricesindexrpiitemindicesandpricequotes";
const ITEMS = { 520331: "manicure", 520250: "nail_varnish" };
const WANTED = new RegExp(`(^|,)\\s*"?(${Object.keys(ITEMS).join("|")})"?\\s*,`);
const REGIONS = { 1: "Catalogue collections (head office)", 2: "London", 3: "South East", 4: "South West", 5: "East Anglia", 6: "East Midlands", 7: "West Midlands", 8: "Yorkshire and the Humber", 9: "North West", 10: "North", 11: "Wales", 12: "Scotland", 13: "Northern Ireland" };
const fresh = process.argv.includes("--fresh");
const dir = join(root, "raw", "ons-price-quotes");
await mkdir(dir, { recursive: true });

async function get(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(300000) });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if (attempt >= 3 || (res.status !== 429 && res.status < 500)) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt >= 3) throw new Error(`${url}: ${err.message}`);
    }
    await sleep(4000 * 2 ** attempt);
  }
}

// Every file in a zip as a Buffer (walks the central directory).
function unzip(buf) {
  const out = [];
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("not a zip file");
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = buf.readUInt16LE(eocd + 10); n > 0; n--) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    if (!name.endsWith("/")) out.push({ name, data: method === 0 ? raw : inflateRawSync(raw) });
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return out;
}

const csvCell = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
// Returns the header line plus the untouched lines for our items, for every table inside the download.
function extract(name, buf) {
  if (/\.zip$/i.test(name)) return unzip(buf).map((f) => extract(f.name, f.data)).join("");
  if (/\.xlsx$/i.test(name)) {
    const book = readXlsx(buf);
    let text = "";
    for (const sheetName of book.sheetNames) {
      const rows = book.sheet(sheetName).map((cells) => {
        const line = [];
        for (const [col, v] of Object.entries(cells)) line[colNum(col) - 1] = v;
        return Array.from(line, (v) => csvCell(v ?? "")).join(",");
      });
      const head = rows.findIndex((r) => /quote_date/i.test(r));
      if (head < 0) continue;
      text += [rows[head], ...rows.slice(head + 1).filter((r) => WANTED.test(r))].join("\n") + "\n";
    }
    return text;
  }
  if (!/\.csv$/i.test(name)) return "";
  const lines = buf.toString("latin1").split(/\r?\n/);
  if (!/quote_date/i.test(lines[0])) throw new Error(`${name}: no header row`);
  return [lines[0], ...lines.filter((l) => WANTED.test(l))].join("\n") + "\n";
}

// 1. The list of price quote files, from the dataset page.
const page = (await get(PAGE)).toString("utf8");
const links = [...new Set([...page.matchAll(/href="(\/file\?uri=[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&")))].filter((l) => /\/prices?quotes?[^/]*\/[^/]+$/i.test(l));
console.log(`${links.length} price quote files linked from the ONS page`);
if (links.length < 100) throw new Error("the ONS page layout has changed: too few price quote links");

// 2. Download (or reuse) each one, keeping only our rows.
const quotes = {}; // item -> month -> { all, prices: [], regions: { code: [prices] } }
const sources = {}; // month -> file
const validityValues = {};
for (const link of links) {
  const file = link.split("/").at(-1);
  const path = join(dir, `${file}.csv`);
  let text;
  try {
    if (fresh) throw new Error("fresh");
    text = await readFile(path, "utf8");
  } catch {
    text = extract(file, await get(`https://www.ons.gov.uk${link}`));
    await writeFile(path, text);
    await sleep(300);
  }
  let col = null;
  const months = new Set();
  for (const row of parseCsv(text)) {
    const cells = row.map((c) => c.trim());
    if (cells.some((c) => /^quote_date$/i.test(c))) {
      const names = cells.map((c) => c.toLowerCase());
      col = Object.fromEntries(["quote_date", "item_id", "cs_id", "validity", "price", "region"].map((k) => [k, names.indexOf(k)]));
      col.modern = col.cs_id >= 0;
      if (col.item_id < 0) col.item_id = col.cs_id;
      for (const k of ["quote_date", "item_id", "validity", "price", "region"]) if (col[k] < 0) throw new Error(`${file}: no ${k} column`);
      continue;
    }
    const item = ITEMS[cells[col.item_id]];
    if (!item) continue;
    const month = `${cells[col.quote_date].slice(0, 4)}-${cells[col.quote_date].slice(4, 6)}`;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error(`${file}: bad quote_date ${cells[col.quote_date]}`);
    if (sources[month] && sources[month] !== file) throw new Error(`${month} is in both ${sources[month]} and ${file}`);
    months.add(month);
    const validity = cells[col.validity].toLowerCase();
    validityValues[`${col.modern ? "new" : "old"} layout ${validity}`] = (validityValues[`${col.modern ? "new" : "old"} layout ${validity}`] ?? 0) + 1;
    const price = Number(cells[col.price]);
    const m = ((quotes[item] ??= {})[month] ??= { all: 0, prices: [], regions: {} });
    m.all++;
    const valid = col.modern ? validity === "true" || validity === "1" : validity === "3" || validity === "4";
    if (valid && price > 0) {
      m.prices.push(price);
      (m.regions[Number(cells[col.region])] ??= []).push(price);
    }
  }
  for (const month of months) sources[month] = file;
  console.log(`${file}: ${[...months].sort().join(" ") || "no rows for our items"}`);
}
console.log("validity values seen:", validityValues);

// 3. Median, mean and count per month and per calendar year (every valid quote of the year pooled).
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const series = {};
const coverage = {};
const allMonths = Object.keys(sources).sort();
for (const [code, item] of Object.entries(ITEMS)) {
  const byMonth = quotes[item] ?? {};
  const months = Object.keys(byMonth).filter((m) => byMonth[m].prices.length).sort();
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  const pooled = Object.fromEntries(years.map((y) => [y, months.filter((m) => m.startsWith(y)).flatMap((m) => byMonth[m].prices)]));
  const name = item === "manicure" ? "a basic manicure" : "a bottle of nail varnish";
  const tail = `ONS item ${code}, UK, pounds`;
  const stat = (label, fn, p) => ({
    label,
    monthly: Object.fromEntries(months.map((m) => [m, round(fn(byMonth[m].prices), p)])),
    annual: Object.fromEntries(years.map((y) => [y, round(fn(pooled[y]), p)])),
  });
  series[`${item}_median_gbp`] = stat(`Median quoted shop price of ${name} (${tail}). annual pools every valid quote of the year`, median, 6);
  series[`${item}_mean_gbp`] = stat(`Mean quoted shop price of ${name} (${tail}), unweighted. annual pools every valid quote of the year`, mean, 6);
  series[`${item}_quotes`] = stat(`Number of valid price quotes behind the median and mean for ${name}. annual is the total over the year's months`, (xs) => xs.length, 10);
  coverage[item] = {
    first_month: months[0],
    last_month: months.at(-1),
    months: months.length,
    missing_months: allMonths.filter((m) => m >= months[0] && !months.includes(m)),
    months_in_year: Object.fromEntries(years.map((y) => [y, months.filter((m) => m.startsWith(y)).length])),
    rows_dropped_as_not_valid: Object.values(byMonth).reduce((s, m) => s + m.all - m.prices.length, 0),
  };
  console.log(`${item}: ${months[0]} to ${months.at(-1)}, ${months.length} months`);
}

// 4. Manicure by region for the latest year with quotes.
const latestYear = coverage.manicure.last_month.slice(0, 4);
const byRegion = {};
for (const [month, m] of Object.entries(quotes.manicure)) {
  if (!month.startsWith(latestYear)) continue;
  for (const [code, prices] of Object.entries(m.regions)) (byRegion[code] ??= []).push(...prices);
}
const regions = Object.entries(byRegion)
  .map(([code, prices]) => ({ region_code: Number(code), region: REGIONS[code] ?? `Region ${code}`, median_gbp: round(median(prices)), mean_gbp: round(mean(prices)), quotes: prices.length }))
  .sort((a, b) => b.median_gbp - a.median_gbp);

const present = new Set(allMonths);
const filesMissing = [];
for (let y = Number(allMonths[0].slice(0, 4)), m = 1; `${y}-${String(m).padStart(2, "0")}` <= allMonths.at(-1); m === 12 ? (y++, (m = 1)) : m++) {
  const key = `${y}-${String(m).padStart(2, "0")}`;
  if (!present.has(key)) filesMissing.push(key);
}

await writePart("uk-manicure-prices.json", {
  source: `Office for National Statistics, "Consumer price inflation item indices and price quotes", the monthly price quotes files (${PAGE}). Items 520331 BASIC MANICURE and 520250 NAIL VARNISH BOTTLE.`,
  licence: "Open Government Licence v3.0",
  note: "Real prices that ONS price collectors recorded in shops and salons, not index numbers. Each month's value is the median or mean of that month's valid quotes: the quotes the ONS used in the index (validity 3 or 4 in files to January 2025, VALIDITY True from February 2025) with a price above zero. Quotes are not weighted. A chain priced centrally appears once per region with the same price, which matters for nail varnish. The sample of shops changes every February, and what counts as the item is the collector's choice within the ONS description, so small moves are noise. annual pools every valid quote in the calendar year; coverage.months_in_year says how many months that was.",
  fetched: new Date().toISOString().slice(0, 10),
  coverage: { ...coverage, months_with_no_ons_file: filesMissing },
  series,
  manicure_by_region: { year: latestYear, months: coverage.manicure.months_in_year[latestYear], note: "Median and mean of every valid manicure quote in that year, by the ONS collection region. Sorted dearest first. Regions with few quotes are shaky.", regions },
});
