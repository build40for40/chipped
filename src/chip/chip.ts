// The chip in your day. Every nail is one working day, tip to cuticle. The bare chipped tip is the part of
// that day a woman on typical pay works to pay for one basic manicure. Draws an SVG string at the width given.
// Colours are CSS variables: the page's own tokens from styles/base.css, plus the --chip-* ones set in ChipDay.vue.
// The nails are long coffin shapes in glossy black with a gold band, after the team's nail inspiration.

/** The working day every nail stands for, in minutes. Fixed everywhere, and printed on the chart. */
export const DAY = 480

export interface Row {
  label: string
  minutes: number
  kind: 'year' | 'latest' | 'you'
}

const esc = (s: string | number) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

export function clock(minutes: number) {
  const m = Math.round(minutes)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}`
}
export const share = (minutes: number) => `${Math.round((minutes / DAY) * 100)}%`

const DEFS = `<defs>${(['year', 'latest', 'you'] as const)
  .map(
    (k) =>
      `<linearGradient id="chip-${k}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" style="stop-color:var(--chip-${k}-deep)"/><stop offset=".38" style="stop-color:var(--chip-${k})"/><stop offset=".7" style="stop-color:var(--chip-${k})"/><stop offset="1" style="stop-color:var(--chip-${k}-deep)"/></linearGradient>`,
  )
  .join('')}</defs>`

// A coffin nail: wide at the cuticle, tapering to a flat tip. TAPER is the tip's width as a share of the base.
// The chip is measured by depth from the tip, so the number is carried by length, as on a bar.
const TAPER = 0.62
const halfWidth = (r: number, len: number, up: number) => r - r * (1 - TAPER) * (up / len)

function plate(cx: number, base: number, len: number, r: number) {
  const top = base - len
  const rt = r * TAPER
  const k = rt * 0.3
  const lift = halfWidth(r, len, len - k)
  return `M${cx - r},${base} L${cx - lift},${top + k} Q${cx - rt},${top} ${cx - rt + k},${top} L${cx + rt - k},${top} Q${cx + rt},${top} ${cx + lift},${top + k} L${cx + r},${base} Q${cx},${base + r * 0.5} ${cx - r},${base} Z`
}

const JAG = [0, -1, 0.6, -0.8, 1, -0.5, 0.3, 0]

function nail(cx: number, base: number, len: number, w: number, chip: number, kind: Row['kind'], tip: string) {
  const r = w / 2
  const edge = base - len + chip
  const kept = base - edge
  const at = halfWidth(r, len, kept)
  const amp = Math.min(4, r * 0.16)
  const jag = JAG.map((j, i) => `${(cx - at + (2 * at * i) / (JAG.length - 1)).toFixed(1)},${(edge + j * amp).toFixed(1)}`)
  const paint = `M${cx - r},${base} L${jag.join(' L')} L${cx + r},${base} Q${cx},${base + r * 0.5} ${cx - r},${base} Z`
  // The gold band sits a little above the cuticle, like a ring.
  const band = Math.min(10, kept * 0.3)
  const bandHalf = halfWidth(r, len, band)
  return (
    `<g class="nail" tabindex="0" data-tip="${esc(tip)}"><path class="edge" d="${plate(cx, base, len, r)}" fill="var(--chip-bare)" stroke="var(--chrome)" stroke-width="1"/>` +
    `<path d="${paint}" fill="url(#chip-${kind})"/>` +
    `<path d="M${(cx - r * 0.5).toFixed(1)},${base - kept * 0.2} L${(cx - halfWidth(r, len, kept * 0.86) * 0.5).toFixed(1)},${base - kept * 0.86}" fill="none" stroke="#fff" stroke-width="${Math.max(1.8, w * 0.09)}" stroke-linecap="round" opacity="${kind === 'year' ? 0.45 : 0.6}"/>` +
    `<line x1="${(cx - bandHalf).toFixed(1)}" x2="${(cx + bandHalf).toFixed(1)}" y1="${base - band}" y2="${base - band}" stroke="var(--gold)" stroke-width="3"/></g>`
  )
}

/** On a phone there is room for about seven nails, so keep the first, the last and an even spread between. */
export function thin(rows: Row[], room: number) {
  const fixed = rows.filter((r) => r.kind === 'year' || r.kind === 'latest')
  const you = rows.filter((r) => r.kind === 'you')
  const want = room - you.length
  if (fixed.length <= want) return rows
  const stride = Math.ceil((fixed.length - 1) / (want - 1))
  const last = fixed.length - 1
  return [...fixed.filter((_, i) => i === last || (i % stride === 0 && last - i >= stride / 2)), ...you]
}

/**
 * @param rows one nail each, in the order to draw them
 * @param reference minutes for the dashed guide across the chart (the first year's chip), with its label
 */
export function drawChips(w: number, all: Row[], reference: { minutes: number; label: string }) {
  const wide = w > 560
  const rows = wide ? all : thin(all, 7)
  const m = { l: wide ? 50 : 40, r: 8, t: 40, b: 44 }
  const H = wide ? 270 : 210
  const h = m.t + H + m.b
  const base = m.t + H
  const top = m.t
  const step = (w - m.l - m.r) / rows.length
  const nw = Math.min(58, step * 0.66)
  const px = (minutes: number) => (minutes / DAY) * H
  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(`A row of nails. Each nail is an eight hour working day and the bare chipped tip is the time needed to pay for a manicure: ${rows.map((r) => `${r.label} ${clock(r.minutes)}`).join(', ')}`)}">${DEFS}`
  // Hours down from the tip, so the depth of a chip can be read off.
  for (const t of [0, 60, 120, 180]) {
    s += `<line x1="${m.l}" x2="${w - m.r}" y1="${top + px(t)}" y2="${top + px(t)}" stroke="var(--rule)" stroke-dasharray="1 6" stroke-linecap="round"/><text x="${m.l - 8}" y="${top + px(t) + 4}" text-anchor="end">${t ? `${t / 60} hr${t > 60 ? 's' : ''}` : '0'}</text>`
  }
  s += `<text x="${m.l - 8}" y="${base + 4}" text-anchor="end">8 hrs</text><text x="${m.l}" y="12">minutes chipped off</text>`
  s += `<path d="M${m.l - 6},${base + 3} C${m.l + 30},${base - 5} ${w - m.r - 40},${base - 4} ${w - m.r + 2},${base + 4} C${w - m.r + 6},${base + 20} ${m.l + 40},${base + 24} ${m.l - 6},${base + 14} Z" fill="var(--rule)"/>`
  rows.forEach((r, i) => {
    const cx = m.l + step * (i + 0.5)
    const change = Math.round(r.minutes) - Math.round(reference.minutes)
    const versus = r.kind === 'you' ? 'Your own numbers' : change === 0 ? `The ${reference.label} level` : `${Math.abs(change)} minutes ${change < 0 ? 'less' : 'more'} than ${reference.label}`
    s += nail(cx, base, H, nw, px(r.minutes), r.kind, `${r.label}\n${clock(r.minutes)} chipped off, ${share(r.minutes)} of the day\n${versus}`)
    s += `<text class="strong${r.kind === 'latest' ? ' hot' : ''}" x="${cx}" y="${top - 10}" text-anchor="middle">${Math.round(r.minutes)}</text>`
    s += `<text x="${cx}" y="${h - 12}" text-anchor="middle">${esc(r.label)}</text>`
  })
  // Where the chip reached in the first year, drawn across every nail.
  const ry = top + px(reference.minutes)
  s += `<line x1="${m.l}" x2="${w - m.r}" y1="${ry}" y2="${ry}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 4"/>`
  return `${s}</svg>`
}
