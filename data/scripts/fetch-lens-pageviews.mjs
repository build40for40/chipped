#!/usr/bin/env node
// Fetches Wikipedia pageviews for the lenses and writes data/parts/lens-pageviews.json. Two parts:
//  1. byLanguage: views in 2019 and 2020 of hobby articles in language editions that mostly map to one country
//     (Japanese to Japan, Swedish to Sweden...), as a stand-in for "interest in this hobby in that country".
//     Article titles in each language come from Wikidata sitelinks, so nothing is translated by hand.
//  2. series: English Wikipedia monthly views for self-care and dating topics (yoga, Pilates, Tinder...).
// Wikipedia readers are not the population and a page is not a hobby: this is a stand-in for Google Trends.
// Run: node data/scripts/fetch-lens-pageviews.mjs   (add --fresh to ignore the data/raw/ cache)
import { annualSum, cached, sleep, writePart } from "./lens-lib.mjs";

// Language editions where one country dominates the readership. German and French are spoken in several
// countries, so they are marked shared.
const LANGS = [
  ["ja", "JPN", "Japan"], ["ko", "KOR", "South Korea"], ["it", "ITA", "Italy"], ["sv", "SWE", "Sweden"],
  ["pl", "POL", "Poland"], ["tr", "TUR", "Turkey"], ["nl", "NLD", "Netherlands"], ["fi", "FIN", "Finland"],
  ["da", "DNK", "Denmark"], ["no", "NOR", "Norway"], ["cs", "CZE", "Czechia"], ["hu", "HUN", "Hungary"],
  ["el", "GRC", "Greece"], ["th", "THA", "Thailand"], ["vi", "VNM", "Vietnam"], ["id", "IDN", "Indonesia"],
  ["he", "ISR", "Israel"], ["uk", "UKR", "Ukraine"], ["ro", "ROU", "Romania"], ["bg", "BGR", "Bulgaria"],
  ["hr", "HRV", "Croatia"], ["sk", "SVK", "Slovakia"], ["lt", "LTU", "Lithuania"],
  ["de", "DEU", "Germany", true], ["fr", "FRA", "France", true],
];
// English Wikipedia titles. kind says which side of lens 4 the hobby sits on.
const HOBBIES = [
  ["Nail polish", "home"], ["Manicure", "home"], ["Knitting", "home"], ["Crochet", "home"], ["Baking", "home"],
  ["Sourdough", "home"], ["Jigsaw puzzle", "home"], ["Yoga", "home"], ["Gardening", "home"],
  ["Hiking", "outdoor"], ["Camping", "outdoor"], ["Cycling", "outdoor"], ["Running", "outdoor"],
  ["Jogging", "outdoor"], ["Angling", "outdoor"], ["Surfing", "outdoor"],
];
// English Wikipedia monthly series for lens 1 (dating) and lens 6 (self care).
const EN_SERIES = {
  dating: ["Tinder (app)", "Bumble", "Hinge (app)", "Online dating"],
  selfcare: ["Yoga", "Pilates", "Health club", "Massage", "Spa", "Nail salon", "Manicure", "Pedicure"],
};

const slug = (s) => s.replace(/[^A-Za-z0-9]+/g, "_");
const pv = (project, title, start, end) =>
  `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${project}/all-access/user/${encodeURIComponent(title.replace(/ /g, "_"))}/monthly/${start}00/${end}00`;
async function monthly(project, title, start, end, cacheName) {
  const buf = await cached(cacheName, pv(project, title, start, end));
  if (!buf) return null;
  return Object.fromEntries(JSON.parse(buf.toString("utf8")).items.map((i) => [`${i.timestamp.slice(0, 4)}-${i.timestamp.slice(4, 6)}`, i.views]));
}

// 1. Hobby articles by language.
const wd = JSON.parse(
  (await cached(
    "wikidata-hobby-sitelinks.json",
    `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(HOBBIES.map((h) => h[0]).join("|"))}&props=sitelinks&format=json`,
  )).toString("utf8"),
);
const links = {};
for (const e of Object.values(wd.entities)) if (e.sitelinks?.enwiki) links[e.sitelinks.enwiki.title] = e.sitelinks;
for (const [h] of HOBBIES) if (!links[h]) throw new Error(`no Wikidata item for "${h}"`);

const byLanguage = [];
for (const [lang, iso3, country, shared] of LANGS) {
  const row = { lang, iso3, country, ...(shared ? { shared: true } : {}), hobbies: {} };
  for (const [hobby, kind] of HOBBIES) {
    const title = links[hobby][`${lang}wiki`]?.title;
    if (!title) continue;
    const m = await monthly(`${lang}.wikipedia`, title, "20190101", "20201231", `pv-${lang}-${slug(hobby)}.json`);
    if (!m) continue;
    const year = (y) => {
      const xs = Object.entries(m).filter(([k]) => k.startsWith(y));
      return xs.length === 12 ? xs.reduce((s, [, v]) => s + v, 0) : null;
    };
    row.hobbies[hobby] = { kind, title, views_2019: year("2019"), views_2020: year("2020") };
    await sleep(60);
  }
  // Wikipedia was blocked in Turkey from April 2017 to January 2020, so its 2019 views are near zero.
  if (lang === "tr") row.caveat = "Wikipedia was blocked in Turkey until January 2020, so 2019 is not comparable with 2020. Leave this row out of any 2019 to 2020 change.";
  byLanguage.push(row);
  console.log(`${lang}: ${Object.keys(row.hobbies).length} of ${HOBBIES.length} hobbies`);
}

// 2. English monthly series, Jul 2015 (the start of the data) to last month.
const now = new Date();
const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).toISOString().slice(0, 10).replace(/-/g, "");
const series = {};
for (const [group, titles] of Object.entries(EN_SERIES)) {
  for (const title of titles) {
    const m = await monthly("en.wikipedia", title, "20150701", end, `pv-en-${slug(title)}-${end}.json`);
    if (!m) { console.log(`missing ${title}`); continue; }
    series[title] = { group, monthly: m, annual: annualSum(m) };
    console.log(`en ${title}: ${Object.keys(m).length} months`);
    await sleep(60);
  }
}

await writePart("lens-pageviews.json", {
  source: "Wikimedia REST API pageviews, all access, user agents only. Article titles per language from Wikidata sitelinks.",
  licence: "CC0 (Wikimedia pageview data and Wikidata)",
  note: "A stand-in for interest, not a measure of people doing the hobby. byLanguage[].hobbies[English title] has the local title and total views in 2019 and 2020 (null unless all 12 months exist). kind is home or outdoor. Rows marked shared are languages read in several countries. series[title].monthly is English Wikipedia views per month; annual sums full calendar years.",
  fetched: now.toISOString().slice(0, 10),
  byLanguage,
  series,
});
