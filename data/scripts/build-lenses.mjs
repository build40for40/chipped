#!/usr/bin/env node
// Boils data/parts/ down to the few numbers the seven lens charts draw, and writes src/lenses/data.json.
// Nothing is fetched here and nothing is invented: every value is read from a part, or is a sum, ratio,
// index or correlation of values read from a part. data/LENSES.md says what each part is and where it falls short.
// Run: node data/scripts/build-lenses.mjs   (after any fetch script has refreshed a part)
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const part = async (name) => JSON.parse(await readFile(join(root, "parts", `${name}.json`), "utf8"));
const round = (x, d = 2) => Number(x.toFixed(d));

function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let c = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) {
    c += (a[i] - ma) * (b[i] - mb);
    va += (a[i] - ma) ** 2;
    vb += (b[i] - mb) ** 2;
  }
  return c / Math.sqrt(va * vb);
}
const diff = (a) => a.slice(1).map((v, i) => v - a[i]);

const abs = (await part("uk-selfcare-business")).series;
const nomis = await part("uk-nomis");
const births = (await part("births-marriage-management")).series;
const trade = (await part("uk-nail-trade")).series;
const sport = (await part("england-women-sport")).series;
const covid = (await part("covid-by-country")).countries;
const views = (await part("lens-pageviews")).byLanguage;
const imports = (await part("nail-imports-by-country")).countries;
const eating = (await part("eating-styles")).countries;
const protests = (await part("us-protests")).series;
const salons = JSON.parse(await readFile(join(root, "..", "research", "samples", "bls-ces-nail-vs-hair-salons-1990-2026.json"), "utf8"));

// The ONS redrew its job groups in 2021. Use the old grouping up to 2020 and the new one from 2021.
const spliced = (stem, suffix = "") => ({ ...nomis.series[`${stem}_soc2010${suffix}`].annual, ...nomis.series[`${stem}_soc2020${suffix}`].annual });

// Pairs up two yearly series over the years both have.
function paired(xs, ys) {
  return Object.keys(xs).filter((y) => ys[y] != null).sort().map((y) => ({ year: Number(y), x: xs[y], y: ys[y] }));
}

// Lens 1. UK hair and beauty turnover against three "pride" measures.
const turnover = abs.sic9602_turnover_million_gbp.annual;
const pride = [
  { key: "births", title: "Births per 1,000 people", yName: "Births per 1,000", points: paired(turnover, births.birth_rate_GBR.annual) },
  { key: "managers", title: "Women's share of manager jobs", yName: "Women managers", unit: "%", points: paired(turnover, spliced("women_share_group1", "_pct")) },
  { key: "marriages", title: "Marriages per 1,000 people", yName: "Marriages per 1,000", points: paired(turnover, births.marriage_rate_GBR.annual) },
];

// Lens 2. Three yearly series over the years all three have, each set to 100 in the first of them.
const lines = [
  ["Nail polish imports", trade.imports_gbp.annual],
  ["Women in manual jobs", spliced("women_manual")],
  ["Women who are active", sport.women_active_pct.annual],
];
const workYears = Object.keys(lines[0][1]).filter((y) => lines.every(([, s]) => s[y] != null)).sort();
const work = {
  years: workYears.map(Number),
  series: lines.map(([name, s]) => ({ name, values: workYears.map((y) => round((s[y] / s[workYears[0]]) * 100, 1)), first: s[workYears[0]], last: s[workYears.at(-1)] })),
};

// Lens 3. No polish data exists. This is who a poll would have to reach: women's share of jobs in each UK industry.
const SHORT = {
  A: "Farming and fishing", B: "Mining", C: "Manufacturing", D: "Energy", E: "Water and waste", F: "Construction",
  G: "Shops and wholesale", H: "Transport and storage", I: "Hotels and restaurants", J: "Information and communication",
  K: "Finance and insurance", L: "Property", M: "Professional and scientific", N: "Admin and support",
  O: "Public administration", P: "Education", Q: "Health and social work", R: "Arts and recreation", S: "Other services",
};
const industryYear = Object.keys(nomis.industries[0].women_share_pct).sort().at(-1);
const industry = {
  year: Number(industryYear),
  average: round(nomis.industries.find((i) => i.section === "TOTAL").women_share_pct[industryYear], 1),
  rows: nomis.industries
    .filter((i) => SHORT[i.section])
    .map((i) => ({ name: SHORT[i.section], share: round(i.women_share_pct[industryYear], 1), jobs: i.women_jobs[industryYear] }))
    .sort((a, b) => b.share - a.share),
};

// Lens 4. Lockdown strictness in 2020 against the change in Wikipedia views of home and outdoor hobbies, 2019 to 2020.
// Only hobbies with views in both years count. Turkey is left out: Wikipedia was blocked there for most of 2019.
const strictness = new Map(covid.map((c) => [c.iso3, c.stringency_mean_2020]));
const hobbies = views
  .filter((row) => !row.caveat && strictness.get(row.iso3) != null)
  .map((row) => {
    const change = (kind) => {
      const both = Object.values(row.hobbies).filter((h) => h.kind === kind && h.views_2019 && h.views_2020);
      const before = both.reduce((s, h) => s + h.views_2019, 0);
      const after = both.reduce((s, h) => s + h.views_2020, 0);
      return both.length ? round((after / before - 1) * 100, 1) : null;
    };
    return { country: row.country, shared: Boolean(row.shared), strict: round(strictness.get(row.iso3), 1), home: change("home"), outdoor: change("outdoor") };
  })
  .filter((r) => r.home != null && r.outdoor != null);

