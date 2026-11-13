// Polish stripes: UK nail product imports by month, as an SVG band of coloured stripes.
import { data } from './draw'

const raw = (data as unknown as { stripes: { monthly: Record<string, number>; annual: Record<string, number> } }).stripes

// The same colours as --nude, --lacquer and --lacquer-deep in src/styles/base.css.
const NUDE = [239, 207, 195]
const LACQUER = [201, 64, 91]
const DEEP = [140, 37, 57]

// t from 0 (quietest month) to 1 (busiest): nude to lacquer for the first 60%, then lacquer to deep.
export function colour(t: number): string {
  const [a, b, u] = t < 0.6 ? [NUDE, LACQUER, t / 0.6] : [LACQUER, DEEP, (t - 0.6) / 0.4]
  return `rgb(${a.map((x, i) => Math.round(x + (b[i]! - x) * u)).join(',')})`
}

export function stripesSvg(months: [string, number][]): string {
  const sorted = months.map((m) => m[1]).sort((x, y) => x - y)
  const rank = (v: number) => sorted.indexOf(v) / (sorted.length - 1)
  const n = months.length
  let out = ''
  months.forEach(([, v], i) => {
    // Each stripe is a hair wider than its slot so no gaps show when the band is scaled.
    out += `<rect x="${i}" y="0" width="1.06" height="100" fill="${colour(rank(v))}"/>`
  })
  const lockdown = months.findIndex((m) => m[0] === '2020-03')
  if (lockdown >= 0) out += `<rect x="${lockdown}" y="0" width="0.35" height="100" fill="#fff" opacity="0.9"/>`
  out += `<defs><linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".22" stop-color="#fff" stop-opacity="0"/><stop offset=".85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient></defs>`
  out += `<rect x="0" y="0" width="${n}" height="100" fill="url(#gloss)"/>`
  return `<svg viewBox="0 0 ${n} 100" preserveAspectRatio="none" role="img" aria-label="UK nail product imports by month from ${months[0]![0]} to ${months[n - 1]![0]}, as coloured stripes. A white line marks the first lockdown in March 2020.">${out}</svg>`
}

export function stripes() {
  const months = Object.entries(raw.monthly).sort(([a], [b]) => a.localeCompare(b))
  const annual = Object.entries(raw.annual).sort(([a], [b]) => a.localeCompare(b))
  const m = (v: number) => Math.round(v / 1e6)
  const [firstYear, first] = annual[0]!
  const [peakYear, peak] = annual.reduce((best, cur) => (cur[1] > best[1] ? cur : best))
  const recent = annual.filter(([y]) => y >= '2021')
  const n = months.length
  // 2025 sits too near the right edge to label on a phone.
  const ticks = ['2005', '2010', '2015', '2020']
    .map((year) => ({ year, i: months.findIndex(([k]) => k === `${year}-01`) }))
    .filter((t) => t.i >= 0)
    .map((t) => ({ year: t.year, at: t.i / n }))
  return {
    months: months as [string, number][],
    ticks,
    firstYear,
    firstTotal: m(first),
    peakYear,
    peakTotal: m(peak),
    recentFrom: recent[0]?.[0] ?? '2021',
    recentTotal: m(recent.reduce((s, [, v]) => s + v, 0) / Math.max(1, recent.length)),
  }
}
