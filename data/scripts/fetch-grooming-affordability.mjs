#!/usr/bin/env node
// The manicure index for other countries, as far as free keyless data allows.
// Writes data/parts/grooming-affordability-by-country.json.
//
// No country other than the UK was found to publish a manicure price in money (see data/LENSES.md, "Other countries").
// So every country here is tier B: a price INDEX set against that same country's pay, both rebased to 2015 = 100.
//   price_to_pay_index = price index (2015 = 100) / pay index (2015 = 100) x 100
// Above 100 means the service takes more work to pay for than it did in 2015. Below 100 means less.
// Nothing is converted between currencies: each country is only ever compared with itself.
//
// Fetched (all keyless):
//  1. Eurostat HICP annual average index, "Hairdressing salons and personal grooming establishments" (CP1211).
//  2. ONS consumer prices index D7EY, the same class for the UK (Eurostat's UK series stops in 2019).
//  3. FRED CUUR0000SEGC, US CPI "Personal Care Services" (haircuts and other personal care services), monthly.
//  4. Statistics Canada table 18-10-0005-01, CPI annual average, "Personal care services", Canada.
//  5. Australian Bureau of Statistics CPI, "Hairdressing and personal grooming services", Australia, quarterly.
//  6. IBGE Brazil IPCA monthly change of the subitem "7101005.Manicure" (SIDRA tables 1419 and 7060). Nail-specific.
//  7. Pay: OECD average annual wages, current prices, national currency (mean, full-time equivalent, both sexes).
//     Brazil is not in that table, so it uses IBGE PNAD Continua mean nominal monthly earnings (SIDRA table 6472).
//  8. Women's pay, only where a keyless series was found: UK median hourly pay of women employees (ONS ASHE via Nomis)
//     and US median usual weekly earnings of women working full time (FRED LEU0252882700A).
// Also read: data/parts/uk-manicure-affordability.json, to set the UK's true manicure figure beside its index.
// Run: node data/scripts/fetch-grooming-affordability.mjs   (add --fresh to ignore the data/raw/ cache)
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { annualMean, cached, jsonStat, mean, parseCsv, root, round, sleep, writePart } from "./lens-lib.mjs";

const stamp = new Date().toISOString().slice(0, 7);
const BASE = "2015";
const text = async (name, url, init) => (await cached(name, url, init)).toString("utf8");
const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
// Rebases a yearly series to BASE = 100. Returns null when the base year is missing.
const rebase = (annual) => (annual[BASE] ? Object.fromEntries(Object.entries(annual).map(([y, v]) => [y, round((v / annual[BASE]) * 100, 5)])) : null);
const ratio = (a, b) => Object.fromEntries(Object.keys(a).filter((y) => b[y] !== undefined).map((y) => [y, round((a[y] / b[y]) * 100, 5)]));

// 7. OECD average annual wages. One CSV for every country, constant and current prices; keep current (PRICE_BASE V).
const oecdRows = parseCsv(await text(`oecd-av-an-wage-${stamp}.csv`, "https://sdmx.oecd.org/public/rest/data/OECD.ELS.SAE,DSD_EARNINGS@AV_AN_WAGE,/all?format=csv", { check: (b) => { if (!b.toString("utf8", 0, 200).includes("REF_AREA")) throw new Error("not the OECD wages table"); } }));
const oh = oecdRows[0];
const col = (n) => oh.indexOf(n);
const oecdWage = {};
for (const r of oecdRows.slice(1)) {
  if (r.length !== oh.length || r[col("PRICE_BASE")] !== "V" || r[col("UNIT_MEASURE")] === "USD_PPP") continue;
  if (r[col("MEASURE")] !== "WG" || r[col("AGGREGATION_OPERATION")] !== "MEAN" || r[col("PAY_PERIOD")] !== "A") throw new Error(`unexpected OECD row: ${r.join(",")}`);
  const c = (oecdWage[r[col("REF_AREA")]] ??= { currency: r[col("UNIT_MEASURE")], annual: {} });
  if (c.currency !== r[col("UNIT_MEASURE")]) throw new Error(`${r[col("REF_AREA")]} has two currencies`);
  if (r[col("OBS_VALUE")] !== "") c.annual[r[col("TIME_PERIOD")]] = round(Number(r[col("OBS_VALUE")]), 8);
}
for (const c of Object.values(oecdWage)) c.annual = sortKeys(c.annual);
console.log(`OECD wages: ${Object.keys(oecdWage).length} countries`);
const OECD_WAGE_NAME = "Average annual wages, current prices, national currency: mean per full-time equivalent employee, both sexes (OECD, dataflow DSD_EARNINGS@AV_AN_WAGE)";

