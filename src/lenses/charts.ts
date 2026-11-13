// One draw function per plot. Each takes the width it has to fill and returns an SVG string,
// so text stays the same size on a phone and on a desktop. Colours come from CSS variables
// set on .lenses (see Lenses.vue): --c1..--c3 are series colours, the rest are ink and lines.
// Every number comes from ./data.json, which data/scripts/build-lenses.mjs writes from the real series.
import { data, diff, pearson, type Point } from './data'

type Scale = (v: number) => number

const esc = (s: string | number) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const lin = (d0: number, d1: number, p0: number, p1: number): Scale => (v) => p0 + ((v - d0) / (d1 - d0)) * (p1 - p0)
const signed = (v: number, digits = 0) => `${v > 0 ? '+' : ''}${v.toFixed(digits)}`
export const r2 = (v: number) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`

function extent(values: number[], pad = 0.08): [number, number] {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  return [lo - (hi - lo) * pad, hi + (hi - lo) * pad]
}

function ticks(lo: number, hi: number, n: number) {
  let step = 10 ** Math.floor(Math.log10((hi - lo) / n))
  const err = (hi - lo) / n / step
  if (err >= 7.5) step *= 10
  else if (err >= 3.5) step *= 5
  else if (err >= 1.5) step *= 2
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6)
  return out
}

function fit(xs: number[], ys: number[]) {
  const n = xs.length
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  let c = 0
  let vx = 0
  for (let i = 0; i < n; i++) {
    c += (xs[i]! - mx) * (ys[i]! - my)
    vx += (xs[i]! - mx) ** 2
  }
  return { slope: c / vx, intercept: my - (c / vx) * mx }
}

const open = (w: number, h: number, label: string) =>
  `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">`

const gridY = (values: number[], y: Scale, x0: number, x1: number, fmt: (t: number) => string = String) =>
  values.map((t) => `<line x1="${x0}" x2="${x1}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${x0 - 6}" y="${y(t) + 4}" text-anchor="end">${fmt(t)}</text>`).join('')

const ticksX = (values: number[], x: Scale, y0: number) =>
  values.map((t) => `<text x="${x(t)}" y="${y0 + 16}" text-anchor="middle">${t}</text>`).join('')

const dot = (cx: number, cy: number, colour: string, tip: string, r = 5) =>
  `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${colour}" stroke="var(--panel)" stroke-width="2" tabindex="0" data-tip="${esc(tip)}"/>`

const path = (points: [number, number][]) => points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join('')

const COLOURS = ['var(--c1)', 'var(--c2)', 'var(--c3)']

// Lens 1: each dot is a year. The dashed line is the best fit.
function scatter(points: Point[], xName: string, yName: string, unit = '') {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return (w: number) => {
    const h = Math.round(Math.min(260, Math.max(200, w * 0.85)))
    const m = { l: 38, r: 10, t: 26, b: 34 }
    const ex = extent(xs)
    const ey = extent(ys)
    const x = lin(ex[0], ex[1], m.l, w - m.r)
    const y = lin(ey[0], ey[1], h - m.b, m.t)
    const f = fit(xs, ys)
    const r = pearson(xs, ys)
    let s = open(w, h, `${yName} against ${xName}, ${points[0]!.year} to ${points[points.length - 1]!.year}, correlation ${r2(r)}`)
    s += gridY(ticks(ey[0], ey[1], 4), y, m.l, w - m.r) + ticksX(ticks(ex[0], ex[1], 3), x, h - m.b)
    s += `<text x="${w - m.r}" y="${h - 2}" text-anchor="end">${xName} →</text>`
    s += `<line x1="${x(ex[0])}" y1="${y(f.intercept + f.slope * ex[0])}" x2="${x(ex[1])}" y2="${y(f.intercept + f.slope * ex[1])}" stroke="var(--neutral)" stroke-width="2" stroke-dasharray="4 4"/>`
    for (const p of points) s += dot(x(p.x), y(p.y), 'var(--c1)', `${p.year}\n${xName}: ${p.x.toLocaleString('en-GB')}\n${yName}: ${p.y.toFixed(1)}${unit}`, 4.5)
    s += `<text class="strong" x="${m.l}" y="14">r ${r2(r)}</text><text x="${m.l + 62}" y="14">year on year ${r2(pearson(diff(xs), diff(ys)))}</text>`
    return `${s}</svg>`
  }
}

