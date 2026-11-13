#!/usr/bin/env node
// Prints each entry's Ngram correlation with the baseline (chipped nails), its peak year and growth,
// so we can pick which entries make the best one-line facts. Reads data/parts/ngram.json.
// Run: node data/scripts/summarise.mjs [fromYear]
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { entries, baseline } = JSON.parse(await readFile(join(root, "entries.json"), "utf8"));
const ngram = JSON.parse(await readFile(join(root, "parts", "ngram.json"), "utf8"));
const from = Number(process.argv[2] ?? 1960);
const slice = (v) => v.slice(from - ngram.from);

const pearson = (a, b) => {
  const n = a.length, ma = a.reduce((s, x) => s + x) / n, mb = b.reduce((s, x) => s + x) / n;
  let c = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; }
  return c / Math.sqrt(va * vb);
};
// Year-on-year changes strip out the shared upward drift, so this is the "honest" correlation.
const diffs = (v) => v.slice(1).map((x, i) => x - v[i]);

const base = slice(ngram.series[baseline].values);
const rows = entries
  .filter((e) => ngram.series[e.id] && e.id !== baseline)
  .map((e) => {
    const v = slice(ngram.series[e.id].values);
    const peak = from + v.indexOf(Math.max(...v));
    const first = v.find((x) => x > 0) ?? 0;
    return { id: e.id, r: pearson(base, v), rDiff: pearson(diffs(base), diffs(v)), peak, growth: first ? v.at(-1) / first : NaN };
  })
  .sort((a, b) => b.r - a.r);

console.log(`Correlation with "${baseline}", ${from}-${ngram.to}. r = raw curves, rΔ = year-on-year changes.`);
for (const r of rows)
  console.log(`${r.id.padEnd(24)} r ${r.r.toFixed(2).padStart(5)}  rΔ ${r.rDiff.toFixed(2).padStart(5)}  peak ${r.peak}  x${r.growth.toFixed(1)}`);
