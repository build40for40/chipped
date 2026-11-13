#!/usr/bin/env node
// Copies the data files into public/data/, which the site serves at https://build40for40.com/chipped/data/.
// Some data we may chart but not hand out as a file, so it stays out:
// - sp500.json: S&P 500 index levels belong to S&P Dow Jones Indices.
// - fred.json VIXCLS: the VIX is Cboe's, and FRED marks it as copyrighted.
// Run: npm run data:publish
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const data = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(data, "..", "public", "data");
const SKIP = new Set(["sp500.json"]);
const DROP_SERIES = { "fred.json": ["VIXCLS"] };

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await copyFile(join(data, "entries.json"), join(out, "entries.json"));
await copyFile(join(data, "..", "research", "samples", "bls-ces-nail-vs-hair-salons-1990-2026.json"), join(out, "bls-salons.json"));

for (const name of (await readdir(join(data, "parts"))).filter((f) => f.endsWith(".json"))) {
  if (SKIP.has(name)) continue;
  const drop = DROP_SERIES[name];
  if (!drop) {
    await copyFile(join(data, "parts", name), join(out, name));
    continue;
  }
  const json = JSON.parse(await readFile(join(data, "parts", name), "utf8"));
  for (const id of drop) delete json.series[id];
  json.withheld = `${drop.join(", ")} left out of the published copy: the owner's terms do not allow handing it out.`;
  await writeFile(join(out, name), JSON.stringify(json) + "\n");
}
console.log(`published ${(await readdir(out)).length} files to public/data/`);
