#!/usr/bin/env node
// Fetches US jobs in self-care industries from the BLS Current Employment Statistics, monthly from 1990,
// and writes data/parts/bls-selfcare.json. Nail and hair salon jobs are already in bls-salons.json.
//   CEU7071394001 fitness and recreational sports centers (gyms, yoga and Pilates studios)
//   CEU8081219001 other personal care services (massage, day spas, tanning, diet centers, tattoo parlors...)
//   CEU8081210001 personal care services (the parent of hair, nail and other personal care)
// Uses the keyless v1 API: 10 years per call and 25 calls a day, so this script makes 4 calls and caches each.
// Run: node data/scripts/fetch-bls-selfcare.mjs   (add --fresh to ignore the data/raw/ cache)
import { annualMean, cached, writePart } from "./lens-lib.mjs";

const SERIES = {
  CEU7071394001: "Fitness and recreational sports centers",
  CEU8081219001: "Other personal care services",
  CEU8081210001: "Personal care services",
};
const thisYear = new Date().getUTCFullYear();
const monthly = Object.fromEntries(Object.keys(SERIES).map((id) => [id, {}]));
for (let start = 1990; start <= thisYear; start += 10) {
  const end = Math.min(start + 9, thisYear);
  // A decade that is still running gets today's date in its cache name, so a later run fetches the new months.
  const tag = end === thisYear ? `-${new Date().toISOString().slice(0, 10)}` : "";
  const buf = await cached(`bls-selfcare-${start}-${end}${tag}.json`, "https://api.bls.gov/publicAPI/v1/timeseries/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seriesid: Object.keys(SERIES), startyear: String(start), endyear: String(end) }),
    // BLS answers 200 even when the daily limit is used up, so check the body before it is cached.
    check: (b) => {
      const { status, message } = JSON.parse(b.toString("utf8"));
      if (status !== "REQUEST_SUCCEEDED") throw new Error(`BLS ${start}: ${status} ${message}`);
    },
  });
  const body = JSON.parse(buf.toString("utf8"));
  for (const s of body.Results.series)
    for (const d of s.data) if (/^M(0[1-9]|1[0-2])$/.test(d.period) && d.value !== "-") monthly[s.seriesID][`${d.year}-${d.period.slice(1)}`] = Number(d.value);
}

const series = {};
for (const [id, label] of Object.entries(SERIES)) {
  const sorted = Object.fromEntries(Object.entries(monthly[id]).sort());
  series[id] = { label, monthly: sorted, annual: annualMean(sorted) };
  const keys = Object.keys(sorted);
  console.log(`${id}: ${keys.length} months, ${keys[0]} to ${keys.at(-1)}`);
}

await writePart("bls-selfcare.json", {
  source: "US Bureau of Labor Statistics, Current Employment Statistics (api.bls.gov), all employees, not seasonally adjusted.",
  licence: "US government work, public domain",
  note: "Thousands of jobs. monthly is the published figure; annual is the mean of a full calendar year. Jobs, not sales or visits. The latest months are preliminary.",
  fetched: new Date().toISOString().slice(0, 10),
  series,
});