// Lens 5. Polish imports per woman in the latest year, for the countries we could give an eating style.
const importYear = "2023";
const perWoman = new Map(imports.map((c) => [c.iso3, c.imports_usd_per_woman?.[importYear]]));
const hands = {
  year: Number(importYear),
  rows: eating
    .filter((c) => perWoman.get(c.iso3) != null)
    .map((c) => ({ group: `Mostly ${c.style}`, country: c.country, value: round(perWoman.get(c.iso3), 2) })),
};

// Lens 6. UK hair and beauty against spas and massage, and against gyms, on three money measures.
const MEASURES = [["turnover_million_gbp", "turnover"], ["employment_costs_million_gbp", "wage bill"], ["gva_million_gbp", "value added"]];
const OTHERS = [["sic9604", "Spas and massage"], ["sic9313", "Gyms"]];
const selfcare = OTHERS.flatMap(([code, label]) =>
  MEASURES.map(([measure, word]) => {
    const pts = paired(abs[`sic9602_${measure}`].annual, abs[`${code}_${measure}`].annual);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return { name: `${label}, ${word}`, raw: round(pearson(xs, ys), 3), yearOnYear: round(pearson(diff(xs), diff(ys)), 3), from: pts[0].year, to: pts.at(-1).year };
  }),
);

// Lens 7. The six biggest months of protest about women's issues, at least six months apart, leaving out any whose
// window touches the lockdown collapse in salon jobs (March 2020 to December 2021). For each, take nail salon job
// growth over the year minus hair salon job growth over the year (so a general boom or slump cancels out), from three
// months before to six months after, measured against the average of the three months before.
const monthAdd = (ym, k) => {
  const [y, m] = ym.split("-").map(Number);
  const t = y * 12 + (m - 1) + k;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
};
const nail = salons.CEU8081211301;
const hair = salons.CEU8081211201;
const growth = (s, ym) => (s[ym] / s[monthAdd(ym, -12)] - 1) * 100;
const edge = (ym) => growth(nail, ym) - growth(hair, ym);
const OFFSETS = Array.from({ length: 10 }, (_, i) => i - 3);
const inCollapse = (ym) => ym >= "2020-03" && ym <= "2021-12";
const chosen = [];
for (const [ym] of Object.entries(protests.people_women.monthly).sort((a, b) => b[1] - a[1])) {
  if (chosen.length === 6) break;
  const window = OFFSETS.map((k) => monthAdd(ym, k));
  if (window.some(inCollapse) || window.some((m) => nail[m] == null || nail[monthAdd(m, -12)] == null)) continue;
  const idx = (m) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5));
  if (chosen.some((c) => Math.abs(idx(c) - idx(ym)) < 6)) continue;
  chosen.push(ym);
}
const tracks = chosen.map((ym) => {
  const base = [-3, -2, -1].reduce((s, k) => s + edge(monthAdd(ym, k)), 0) / 3;
  return OFFSETS.map((k) => edge(monthAdd(ym, k)) - base);
});
const protest = {
  events: chosen.map((ym) => ({ month: ym, people: Math.round(protests.people_women.monthly[ym]) })),
  rows: OFFSETS.map((k, i) => {
    const at = tracks.map((t) => t[i]);
    return { month: k, mean: round(at.reduce((s, v) => s + v, 0) / at.length), low: round(Math.min(...at)), high: round(Math.max(...at)) };
  }),
};

// Lens 8. The manicure index: the middle shop price of a basic manicure in the UK, the same in today's money,
// and how many minutes a woman on the middle hourly wage works to pay for one.
const quotes = await part("uk-manicure-prices");
const afford = (await part("uk-manicure-affordability")).series;
const minuteYears = Object.keys(afford.manicure_minutes_of_work.annual).sort();
const priceYears = Object.keys(quotes.series.manicure_median_gbp.annual).filter((y) => afford.manicure_real_gbp.annual[y] != null).sort();
const manicure = {
  minutes: { years: minuteYears.map(Number), values: minuteYears.map((y) => round(afford.manicure_minutes_of_work.annual[y], 1)) },
  price: {
    years: priceYears.map(Number),
    sticker: priceYears.map((y) => round(quotes.series.manicure_median_gbp.annual[y])),
    real: priceYears.map((y) => round(afford.manicure_real_gbp.annual[y])),
  },
  pay: { first: afford.women_median_hourly_pay_gbp.annual[minuteYears[0]], last: afford.women_median_hourly_pay_gbp.annual[minuteYears.at(-1)] },
  regions: { year: Number(quotes.manicure_by_region.year), rows: quotes.manicure_by_region.regions.map((r) => ({ name: r.region, price: r.median_gbp, quotes: r.quotes })) },
};

const out = { pride, work, industry, hobbies, hands, selfcare, protest, manicure };
await writeFile(join(root, "..", "src", "lenses", "data.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`pride: ${pride.map((p) => `${p.key} ${p.points[0].year}-${p.points.at(-1).year}`).join(", ")}`);
console.log(`work: ${work.years[0]}-${work.years.at(-1)}; industry: ${industry.rows.length} rows, ${industry.year}; hobbies: ${hobbies.length} countries`);
console.log(`hands: ${hands.rows.length} countries; selfcare: ${selfcare.map((r) => `${r.name} ${r.raw}/${r.yearOnYear}`).join("; ")}`);
console.log(`manicure: minutes ${manicure.minutes.years[0]}:${manicure.minutes.values[0]} to ${manicure.minutes.years.at(-1)}:${manicure.minutes.values.at(-1)}; price ${manicure.price.years[0]} to ${manicure.price.years.at(-1)}`);
console.log(`protest events: ${chosen.join(", ")}; mean by month: ${protest.rows.map((r) => `${r.month}:${r.mean}`).join(" ")}`);
