#!/usr/bin/env node
// Fetches Sport England's Active Lives Adult Survey "Levels of activity" workbook and pulls out the yearly trend
// for women and men in England (sheet "Table 1b Levels Trends"). Writes data/parts/england-women-sport.json.
// Sport England publishes a new workbook under a new link with each release, so this script reads the data
// tables page and takes the newest adult "Levels of activity" workbook it links to. If the page or the sheet
// layout changes it stops with an error instead of guessing.
// Run: node data/scripts/fetch-sport-england.mjs   (add --fresh to ignore the data/raw/ cache)
import { cached, colName, colNum, readXlsx, round, writePart } from "./lens-lib.mjs";

const PAGE = "https://www.sportengland.org/research-and-data/data/active-lives/active-lives-data-tables";
const month = new Date().toISOString().slice(0, 7);
const html = (await cached(`sport-england-tables-${month}.html`, PAGE)).toString("utf8");
const links = [...html.matchAll(/href="(https:\/\/sportengland-production-files[^"]+\.xlsx[^"]*)"/g)]
  .map((m) => m[1].replace(/&amp;/g, "&"))
  .filter((u) => /levels(%20|-|_)of(%20|-|_)activity/i.test(u) && /Adult/i.test(u) && !/CYP|children|coronavirus/i.test(u))
  // Links sit in a folder named for the month they were uploaded: .../s3fs-public/2026-04/...
  .sort((a, b) => a.match(/s3fs-public\/(\d{4}-\d{2})/)[1].localeCompare(b.match(/s3fs-public\/(\d{4}-\d{2})/)[1]));
const url = links.at(-1);
if (!url) throw new Error("no adult Levels of activity workbook linked from the data tables page");
const folder = url.match(/s3fs-public\/(\d{4}-\d{2})/)[1];
console.log(`workbook uploaded ${folder}`);

const { sheet } = readXlsx(await cached(`sport-england-levels-${folder}.xlsx`, url));
const rows = sheet("Table 1b Levels Trends");
// One header row names each survey year ("November 2015 - November 2016") above its first column. Under it sit
// Respondents, then Active (population, rate), Fairly active (population, rate), Inactive (population, rate).
const periods = rows.find((r) => Object.values(r).filter((v) => /^November \d{4} - November \d{4}$/.test(v)).length >= 3);
const labels = periods && rows[rows.indexOf(periods) + 1];
if (!periods || !labels) throw new Error("Table 1b: header rows not found");
const MEASURES = { active: /^Active/, fairly_active: /^Fairly Active/i, inactive: /^Inactive/ };

const series = {};
for (const [who, id] of [["Women", "women"], ["Men", "men"]]) {
  const row = rows.find((r) => r.A === who);
  if (!row) throw new Error(`Table 1b: no "${who}" row`);
  for (const [col, period] of Object.entries(periods)) {
    const year = period.match(/November (\d{4})$/)?.[1];
    if (!year) continue;
    const first = colNum(col);
    for (const [measure, pattern] of Object.entries(MEASURES)) {
      // Find this measure's label within the 7 columns that belong to this survey year.
      const at = Array.from({ length: 7 }, (_, i) => first + i).find((n) => pattern.test(labels[colName(n)] ?? ""));
      if (!at) throw new Error(`Table 1b: no ${measure} column for ${period}`);
      const people = Number(row[colName(at)]);
      const rate = Number(row[colName(at + 1)]);
      if (!Number.isFinite(people) || !Number.isFinite(rate)) continue;
      ((series[`${id}_${measure}_people`] ??= { label: `${who} aged 16+ who are ${measure.replace("_", " ")}, population estimate`, annual: {} }).annual[year] = people);
      ((series[`${id}_${measure}_pct`] ??= { label: `${who} aged 16+ who are ${measure.replace("_", " ")}, %`, annual: {} }).annual[year] = round(rate * 100, 4));
    }
  }
}
const years = Object.keys(series.women_active_pct.annual);
console.log(`women active: ${years[0]} ${series.women_active_pct.annual[years[0]]}% to ${years.at(-1)} ${series.women_active_pct.annual[years.at(-1)]}%`);

await writePart("england-women-sport.json", {
  source: `Sport England, Active Lives Adult Survey, Levels of activity workbook, Table 1b (trends by gender). Linked from ${PAGE}`,
  licence: "Published openly by Sport England, a public body. The workbook does not state a licence: credit Sport England, Active Lives Adult Survey.",
  note: "England only, adults aged 16 and over. Each survey year runs mid November to mid November and is keyed by the year it ends, so 2020 is November 2019 to November 2020. Active is 150 or more minutes of sport or physical activity a week, fairly active 30 to 149, inactive under 30. Walking, cycling for travel, dance, fitness and gardening all count, so this is being active, not only playing sport. Survey estimates with a margin of error of about half a percentage point.",
  fetched: new Date().toISOString().slice(0, 10),
  series,
});
