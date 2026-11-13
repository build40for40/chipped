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
      const w = H * 0.7
      const y0 = base - w
      let pins = ''
      for (let i = 0; i < 5; i++) pins += `<rect class="pin" x="${f(cx - w * 0.6)}" y="${f(y0 + w * (0.14 + i * 0.18))}" width="${f(w * 1.2)}" height="${f(Math.max(1, w * 0.06))}" ${fill('chrome')}/>`
      return pins + `<rect x="${f(cx - w / 2)}" y="${f(y0)}" width="${f(w)}" height="${f(w)}" rx="${f(w * 0.08)}" ${fill('ink')}/>` +
        `<rect x="${f(cx - w * 0.25)}" y="${f(y0 + w * 0.25)}" width="${f(w * 0.5)}" height="${f(w * 0.5)}" rx="${f(w * 0.04)}" ${fill('gold')}/>`
    }
  }
}

// Up to n points spread evenly from first to last.
export function pick<T>(points: T[], n = 6): T[] {
  if (points.length <= n) return points
  return Array.from({ length: n }, (_, i) => points[Math.round((i * (points.length - 1)) / (n - 1))]!)
}

// The chosen thing drawn at several years, each object's area in proportion to its real price.
// Over every later object sits a dashed ghost of the first one, so growth or shrinkage reads at a glance.
export function objectsSvg(item: PriceItem, todayPrice?: number, n = 6): string {
  const shown = pick(item.points, n)
  const maxV = Math.max(...shown.map((p) => p[1]))
  const W = 150 * shown.length
  const base = 206
  const bw = W / shown.length
  const kind = ICONS[item.key] ?? 'nail'
  const v0 = shown[0]![1]
  let out = `<line x1="0" x2="${W}" y1="${base + 1}" y2="${base + 1}" style="stroke:var(--rule);stroke-width:2"/>`
  shown.forEach(([year, v], i) => {
    const cx = bw * i + bw / 2
    out += icon(kind, cx, base, Math.sqrt(v / maxV))
    if (i > 0) out += `<g class="ghost">${icon(kind, cx, base, Math.sqrt(v0 / maxV))}</g>`
    out += `<text x="${f(cx)}" y="${base + 24}" text-anchor="middle" class="strong">${year}</text>`
    const d = (v / v0) * 100 - 100
    const label = todayPrice !== undefined ? `$${((todayPrice * v) / 100).toFixed(2)} today` : i === 0 ? 'the start' : signed(d)
    const cls = todayPrice !== undefined || i === 0 ? '' : ` class="big ${d >= 0 ? 'hot' : 'cool'}"`
    out += `<text x="${f(cx)}" y="${base + 46}" text-anchor="middle"${cls}>${label}</text>`
  })
  return `<svg viewBox="0 0 ${W} ${base + 56}" role="img" aria-label="${item.label} drawn at its inflation-adjusted price">${out}</svg>`
}

// +108%, −2.5%: one decimal under 10 so small moves don't round away.
export function signed(n: number): string {
  return `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(Math.abs(n) < 10 ? 1 : 0)}%`
}

// Where a real change sits on the dearer-or-cheaper bars: −100% at the left edge, +120% at the right.
export const BAR_MIN = -100
export const BAR_MAX = 120
export function barSpan(pct: number): { left: number; width: number } {
  const at = (p: number) => ((Math.min(Math.max(p, BAR_MIN), BAR_MAX) - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100
  const zero = at(0)
  const end = at(pct)
  return { left: Math.min(zero, end), width: Math.abs(end - zero) }
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
