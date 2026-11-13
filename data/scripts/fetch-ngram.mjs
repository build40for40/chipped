#!/usr/bin/env node
// Fetches Google Books Ngram curves for every entry in data/entries.json and writes data/parts/ngram.json.
// Each entry's series is the sum of its phrases, case-insensitive, in occurrences per million words.
// Adapted from Day 9's fetch-ngram.mjs. Responses are cached in data/raw/ngram/, so reruns only fetch new phrases.
// Run: node data/scripts/fetch-ngram.mjs
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "raw", "ngram");
const outPath = join(root, "parts", "ngram.json");

const CORPUS = "en";
const FROM = 1900;
const TO = 2022;
const YEARS = TO - FROM + 1;
const BATCH = 10;
const MIN_GAP_MS = 1100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (phrase) => phrase.toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
const sig4 = (x) => (x === 0 ? 0 : Number(x.toPrecision(4)));

function matchResponse(phrases, response) {
  const byKey = new Map();
  for (const row of response) {
    if (row.parent) continue;
    const name = row.ngram.replace(/ \(All\)$/, "");
    if (row.timeseries?.length === YEARS) byKey.set(key(name), row.timeseries);
  }
  return phrases.map((p) => [p, byKey.get(key(p)) ?? null]);
}

let lastRequest = 0;
async function fetchBatch(phrases) {
  const params = new URLSearchParams({
    content: phrases.join(","),
    year_start: String(FROM),
    year_end: String(TO),
    corpus: CORPUS,
    smoothing: "0",
    case_insensitive: "true",
  });
  const url = `https://books.google.com/ngrams/json?${params}`;
  for (let attempt = 0; ; attempt++) {
    const wait = lastRequest + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": "40for40-day10-dataset/1.0" } });
    } catch (err) {
      res = { ok: false, status: `network ${err.message}` };
    }
    if (res.ok) return res.json();
    const retryable = typeof res.status !== "number" || res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= 6) throw new Error(`${phrases.join(",")}: HTTP ${res.status}`);
    const backoff = 5000 * 2 ** attempt;
    console.warn(`  ${res.status}, retrying in ${backoff / 1000}s`);
    await sleep(backoff);
  }
}

await mkdir(cacheDir, { recursive: true });
await mkdir(dirname(outPath), { recursive: true });

const index = new Map();
for (const file of (await readdir(cacheDir)).filter((f) => f.endsWith(".json")).sort()) {
  const { phrases, response } = JSON.parse(await readFile(join(cacheDir, file), "utf8"));
  for (const [p, s] of matchResponse(phrases, response)) index.set(p, s);
}

const { entries } = JSON.parse(await readFile(join(root, "entries.json"), "utf8"));
const phrases = [...new Set(entries.flatMap((e) => e.ngram))];
const todo = phrases.filter((p) => !index.has(p));
console.log(`${phrases.length - todo.length} cached, ${todo.length} to fetch`);
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  const response = await fetchBatch(batch);
  const id = createHash("sha1").update(batch.join("\n")).digest("hex").slice(0, 16);
  await writeFile(join(cacheDir, `${id}.json`), JSON.stringify({ phrases: batch, response }));
  for (const [p, s] of matchResponse(batch, response)) index.set(p, s);
  console.log(`  ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
}

const series = {};
for (const e of entries) {
  const hits = e.ngram.filter((p) => index.get(p));
  const missing = e.ngram.filter((p) => !index.get(p));
  if (missing.length) console.log(`  ${e.id}: no data for ${missing.join(" | ")}`);
  series[e.id] = hits.length
    ? { phrases: hits, values: Array.from({ length: YEARS }, (_, y) => sig4(hits.reduce((s, p) => s + index.get(p)[y], 0) * 1e6)) }
    : null;
}

const doc = {
  source: "Google Books Ngram Viewer (books.google.com/ngrams), English corpus, case-insensitive, no smoothing. Each entry sums its phrases, in occurrences per million words.",
  licence: "CC BY 3.0 (Google Books Ngram)",
  from: FROM,
  to: TO,
  series,
};
const json = JSON.stringify(doc, null, 2).replace(/\[\n\s+([\d.e+-]+(?:,\n\s+[\d.e+-]+)*)\n\s+\]/g, (_, nums) => `[${nums.split(/,\n\s+/).join(", ")}]`);
await writeFile(outPath, json + "\n");
console.log(`${Object.values(series).filter(Boolean).length}/${entries.length} entries with Ngram data`);
