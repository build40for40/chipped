#!/usr/bin/env node
// Fetches two UK tables from Nomis (nomisweb.co.uk, keyless) and writes data/parts/uk-nomis.json:
//  1. UK Business Counts (NM_142_1): number of enterprises each March, 2010 onwards, for hairdressing and other
//     beauty treatment (SIC 96020, nail bars are inside it), physical well-being such as spas (96040) and
//     fitness facilities (93130).
//  2. Workforce jobs by industry and sex (NM_131_1): jobs held by women and by everyone in each industry
//     section, taken each June. These are jobs, not people: someone with two jobs counts twice.
//  3. Annual Population Survey, occupation by sex (NM_210_1 for 2006 to 2021 on the SOC 2010 job groups,
//     NM_218_1 for 2021 onwards on SOC 2020): women and everyone employed in each of the nine major groups,
//     calendar years. Group 1 is managers; groups 5, 8 and 9 are the manual ones.
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

// 3. Occupation by sex, calendar years (the Jan to Dec periods). People in employment aged 16 and over.
const GROUPS = "0,1000001,2000000,3000000,4000000,5000000,6000000,7000000,8000000,9000000";
const MANUAL = ["5", "8", "9"];
for (const [soc, dataset, dim, from, to] of [["soc2010", "NM_210_1", "c_occpuk11h_0", 2006, 2021], ["soc2020", "NM_218_1", "soc2020_full", 2021, thisYear - 1]]) {
  const times = Array.from({ length: to - from + 1 }, (_, i) => `${from + i}-12`).join(",");
  const rows = await table(
    `nomis-occupation-${soc}-${month}.csv`,
    `${API}/${dataset}.data.csv?geography=${UK}&time=${times}&jtype=0&ftpt=0&etype=0&c_sex=0,2&${dim}=${GROUPS}&measure=1&measures=20100&select=date_code,c_sex_name,${dim}_name,obs_value`,
  );
  const by = {};
  for (const r of rows) {
    if (r.OBS_VALUE === "") continue;
    const name = r[`${dim.toUpperCase()}_NAME`];
    const group = name === "Total" ? "all" : name[0];
    (((by[group] ??= { name: name.replace(/^\d :? ?/, "") })[r.C_SEX_NAME === "Females" ? "women" : "everyone"] ??= {})[r.DATE_CODE.slice(0, 4)] = Number(r.OBS_VALUE));
  }
  for (const [group, g] of Object.entries(by)) {
    if (!g.women) continue;
    series[`women_group${group}_${soc}`] = { label: `Women employed, ${group === "all" ? "all occupations" : `major group ${group}: ${g.name}`} (${soc.toUpperCase().replace("SOC", "SOC ")})`, annual: g.women };
    if (g.everyone) series[`women_share_group${group}_${soc}_pct`] = {
      label: `Women as a share of everyone employed, ${group === "all" ? "all occupations" : `major group ${group}: ${g.name}`} (${soc.toUpperCase().replace("SOC", "SOC ")})`,
      derived: true,
      annual: Object.fromEntries(Object.keys(g.women).filter((y) => g.everyone[y]).map((y) => [y, round((g.women[y] / g.everyone[y]) * 100, 4)])),
    };
  }
  const yrs = Object.keys(by.all.women).filter((y) => MANUAL.every((m) => by[m]?.women?.[y] != null));
  series[`women_manual_${soc}`] = {
    label: `Women employed in manual occupations: skilled trades, machine operatives and elementary jobs (major groups 5, 8 and 9 added together, ${soc.toUpperCase().replace("SOC", "SOC ")})`,
    derived: true,
    annual: Object.fromEntries(yrs.map((y) => [y, MANUAL.reduce((t, m) => t + by[m].women[y], 0)])),
  };
  console.log(`occupation ${soc}: ${yrs[0]} to ${yrs.at(-1)}`);
}

await writePart("uk-nomis.json", {
  source: "Office for National Statistics via Nomis (nomisweb.co.uk): UK Business Counts, enterprises (NM_142_1); workforce jobs by industry (SIC 2007) and sex, unadjusted (NM_131_1); Annual Population Survey, occupation by sex (NM_210_1 and NM_218_1).",
  licence: "Open Government Licence v3.0",
  note: "United Kingdom. series[sic..._enterprises].annual is the number of VAT or PAYE registered enterprises each March, rounded by the ONS to the nearest 5; the jump from 2014 to 2015 is a change in coverage. industries[] has jobs held by women and by everyone each June, by industry section; women_share_pct is derived (women_jobs / all_jobs x 100). Jobs, not people. series[women_...] are people in employment by major occupation group and calendar year, from a survey, so small moves are noise; the _soc2010 series (2006 to 2021) and _soc2020 series (2021 on) use different job groupings and both carry 2021 so the break can be seen. Series marked derived are sums or ratios of fetched figures. Counting women in manager jobs is not counting promotions. SIC 96020 mixes hair and beauty: nails cannot be split out.",
  fetched: new Date().toISOString().slice(0, 10),
  series,
  industries,
});
