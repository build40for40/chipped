#!/usr/bin/env node
// Fetches the ONS consumer price index for hairdressing and personal grooming (series D7EY, UK, 2015 = 100),
// monthly from 1988, and writes data/parts/uk-grooming-prices.json. It is the price of salon visits, not how
// many people went, and manicures are a small part of it.
// Run: node data/scripts/fetch-ons-cpi.mjs   (add --fresh to ignore the data/raw/ cache)
import { cached, writePart } from "./lens-lib.mjs";

const SERIES = { D7EY: "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7ey/mm23/data" };
const MONTHS = { January: "01", February: "02", March: "03", April: "04", May: "05", June: "06", July: "07", August: "08", September: "09", October: "10", November: "11", December: "12" };

const series = {};
for (const [id, url] of Object.entries(SERIES)) {
  const j = JSON.parse((await cached(`ons-${id}-${new Date().toISOString().slice(0, 7)}.json`, url)).toString("utf8"));
  const monthly = Object.fromEntries(j.months.filter((m) => m.value !== "").map((m) => [`${m.year}-${MONTHS[m.month]}`, Number(m.value)]));
  const annual = Object.fromEntries(j.years.filter((y) => y.value !== "").map((y) => [y.year, Number(y.value)]));
  series[id] = { label: j.description.title, monthly, annual };
  console.log(`${id} ${j.description.title}: ${Object.keys(monthly)[0]} to ${Object.keys(monthly).at(-1)}`);
}

await writePart("uk-grooming-prices.json", {
  source: "Office for National Statistics, Consumer price inflation time series (MM23), series D7EY.",
  licence: "Open Government Licence v3.0",
  note: "UK price index, 2015 = 100. monthly and annual are both as published by the ONS (annual is its own yearly average). Prices, not sales or visits.",
  fetched: new Date().toISOString().slice(0, 10),
  series,
});