// Lens 2: three series on one axis, each set to 100 in the first year they share.
function indexedLines(w: number) {
  const { years, series } = data.work
  const wide = w > 520
  const h = wide ? 320 : 260
  const m = { l: 38, r: wide ? 160 : 14, t: 12, b: 28 }
  const first = years[0]!
  const last = years[years.length - 1]!
  const ey = extent(series.flatMap((q) => q.values))
  const x = lin(first, last, m.l, w - m.r)
  const y = lin(ey[0], ey[1], h - m.b, m.t)
  let s = open(w, h, `${series.map((q) => q.name).join(', ')}, each set to 100 in ${first}`)
  s += gridY(ticks(ey[0], ey[1], 5), y, m.l, w - m.r) + ticksX(wide ? years.filter((_, i) => i % 3 === 0) : [first, last], x, h - m.b)
  s += `<line x1="${m.l}" x2="${w - m.r}" y1="${y(100)}" y2="${y(100)}" stroke="var(--edge)" stroke-width="1.5"/>`
  series.forEach((q, i) => {
    s += `<path fill="none" stroke="${COLOURS[i]}" stroke-width="2" stroke-linejoin="round" d="${path(q.values.map((v, j) => [x(years[j]!), y(v)]))}"/>`
    s += `<circle cx="${x(last)}" cy="${y(q.values[q.values.length - 1]!)}" r="4" fill="${COLOURS[i]}" stroke="var(--panel)" stroke-width="2"/>`
  })
  if (wide) {
    // Nudge end labels apart so they never sit on top of each other.
    const ys = series.map((q) => y(q.values[q.values.length - 1]!))
    for (let pass = 0; pass < 4; pass++)
      for (let a = 0; a < ys.length; a++)
        for (let b = a + 1; b < ys.length; b++)
          if (Math.abs(ys[a]! - ys[b]!) < 14) {
            const up = ys[a]! < ys[b]! ? a : b
            const down = up === a ? b : a
            ys[up] = ys[up]! - 4
            ys[down] = ys[down]! + 4
          }
    series.forEach((q, i) => (s += `<text class="lab" x="${x(last) + 10}" y="${ys[i]! + 4}">${q.name}</text>`))
  }
  const column = (w - m.l - m.r) / (years.length - 1)
  years.forEach((year, j) => {
    const tip = `${year}\n${series.map((q) => `${q.name}: ${Math.round(q.values[j]!)}`).join('\n')}`
    s += `<rect x="${x(year) - column / 2}" y="${m.t}" width="${column}" height="${h - m.t - m.b}" fill="transparent" tabindex="0" data-tip="${esc(tip)}"/>`
  })
  return `${s}</svg>`
}

// Lens 3: one bar per industry, longest first. On a phone the label sits above its bar.
function industryBars(w: number) {
  const { rows, average, year } = data.industry
  const labelWidth = w > 520 ? 230 : 0
  const step = labelWidth ? 30 : 44
  const m = { l: labelWidth + 4, r: 44, t: 22, b: 6 }
  const h = m.t + rows.length * step + m.b
  const x = lin(0, 100, m.l, w - m.r)
  let s = open(w, h, `Share of jobs held by women in each UK industry, June ${year}`)
  s += `<line x1="${x(average)}" x2="${x(average)}" y1="${m.t - 4}" y2="${h - m.b}" stroke="var(--neutral)" stroke-width="1.5" stroke-dasharray="4 4"/>`
  s += `<text x="${x(average)}" y="12" text-anchor="middle">All jobs ${Math.round(average)}%</text>`
  rows.forEach((d, i) => {
    const top = m.t + i * step
    const barTop = labelWidth ? top + 6 : top + 16
    const width = Math.max(5, x(d.share) - x(0))
    s += labelWidth
      ? `<text class="lab" x="${labelWidth - 6}" y="${top + 20}" text-anchor="end" font-size="12">${esc(d.name)}</text>`
      : `<text class="lab" x="${m.l}" y="${top + 10}" font-size="12">${esc(d.name)}</text>`
    const tip = `${d.name}\nWomen hold ${d.share}% of the jobs\n${(d.jobs / 1e6).toFixed(2)} million jobs held by women`
    s += `<path d="M${x(0)} ${barTop}h${width - 4}a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-${width - 4}z" fill="var(--c1)" tabindex="0" data-tip="${esc(tip)}"/>`
    s += `<text class="strong" x="${x(0) + width + 6}" y="${barTop + 13}">${Math.round(d.share)}%</text>`
  })
  return `${s}</svg>`
}

