#!/usr/bin/env node
// Fetches Our World in Data's Covid dataset (about 98 MB, cached in data/raw/) and reduces it to one row per
// country and year for 2020 and 2021: confirmed cases per 100,000 people by 31 December, and the mean and peak
// of the Oxford stringency index (0 to 100, how strict the lockdown rules were). Writes data/parts/covid-by-country.json.
// Run: node data/scripts/fetch-owid-covid.mjs   (add --fresh to ignore the data/raw/ cache)
import { cached, mean, round, writePart } from "./lens-lib.mjs";

const URL = "https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/owid-covid-data.csv";
const text = (await cached("owid-covid-data.csv", URL, { timeout: 600000 })).toString("utf8");
const lines = text.split("\n");
const cols = lines[0].trim().split(",");
const col = (name) => {
  const i = cols.indexOf(name);
  if (i < 0) throw new Error(`no "${name}" column`);
  return i;
};
const C = { iso: col("iso_code"), name: col("location"), date: col("date"), cases: col("total_cases_per_million"), strict: col("stringency_index"), pop: col("population") };

const acc = {};
for (const line of lines.slice(1)) {
  if (!line) continue;
  // No quoted commas appear in the columns we read: they all sit before any free-text column.
  const c = line.split(",");
  const iso = c[C.iso];
  const year = c[C.date].slice(0, 4);
  if (iso.length !== 3 || (year !== "2020" && year !== "2021")) continue;
  const a = ((acc[iso] ??= { name: c[C.name], population: Number(c[C.pop]), years: {} }).years[year] ??= { cases: null, strict: [] });
  if (c[C.cases] !== "") a.cases = Number(c[C.cases]);
  if (c[C.strict] !== "") a.strict.push(Number(c[C.strict]));
}

const countries = [];
for (const [iso3, a] of Object.entries(acc).sort()) {
  const row = { iso3, country: a.name, population: a.population };
  for (const [year, y] of Object.entries(a.years)) {
    row[`cases_per_100k_end_${year}`] = y.cases === null ? null : round(y.cases / 10, 5);
    row[`stringency_mean_${year}`] = y.strict.length ? round(mean(y.strict), 4) : null;
    row[`stringency_max_${year}`] = y.strict.length ? Math.max(...y.strict) : null;
    row[`stringency_days_${year}`] = y.strict.length;
  }
  countries.push(row);
}
console.log(`${countries.length} countries, ${countries.filter((r) => r.stringency_mean_2020 != null).length} with a 2020 stringency index`);

await writePart("covid-by-country.json", {
  source:
    "Our World in Data Covid-19 dataset (github.com/owid/covid-19-data). Cases from the WHO, stringency from the Oxford Covid-19 Government Response Tracker.",
  licence: "CC BY 4.0 (Our World in Data; Oxford tracker also CC BY 4.0)",
  note: "cases_per_100k_end_YYYY is cumulative confirmed cases per 100,000 people at the last reading of that year (OWID's per-million figure divided by 10). stringency_mean_YYYY averages the daily index over the days that have one (stringency_days_YYYY says how many). Confirmed cases depend on how much each country tested.",
  fetched: new Date().toISOString().slice(0, 10),
  countries,
});
