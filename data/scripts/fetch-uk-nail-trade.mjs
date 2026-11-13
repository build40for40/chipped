#!/usr/bin/env node
// Fetches UK trade in manicure and pedicure preparations (commodity 33043000) from HMRC's keyless
// uktradeinfo API, monthly from Jan 2000, and writes data/parts/uk-nail-trade.json.
// This is trade, not sales: it is the nearest free monthly stand-in for UK nail polish demand.
// The code also covers removers, gels and cuticle products. EU trade was collected differently before 2021.
// Run: node data/scripts/fetch-uk-nail-trade.mjs   (add --fresh to ignore the data/raw/ cache)
import { annualSum, cached, writePart } from "./lens-lib.mjs";

const URL =
  "https://api.uktradeinfo.com/OTS?$apply=filter(CommodityId eq 33043000)/groupby((MonthId,FlowTypeId),aggregate(Value with sum as Value,NetMass with sum as NetMass))";
// HMRC flow types: 1 EU imports, 2 EU exports, 3 non-EU imports, 4 non-EU exports.
const FLOW = { 1: "imports", 3: "imports", 2: "exports", 4: "exports" };

const rows = [];
for (let url = URL, page = 0; url; page++) {
  const body = JSON.parse((await cached(`uktradeinfo-33043000-${page}.json`, url)).toString("utf8"));
  rows.push(...body.value);
  url = body["@odata.nextLink"] ?? null;
}

const sums = {};
for (const r of rows) {
  const flow = FLOW[r.FlowTypeId];
  if (!flow) throw new Error(`unknown FlowTypeId ${r.FlowTypeId}`);
  const month = `${String(r.MonthId).slice(0, 4)}-${String(r.MonthId).slice(4)}`;
  for (const [id, v] of [[`${flow}_gbp`, r.Value], [`${flow}_kg`, r.NetMass]]) {
    ((sums[id] ??= {})[month] ??= 0);
    sums[id][month] += v;
  }
}
const series = {};
for (const [id, monthly] of Object.entries(sums)) {
  const sorted = Object.fromEntries(Object.entries(monthly).sort());
  series[id] = { monthly: sorted, annual: annualSum(sorted) };
  const keys = Object.keys(sorted);
  console.log(`${id}: ${keys.length} months, ${keys[0]} to ${keys.at(-1)}`);
}

await writePart("uk-nail-trade.json", {
  source:
    "HM Revenue & Customs, Overseas Trade Statistics via api.uktradeinfo.com. Commodity 33043000, manicure or pedicure preparations. EU and non-EU flows added together.",
  licence: "Open Government Licence v3.0",
  note: "Trade, not retail sales. imports_gbp and exports_gbp are pounds, *_kg is net mass in kilograms. monthly is the month's total; annual is the sum of a full calendar year. Covers polish plus removers, gels and cuticle products. EU figures before 2021 came from a business survey and after from customs declarations, so treat 2020 to 2021 as a break.",
  fetched: new Date().toISOString().slice(0, 10),
  series,
});