// Lens 4: every country twice, once per kind of hobby.
function hobbyScatter(w: number) {
  const rows = data.hobbies
  const h = w > 520 ? 360 : 300
  const m = { l: 48, r: 14, t: 14, b: 36 }
  const ex = extent(rows.map((d) => d.strict), 0.06)
  const ey = extent(rows.flatMap((d) => [d.home, d.outdoor]))
  const x = lin(ex[0], ex[1], m.l, w - m.r)
  const y = lin(ey[0], ey[1], h - m.b, m.t)
  let s = open(w, h, 'Change in Wikipedia views of home and outdoor hobbies, 2019 to 2020, against lockdown strictness, by country')
  s += gridY(ticks(ey[0], ey[1], 5), y, m.l, w - m.r, (t) => `${signed(t)}%`) + ticksX(ticks(ex[0], ex[1], 4), x, h - m.b)
  s += `<line x1="${m.l}" x2="${w - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="var(--edge)" stroke-width="1.5"/>`
  s += `<text x="${w - m.r}" y="${h - 2}" text-anchor="end">Stricter lockdown →</text>`
  const strict = rows.map((d) => d.strict)
  for (const [key, colour] of [['home', COLOURS[0]], ['outdoor', COLOURS[1]]] as const) {
    const f = fit(strict, rows.map((d) => d[key]))
    s += `<line x1="${x(ex[0])}" y1="${y(f.intercept + f.slope * ex[0])}" x2="${x(ex[1])}" y2="${y(f.intercept + f.slope * ex[1])}" stroke="${colour}" stroke-width="2" stroke-dasharray="4 4" opacity=".7"/>`
  }
  for (const d of rows) {
    const tip = `${d.country}${d.shared ? ' (its language is read in other countries too)' : ''}\nLockdown strictness: ${Math.round(d.strict)} out of 100\nHome hobbies: ${signed(d.home)}%\nOutdoor hobbies: ${signed(d.outdoor)}%`
    s += dot(x(d.strict), y(d.outdoor), COLOURS[1]!, tip) + dot(x(d.strict), y(d.home), COLOURS[0]!, tip)
    if (['Italy', 'Japan', 'Sweden'].includes(d.country)) s += `<text class="lab" x="${x(d.strict) - 8}" y="${y(d.home) - 8}" text-anchor="end">${d.country}</text>`
  }
  return `${s}</svg>`
}

