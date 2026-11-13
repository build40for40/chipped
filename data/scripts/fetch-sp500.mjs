#!/usr/bin/env node
// Fetches the S&P 500 back to 1871 (Robert Shiller's dataset, as kept by datasets/s-and-p-500 on GitHub)
// and writes monthly and annual averages to data/parts/sp500.json, in the same shape as fred.json.
// SP500 is the index level. SP500_real is the level adjusted for inflation, which the source only has to Sep 2023.
// Run: node data/scripts/fetch-sp500.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "parts", "sp500.json");
const URL = "https://raw.githubusercontent.com/datasets/s-and-p-500/main/data/data.csv";

const res = await fetch(URL);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const [head, ...lines] = (await res.text()).trim().split("\n");
const cols = head.split(",");
const col = (name) => {
  const i = cols.indexOf(name);
  if (i < 0) throw new Error(`no "${name}" column in ${URL}`);
  return i;
};
const want = { SP500: col("SP500"), SP500_real: col("Real Price") };

const round = (x) => Number(x.toPrecision(5));
const avg = (b) => Object.fromEntries(Object.entries(b).map(([k, xs]) => [k, round(xs.reduce((s, x) => s + x, 0) / xs.length)]));
const series = {};
for (const [id, i] of Object.entries(want)) {
  const monthly = {};
  const annual = {};
  for (const line of lines) {
    const cells = line.split(",");
    const x = Number(cells[i]);
    // The source writes 0 where it has no reading yet. The index has never been 0.
    if (!Number.isFinite(x) || x === 0) continue;
    monthly[cells[0].slice(0, 7)] = [x];
    (annual[cells[0].slice(0, 4)] ??= []).push(x);
  }
  series[id] = { monthly: avg(monthly), annual: avg(annual) };
  console.log(`${id}: ${Object.keys(series[id].monthly).length} months`);
}

await mkdir(dirname(outPath), { recursive: true });
await writeFile(
  outPath,
  JSON.stringify({
    source: "Robert Shiller, Irrational Exuberance dataset (shillerdata.com), via github.com/datasets/s-and-p-500. Monthly averages of daily closes; annual is the mean of the months.",
    series,
  }) + "\n",
);
