#!/usr/bin/env node
// Fetches US prices for things in the almanac from FRED's keyless CSV download, adjusts each for inflation
// with the consumer price index (CPIAUCSL), and writes data/parts/real-prices.json.
// real[year] is the inflation-adjusted price as an index, first year = 100. nominal[year] is the published yearly mean.
// A year needs 10 or more monthly readings (October 2025 is missing from many BLS series).
// Run: node data/scripts/fetch-real-prices.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "parts", "real-prices.json");
const LAST = "2025";

const ITEMS = [
  ["potato-chips", "Potato chips", "APU0000718311", "Average US price of a 16oz bag of potato chips, dollars (BLS)"],
  ["polish", "Nail polish & beauty products", "CUUR0000SEGC", "CPI for personal care products, which includes cosmetics and nail polish (BLS)"],
  ["salon", "Salon visits", "CUUR0000SEGD", "CPI for personal care services: haircuts, manicures and other salon services (BLS)"],
  ["steel-nails", "Steel nails", "WPU10881201", "Producer price index for steel nails (BLS)"],
  ["microchips", "Microchips", "PCU334413334413", "Producer price index for semiconductors (BLS)"],
  ["computers", "Computers", "CUUR0000SEEE01", "CPI for computers and peripherals (BLS)"],
];

async function annual(id) {
  const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`);
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  const buckets = {};
  for (const line of (await res.text()).trim().split("\n").slice(1)) {
    const [date, v] = line.split(",");
    // FRED leaves a missing reading blank (or "."), and Number("") is 0, so skip those by hand.
    if (v === undefined || v.trim() === "" || v === "." || Number.isNaN(Number(v))) continue;
    (buckets[date.slice(0, 4)] ??= []).push(Number(v));
  }
  return Object.fromEntries(Object.entries(buckets).filter(([, xs]) => xs.length >= 10).map(([y, xs]) => [y, xs.reduce((s, x) => s + x, 0) / xs.length]));
}

const cpi = await annual("CPIAUCSL");
const series = {};
for (const [key, label, id, source] of ITEMS) {
  const a = await annual(id);
  const years = Object.keys(a).filter((y) => cpi[y] && y <= LAST).sort();
  const real = Object.fromEntries(years.map((y) => [y, (a[y] / cpi[y]) * cpi[LAST]]));
  const first = real[years[0]];
  series[key] = {
    label,
    id,
    source,
    real: Object.fromEntries(years.map((y) => [y, Number(((real[y] / first) * 100).toPrecision(4))])),
    nominal: Object.fromEntries(years.map((y) => [y, Number(a[y].toPrecision(4))])),
  };
  console.log(`${key}: ${years[0]}–${years.at(-1)}, real change ${(series[key].real[years.at(-1)] - 100).toFixed(1)}%`);
}

await mkdir(dirname(outPath), { recursive: true });
await writeFile(
  outPath,
  JSON.stringify({
    source: "FRED, Federal Reserve Bank of St. Louis, from BLS consumer and producer price series. Adjusted for inflation with CPIAUCSL.",
    licence: "US government work, public domain. Credit FRED and BLS.",
    note: `real[year] is the yearly mean price divided by that year's CPI, as an index with the first year = 100. nominal[year] is the yearly mean as published. Prices are in ${LAST} dollars where shown.`,
    fetched: new Date().toISOString().slice(0, 10),
    series,
  }) + "\n",
);