// Lens 5: a row of country dots per way of eating, with the middle country marked.
function eatingStrips(w: number) {
  const { rows: all, year } = data.hands
  const groups = [...new Set(all.map((d) => d.group))]
  const rowHeight = 84
  const m = { l: 14, r: 14, t: 8, b: 34 }
  const h = m.t + groups.length * rowHeight + m.b
  const top = Math.ceil(Math.max(...all.map((d) => d.value)))
  const x = lin(0, top, m.l, w - m.r)
  let s = open(w, h, `Nail polish imports per woman in ${year}, in US dollars, by how the country mostly eats`)
  for (let t = 0; t <= top; t++) s += `<line x1="${x(t)}" x2="${x(t)}" y1="${m.t}" y2="${h - m.b}" stroke="var(--line)"/><text x="${x(t)}" y="${h - m.b + 16}" text-anchor="middle">$${t}</text>`
  s += `<text x="${w - m.r}" y="${h - 2}" text-anchor="end">Imports per woman, ${year} →</text>`
  groups.forEach((group, gi) => {
    const y0 = m.t + gi * rowHeight
    const cy = y0 + 54
    const rows = all.filter((d) => d.group === group).sort((a, b) => a.value - b.value)
    // With an even number of countries the middle is halfway between the two in the centre.
    const mid = rows.length / 2
    const middle = rows.length % 2 ? rows[Math.floor(mid)]!.value : (rows[mid - 1]!.value + rows[mid]!.value) / 2
    s += `<text class="lab" x="${m.l}" y="${y0 + 18}" font-size="12">${group}</text><text x="${w - m.r}" y="${y0 + 18}" text-anchor="end">middle $${middle.toFixed(2)}</text>`
    s += `<line x1="${x(middle)}" x2="${x(middle)}" y1="${cy - 24}" y2="${cy + 24}" stroke="var(--text)" stroke-width="2"/>`
    const placed: { x: number; offset: number }[] = []
    for (const d of rows) {
      const px = x(d.value)
      const offset = [0, -10, 10, -20, 20].find((o) => !placed.some((p) => Math.abs(p.x - px) < 11 && p.offset === o)) ?? 0
      placed.push({ x: px, offset })
      s += dot(px, cy + offset, COLOURS[gi]!, `${d.country}\n$${d.value.toFixed(2)} of polish imports per woman\n${group}`)
    }
  })
  return `${s}</svg>`
}

// Lens 6: hollow dot is the raw correlation, solid dot the year-on-year one.
function selfCareDumbbells(w: number) {
  const rows = data.selfcare
  const labelWidth = w > 520 ? 216 : 0
  const step = labelWidth ? 40 : 52
  const m = { l: labelWidth + 16, r: 50, t: 24, b: 8 }
  const h = m.t + rows.length * step + m.b
  const x = lin(-0.5, 1, m.l, w - m.r)
  let s = open(w, h, 'Correlation between UK hair and beauty and each other kind of self care, raw and year on year')
  for (const [t, label, anchor] of [[-0.5, '−0.5', 'start'], [0, 'no link', 'middle'], [1, 'as one', 'end']] as const)
    s += `<line x1="${x(t)}" x2="${x(t)}" y1="${m.t - 4}" y2="${h - m.b}" stroke="${t === 0 ? 'var(--edge)' : 'var(--line)'}" stroke-width="${t === 0 ? 1.5 : 1}"/><text x="${x(t)}" y="12" text-anchor="${anchor}">${label}</text>`
  rows.forEach((d, i) => {
    const cy = m.t + i * step + (labelWidth ? 20 : 28)
    const tip = `${d.name}, ${d.from} to ${d.to}\nRaw correlation: ${r2(d.raw)}\nYear on year: ${r2(d.yearOnYear)}`
    s += labelWidth
      ? `<text class="lab" x="${labelWidth + 4}" y="${cy + 4}" text-anchor="end" font-size="12">${d.name}</text>`
      : `<text class="lab" x="${m.l}" y="${cy - 14}" font-size="12">${d.name}</text>`
    s += `<line x1="${x(d.yearOnYear)}" x2="${x(d.raw)}" y1="${cy}" y2="${cy}" stroke="var(--neutral)" stroke-width="2"/>`
    s += `<circle cx="${x(d.raw)}" cy="${cy}" r="5.5" fill="var(--panel)" stroke="var(--neutral)" stroke-width="2" tabindex="0" data-tip="${esc(tip)}"/>`
    s += dot(x(d.yearOnYear), cy, COLOURS[0]!, tip, 6)
    s += `<text class="strong" x="${w - m.r + 8}" y="${cy + 4}">${r2(d.yearOnYear)}</text>`
  })
  return `${s}</svg>`
}