// 1. Eurostat HICP.
const GEO = { BE: ["BEL", "Belgium"], BG: ["BGR", "Bulgaria"], CZ: ["CZE", "Czechia"], DK: ["DNK", "Denmark"], DE: ["DEU", "Germany"], EE: ["EST", "Estonia"], IE: ["IRL", "Ireland"], EL: ["GRC", "Greece"], ES: ["ESP", "Spain"], FR: ["FRA", "France"], HR: ["HRV", "Croatia"], IT: ["ITA", "Italy"], CY: ["CYP", "Cyprus"], LV: ["LVA", "Latvia"], LT: ["LTU", "Lithuania"], LU: ["LUX", "Luxembourg"], HU: ["HUN", "Hungary"], MT: ["MLT", "Malta"], NL: ["NLD", "Netherlands"], AT: ["AUT", "Austria"], PL: ["POL", "Poland"], PT: ["PRT", "Portugal"], RO: ["ROU", "Romania"], SI: ["SVN", "Slovenia"], SK: ["SVK", "Slovakia"], FI: ["FIN", "Finland"], SE: ["SWE", "Sweden"], IS: ["ISL", "Iceland"], NO: ["NOR", "Norway"], CH: ["CHE", "Switzerland"], ME: ["MNE", "Montenegro"], MK: ["MKD", "North Macedonia"], AL: ["ALB", "Albania"], RS: ["SRB", "Serbia"], TR: ["TUR", "Türkiye"], XK: ["XKX", "Kosovo"] };
const hicp = JSON.parse(await text(`eurostat-hicp-cp1211-${stamp}.json`, "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_aind?format=JSON&coicop=CP1211&unit=INX_A_AVG&lang=EN"));
const hicpItem = hicp.dimension.coicop.category.label.CP1211;
if (!/Hairdressing salons and personal grooming/.test(hicpItem)) throw new Error(`CP1211 is "${hicpItem}"`);
const hicpBy = {};
for (const r of jsonStat(hicp)) (hicpBy[r.geo] ??= {})[r.time] = r.value;
const HICP_NAME = `Harmonised index of consumer prices, annual average index, "${hicpItem}" (Eurostat prc_hicp_aind, COICOP CP1211)`;

