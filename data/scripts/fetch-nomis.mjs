#!/usr/bin/env node
// Fetches two UK tables from Nomis (nomisweb.co.uk, keyless) and writes data/parts/uk-nomis.json:
//  1. UK Business Counts (NM_142_1): number of enterprises each March, 2010 onwards, for hairdressing and other
//     beauty treatment (SIC 96020, nail bars are inside it), physical well-being such as spas (96040) and
//     fitness facilities (93130).
//  2. Workforce jobs by industry and sex (NM_131_1): jobs held by women and by everyone in each industry
//     section, taken each June. These are jobs, not people: someone with two jobs counts twice.
// Run: node data/scripts/fetch-nomis.mjs   (add --fresh to ignore the data/raw/ cache)
import { cached, parseCsv, round, writePart } from "./lens-lib.mjs";

const API = "https://www.nomisweb.co.uk/api/v01/dataset";
const UK = "2092957697";
const month = new Date().toISOString().slice(0, 7);
async function table(name, url) {
  const [head, ...rows] = parseCsv((await cached(name, url)).toString("utf8"));
  if (!head?.includes("OBS_VALUE")) throw new Error(`${name}: not a Nomis table`);
  return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

// 1. Business counts. Nomis's own codes for the three 5-digit industries.
const INDUSTRIES = { 134313748: "96020", 134313768: "96040", 134310858: "93130" };
const counts = await table(
  `nomis-business-counts-${month}.csv`,
  `${API}/NM_142_1.data.csv?geography=${UK}&industry=${Object.keys(INDUSTRIES).join(",")}&employment_sizeband=0&legal_status=0&measures=20100&select=date_name,industry_name,industry_code,obs_value`,
);
const series = {};
for (const r of counts) {
  if (r.OBS_VALUE === "") continue;
  const s = (series[`sic${r.INDUSTRY_CODE}_enterprises`] ??= { label: `Enterprises, ${r.INDUSTRY_NAME.replace(/^\d+ : /, "")} (SIC ${r.INDUSTRY_CODE})`, annual: {} });
  s.annual[r.DATE_NAME] = Number(r.OBS_VALUE);
}
for (const [id, s] of Object.entries(series)) console.log(`${id}: ${Object.keys(s.annual)[0]} to ${Object.keys(s.annual).at(-1)}`);

// 2. Workforce jobs by section and sex, each June from 1996 (sex 6 is female, 7 is total; item 1 is all workforce jobs).
const thisYear = new Date().getUTCFullYear();
const junes = Array.from({ length: thisYear - 1996 + 1 }, (_, i) => `${1996 + i}-06`).join(",");
const jobs = await table(
  `nomis-workforce-jobs-${month}.csv`,
  `${API}/NM_131_1.data.csv?geography=${UK}&industry=150994945...150994965,37748736&sex=6,7&item=1&measures=20100&time=${junes}&select=date_code,industry_name,industry_code,sex_name,obs_value`,
);
const bySection = {};
for (const r of jobs) {
  if (r.OBS_VALUE === "") continue;
  const code = r.INDUSTRY_NAME.includes(" : ") ? r.INDUSTRY_NAME.split(" : ")[0] : "TOTAL";
  const row = (bySection[code] ??= { section: code, name: r.INDUSTRY_NAME.replace(/^[A-Z] : /, ""), women_jobs: {}, all_jobs: {}, women_share_pct: {} });
  (r.SEX_NAME === "Female" ? row.women_jobs : row.all_jobs)[r.DATE_CODE.slice(0, 4)] = Number(r.OBS_VALUE);
}
const industries = Object.values(bySection);
for (const row of industries) for (const y of Object.keys(row.women_jobs)) if (row.all_jobs[y]) row.women_share_pct[y] = round((row.women_jobs[y] / row.all_jobs[y]) * 100, 4);
const years = Object.keys(bySection.TOTAL.women_jobs);
console.log(`${industries.length} industry rows, June ${years[0]} to June ${years.at(-1)}`);

await writePart("uk-nomis.json", {
  source: "Office for National Statistics via Nomis (nomisweb.co.uk): UK Business Counts, enterprises (NM_142_1), and workforce jobs by industry (SIC 2007) and sex, unadjusted (NM_131_1).",
  licence: "Open Government Licence v3.0",
  note: "United Kingdom. series[...].annual is the number of VAT or PAYE registered enterprises each March, rounded by the ONS to the nearest 5; the jump from 2014 to 2015 is a change in coverage. industries[] has jobs held by women and by everyone each June, by industry section; women_share_pct is derived (women_jobs / all_jobs x 100). Jobs, not people. SIC 96020 mixes hair and beauty: nails cannot be split out.",
  fetched: new Date().toISOString().slice(0, 10),
  series,
  industries,
});
