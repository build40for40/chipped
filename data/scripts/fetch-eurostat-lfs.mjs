#!/usr/bin/env node
// Fetches UK women's employment from Eurostat's Labour Force Survey tables and writes data/parts/uk-women-work.json:
//  - lfsa_egan2: employed people aged 15 to 64 by industry section (NACE Rev. 2, the same sections as UK SIC 2007) and sex
//  - lfsa_egais: employed people aged 15 to 64 by occupation group (ISCO-08) and sex
// The UK left the Eurostat tables after 2019, so every UK series here stops in 2019.
// Run: node data/scripts/fetch-eurostat-lfs.mjs   (add --fresh to ignore the data/raw/ cache)
import { cached, jsonStat, round, writePart } from "./lens-lib.mjs";

const API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";
const get = async (name, url) => JSON.parse((await cached(name, url)).toString("utf8"));

const ind = await get("eurostat-lfsa_egan2-uk.json", `${API}/lfsa_egan2?format=JSON&geo=UK&sex=F&sex=T&age=Y15-64`);
const occ = await get("eurostat-lfsa_egais-uk.json", `${API}/lfsa_egais?format=JSON&geo=UK&sex=F&sex=T&age=Y15-64&wstatus=EMP`);

// Thousands of people -> { code: { F: {year: v}, T: {year: v} } }
function bySex(j, dim) {
  const out = {};
  for (const r of jsonStat(j)) (((out[r[dim]] ??= {})[r.sex] ??= {})[r.time] = r.value);
  return out;
}
const share = (f, t) => Object.fromEntries(Object.keys(f).filter((y) => t?.[y]).map((y) => [y, round((f[y] / t[y]) * 100, 4)]));

// Lens 3: one row per industry section.
const indBy = bySex(ind, "nace_r2");
const labels = ind.dimension.nace_r2.category.label;
const industries = [];
for (const [code, s] of Object.entries(indBy)) {
  if (!s.F || code === "NRP") continue;
  industries.push({ section: code, name: labels[code], women_thousands: s.F, all_thousands: s.T, women_share_pct: share(s.F, s.T) });
}
console.log(`${industries.length} industry rows, years ${Object.keys(indBy.TOTAL.F)[0]} to ${Object.keys(indBy.TOTAL.F).at(-1)}`);

// Lenses 1 and 2: yearly series by occupation group.
const occBy = bySex(occ, "isco08");
const occLabels = occ.dimension.isco08.category.label;
const series = {};
for (const [code, s] of Object.entries(occBy)) {
  if (!s.F || code === "NRP") continue;
  series[`women_${code}_thousands`] = { label: `Women employed, ${occLabels[code]}`, annual: s.F };
  if (s.T) series[`women_share_${code}_pct`] = { label: `Women as a share of everyone employed, ${occLabels[code]}`, derived: true, annual: share(s.F, s.T) };
}
// Manual work = ISCO groups 6 to 9: skilled farm work, craft and trades, machine operators, elementary jobs.
const MANUAL = ["OC6", "OC7", "OC8", "OC9"];
const years = Object.keys(occBy.TOTAL.F).filter((y) => MANUAL.every((c) => occBy[c]?.F?.[y] != null));
series.women_manual_thousands = {
  label: "Women employed in manual occupations (ISCO groups 6, 7, 8 and 9 added together)",
  derived: true,
  annual: Object.fromEntries(years.map((y) => [y, round(MANUAL.reduce((s, c) => s + occBy[c].F[y], 0), 6)])),
};
series.women_manual_share_pct = {
  label: "Share of employed women who work in manual occupations",
  derived: true,
  annual: Object.fromEntries(years.map((y) => [y, round((series.women_manual_thousands.annual[y] / occBy.TOTAL.F[y]) * 100, 4)])),
};
console.log(`occupation years ${years[0]} to ${years.at(-1)}`);

await writePart("uk-women-work.json", {
  source: "Eurostat, EU Labour Force Survey, tables lfsa_egan2 (by industry) and lfsa_egais (by occupation). United Kingdom, employed people aged 15 to 64.",
  licence: "CC BY 4.0 (Eurostat)",
  note: "Thousands of people. The UK series end in 2019. Series marked derived are sums or ratios of the fetched figures, nothing else. OC1 is managers; this counts women in manager jobs, not promotions. Occupation groups changed from ISCO-88 to ISCO-08 in 2011, so compare across that year with care.",
  fetched: new Date().toISOString().slice(0, 10),
  industries,
  series,
});
