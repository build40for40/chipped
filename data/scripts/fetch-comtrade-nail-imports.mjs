#!/usr/bin/env node
// Fetches each country's imports of manicure and pedicure preparations (HS 330430) from UN Comtrade's keyless
// preview API, one call per year, plus population and the female share of it from Our World in Data, and writes
// data/parts/nail-imports-by-country.json: one row per country with imports per woman.
// UN Comtrade's licence does not let us republish its figures as they are, so the part keeps only the derived
// per-woman figure. The raw responses stay in the git-ignored data/raw/ cache.
// Imports are a stand-in for nail polish bought. They miss anything made at home (big for France, the US, China)
// and count goods that are shipped on again (big for the Netherlands, Hong Kong, Singapore).
// Run: node data/scripts/fetch-comtrade-nail-imports.mjs   (add --fresh to ignore the data/raw/ cache)
import { cached, parseCsv, round, sleep, writePart } from "./lens-lib.mjs";

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023];
const json = async (name, url) => JSON.parse((await cached(name, url)).toString("utf8"));

const reporters = await json("comtrade-reporters.json", "https://comtradeapi.un.org/files/v1/app/reference/Reporters.json");
const iso = Object.fromEntries(reporters.results.filter((r) => !r.isGroup && /^[A-Z]{3}$/.test(r.reporterCodeIsoAlpha3 ?? "")).map((r) => [r.reporterCode, [r.reporterCodeIsoAlpha3, r.text]]));

// OWID grapher CSVs: Entity,Code,Year,value
async function owid(slug) {
  const rows = parseCsv((await cached(`owid-${slug}.csv`, `https://ourworldindata.org/grapher/${slug}.csv`)).toString("utf8")).slice(1);
  const out = {};
  for (const [, code, year, v] of rows) if (code && v !== "") (out[code] ??= {})[year] = Number(v);
  return out;
}
const population = await owid("population");
const femaleShare = await owid("share-population-female");

const byIso = {};
for (const year of YEARS) {
  const name = `comtrade-330430-imports-${year}.json`;
  const body = await json(name, `https://comtradeapi.un.org/public/v1/preview/C/A/HS?period=${year}&cmdCode=330430&flowCode=M&partnerCode=0&partner2Code=0&customsCode=C00&motCode=0`);
  if (!Array.isArray(body.data)) throw new Error(`${year}: no data (${body.error ?? "unknown"})`);
  // The preview API returns at most 500 rows. A year has under 200 reporters, so hitting 500 means something changed.
  if (body.data.length >= 500) throw new Error(`${year}: 500 rows, the preview limit, so some may be missing`);
  for (const r of body.data) {
    const known = iso[r.reporterCode];
    if (!known) continue;
    const row = (byIso[known[0]] ??= { iso3: known[0], country: known[1], imports_usd_per_woman: {} });
    const pop = population[known[0]]?.[year];
    const share = femaleShare[known[0]]?.[year];
    if (pop && share) row.imports_usd_per_woman[year] = round(r.primaryValue / ((pop * share) / 100), 4);
  }
  console.log(`${year}: ${body.data.length} reporters`);
  await sleep(4000);
}
const countries = Object.values(byIso).filter((c) => Object.keys(c.imports_usd_per_woman).length).sort((a, b) => a.iso3.localeCompare(b.iso3));

await writePart("nail-imports-by-country.json", {
  source:
    "UN Comtrade (comtradeapi.un.org public preview), HS 330430 manicure or pedicure preparations, imports from the world, as reported by each country. Population from Our World in Data (UN World Population Prospects) and female share of population from the World Bank via Our World in Data.",
  licence: "Derived from UN Comtrade, whose licence restricts republishing its data unchanged, so only our derived per-woman figure is kept here. Credit: UN Comtrade Database. Our World in Data: CC BY 4.0.",
  note: "imports_usd_per_woman is derived: the import value each country reported for the year, in US dollars, divided by its female population (women and girls of all ages). Imports are not purchases: they miss home production and include re-exports. A country missing a year did not report it, or has no population figure.",
  years: YEARS,
  fetched: new Date().toISOString().slice(0, 10),
  countries,
});
console.log(`${countries.length} countries`);