const countries = [];
const skipped = [];
// Builds one country from a yearly price index and a yearly pay series.
function add({ iso3, country, price, wage, extra = {} }) {
  const p = rebase(price.annual);
  const w = rebase(wage.annual);
  if (!p || !w) { skipped.push({ iso3, country, why: `no ${BASE} value for ${!p ? "the price index" : "pay"}` }); return; }
  const index = ratio(p, w);
  const years = Object.keys(index);
  const c = {
    iso3, country, tier: "B", nail_specific: false,
    price_item: price.name, wage_measure: wage.name, currency: wage.currency,
    years: { from: years[0], to: years.at(-1), count: years.length },
    price_index: { label: `${price.name}, as published (${price.unit})`, annual: sortKeys(price.annual) },
    wage: { label: `${wage.name}, ${wage.unit}`, annual: wage.annual },
    price_index_2015: { label: `Price index rebased. Formula: price_index[year] / price_index[${BASE}] x 100`, derived: true, annual: p },
    wage_index_2015: { label: `Pay rebased. Formula: wage[year] / wage[${BASE}] x 100`, derived: true, annual: w },
    price_to_pay_index: { label: `Price set against pay, ${BASE} = 100. Formula: price_index_2015[year] / wage_index_2015[year] x 100. Above 100 = takes more work to pay for than in ${BASE}`, derived: true, annual: index },
    ...extra,
  };
  countries.push(c);
  return c;
}
// Adds a second pay measure (women's pay) to a country.
function addWomen(c, wage) {
  const w = rebase(wage.annual);
  c.women_wage = { label: `${wage.name}, ${wage.unit}`, annual: wage.annual };
  c.price_to_women_pay_index = { label: `Price set against women's pay, ${BASE} = 100. Formula: price_index_2015[year] / (women_wage[year] / women_wage[${BASE}] x 100) x 100`, derived: true, annual: ratio(c.price_index_2015.annual, w) };
}
const oecdPay = (iso3) => oecdWage[iso3] && { name: OECD_WAGE_NAME, unit: `${oecdWage[iso3].currency} a year`, currency: oecdWage[iso3].currency, annual: oecdWage[iso3].annual };

for (const [geo, [iso3, country]] of Object.entries(GEO)) {
  if (!hicpBy[geo]) { skipped.push({ iso3, country, why: "no Eurostat grooming index" }); continue; }
  if (!oecdWage[iso3]) { skipped.push({ iso3, country, why: "has the Eurostat grooming index, but is not in the OECD wages table" }); continue; }
  add({ iso3, country, price: { name: HICP_NAME, unit: "index, 2015 = 100", annual: hicpBy[geo] }, wage: oecdPay(iso3) });
}

// 2. UK: ONS D7EY, plus women's median hourly pay, plus the true manicure figure from the UK files.
{
  const j = JSON.parse(await text(`ons-D7EY-${stamp}.json`, "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7ey/mm23/data"));
  if (!/CPI INDEX 12\.1\.1.*Hairdressing and personal grooming/i.test(j.description.title)) throw new Error(`D7EY is "${j.description.title}"`);
  const annual = Object.fromEntries(j.years.filter((y) => y.value !== "").map((y) => [y.year, Number(y.value)]));
  const c = add({ iso3: "GBR", country: "United Kingdom", price: { name: `${j.description.title.trim()} (ONS consumer prices index, series D7EY, dataset MM23)`, unit: "index, 2015 = 100, the ONS's own yearly average", annual }, wage: oecdPay("GBR") });
  const NOMIS = "https://www.nomisweb.co.uk/api/v01/dataset/NM_99_1.data.csv?geography=2092957697&sex=6&item=2&pay=5&measures=20100&select=date_name,geography_name,sex_name,pay_name,item_name,obs_value";
  const [head, ...rows] = parseCsv(await text(`nomis-ashe-hourly-women-${stamp}.csv`, NOMIS));
  if (!head?.includes("OBS_VALUE")) throw new Error("not a Nomis table");
  const pay = {};
  for (const r of rows.filter((x) => x.length === head.length).map((x) => Object.fromEntries(head.map((h, i) => [h, x[i]])))) {
    if (r.GEOGRAPHY_NAME !== "United Kingdom" || r.SEX_NAME !== "Female" || r.PAY_NAME !== "Hourly pay - gross" || r.ITEM_NAME !== "Median") throw new Error(`unexpected Nomis row: ${JSON.stringify(r)}`);
    if (r.OBS_VALUE !== "") pay[r.DATE_NAME] = Number(r.OBS_VALUE);
  }
  addWomen(c, { name: "Median gross hourly pay, women employees, full-time and part-time together, UK, each April (ONS Annual Survey of Hours and Earnings via Nomis NM_99_1)", unit: "GBP an hour", annual: pay });
  // The true figure, for comparison: minutes of work for a basic manicure, already worked out in the UK file.
  const uk = JSON.parse(await readFile(join(root, "parts", "uk-manicure-affordability.json"), "utf8"));
  const minutes = uk.series.manicure_minutes_of_work.annual;
  c.true_manicure = {
    label: "For comparison only: the UK is the one country with a real manicure price. Minutes of work to pay for a basic manicure at women's median hourly pay, copied from uk-manicure-affordability.json (manicure_minutes_of_work)",
    minutes_of_work: { derived: true, annual: minutes },
    minutes_of_work_index_2015: { label: `Formula: minutes_of_work[year] / minutes_of_work[${BASE}] x 100. Compare with price_to_women_pay_index`, derived: true, annual: rebase(minutes) },
  };
}

