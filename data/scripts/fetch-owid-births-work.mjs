#!/usr/bin/env node
// Fetches yearly UK and US series for lens 1 from Our World in Data's keyless grapher CSVs and writes
// data/parts/births-marriage-management.json: births, birth rate, fertility rate, marriage rate and the share
// of senior and middle management jobs held by women.
// Run: node data/scripts/fetch-owid-births-work.mjs   (add --fresh to ignore the data/raw/ cache)
import { cached, parseCsv, writePart } from "./lens-lib.mjs";

const COUNTRIES = ["GBR", "USA"];
// slug -> [series id, label, the CSV column to read, who collected it]
const CHARTS = {
  "number-of-births-per-year": ["births", "Live births per year", "Number of births", "UN World Population Prospects"],
  "crude-birth-rate": ["birth_rate", "Births per 1,000 people", "Birth rate", "UN World Population Prospects"],
  "total-fertility-rate": ["fertility_rate", "Children per woman (total fertility rate)", "Total fertility rate", "UN World Population Prospects"],
  "marriage-rate-per-1000-inhabitants": ["marriage_rate", "Marriages per 1,000 people", "Crude marriage rate", "OECD and national statistics offices, compiled by Our World in Data"],
  "proportion-of-women-in-senior-and-middle-management-positions": ["women_management_share", "Share of senior and middle management jobs held by women, %", null, "International Labour Organization (UN SDG indicator 5.5.2)"],
};

const series = {};
for (const [slug, [id, label, column, origin]] of Object.entries(CHARTS)) {
  const [head, ...rows] = parseCsv((await cached(`owid-${slug}.csv`, `https://ourworldindata.org/grapher/${slug}.csv`)).toString("utf8"));
  // Columns are Entity, Code, Year, then the values. Take the named column, or the only one.
  const i = column ? head.indexOf(column) : 3;
  if (i < 3) throw new Error(`${slug}: no "${column}" column`);
  for (const iso3 of COUNTRIES) {
    const annual = {};
    for (const r of rows) if (r[1] === iso3 && r[i] !== "" && r[i] !== undefined && Number(r[2]) >= 1950) annual[r[2]] = Number(r[i]);
    const years = Object.keys(annual);
    if (!years.length) { console.log(`${id}_${iso3}: no data`); continue; }
    series[`${id}_${iso3}`] = { label, country: iso3, origin, chart: `https://ourworldindata.org/grapher/${slug}`, annual };
    console.log(`${id}_${iso3}: ${years[0]} to ${years.at(-1)} (${years.length} years)`);
  }
}

await writePart("births-marriage-management.json", {
  source: "Our World in Data grapher downloads (ourworldindata.org/grapher/<slug>.csv). Each series names the body that collected it in `origin`.",
  licence: "CC BY 4.0 (Our World in Data)",
  note: "Yearly, UK (GBR) and US (USA), observed values only (no projections). The management series counts women in manager jobs at a point in time, not promotions. Marriages are all marriages, not a measure of dating.",
  fetched: new Date().toISOString().slice(0, 10),
  series,
});
