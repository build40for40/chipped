#!/usr/bin/env node
// Counts US emergency-room visits from CPSC's NEISS yearly files by matching keywords in the case narratives,
// and writes national estimates (sum of case weights) to data/parts/neiss.json.
// NEISS files are ~40 MB each, so they aren't fetched here. Download them by hand:
//   https://www.cpsc.gov/cgibin/NEISSQuery/Data/Archived%20Data/<year>/neiss<year>.xlsx
// Needs the `xlsx` package, which the app doesn't depend on:
//   npm i --prefix /some/tmp xlsx@0.18.5
//   NODE_PATH=/some/tmp/node_modules node data/scripts/reduce-neiss.mjs <dir with neissYYYY.xlsx>
import { createRequire } from "node:module";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const XLSX = createRequire(import.meta.url)("xlsx");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "parts", "neiss.json");

const MATCHERS = {
  "nail-guns": /\bNAIL ?GUNS?\b|\bNAILGUNS?\b|\bNAILERS?\b/,
  "nail-cosmetics": /MANICUR|PEDICUR|NAIL POLISH|NAIL SALON|ACRYLIC NAIL|GEL NAIL|NAIL GLUE|FAKE NAIL|ARTIFICIAL NAIL|PRESS ?ON NAIL|NAIL FILE|NAIL CLIPPER/,
  "potato-chips": /POTATO CHIP|TORTILLA CHIP|\bCHIPS?\b.*\b(CHOK|ATE|EATING)|\b(CHOK|ATE|EATING)\w*\b.*\bCHIPS\b/,
  "wood-chippers": /WOOD ?CHIPPER|\bCHIPPER\b/,
  "poker-chips": /POKER CHIP|CASINO CHIP/,
};

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node data/scripts/reduce-neiss.mjs <dir with neissYYYY.xlsx>");
  process.exit(1);
}

const out = {};
for (const file of (await readdir(dir)).filter((f) => /^neiss\d{4}\.xlsx$/.test(f)).sort()) {
  const year = file.slice(5, 9);
  const wb = XLSX.readFile(join(dir, file));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  const tally = Object.fromEntries(Object.keys(MATCHERS).map((k) => [k, { cases: 0, estimate: 0 }]));
  for (const r of rows) {
    const text = `${r.Narrative_1 ?? ""} ${r.Narrative_2 ?? ""}`.toUpperCase();
    for (const [k, re] of Object.entries(MATCHERS)) {
      if (re.test(text)) {
        tally[k].cases++;
        tally[k].estimate += Number(r.Weight) || 0;
      }
    }
  }
  for (const t of Object.values(tally)) t.estimate = Math.round(t.estimate);
  out[year] = tally;
  console.log(year, rows.length, "cases", JSON.stringify(tally));
}

await mkdir(dirname(outPath), { recursive: true });
await writeFile(
  outPath,
  JSON.stringify({
    source: "CPSC National Electronic Injury Surveillance System (NEISS). Keyword matches on case narratives; estimate is the sum of case weights (national ER visits).",
    licence: "US government work (CPSC), public domain.",
    caveat: "Keyword matching over free-text narratives: counts are indicative, not official product-code totals.",
    matchers: Object.fromEntries(Object.entries(MATCHERS).map(([k, re]) => [k, re.source])),
    years: out,
  }, null, 2) + "\n",
);
