#!/usr/bin/env node
// Fetches the ONS Annual Business Survey workbook (Sections A to S, about 1 MB, cached in data/raw/) and pulls
// out UK yearly turnover and enterprise counts for the self-care industries. Writes data/parts/uk-selfcare-business.json.
//   96.02 hairdressing and other beauty treatment (nail bars are in here, mixed with hairdressers)
//   96.04 physical well-being activities (spas, saunas, massage)
//   93.13 fitness facilities (gyms, most yoga and Pilates studios)
// The workbook is an .xlsx, which is a zip of XML, read here with Node's own zlib: no dependencies.
// Run: node data/scripts/fetch-ons-abs.mjs   (add --fresh to ignore the data/raw/ cache)
import { inflateRawSync } from "node:zlib";
import { cached, writePart } from "./lens-lib.mjs";

const URL =
  "https://www.ons.gov.uk/file?uri=/businessindustryandtrade/business/businessservices/datasets/uknonfinancialbusinesseconomyannualbusinesssurveysectionsas/current/abssectionsas.xlsx";
const WANT = { "96.02": "Section S", "96.04": "Section S", "93.13": "Section R" };
const MEASURES = { enterprises: "Number of enterprises", turnover_million_gbp: "Total turnover", gva_million_gbp: "Approximate gross value added", employment_costs_million_gbp: "Total employment costs" };

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
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

const files = unzip(await cached("ons-abs-sections-a-s.xlsx", URL));
const strings = [...files["xl/sharedStrings.xml"]().matchAll(/<si>(.*?)<\/si>/gs)].map((m) => unescape([...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((t) => t[1]).join("")));
const rels = files["xl/_rels/workbook.xml.rels"]();
function sheet(name) {
  const rid = files["xl/workbook.xml"]().match(new RegExp(`<sheet name="${name}"[^>]*r:id="([^"]+)"`))?.[1];
  const target = rid && rels.match(new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*>`))?.[0].match(/Target="([^"]+)"/)?.[1];
  if (!target) throw new Error(`no sheet "${name}"`);
  return [...files[`xl/${target.replace(/^\//, "").replace(/^xl\//, "")}`]().matchAll(/<row [^>]*>(.*?)<\/row>/gs)].map((r) => {
    const cells = {};
    for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) {
      const v = c[3]?.match(/<v>(.*?)<\/v>/s)?.[1];
      if (v !== undefined) cells[c[1]] = /t="s"/.test(c[2]) ? strings[Number(v)] : unescape(v);
    }
    return cells;
  });
}

const series = {};
for (const [sic, sheetName] of Object.entries(WANT)) {
  const rows = sheet(sheetName);
  const head = rows.find((r) => r.C === "Year" && Object.values(r).some((v) => v.startsWith("Total turnover")));
  if (!head) throw new Error(`${sheetName}: header row not found`);
  const colOf = (label) => {
    const col = Object.keys(head).find((k) => head[k].startsWith(label));
    if (!col) throw new Error(`${sheetName}: no "${label}" column`);
    return col;
  };
  const mine = rows.filter((r) => r.A === sic && /^\d{4}$/.test(r.C ?? ""));
  if (!mine.length) throw new Error(`${sheetName}: no rows for ${sic}`);
  for (const [id, label] of Object.entries(MEASURES)) {
    const col = colOf(label);
    const annual = {};
    // Cells like [c] (confidential) or [low] are not numbers and are left out.
    for (const r of mine) if (r[col] !== undefined && r[col] !== "" && Number.isFinite(Number(r[col]))) annual[r.C] = Number(r[col]);
    series[`sic${sic.replace(".", "")}_${id}`] = { label: `${mine[0].B.trim()} (SIC ${sic}): ${label.toLowerCase()}`, annual };
  }
  const t = series[`sic${sic.replace(".", "")}_turnover_million_gbp`].annual;
  console.log(`${sic} ${mine[0].B.trim()}: ${Object.keys(t)[0]} to ${Object.keys(t).at(-1)}`);
}

await writePart("uk-selfcare-business.json", {
  source: "Office for National Statistics, Annual Business Survey, UK non-financial business economy, Sections A to S workbook (sheets Section R and Section S).",
  licence: "Open Government Licence v3.0",
  note: "UK, yearly. Turnover, gross value added and employment costs are in £ million at current prices (not adjusted for inflation). Only VAT or PAYE registered businesses are counted, so many self-employed nail technicians are missing. SIC 96.02 mixes hair and beauty: nail salons cannot be separated. The jump in enterprises from 2015 to 2016 is a change in coverage, not a boom. The latest year is provisional.",
  fetched: new Date().toISOString().slice(0, 10),
  series,
});
