// Shared helpers for the lens fetch scripts (fetch-uk-nail-trade.mjs and friends). No dependencies.
// cached() keeps every raw download in data/raw/ (git-ignored), so a rerun only refetches when you delete the file
// or pass --fresh.
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const UA = "chipped-data/1.0";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const round = (x, p = 6) => Number(Number(x).toPrecision(p));
export const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const fresh = process.argv.includes("--fresh");

// Fetches `url` (retrying 429 and 5xx) and returns a Buffer, from data/raw/<name> when it is already there.
// init.check(buffer) may throw to reject a 200 response that is really an error, so it never reaches the cache.
export async function cached(name, url, init = {}) {
  const path = join(root, "raw", name);
  if (!fresh) {
    try {
      await stat(path);
      return await readFile(path);
    } catch {}
  }
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...init.headers }, signal: AbortSignal.timeout(init.timeout ?? 120000) });
    } catch (err) {
      if (attempt >= 3) throw new Error(`${name}: ${err.message}`);
      await sleep(3000 * 2 ** attempt);
      continue;
    }
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      init.check?.(buf);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, buf);
      return buf;
    }
    if (res.status === 404) return null;
    if (attempt >= 4 || (res.status !== 429 && res.status < 500)) throw new Error(`${name}: HTTP ${res.status}`);
    await sleep(5000 * 2 ** attempt);
  }
}

export async function writePart(name, obj) {
  const path = join(root, "parts", name);
  await mkdir(dirname(path), { recursive: true });
  const text = JSON.stringify(obj) + "\n";
  await writeFile(path, text);
  console.log(`wrote parts/${name} (${(text.length / 1024).toFixed(1)} KB)`);
}

// Minimal CSV parser: handles quoted fields, doubled quotes and newlines inside quotes. Returns arrays of strings.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// Turns { "YYYY-MM": value } into { "YYYY": mean of that year's months }, only for years with all 12 months
// unless `partial` is true.
export function annualMean(monthly, partial = false) {
  const by = {};
  for (const [k, v] of Object.entries(monthly)) (by[k.slice(0, 4)] ??= []).push(v);
  return Object.fromEntries(Object.entries(by).filter(([, xs]) => partial || xs.length === 12).map(([y, xs]) => [y, round(mean(xs))]));
}
export function annualSum(monthly) {
  const by = {};
  for (const [k, v] of Object.entries(monthly)) (by[k.slice(0, 4)] ??= []).push(v);
  return Object.fromEntries(Object.entries(by).filter(([, xs]) => xs.length === 12).map(([y, xs]) => [y, round(xs.reduce((s, x) => s + x, 0), 10)]));
}

// Flattens a Eurostat JSON-stat 2.0 response into rows: { <dimension id>: <category code>, ..., value }.
export function jsonStat(j) {
  const dims = j.id.map((id) => {
    const index = j.dimension[id].category.index;
    const codes = [];
    for (const [code, i] of Object.entries(index)) codes[i] = code;
    return { id, codes };
  });
  const rows = [];
  for (const [k, value] of Object.entries(j.value)) {
    let n = Number(k);
    const row = { value };
    for (let d = dims.length - 1; d >= 0; d--) {
      const size = j.size[d];
      row[dims[d].id] = dims[d].codes[n % size];
      n = Math.floor(n / size);
    }
    rows.push(row);
  }
  return rows;
}
