#!/usr/bin/env node
// Fetches UK pay and the all-items consumer price index, then works out how affordable a manicure and a bottle
// of nail varnish are. Writes data/parts/uk-manicure-affordability.json.
// Run fetch-ons-price-quotes.mjs first: this reads its output, data/parts/uk-manicure-prices.json.
//
// Fetched (all keyless):
//  1. ONS Annual Survey of Hours and Earnings, workplace analysis, from Nomis (NM_99_1): median gross hourly
//     pay of women employees in the UK, full-time and part-time together, each April. Also the same for all employees.
//  2. ONS average weekly earnings, series KAB9: mean total pay per week, whole economy, seasonally adjusted, monthly.
//  3. ONS consumer prices index, all items, series D7BT (2015 = 100), monthly.
// Derived (each flagged derived: true, with its formula in the label):
//  minutes of work to pay for the item, the price in today's money, and the price as a share of a week's pay.
// Run: node data/scripts/fetch-uk-pay.mjs   (add --fresh to ignore the data/raw/ cache)
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cached, mean, parseCsv, root, round, writePart } from "./lens-lib.mjs";

const stamp = new Date().toISOString().slice(0, 7);
const MONTHS = { January: "01", February: "02", March: "03", April: "04", May: "05", June: "06", July: "07", August: "08", September: "09", October: "10", November: "11", December: "12" };
const series = {};

// 1. ASHE from Nomis. sex 6 = Female, 7 = Total; item 2 = Median; pay 5 = Hourly pay, gross.
const NOMIS = "https://www.nomisweb.co.uk/api/v01/dataset/NM_99_1.data.csv?geography=2092957697&sex=6,7&item=2&pay=5&measures=20100&select=date_name,geography_name,sex_name,pay_name,item_name,obs_value";
const [head, ...rows] = parseCsv((await cached(`nomis-ashe-hourly-${stamp}.csv`, NOMIS)).toString("utf8"));
if (!head?.includes("OBS_VALUE")) throw new Error("not a Nomis table");
const ashe = { Female: {}, Total: {} };
for (const r of rows.filter((x) => x.length === head.length).map((x) => Object.fromEntries(head.map((h, i) => [h, x[i]])))) {
  if (r.GEOGRAPHY_NAME !== "United Kingdom" || r.PAY_NAME !== "Hourly pay - gross" || r.ITEM_NAME !== "Median") throw new Error(`unexpected Nomis row: ${JSON.stringify(r)}`);
  if (r.OBS_VALUE !== "" && ashe[r.SEX_NAME]) ashe[r.SEX_NAME][r.DATE_NAME] = Number(r.OBS_VALUE);
}
series.women_median_hourly_pay_gbp = { label: "Median gross hourly pay, women employees, full-time and part-time together, UK, each April (ONS Annual Survey of Hours and Earnings, workplace analysis, via Nomis NM_99_1), pounds", annual: ashe.Female };
series.all_median_hourly_pay_gbp = { label: "Median gross hourly pay, all employees, full-time and part-time together, UK, each April (ONS Annual Survey of Hours and Earnings, workplace analysis, via Nomis NM_99_1), pounds", annual: ashe.Total };
const pay = ashe.Female;
console.log(`women's median hourly pay: ${Object.keys(pay)[0]} £${Object.values(pay)[0]} to ${Object.keys(pay).at(-1)} £${Object.values(pay).at(-1)}`);

// 2 and 3. ONS time series.
async function ons(id, url, wantTitle) {
  const j = JSON.parse((await cached(`ons-${id}-${stamp}.json`, url)).toString("utf8"));
  if (!wantTitle.test(j.description.title)) throw new Error(`${id} is "${j.description.title}", not what we expected`);
  const monthly = Object.fromEntries(j.months.filter((m) => m.value !== "").map((m) => [`${m.year}-${MONTHS[m.month]}`, Number(m.value)]));
  const annual = Object.fromEntries(j.years.filter((y) => y.value !== "").map((y) => [y.year, Number(y.value)]));
  console.log(`${id} ${j.description.title}: ${Object.keys(monthly)[0]} to ${Object.keys(monthly).at(-1)}`);
  return { title: j.description.title, monthly, annual };
}
const awe = await ons("KAB9", "https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/kab9/lms/data", /AWE: Whole Economy Level.*Total Pay/);
const cpi = await ons("D7BT", "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7bt/mm23/data", /CPI INDEX 00: ALL ITEMS/);
series.KAB9 = { label: `${awe.title}. Mean weekly pay of employees in Great Britain, everyone, full-time and part-time, pounds a week (ONS average weekly earnings)`, monthly: awe.monthly, annual: awe.annual };
series.D7BT = { label: `${cpi.title} (ONS consumer prices index, UK). An index, not a price`, monthly: cpi.monthly, annual: cpi.annual };

