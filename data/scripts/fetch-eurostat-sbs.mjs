#!/usr/bin/env node
// Fetches Eurostat Structural Business Statistics (table sbs_ovw_act) for three self-care industries in every
// country Eurostat covers, 2021 onwards, and writes data/parts/eu-selfcare-business.json:
//   S9602 hairdressing and other beauty treatment (nail bars sit in here, mixed with hairdressers)
//   S9604 physical well-being activities (spas, saunas, massage salons)
//   R9313 fitness facilities (gyms, and most yoga and Pilates studios)
// Run: node data/scripts/fetch-eurostat-sbs.mjs   (add --fresh to ignore the data/raw/ cache)
import { cached, jsonStat, writePart } from "./lens-lib.mjs";

const NACE = ["S9602", "S9604", "R9313"];
const INDIC = { ENT_NR: "enterprises", EMP_NR: "people_employed", NETTUR_MEUR: "turnover_million_eur" };
const url =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sbs_ovw_act?format=JSON" +
  NACE.map((n) => `&nace_r2=${n}`).join("") + Object.keys(INDIC).map((i) => `&indic_sbs=${i}`).join("");
const j = JSON.parse((await cached("eurostat-sbs_ovw_act-selfcare.json", url)).toString("utf8"));

const geoLabel = j.dimension.geo.category.label;
const byGeo = {};
for (const r of jsonStat(j)) {
  const row = (byGeo[r.geo] ??= { geo: r.geo, country: geoLabel[r.geo], industries: {} });
  (((row.industries[r.nace_r2] ??= {})[INDIC[r.indic_sbs]] ??= {})[r.time] = r.value);
}
const countries = Object.values(byGeo).sort((a, b) => a.geo.localeCompare(b.geo));
console.log(`${countries.length} countries or groups, years ${Object.keys(j.dimension.time.category.index).join(", ")}`);

await writePart("eu-selfcare-business.json", {
  source: "Eurostat, Structural Business Statistics, table sbs_ovw_act (enterprises by detailed NACE Rev. 2 activity).",
  licence: "CC BY 4.0 (Eurostat)",
  note: "geo is Eurostat's country code (mostly ISO 3166 alpha-2, but EL is Greece; codes starting EU or EA are groups). industries[code][measure][year]. Turnover is net turnover in million euros. S9602 mixes hairdressers with beauty and nail salons: nails cannot be split out. The UK is not in this table. Missing cells were withheld or not reported.",
  industryLabels: j.dimension.nace_r2.category.label,
  fetched: new Date().toISOString().slice(0, 10),
  countries,
});