// Lens 7: every big protest month lined up at zero, then averaged.
function protestLag(w: number) {
  const rows = data.protest.rows
  const wide = w > 520
  const h = wide ? 320 : 260
  const m = { l: 44, r: 14, t: 26, b: 36 }
  const first = rows[0]!.month
  const last = rows[rows.length - 1]!.month
  const ey = extent(rows.flatMap((d) => [d.low, d.high]), 0.05)
  const x = lin(first, last, m.l, w - m.r)
  const y = lin(ey[0], ey[1], h - m.b, m.t)
  let s = open(w, h, 'Nail salon job growth compared with hair salons, in the months around a big protest about women’s issues')
  s += gridY(ticks(ey[0], ey[1], 5), y, m.l, w - m.r, (t) => signed(t)) + ticksX(rows.map((d) => d.month).filter((k) => wide || k % 3 === 0), x, h - m.b)
  s += `<text x="${w - m.r}" y="${h - 2}" text-anchor="end">Months after the protest →</text>`
  const band = [...rows.map((d): [number, number] => [x(d.month), y(d.high)]), ...[...rows].reverse().map((d): [number, number] => [x(d.month), y(d.low)])]
  s += `<path fill="var(--band)" stroke="none" d="${path(band)}Z"/>`
  s += `<line x1="${m.l}" x2="${w - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="var(--edge)" stroke-width="1.5"/>`
  s += `<line x1="${x(0)}" x2="${x(0)}" y1="${m.t - 6}" y2="${h - m.b}" stroke="var(--text)" stroke-width="1.5" stroke-dasharray="3 4"/><text class="lab" x="${x(0) + 6}" y="${m.t - 10}">Protest</text>`
  s += `<path fill="none" stroke="var(--c1)" stroke-width="2" stroke-linejoin="round" d="${path(rows.map((d) => [x(d.month), y(d.mean)]))}"/>`
  // Label the point furthest from zero, whichever way it goes.
  const far = rows.reduce((a, b) => (Math.abs(b.mean) > Math.abs(a.mean) ? b : a))
  s += `<circle cx="${x(far.month)}" cy="${y(far.mean)}" r="5" fill="var(--c1)" stroke="var(--panel)" stroke-width="2"/>`
  s += `<text class="strong" x="${x(far.month) + 9}" y="${y(far.mean) + (far.mean < 0 ? 18 : -8)}">${signed(far.mean, 1)} in month ${far.month}</text>`
  const column = (w - m.l - m.r) / (rows.length - 1)
  for (const d of rows) {
    const when = d.month === 0 ? 'Protest month' : d.month < 0 ? `${-d.month} months before` : `${d.month} months after`
    const tip = `${when}\nNail against hair salon jobs: ${signed(d.mean, 1)} points\nAcross the protests: ${signed(d.low, 1)} to ${signed(d.high, 1)}`
    s += `<rect x="${x(d.month) - column / 2}" y="${m.t}" width="${column}" height="${h - m.t - m.b}" fill="transparent" tabindex="0" data-tip="${esc(tip)}"/>`
  }
  return `${s}</svg>`
}

// Lens 8: one or two yearly lines in the same unit. A single line gets its first, lowest and last points labelled.
function yearLines(years: number[], series: { name: string; values: number[] }[], fmt: (v: number) => string, label: string) {
  return (w: number) => {
    const wide = w > 520
    const many = series.length > 1
    const h = wide ? 300 : 250
    const m = { l: 44, r: wide && many ? 150 : 22, t: 26, b: 28 }
    const first = years[0]!
    const last = years[years.length - 1]!
    const ey = extent(series.flatMap((q) => q.values), 0.14)
    const x = lin(first, last, m.l, w - m.r)
    const y = lin(ey[0], ey[1], h - m.b, m.t)
    let s = open(w, h, label)
    s += gridY(ticks(ey[0], ey[1], 4), y, m.l, w - m.r, fmt) + ticksX(years.filter((yr) => (wide ? yr % 3 === 0 : yr % 5 === 0)), x, h - m.b)
    series.forEach((q, i) => {
      s += `<path fill="none" stroke="${COLOURS[i]}" stroke-width="2" stroke-linejoin="round" d="${path(q.values.map((v, j) => [x(years[j]!), y(v)]))}"/>`
      s += `<circle cx="${x(last)}" cy="${y(q.values[q.values.length - 1]!)}" r="4" fill="${COLOURS[i]}" stroke="var(--panel)" stroke-width="2"/>`
      if (wide && many) s += `<text class="lab" x="${x(last) + 10}" y="${y(q.values[q.values.length - 1]!) + 4}">${q.name}</text>`
    })
    if (!many) {
      const values = series[0]!.values
      const low = values.indexOf(Math.min(...values))
      const marks = [...new Set([0, low, values.length - 1])]
      for (const j of marks) {
        const anchor = j === 0 ? 'start' : j >= values.length - 3 ? 'end' : 'middle'
        s += `<circle cx="${x(years[j]!)}" cy="${y(values[j]!)}" r="4" fill="${COLOURS[0]}" stroke="var(--panel)" stroke-width="2"/>`
        s += `<text class="strong" x="${x(years[j]!)}" y="${y(values[j]!) + (j === low && j !== 0 && j !== values.length - 1 ? 20 : -10)}" text-anchor="${anchor}">${fmt(values[j]!)} in ${years[j]}</text>`
      }
    }
    const column = (w - m.l - m.r) / (years.length - 1)
    years.forEach((year, j) => {
      const tip = `${year}\n${series.map((q) => `${q.name}: ${fmt(q.values[j]!)}`).join('\n')}`
      s += `<rect x="${x(year) - column / 2}" y="${m.t}" width="${column}" height="${h - m.t - m.b}" fill="transparent" tabindex="0" data-tip="${esc(tip)}"/>`
    })
    return `${s}</svg>`
  }
}

