#!/usr/bin/env node
// Writes src/exhibits/data.json, the numbers behind the three charts at the top of the page,
// from files already in data/parts/. Nothing is typed in by hand.
// Run after fetch-real-prices.mjs or reduce-neiss.mjs: node data/scripts/build-exhibits.mjs
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = async (f) => JSON.parse(await readFile(join(root, "parts", f), "utf8"));
const outPath = join(root, "..", "src", "exhibits", "data.json");

const prices = await read("real-prices.json");
const nails = await read("nail-prices.json");
const neiss = await read("neiss.json");
const trade = await read("uk-nail-trade.json");

const ORDER = ["salon", "polish", "potato-chips", "microchips", "computers", "steel-nails"];
const items = [
  ...ORDER.map((key) => {
    const s = prices.series[key];
    return {
      key,
      label: s.label,
      source: `${s.source}. FRED ${s.id}, adjusted for inflation with CPIAUCSL.`,
      points: Object.entries(s.real).map(([y, v]) => [Number(y), v]),
      nominal: Object.fromEntries(Object.entries(s.nominal).map(([y, v]) => [y, v])),
    };
  }),
  {
    key: "iron-nails",
    label: "Iron nails since 1790",
    source: "Daniel Sichel, The Price of Nails since 1695, NBER Working Paper 29617, Table 1.",
    points: nails.index.map((p) => [p.year, p.real_index]),
  },
];

const years = Object.keys(neiss.years).sort();
const mean = (k) => Math.round(years.reduce((s, y) => s + neiss.years[y][k].estimate, 0) / years.length);

await writeFile(
  outPath,
  JSON.stringify(
    {
      prices: { note: prices.note, items },
      stripes: {
        source: trade.source,
        licence: trade.licence,
        monthly: trade.series.imports_gbp.monthly,
        annual: trade.series.imports_gbp.annual,
      },
      er: { from: Number(years[0]), to: Number(years.at(-1)), manicure: mean("nail-cosmetics"), nailGun: mean("nail-guns"), caveat: neiss.caveat },
    },
    null,
    1,
  ) + "\n",
);
console.log(`wrote ${outPath}`);