// 4. Derived series, from the quoted prices.
const prices = JSON.parse(await readFile(join(root, "parts", "uk-manicure-prices.json"), "utf8"));
const cpiMonth = Object.keys(cpi.monthly).at(-1);
const cpiNow = cpi.monthly[cpiMonth];
const keep = (entries) => Object.fromEntries(entries.filter(([, v]) => v !== undefined && Number.isFinite(v)));
for (const [item, name] of [["manicure", "a basic manicure"], ["nail_varnish", "a bottle of nail varnish"]]) {
  const p = prices.series[`${item}_median_gbp`];
  const monthsOf = (y) => Object.keys(p.monthly).filter((m) => m.startsWith(y));
  series[`${item}_minutes_of_work`] = {
    label: `Minutes of work to pay for ${name} at women's median hourly pay, before tax. Formula: ${item}_median_gbp.annual / women_median_hourly_pay_gbp.annual x 60. The price is the whole year's quotes, the pay is April's`,
    derived: true,
    annual: keep(Object.entries(p.annual).map(([y, v]) => [y, pay[y] ? round((v / pay[y]) * 60, 4) : undefined])),
  };
  series[`${item}_real_gbp`] = {
    label: `Median price of ${name} in ${cpiMonth} money. Formula: ${item}_median_gbp x D7BT[${cpiMonth}] / D7BT[same month]. annual divides the year's median by the mean of D7BT over the months of that year that have quotes`,
    derived: true,
    monthly: keep(Object.entries(p.monthly).map(([m, v]) => [m, cpi.monthly[m] ? round((v * cpiNow) / cpi.monthly[m], 4) : undefined])),
    annual: keep(Object.entries(p.annual).map(([y, v]) => [y, monthsOf(y).every((m) => cpi.monthly[m]) ? round((v * cpiNow) / mean(monthsOf(y).map((m) => cpi.monthly[m])), 4) : undefined])),
  };
  series[`${item}_pct_of_weekly_pay`] = {
    label: `Median price of ${name} as a percentage of mean weekly pay. Formula: ${item}_median_gbp.monthly / KAB9.monthly x 100`,
    derived: true,
    monthly: keep(Object.entries(p.monthly).map(([m, v]) => [m, awe.monthly[m] ? round((v / awe.monthly[m]) * 100, 4) : undefined])),
  };
  for (const id of [`${item}_minutes_of_work`, `${item}_real_gbp`]) {
    const a = series[id].annual;
    console.log(`${id}: ${Object.keys(a)[0]} ${Object.values(a)[0]} to ${Object.keys(a).at(-1)} ${Object.values(a).at(-1)}`);
  }
}

await writePart("uk-manicure-affordability.json", {
  source: "Office for National Statistics: Annual Survey of Hours and Earnings via Nomis (NM_99_1), average weekly earnings (series KAB9, dataset LMS), consumer prices index (series D7BT, dataset MM23), and the CPI price quotes summarised in uk-manicure-prices.json.",
  licence: "Open Government Licence v3.0",
  note: `Pay, the all-items price index, and what they say about the manicure and nail varnish prices in uk-manicure-prices.json. Series with derived: true are worked out here by the formula in their label; the rest are as published. Hourly pay is the median for women employees, full-time and part-time together, before tax, in April of each year. "Today's money" means ${cpiMonth}, the latest month of D7BT when this was fetched. Years and months with a missing input are left out.`,
  fetched: new Date().toISOString().slice(0, 10),
  series,
});
