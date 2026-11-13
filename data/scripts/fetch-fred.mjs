#!/usr/bin/env node
// Fetches every `fred:<id>` series named in data/entries.json from FRED's keyless CSV download,
// and writes monthly and annual averages to data/parts/fred.json.
// Run: node data/scripts/fetch-fred.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "parts", "fred.json");

const { entries } = JSON.parse(await readFile(join(root, "entries.json"), "utf8"));
const ids = [...new Set(entries.flatMap((e) => e.extra ?? []).filter((x) => x.startsWith("fred:")).map((x) => x.slice(5)))];

const round = (x) => Number(x.toPrecision(5));
const series = {};
for (const id of ids) {
  const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`);
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  const rows = (await res.text()).trim().split("\n").slice(1).map((l) => l.split(","));
  const buckets = { monthly: {}, annual: {} };
  for (const [date, v] of rows) {
    const x = Number(v);
    if (v === "." || Number.isNaN(x)) continue;
    for (const [k, b] of [[date.slice(0, 7), buckets.monthly], [date.slice(0, 4), buckets.annual]]) (b[k] ??= []).push(x);
  }
  const avg = (b) => Object.fromEntries(Object.entries(b).map(([k, xs]) => [k, round(xs.reduce((s, x) => s + x, 0) / xs.length)]));
  series[id] = { monthly: avg(buckets.monthly), annual: avg(buckets.annual) };
  console.log(`${id}: ${Object.keys(series[id].monthly).length} months`);
}

await mkdir(dirname(outPath), { recursive: true });
await writeFile(
  outPath,
  JSON.stringify({
    source: "FRED, Federal Reserve Bank of St. Louis (fred.stlouisfed.org). Monthly and annual means of each series.",
    series,
  }) + "\n",
);
