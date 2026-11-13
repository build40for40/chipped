// Draws the exhibits as SVG strings. Colours come from CSS variables in src/styles/base.css,
// so they are set with style="fill:var(--x)" (presentation attributes don't read variables).
import raw from './data.json'

export type Icon = 'chair' | 'bottle' | 'bag' | 'chip' | 'nail'
export interface PriceItem {
  key: string
  label: string
  source: string
  points: [number, number][]
  nominal?: Record<string, number>
}

export const data = raw as unknown as {
  prices: { note: string; items: PriceItem[] }
  er: { from: number; to: number; manicure: number; nailGun: number; caveat: string }
}

export const ICONS: Record<string, Icon> = {
  salon: 'chair',
  polish: 'bottle',
  'potato-chips': 'bag',
  microchips: 'chip',
  computers: 'chip',
  'steel-nails': 'nail',
  'iron-nails': 'nail',
}

export const last = <T>(a: T[]): T => a[a.length - 1]!

const f = (n: number) => Number(n.toFixed(1))
const fill = (v: string) => `style="fill:var(--${v})"`

// One object standing on a baseline at cx, scaled by s (1 = full height).
export function icon(kind: Icon, cx: number, base: number, s: number): string {
  const H = 190 * s
  const W = H * 0.62
  switch (kind) {
    case 'nail': {
      const w = 30 * s
      const top = base - 200 * s
      return `<rect x="${f(cx - w * 1.6)}" y="${f(top)}" width="${f(w * 3.2)}" height="${f(Math.max(3, w * 0.45))}" rx="2" ${fill('chrome')}/>` +
        `<path d="M${f(cx - w / 2)} ${f(top + w * 0.45)} L${f(cx + w / 2)} ${f(top + w * 0.45)} L${f(cx + w / 2)} ${f(base - w * 1.2)} L${f(cx)} ${f(base)} L${f(cx - w / 2)} ${f(base - w * 1.2)} Z" ${fill('chrome')}/>`
    }
    case 'bag': {
      const t = base - H
      const zig = Array.from({ length: 9 }, (_, i) => `L${f(cx - W / 2 + (i * W) / 8)} ${f(t + (i % 2 ? 6 * s + 2 : 0))}`).join(' ')
      const r = 14 * s
      return `<path d="M${f(cx - W / 2)} ${f(t)} ${zig} L${f(cx + W / 2)} ${f(base - r)} Q${f(cx + W / 2)} ${f(base)} ${f(cx + W / 2 - r)} ${f(base)} L${f(cx - W / 2 + r)} ${f(base)} Q${f(cx - W / 2)} ${f(base)} ${f(cx - W / 2)} ${f(base - r)} Z" ${fill('gold')}/>` +
        `<ellipse cx="${f(cx)}" cy="${f(base - H * 0.48)}" rx="${f(W * 0.3)}" ry="${f(H * 0.16)}" ${fill('card')}/>`
    }
    case 'bottle': {
      const bw = W * 0.95
      const bh = H * 0.66
      const cw = bw * 0.34
      return `<rect x="${f(cx - cw / 2)}" y="${f(base - H)}" width="${f(cw)}" height="${f(H * 0.36)}" rx="${f(3 * s + 1)}" ${fill('ink')}/>` +
        `<rect x="${f(cx - bw / 2)}" y="${f(base - bh)}" width="${f(bw)}" height="${f(bh)}" rx="${f(bw * 0.22)}" ${fill('lacquer')}/>` +
        `<rect x="${f(cx - bw * 0.32)}" y="${f(base - bh * 0.86)}" width="${f(bw * 0.12)}" height="${f(bh * 0.55)}" rx="${f(bw * 0.06)}" style="fill:#fff;opacity:.35"/>`
    }
    case 'chair': {
      const w = W * 1.05
      return `<rect x="${f(cx - w * 0.42)}" y="${f(base - H)}" width="${f(w * 0.84)}" height="${f(H * 0.42)}" rx="${f(w * 0.2)}" ${fill('lacquer')}/>` +
        `<rect x="${f(cx - w / 2)}" y="${f(base - H * 0.6)}" width="${f(w)}" height="${f(H * 0.18)}" rx="${f(H * 0.06)}" ${fill('lacquer')}/>` +
        `<rect x="${f(cx - w * 0.05)}" y="${f(base - H * 0.42)}" width="${f(w * 0.1)}" height="${f(H * 0.34)}" ${fill('chrome')}/>` +
        `<ellipse cx="${f(cx)}" cy="${f(base - H * 0.05)}" rx="${f(w * 0.42)}" ry="${f(H * 0.06)}" ${fill('chrome')}/>`
    }
    case 'chip': {
      const w = H * 0.8
      const y0 = base - w
      let pins = ''
      for (let i = 0; i < 5; i++) pins += `<rect x="${f(cx - w * 0.6)}" y="${f(y0 + w * (0.14 + i * 0.18))}" width="${f(w * 1.2)}" height="${f(Math.max(1, w * 0.06))}" ${fill('chrome')}/>`
      return pins + `<rect x="${f(cx - w / 2)}" y="${f(y0)}" width="${f(w)}" height="${f(w)}" rx="${f(w * 0.08)}" ${fill('ink')}/>` +
        `<rect x="${f(cx - w * 0.25)}" y="${f(y0 + w * 0.25)}" width="${f(w * 0.5)}" height="${f(w * 0.5)}" rx="${f(w * 0.04)}" ${fill('gold')}/>`
    }
  }
}