// Lens 8: the middle manicure price in each UK region, dearest first.
function regionBars(w: number) {
  const { rows, year } = data.manicure.regions
  const labelWidth = w > 520 ? 200 : 0
  const step = labelWidth ? 28 : 42
  const m = { l: labelWidth + 4, r: 44, t: 6, b: 6 }
  const h = m.t + rows.length * step + m.b
  const x = lin(0, Math.max(...rows.map((r) => r.price)), m.l, w - m.r)
  let s = open(w, h, `Middle price of a basic manicure in each UK region in ${year}`)
  rows.forEach((d, i) => {
    const top = m.t + i * step
    const barTop = labelWidth ? top + 5 : top + 16
    const width = x(d.price) - x(0)
    s += labelWidth
      ? `<text class="lab" x="${labelWidth - 6}" y="${top + 19}" text-anchor="end" font-size="12">${esc(d.name)}</text>`
      : `<text class="lab" x="${m.l}" y="${top + 10}" font-size="12">${esc(d.name)}</text>`
    s += `<path d="M${x(0)} ${barTop}h${width - 4}a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-${width - 4}z" fill="var(--c1)" tabindex="0" data-tip="${esc(`${d.name}\nMiddle price £${d.price}\nFrom ${d.quotes} shop prices in ${year}`)}"/>`
    s += `<text class="strong" x="${x(d.price) + 6}" y="${barTop + 13}">£${d.price}</text>`
  })
  return `${s}</svg>`
}

const [prideBirths, prideManagers, prideMarriages] = data.pride
const manicure = data.manicure

export const PLOTS = {
  'pride-births': scatter(prideBirths!.points, 'Turnover £m', prideBirths!.yName),
  'pride-managers': scatter(prideManagers!.points, 'Turnover £m', prideManagers!.yName, '%'),
  'pride-marriages': scatter(prideMarriages!.points, 'Turnover £m', prideMarriages!.yName),
  work: indexedLines,
  industry: industryBars,
  hobbies: hobbyScatter,
  hands: eatingStrips,
  selfcare: selfCareDumbbells,
  protest: protestLag,
  'manicure-minutes': yearLines(manicure.minutes.years, [{ name: 'Minutes of work', values: manicure.minutes.values }], (v) => `${Math.round(v)} min`, 'Minutes a woman on the middle UK hourly wage works to pay for a basic manicure, by year'),
  'manicure-price': yearLines(
    manicure.price.years,
    [{ name: 'Price on the day', values: manicure.price.sticker }, { name: "In today's money", values: manicure.price.real }],
    (v) => `£${v.toFixed(v % 1 ? 2 : 0)}`,
    'Middle UK price of a basic manicure by year, as charged at the time and in today\u2019s money',
  ),
  'manicure-regions': regionBars,
} satisfies Record<string, (w: number) => string>

export type PlotKey = keyof typeof PLOTS