// 3. US: FRED.
{
  const fred = async (id) => {
    const rows = (await text(`fred-${id}-${stamp}.csv`, `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, { check: (b) => { if (!b.toString("utf8", 0, 60).includes(id)) throw new Error(`${id}: not a FRED csv`); } })).trim().split("\n").slice(1).map((l) => l.split(","));
    // FRED leaves a missing reading blank or ".", so skip those by hand.
    return Object.fromEntries(rows.filter(([, v]) => v !== undefined && v.trim() !== "" && v.trim() !== "." && Number.isFinite(Number(v))).map(([d, v]) => [d, Number(v)]));
  };
  const title = async (id) => (await text(`fred-${id}-page-${stamp}.html`, `https://fred.stlouisfed.org/series/${id}`)).match(/<title>\s*(.*?)\s*\([A-Z0-9]+\)\s*\|/s)?.[1] ?? "";
  const cpiTitle = await title("CUUR0000SEGC");
  if (!/Personal Care Services in U\.S\. City Average/.test(cpiTitle)) throw new Error(`CUUR0000SEGC is "${cpiTitle}"`);
  const payTitle = await title("LEU0252882700A");
  if (!/Median usual weekly nominal earnings.*Women/.test(payTitle)) throw new Error(`LEU0252882700A is "${payTitle}"`);
  const monthly = Object.fromEntries(Object.entries(await fred("CUUR0000SEGC")).map(([d, v]) => [d.slice(0, 7), v]));
  const c = add({ iso3: "USA", country: "United States", price: { name: `${cpiTitle}, not seasonally adjusted (BLS series CUUR0000SEGC via FRED). The BLS calls its one component "Haircuts and other personal care services"`, unit: "index, 1982-84 = 100, mean of the 12 months of each full year, worked out here", annual: annualMean(monthly) }, wage: oecdPay("USA") });
  c.price_index.derived = true;
  addWomen(c, { name: `${payTitle} (BLS series LEU0252882700A via FRED). Full-time workers only`, unit: "USD a week", annual: Object.fromEntries(Object.entries(await fred("LEU0252882700A")).map(([d, v]) => [d.slice(0, 4), v])) });
}

// 4. Canada: Statistics Canada web data service. Coordinate 2.218 = Canada, Personal care services.
{
  const body = JSON.stringify([{ productId: 18100005, coordinate: "2.218.0.0.0.0.0.0.0.0", latestN: 60 }]);
  const meta = JSON.parse(await text(`statcan-18100005-meta-${stamp}.json`, "https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify([{ productId: 18100005 }]) }))[0].object;
  const member = (dim, id) => meta.dimension[dim].member.find((m) => m.memberId === id)?.memberNameEn;
  if (member(0, 2) !== "Canada" || member(1, 218) !== "Personal care services") throw new Error("Statistics Canada coordinates have moved");
  const j = JSON.parse(await text(`statcan-18100005-personal-care-${stamp}.json`, "https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods", { method: "POST", headers: { "Content-Type": "application/json" }, body }))[0];
  if (j.status !== "SUCCESS") throw new Error("Statistics Canada call failed");
  const annual = Object.fromEntries(j.object.vectorDataPoint.filter((p) => p.value !== null).map((p) => [p.refPer.slice(0, 4), p.value]));
  add({ iso3: "CAN", country: "Canada", price: { name: `${meta.cubeTitleEn}, "Personal care services", Canada (Statistics Canada table 18-10-0005-01, vector v${j.object.vectorId})`, unit: "index, 2002 = 100", annual }, wage: oecdPay("CAN") });
}

// 5. Australia: ABS data API. 1 = index numbers, 40096 = the item, 10 = original, 50 = Australia, Q = quarterly.
{
  const dsd = JSON.parse(await text(`abs-cpi-structure-${stamp}.json`, "https://data.api.abs.gov.au/rest/datastructure/ABS/CPI?references=codelist", { headers: { Accept: "application/vnd.sdmx.structure+json" } }));
  const code = (list, id) => dsd.data.codelists.find((c) => c.id === list)?.codes.find((x) => x.id === id)?.name;
  const item = code("CL_CPI_INDEX", "40096");
  if (item !== "Hairdressing and personal grooming services" || code("CL_CPI_REGION", "50") !== "Australia" || code("CL_CPI_MEASURES", "1") !== "Index numbers") throw new Error("ABS codes have moved");
  const [h, ...rows] = parseCsv(await text(`abs-cpi-40096-${stamp}.csv`, "https://data.api.abs.gov.au/rest/data/ABS,CPI/1.40096.10.50.Q?format=csv", { headers: { Accept: "application/vnd.sdmx.data+csv" } }));
  const byYear = {};
  for (const r of rows.filter((x) => x.length === h.length)) {
    const v = r[h.indexOf("OBS_VALUE")];
    if (v !== "") (byYear[r[h.indexOf("TIME_PERIOD")].slice(0, 4)] ??= []).push(Number(v));
  }
  const annual = sortKeys(Object.fromEntries(Object.entries(byYear).filter(([, xs]) => xs.length === 4).map(([y, xs]) => [y, round(mean(xs))])));
  const c = add({ iso3: "AUS", country: "Australia", price: { name: `Consumer Price Index, index numbers, "${item}", Australia, original (Australian Bureau of Statistics, dataflow CPI, series 1.40096.10.50.Q)`, unit: "index, mean of the 4 quarters of each full year, worked out here", annual }, wage: oecdPay("AUS") });
  c.price_index.derived = true;
}

// 6. Brazil: a nail-specific index. IBGE publishes only the monthly % change of each subitem, so chain it.
{
  const sidra = async (name, path) => {
    const j = JSON.parse(await text(name, `https://apisidra.ibge.gov.br/values/${path}?formato=json`, { check: (b) => { if (b[0] !== 0x5b) throw new Error(`${name}: not a SIDRA table`); } }));
    return j.slice(1);
  };
  const change = {};
  for (const [table, periods] of [[1419, "201201-201912"], [7060, "202001-203012"]]) {
    await sleep(500);
    for (const r of await sidra(`sidra-${table}-manicure-${stamp}.json`, `t/${table}/n1/all/v/63/p/${periods}/c315/12421`)) {
      if (r.D4N !== "7101005.Manicure" || r.D2N !== "IPCA - Variação mensal" || r.D1N !== "Brasil") throw new Error(`unexpected SIDRA row: ${JSON.stringify(r)}`);
      if (Number.isFinite(Number(r.V))) change[`${r.D3C.slice(0, 4)}-${r.D3C.slice(4)}`] = Number(r.V);
    }
  }
  // Chain from December 2011 = 100. Stop at the first missing month, so a gap can never be bridged by a guess.
  const monthly = {};
  let level = 100;
  for (let y = 2012, m = 1; ; m === 12 ? (y++, (m = 1)) : m++) {
    const k = `${y}-${String(m).padStart(2, "0")}`;
    if (change[k] === undefined) break;
    level *= 1 + change[k] / 100;
    monthly[k] = round(level, 7);
  }
  if (Object.keys(monthly).length !== Object.keys(change).length) throw new Error("the Brazil manicure series has a missing month in the middle");
  console.log(`Brazil manicure: ${Object.keys(monthly).length} months chained, ${Object.keys(monthly)[0]} to ${Object.keys(monthly).at(-1)}`);
  const pay = {};
  for (const r of await sidra(`sidra-6472-earnings-${stamp}.json`, "t/6472/n1/all/v/5929/p/all")) {
    if (!/^Rendimento médio mensal nominal .*habitualmente recebido em todos os trabalhos$/.test(r.D2N)) throw new Error(`unexpected SIDRA row: ${JSON.stringify(r)}`);
    if (Number.isFinite(Number(r.V))) (pay[r.D3C.slice(0, 4)] ??= []).push(Number(r.V));
  }
  const wageAnnual = sortKeys(Object.fromEntries(Object.entries(pay).filter(([, xs]) => xs.length === 4).map(([y, xs]) => [y, round(mean(xs))])));
  const c = add({
    iso3: "BRA", country: "Brazil",
    price: { name: 'IPCA consumer price index, subitem "7101005.Manicure", Brazil (IBGE, SIDRA tables 1419 and 7060, variable 63 "IPCA - Variação mensal")', unit: "index, December 2011 = 100, chained here from the published monthly % changes (level x (1 + change / 100)), then the mean of the 12 months of each full year", annual: annualMean(monthly) },
    wage: { name: "Mean nominal monthly earnings from all jobs, usually received, employed people aged 14 and over, both sexes (IBGE PNAD Contínua, SIDRA table 6472, variable 5929)", unit: "BRL a month, mean of the 4 quarters of each full year, worked out here", currency: "BRL", annual: wageAnnual },
  });
  c.nail_specific = true;
  c.price_index.derived = true;
  c.wage.derived = true;
}

countries.sort((a, b) => a.country.localeCompare(b.country));
for (const y of ["2024", "2025"]) {
  const ranked = countries.filter((c) => c.price_to_pay_index.annual[y] !== undefined).sort((a, b) => a.price_to_pay_index.annual[y] - b.price_to_pay_index.annual[y]);
  console.log(`${y}, ${ranked.length} countries, price_to_pay_index: ${ranked.map((c) => `${c.iso3} ${c.price_to_pay_index.annual[y].toFixed(1)}`).join(", ")}`);
}
console.log(`skipped: ${skipped.map((s) => `${s.iso3} (${s.why})`).join("; ")}`);

await writePart("grooming-affordability-by-country.json", {
  source: "Eurostat (HICP, prc_hicp_aind), OECD (average annual wages), Office for National Statistics (D7EY and ASHE via Nomis), US Bureau of Labor Statistics via FRED, Statistics Canada (table 18-10-0005-01), Australian Bureau of Statistics (CPI), IBGE (IPCA and PNAD Contínua via SIDRA).",
  licence: "Eurostat: CC BY 4.0. OECD: CC BY 4.0. ONS: Open Government Licence v3.0. BLS: public domain. Statistics Canada: Statistics Canada Open Licence. ABS: CC BY 4.0. IBGE: free to reuse with credit.",
  note: `The manicure index for other countries. No country here has a manicure price in money, so every one is tier B: a price index for hairdressing and personal grooming (mostly haircuts) set against that country's own pay, both rebased to ${BASE} = 100. price_to_pay_index above 100 means the service takes more work to pay for than in ${BASE}. Brazil is the exception inside tier B: its index is for manicures alone (nail_specific: true). Pay is the OECD's mean annual wage for both sexes, except Brazil. The UK and the US also carry women's median pay. Nothing is converted between currencies and price levels are never compared across countries. Series with derived: true are worked out here by the formula in their label. Years with a missing input are left out.`,
  base_year: BASE,
  fetched: new Date().toISOString().slice(0, 10),
  tier_a: "None in this file. The only true manicure price found is the UK's, in uk-manicure-prices.json and uk-manicure-affordability.json. The UK entry here repeats its minutes of work under true_manicure for comparison.",
  skipped,
  countries,
});
