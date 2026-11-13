#!/usr/bin/env node
// Fetches worldwide Google Trends interest for nail polish colours and writes data/parts/nail-colour-trends.json.
// Each colour is searched as "<colour> nail polish", never "<colour> nails", which pulls in medical searches
// (yellow nail syndrome, black toenails, white spots). Trends compares at most five terms and scales each request
// 0 to 100 on its own, so every batch carries "red nail polish" as an anchor and is rescaled to it.
// The front page paints with each year's palette: its four most searched colours plus its colour of the year, the
// colour whose share of these searches grew most on the year before.
// Responses are cached in data/raw/google-trends/, so reruns only fetch new batches.
// Run: node data/scripts/fetch-google-trends-colours.mjs
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "raw", "google-trends");
const outPath = join(root, "parts", "nail-colour-trends.json");

const FROM = "2004-01-01";
const TO = "2026-10-31";
const ANCHOR = "red";
// Each colour: the word searched, the shade it is painted in, and its name on the page.
const COLOURS = [
  { id: "red", name: "Pillar-box", hex: "#b3122e" },
  { id: "pink", name: "Peony", hex: "#e86a92" },
  { id: "nude", name: "Bare", hex: "#e3bfae" },
  { id: "black", name: "Ink", hex: "#1b1719" },
  { id: "white", name: "Milk", hex: "#f7f3ee" },
  { id: "blue", name: "Cobalt", hex: "#2d4fb3" },
  { id: "purple", name: "Plum", hex: "#6b2d6f" },
  { id: "green", name: "Fern", hex: "#2f7a4a" },
  { id: "burgundy", name: "Oxblood", hex: "#6a1428" },
  { id: "glitter", name: "Stardust", hex: "#cfc6dc", sparkle: true },
  { id: "gold", name: "Gilt", hex: "#d4a23f", sparkle: true },
  { id: "silver", name: "Mercury", hex: "#b9bcc2", sparkle: true },
  { id: "chrome", name: "Chrome", hex: "#a9b4c2", sparkle: true },
  { id: "coral", name: "Coral", hex: "#ee6f5b" },
  { id: "orange", name: "Tangerine", hex: "#f28a2e" },
  { id: "yellow", name: "Buttercup", hex: "#f2cf45" },
  { id: "grey", name: "Slate", hex: "#7c7f86" },
  { id: "brown", name: "Cocoa", hex: "#6b4433" },
  { id: "lavender", name: "Lavender", hex: "#b9a3dc" },
  { id: "navy", name: "Midnight", hex: "#1d2a52" },
  { id: "mint", name: "Mint", hex: "#a9e0c8" },
  { id: "teal", name: "Lagoon", hex: "#1f7f84" },
];
const term = (id) => `${id} nail polish`;
// A colour must hold this share of the year's searches to be its colour of the year, so tiny bases cannot win on growth.
const RISER_MIN_SHARE = 0.03;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cookie = "";

async function getText(url, attempt = 0) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Cookie: cookie } });
  const fresh = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  if (fresh) cookie = fresh;
  if (res.ok) return res.text();
  if ((res.status === 429 || res.status >= 500) && attempt < 6) {
    await sleep(4000 * 2 ** attempt);
    return getText(url, attempt + 1);
  }
  throw new Error(`HTTP ${res.status} for ${url.slice(0, 120)}`);
}
const parse = (text) => JSON.parse(text.slice(text.indexOf("{")));

async function fetchBatch(ids) {
  const keywords = ids.map(term);
  const file = join(cacheDir, createHash("sha1").update(`${keywords.join("|")}|${FROM}|${TO}`).digest("hex").slice(0, 16) + ".json");
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {}
  const req = { comparisonItem: keywords.map((keyword) => ({ keyword, geo: "", time: `${FROM} ${TO}` })), category: 0, property: "" };
  const explore = parse(await getText(`https://trends.google.com/trends/api/explore?hl=en-US&tz=0&req=${encodeURIComponent(JSON.stringify(req))}`));
  const widget = explore.widgets.find((w) => w.id === "TIMESERIES");
  await sleep(1500);
  const line = parse(
    await getText(`https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=0&req=${encodeURIComponent(JSON.stringify(widget.request))}&token=${widget.token}`),
  );
  const rows = line.default.timelineData.map((d) => ({ month: new Date(Number(d.time) * 1000).toISOString().slice(0, 7), values: d.value }));
  const out = { keywords, rows };
  await writeFile(file, JSON.stringify(out));
  await sleep(2500);
  return out;
}

