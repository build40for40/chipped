#!/usr/bin/env node
// Fetches English Wikipedia pageviews for every entry's `wiki` title (monthly, Jul 2015 to last month)
// and `wikiDaily` titles (daily, last 60 days), and writes data/parts/pageviews.json.
// Run: node data/scripts/fetch-pageviews.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "parts", "pageviews.json");
const UA = "40for40-day10-dataset/1.0 (https://build40for40.com)";
const API = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");

async function views(title, granularity, start, end) {
  const article = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `${API}/${article}/${granularity}/${start}00/${end}00`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const { items } = await res.json();
      return Object.fromEntries(items.map((i) => [i.timestamp.slice(0, granularity === "monthly" ? 6 : 8), i.views]));
    }
    if (res.status === 404) return null;
    if (attempt >= 4) throw new Error(`${title}: HTTP ${res.status}`);
    await sleep(1000 * 2 ** attempt);
  }
}

const now = new Date();
const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
const dayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
const dayStart = new Date(dayEnd.getTime() - 59 * 864e5);

const { entries } = JSON.parse(await readFile(join(root, "entries.json"), "utf8"));
const monthly = {};
const daily = {};
for (const title of new Set(entries.map((e) => e.wiki).filter(Boolean))) {
  monthly[title] = await views(title, "monthly", "20150701", ymd(monthEnd));
  console.log(`${monthly[title] ? "ok     " : "missing"} ${title}`);
  await sleep(200);
}
for (const title of new Set(entries.flatMap((e) => e.wikiDaily ?? []))) {
  daily[title] = await views(title, "daily", ymd(dayStart), ymd(dayEnd));
  console.log(`${daily[title] ? "ok     " : "missing"} ${title} (daily)`);
  await sleep(200);
}

await mkdir(dirname(outPath), { recursive: true });
await writeFile(
  outPath,
  JSON.stringify({
    source: "Wikimedia REST API pageviews, en.wikipedia, all access, user agents only.",
    licence: "CC0 (Wikimedia pageview data)",
    fetched: now.toISOString(),
    monthly,
    daily,
  }) + "\n",
);
