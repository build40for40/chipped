#!/usr/bin/env node
// Fetches the ONS Annual Business Survey workbook (Sections A to S, about 1 MB, cached in data/raw/) and pulls
// out UK yearly turnover and enterprise counts for the self-care industries. Writes data/parts/uk-selfcare-business.json.
//   96.02 hairdressing and other beauty treatment (nail bars are in here, mixed with hairdressers)
//   96.04 physical well-being activities (spas, saunas, massage)
//   93.13 fitness facilities (gyms, most yoga and Pilates studios)
// The workbook is an .xlsx, which is a zip of XML; readXlsx in lens-lib.mjs reads it with Node's own zlib.
// Run: node data/scripts/fetch-ons-abs.mjs   (add --fresh to ignore the data/raw/ cache)
import { cached, readXlsx, writePart } from "./lens-lib.mjs";

const URL =
  "https://www.ons.gov.uk/file?uri=/businessindustryandtrade/business/businessservices/datasets/uknonfinancialbusinesseconomyannualbusinesssurveysectionsas/current/abssectionsas.xlsx";
const WANT = { "96.02": "Section S", "96.04": "Section S", "93.13": "Section R" };
const MEASURES = { enterprises: "Number of enterprises", turnover_million_gbp: "Total turnover", gva_million_gbp: "Approximate gross value added", employment_costs_million_gbp: "Total employment costs" };

const { sheet } = readXlsx(await cached("ons-abs-sections-a-s.xlsx", URL));

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
