// Shared helpers for the lens fetch scripts (fetch-uk-nail-trade.mjs and friends). No dependencies.
// cached() keeps every raw download in data/raw/ (git-ignored), so a rerun only refetches when you delete the file
// or pass --fresh.
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { inflateRawSync } from "node:zlib";
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

// Reads every file out of a zip by walking its central directory.
function unzip(buf) {
  const files = {};
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("not a zip file");
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = buf.readUInt16LE(eocd + 10); n > 0; n--) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    files[name] = () => (method === 0 ? raw : inflateRawSync(raw)).toString("utf8");
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return files;
}
const unescapeXml = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

// Opens an .xlsx (a zip of XML) with no dependencies. Returns { sheetNames, sheet(name) }, where sheet() gives
// one object per row keyed by column letter, e.g. { A: "96.02", C: "2008", E: "3401" }. Values are strings.
export function readXlsx(buf) {
  const files = unzip(buf);
  const strings = [...files["xl/sharedStrings.xml"]().matchAll(/<si>(.*?)<\/si>/gs)].map((m) => unescapeXml([...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((x) => x[1]).join("")));
  const workbook = files["xl/workbook.xml"]();
  const rels = files["xl/_rels/workbook.xml.rels"]();
  const sheetNames = [...workbook.matchAll(/<sheet [^>]*name="([^"]+)"/g)].map((m) => unescapeXml(m[1]));
  function sheet(name) {
    const tag = [...workbook.matchAll(/<sheet [^>]*>/g)].map((m) => m[0]).find((x) => unescapeXml(x.match(/name="([^"]+)"/)[1]) === name);
    const rid = tag?.match(/r:id="([^"]+)"/)?.[1];
    const target = rid && rels.match(new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*>`))?.[0].match(/Target="([^"]+)"/)?.[1];
    if (!target) throw new Error(`no sheet "${name}"`);
    return [...files[`xl/${target.replace(/^\//, "").replace(/^xl\//, "")}`]().matchAll(/<row [^>]*>(.*?)<\/row>/gs)].map((r) => {
      const cells = {};
      for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) {
        const v = c[3]?.match(/<v>(.*?)<\/v>/s)?.[1];
        if (v !== undefined) cells[c[1]] = /t="s"/.test(c[2]) ? strings[Number(v)] : unescapeXml(v);
      }
      return cells;
    });
  }
  return { sheetNames, sheet };
}
// Column letter <-> number, A = 1.
export const colNum = (letters) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
export const colName = (n) => (n <= 0 ? "" : colName(Math.floor((n - 1) / 26)) + String.fromCharCode(65 + ((n - 1) % 26)));