// Up to six points spread evenly from first to last.
export function pick<T>(points: T[], n = 6): T[] {
  if (points.length <= n) return points
  return Array.from({ length: n }, (_, i) => points[Math.round((i * (points.length - 1)) / (n - 1))]!)
}

// The chosen thing drawn at several years, each object's area in proportion to its real price.
export function objectsSvg(item: PriceItem, todayPrice?: number): string {
  const shown = pick(item.points)
  const maxV = Math.max(...shown.map((p) => p[1]))
  const W = 900
  const base = 220
  const bw = W / shown.length
  const kind = ICONS[item.key] ?? 'nail'
  let out = ''
  shown.forEach(([year, v], i) => {
    const cx = bw * i + bw / 2
    out += icon(kind, cx, base, Math.sqrt(v / maxV))
    out += `<text x="${f(cx)}" y="${base + 22}" text-anchor="middle" class="strong">${year}</text>`
    const label = todayPrice !== undefined ? `$${((todayPrice * v) / 100).toFixed(2)} today` : `index ${Math.round(v)}`
    out += `<text x="${f(cx)}" y="${base + 40}" text-anchor="middle">${label}</text>`
  })
  return `<svg viewBox="0 0 ${W} 270" role="img" aria-label="${item.label} drawn at its inflation-adjusted price">${out}</svg>`
}

// Every price series on one log scale, first year = 100, with the chosen one in red.
export function linesSvg(items: PriceItem[], current: string): string {
  const W = 900
  const H = 210
  const right = W - 170
  const x = (yr: number) => 40 + ((yr - 1965) * (right - 40)) / (2025 - 1965)
  const hi = Math.log10(400)
  const y = (v: number) => 10 + (1 - Math.log10(Math.max(v, 1)) / hi) * (H - 20)
  let out = ''
  for (const t of [1, 10, 100, 300]) {
    out += `<line x1="40" x2="${right}" y1="${f(y(t))}" y2="${f(y(t))}" style="stroke:var(--rule)"/>`
    out += `<text x="34" y="${f(y(t) + 4)}" text-anchor="end">${t}</text>`
  }
  for (const yr of [1970, 1980, 1990, 2000, 2010, 2020]) out += `<text x="${f(x(yr))}" y="${H + 14}" text-anchor="middle">${yr}</text>`
  const shown = items.filter((it) => it.points[0]![0] >= 1900)
  // Draw the chosen line last so it sits on top.
  for (const it of [...shown.filter((i) => i.key !== current), ...shown.filter((i) => i.key === current)]) {
    const on = it.key === current
    out += `<polyline points="${it.points.map(([yr, v]) => `${f(x(yr))},${f(y(v))}`).join(' ')}" fill="none" style="stroke:var(--${on ? 'lacquer' : 'chrome'});stroke-width:${on ? 3 : 1.4}" stroke-linecap="round"/>`
  }
  // Labels sit in the right margin, nudged apart so none overlap, with a short leader to their line's end.
  const labels = shown.map((it) => ({ it, end: y(last(it.points)[1]), at: y(last(it.points)[1]) })).sort((a, b) => a.end - b.end)
  for (let i = 1; i < labels.length; i++) labels[i]!.at = Math.max(labels[i]!.at, labels[i - 1]!.at + 15)
  for (const l of labels) {
    const on = l.it.key === current
    out += `<line x1="${right + 4}" x2="${right + 14}" y1="${f(l.end)}" y2="${f(l.at)}" style="stroke:var(--rule)"/>`
    out += `<text x="${right + 18}" y="${f(l.at + 4)}"${on ? ' class="hot"' : ''}>${l.it.label.replace(' & beauty products', '')}</text>`
  }
  return `<svg viewBox="0 0 ${W} ${H + 20}" role="img" aria-label="Inflation-adjusted price of each thing, first year = 100, log scale">${out}</svg>`
}

// Two waiting rooms, one chair per 250 ER visits a year.
export function erSvg(er: { manicure: number; nailGun: number }, perChair = 250): string {
  const rooms: [string, number, string][] = [
    ['Manicures and nail products', er.manicure, 'lacquer'],
    ['Nail guns', er.nailGun, 'chrome'],
  ]
  let out = ''
  rooms.forEach(([label, n, colour], r) => {
    const chairs = Math.round(n / perChair)
    const y0 = 20 + r * 125
    out += `<text x="0" y="${y0}" class="strong">${label} · ${n.toLocaleString('en-GB')} a year</text>`
    for (let i = 0; i < chairs; i++) {
      const cx = (i % 25) * 24
      const cy = y0 + 12 + Math.floor(i / 25) * 36
      out += `<g ${fill(colour)}><rect x="${cx + 3}" y="${cy + 2}" width="14" height="16" rx="5"/><rect x="${cx + 1}" y="${cy + 16}" width="18" height="6" rx="3"/><rect x="${cx + 3}" y="${cy + 22}" width="2" height="6"/><rect x="${cx + 15}" y="${cy + 22}" width="2" height="6"/></g>`
    }
  })
  return `<svg viewBox="0 0 600 260" role="img" aria-label="ER visits a year: ${er.manicure} from manicures and nail products, ${er.nailGun} from nail guns">${out}</svg>`
}

// Real change from the first point to the last, as a signed percentage.
export function change(item: PriceItem): number {
  return last(item.points)[1] / item.points[0]![1] * 100 - 100
}