await mkdir(cacheDir, { recursive: true });
await getText("https://trends.google.com/trends/explore?geo=&q=red%20nail%20polish").catch(() => "");

// Batches of four colours plus the anchor.
const others = COLOURS.map((c) => c.id).filter((id) => id !== ANCHOR);
const monthly = {};
let months = null;
let anchorRef = null;
for (let i = 0; i < others.length; i += 4) {
  const ids = [ANCHOR, ...others.slice(i, i + 4)];
  const { rows } = await fetchBatch(ids);
  months ??= rows.map((r) => r.month);
  const anchorTotal = rows.reduce((s, r) => s + r.values[0], 0);
  if (anchorRef === null) {
    anchorRef = anchorTotal;
    monthly[ANCHOR] = rows.map((r) => r.values[0]);
  }
  const k = anchorRef / anchorTotal;
  ids.slice(1).forEach((id, j) => (monthly[id] = rows.map((r) => +(r.values[j + 1] * k).toFixed(2))));
  console.log(`batch ${ids.join(", ")}: scale ${k.toFixed(3)}`);
}

// Yearly totals, then each year's ranking and palette.
const yearsList = [...new Set(months.map((m) => m.slice(0, 4)))];
const yearly = {};
for (const c of COLOURS) {
  yearly[c.id] = yearsList.map((y) => +months.reduce((s, m, i) => (m.startsWith(y) ? s + monthly[c.id][i] : s), 0).toFixed(1));
}
const years = yearsList.map((year, yi) => {
  const total = COLOURS.reduce((s, c) => s + yearly[c.id][yi], 0);
  const share = Object.fromEntries(COLOURS.map((c) => [c.id, total ? yearly[c.id][yi] / total : 0]));
  const ranked = COLOURS.map((c) => c.id).sort((a, b) => share[b] - share[a]);
  let riser = null;
  if (yi > 0) {
    const prevTotal = COLOURS.reduce((s, c) => s + yearly[c.id][yi - 1], 0);
    let best = 0;
    for (const id of ranked) {
      const before = prevTotal ? yearly[id][yi - 1] / prevTotal : 0;
      if (share[id] < RISER_MIN_SHARE || before <= 0) continue;
      const growth = share[id] / before - 1;
      if (growth > best) [best, riser] = [growth, { id, growth: +growth.toFixed(3) }];
    }
  }
  const palette = ranked.slice(0, 5);
  if (riser && !palette.includes(riser.id)) palette.splice(4, 1, riser.id);
  // Too few colours register in the earliest years for a palette to mean anything.
  const thin = ranked.filter((id) => share[id] >= 0.01).length < 5;
  return {
    year,
    thin: thin || undefined,
    partial: year === TO.slice(0, 4) ? `to ${TO.slice(0, 7)}` : undefined,
    top: ranked.slice(0, 5).map((id) => ({ id, share: +share[id].toFixed(4) })),
    colourOfTheYear: riser,
    palette: palette.map((id) => ({ id, share: +share[id].toFixed(4) })),
  };
});

const out = {
  source: `Google Trends (trends.google.com), worldwide web searches, monthly ${FROM.slice(0, 7)} to ${TO.slice(0, 7)}. Each colour is the search "<colour> nail polish". Batches of five were rescaled to the shared "${term(ANCHOR)}" anchor, then summed by year.`,
  licence: "Google Trends data, credited as Source: Google Trends",
  caveats: [
    "Searches, not sales: a colour people are curious about can outrank one they buy.",
    "Trends reports rounded relative interest, so rare colours in early years read as zero.",
    "Google improved its data collection in January 2011, January 2016 and January 2022, which can step a series.",
    `${TO.slice(0, 4)} is a partial year, to ${TO.slice(0, 7)}.`,
  ],
  method: `Years marked thin have fewer than five colours with 1% of searches, and the page leaves them out. Share is a colour's searches over all ${COLOURS.length} colours' searches that year. Colour of the year: the biggest rise in share on the year before, among colours with at least ${RISER_MIN_SHARE * 100}% of the year. Palette: the year's top five, with the fifth swapped for the colour of the year when it is not already in.`,
  colours: COLOURS.map((c) => ({ ...c, search: term(c.id) })),
  months,
  monthly,
  yearly: { years: yearsList, ...yearly },
  years,
};
await writeFile(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${outPath}: ${yearsList[0]} to ${yearsList.at(-1)}, ${COLOURS.length} colours`);
