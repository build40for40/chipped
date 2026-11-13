#!/usr/bin/env node
// Fetches the Crowd Counting Consortium's US protest event data (three files on Harvard Dataverse, about
// 200 MB together, cached in data/raw/) and reduces it to weekly, monthly and yearly counts of events and
// estimated participants, for all protests and for protests tagged "women's rights" or "reproductive rights".
// Writes data/parts/us-protests.json. The source does not record how many protesters were women.
// Run: node data/scripts/fetch-ccc-protests.mjs   (add --fresh to ignore the data/raw/ cache)
import { cached, parseCsv, writePart } from "./lens-lib.mjs";

const DATASETS = [
  ["2017-2020", "doi:10.7910/DVN/6OPP7H"],
  ["2021-2024", "doi:10.7910/DVN/9MMYDI"],
  ["2025-on", "doi:10.7910/DVN/RI9JFU"],
];
const WOMEN = new Set(["women's rights", "reproductive rights"]);
const IDS = ["events_all", "people_all", "events_women", "people_women"];
const buckets = Object.fromEntries(IDS.map((id) => [id, { weekly: {}, monthly: {}, annual: {} }]));
const add = (id, date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  // Weeks start on Monday and are keyed by that Monday's date.
  const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10);
  for (const [grain, key] of [["weekly", monday], ["monthly", date.slice(0, 7)], ["annual", date.slice(0, 4)]])
    buckets[id][grain][key] = (buckets[id][grain][key] ?? 0) + n;
};

let last = "";
for (const [tag, doi] of DATASETS) {
  const meta = JSON.parse((await cached(`ccc-${tag}-meta.json`, `https://dataverse.harvard.edu/api/datasets/:persistentId/?persistentId=${doi}`)).toString("utf8"));
  const file = meta.data.latestVersion.files.find((f) => /\.(tab|csv)$/.test(f.dataFile.filename));
  if (!file) throw new Error(`${doi}: no data file`);
  const buf = await cached(`ccc-${tag}.csv`, `https://dataverse.harvard.edu/api/access/datafile/${file.dataFile.id}?format=original`, { timeout: 900000 });
  const [head, ...rows] = parseCsv(buf.toString("utf8"));
  const iDate = head.indexOf("date");
  const iIssues = head.includes("issues") ? head.indexOf("issues") : head.indexOf("issue_tags");
  const iSize = head.indexOf("size_mean");
  if (iDate < 0 || iIssues < 0 || iSize < 0) throw new Error(`${doi}: columns moved`);
  let n = 0;
  for (const r of rows) {
    const date = r[iDate];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const size = Number(r[iSize]);
    const people = r[iSize] !== "" && r[iSize] !== "NA" && Number.isFinite(size) ? size : 0;
    const women = (r[iIssues] ?? "").split(";").some((t) => WOMEN.has(t.trim()));
    add("events_all", date, 1);
    add("people_all", date, people);
    if (women) {
      add("events_women", date, 1);
      add("people_women", date, people);
    }
    if (date > last) last = date;
    n++;
  }
  console.log(`${tag}: ${n} events`);
}

const sorted = (o) => Object.fromEntries(Object.entries(o).sort().map(([k, v]) => [k, Math.round(v)]));
const series = Object.fromEntries(IDS.map((id) => [id, { weekly: sorted(buckets[id].weekly), monthly: sorted(buckets[id].monthly), annual: sorted(buckets[id].annual) }]));
// Weeks and months with protests but none about women's rights should read 0, not be missing.
for (const grain of ["weekly", "monthly", "annual"])
  for (const k of Object.keys(series.events_all[grain])) for (const id of ["events_women", "people_women"]) series[id][grain][k] ??= 0;
for (const id of ["events_women", "people_women"]) for (const grain of ["weekly", "monthly", "annual"]) series[id][grain] = Object.fromEntries(Object.entries(series[id][grain]).sort());
console.log(`last event ${last}; women's rights events by year`, JSON.stringify(series.events_women.annual));

await writePart("us-protests.json", {
  source: "Crowd Counting Consortium US protest event data, phases 1 to 3 (Harvard Dataverse, doi:10.7910/DVN/6OPP7H, 9MMYDI and RI9JFU).",
  licence: "CC0 1.0, Harvard Dataverse's default, which we could not confirm on the dataset pages. Either way, credit the Crowd Counting Consortium as they ask.",
  note: `United States only, 2017-01-01 to ${last}. events_* count protest events; people_* add up the consortium's size_mean estimate, which is blank for many events, so it undercounts. *_women are events tagged "women's rights" or "reproductive rights": protests about women's issues, not a count of women attending. weekly keys are the Monday that starts the week. The last year, month and week are incomplete.`,
  through: last,
  fetched: new Date().toISOString().slice(0, 10),
  series,
});
