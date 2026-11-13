// Made-up numbers for the seven lenses, so each chart can be designed before its data exists.
// Seeded, so they are the same on every load. Swap each export for a loader of the real series
// (see the "Data sources needed" card on the day10 board) and the charts follow.

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
}
// Roughly -1..1, bell shaped.
const noise = (r: () => number) => (r() + r() + r() - 1.5) / 1.5

export const YEARS = Array.from({ length: 21 }, (_, i) => 2005 + i)

export const diff = (a: number[]) => a.slice(1).map((v, i) => v - a[i]!)

export function pearson(a: number[], b: number[]) {
  const n = a.length
  const ma = a.reduce((s, v) => s + v, 0) / n
  const mb = b.reduce((s, v) => s + v, 0) / n
  let c = 0
  let va = 0
  let vb = 0
  for (let i = 0; i < n; i++) {
    c += (a[i]! - ma) * (b[i]! - mb)
    va += (a[i]! - ma) ** 2
    vb += (b[i]! - mb) ** 2
  }
  return c / Math.sqrt(va * vb)
}

// Lens 1: salon sales against three "pride" measures, one value per year.
const r1 = rng(40)
const trend = (i: number) => 60 + i * 4.2
export const salon = YEARS.map((y, i) => trend(i) + (y === 2020 ? -22 : y === 2021 ? -8 : 0) + noise(r1) * 5)
export const births = YEARS.map((_, i) => 64 - i * 0.55 - (salon[i]! - trend(i)) * 0.05 + noise(r1) * 1.4)
export const promotions = YEARS.map((_, i) => 31 + i * 0.6 + (salon[i]! - trend(i)) * 0.12 + noise(r1) * 1.6)
export const dates = YEARS.map((_, i) => 90 + i * 1.1 + (salon[i]! - trend(i)) * 1.3 + noise(r1) * 7)

// Lens 2: three yearly series, each rebased so its first year is 100.
const r2 = rng(10)
const rebase = (a: number[]) => a.map((v) => (v / a[0]!) * 100)
export const polish = rebase(YEARS.map((y, i) => 100 + i * 2.4 + (y === 2020 ? 14 : 0) + Math.sin(i / 2.2) * 6 + noise(r2) * 3))
export const manualJobs = rebase(YEARS.map((_, i) => 100 + i * 0.9 - Math.sin(i / 2.2) * 5 + noise(r2) * 2.5))
export const sport = rebase(YEARS.map((y, i) => 100 + i * 1.7 + (y === 2020 ? -12 : 0) + noise(r2) * 3))

// Lens 3: share of women wearing polish at work, by UK industry group (SIC section).
export const INDUSTRY_AVERAGE = 46
export const industries: { name: string; share: number }[] = [
  { name: 'Arts and recreation', share: 71 },
  { name: 'Retail', share: 63 },
  { name: 'Finance and insurance', share: 61 },
  { name: 'Professional and scientific', share: 58 },
  { name: 'Information and communication', share: 55 },
  { name: 'Public administration', share: 52 },
  { name: 'Education', share: 49 },
  { name: 'Accommodation and food', share: 44 },
  { name: 'Manufacturing', share: 31 },
  { name: 'Transport and storage', share: 29 },
  { name: 'Health and social work', share: 27 },
  { name: 'Construction', share: 19 },
  { name: 'Agriculture', share: 17 },
]

// Lens 4: one row per country.
const r4 = rng(4)
export const covid = [
  'UK', 'US', 'India', 'Brazil', 'Japan', 'Sweden', 'Italy', 'Spain', 'France', 'Germany', 'Mexico', 'Nigeria',
  'Kenya', 'Australia', 'Canada', 'South Korea', 'Vietnam', 'Poland', 'Turkey', 'Egypt', 'Argentina', 'Chile', 'Thailand', 'Netherlands',
].map((country) => {
  const strict = country === 'Sweden' ? 38 : country === 'Japan' ? 47 : 45 + r4() * 50
  return { country, strict, home: -5 + strict * 0.85 + noise(r4) * 14, outdoor: 22 - strict * 0.12 + noise(r4) * 16 }
})

// Lens 5: one row per country. The grouping is how most people there eat at home.
const r5 = rng(5)
const EAT: Record<string, { base: number; countries: string[] }> = {
  'Mostly hands': { base: 1.4, countries: ['India', 'Ethiopia', 'Nigeria', 'Pakistan', 'Bangladesh', 'Morocco', 'Indonesia', 'Saudi Arabia'] },
  'Mostly chopsticks': { base: 2.6, countries: ['China', 'Japan', 'South Korea', 'Vietnam', 'Taiwan'] },
  'Mostly cutlery': { base: 3.1, countries: ['UK', 'US', 'France', 'Germany', 'Brazil', 'Italy', 'Spain', 'Australia', 'Poland', 'Sweden'] },
}
export const EAT_GROUPS = Object.keys(EAT)
export const eating = EAT_GROUPS.flatMap((group) =>
  EAT[group]!.countries.map((country) => ({ group, country, bottles: Math.max(0.2, EAT[group]!.base + noise(r5) * 1.3) })),
)

// Lens 6: correlation of each kind of self care with salon sales, raw and on year-on-year changes.
const r6 = rng(6)
const CARE: [name: string, growth: number, wobble: number][] = [
  ['Yoga classes', 0.9, 3],
  ['Pilates', 1.3, 6],
  ['Gym memberships', 0.7, 2],
  ['Massage', 0.5, 9],
  ['Spa visits', 0.6, 4],
]
export const selfCare = CARE.map(([name, growth, wobble]) => {
  const series = YEARS.map((_, i) => 50 + i * 3 * growth + (salon[i]! - trend(i)) * (1.2 - wobble / 12) + noise(r6) * wobble * 2.2)
  return { name, raw: pearson(salon, series), yearOnYear: pearson(diff(salon), diff(series)) }
}).sort((a, b) => b.yearOnYear - a.yearOnYear)

// Lens 7: salon sales against normal, averaged over every protest, by week from the protest.
const r7 = rng(7)
export const protest = Array.from({ length: 17 }, (_, i) => i - 4).map((week) => {
  const bump = week < 0 ? 0 : 7.5 * Math.exp(-((week - 3) ** 2) / 5) - (week === 0 ? 3 : 0)
  const mean = bump + noise(r7) * 0.9
  const spread = 2.2 + (week > 0 ? 1.2 : 0) + r7()
  return { week, mean, low: mean - spread, high: mean + spread }
})
