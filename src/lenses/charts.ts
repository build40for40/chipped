// One draw function per plot. Each takes the width it has to fill and returns an SVG string,
// so text stays the same size on a phone and on a desktop. Colours come from CSS variables
// set on .lenses (see Lenses.vue): --c1..--c3 are series colours, the rest are ink and lines.
import {
  births, covid, dates, diff, EAT_GROUPS, eating, industries, INDUSTRY_AVERAGE, manualJobs, pearson,
  polish, promotions, protest, salon, selfCare, sport, YEARS,
} from './dummy'

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

// Lens 1: each dot is a year. The dashed line is the best fit.
function scatter(xs: number[], ys: number[], xName: string, yName: string, unit = '') {
  return (w: number) => {
    const h = Math.round(Math.min(260, Math.max(200, w * 0.85)))
    const m = { l: 38, r: 10, t: 26, b: 34 }
    const ex = extent(xs)
    const ey = extent(ys)
    const x = lin(ex[0], ex[1], m.l, w - m.r)
    const y = lin(ey[0], ey[1], h - m.b, m.t)
    const f = fit(xs, ys)
    const r = pearson(xs, ys)
    let s = open(w, h, `${yName} against ${xName}, correlation ${r2(r)}`)
    s += gridY(ticks(ey[0], ey[1], 4), y, m.l, w - m.r) + ticksX(ticks(ex[0], ex[1], 3), x, h - m.b)
    s += `<text x="${w - m.r}" y="${h - 2}" text-anchor="end">${xName} →</text>`
    s += `<line x1="${x(ex[0])}" y1="${y(f.intercept + f.slope * ex[0])}" x2="${x(ex[1])}" y2="${y(f.intercept + f.slope * ex[1])}" stroke="var(--neutral)" stroke-width="2" stroke-dasharray="4 4"/>`
    xs.forEach((v, i) => {
      s += dot(x(v), y(ys[i]!), 'var(--c1)', `${YEARS[i]}\n${xName}: ${v.toFixed(1)}\n${yName}: ${ys[i]!.toFixed(1)}${unit}`, 4.5)
    })
    s += `<text class="strong" x="${m.l}" y="14">r ${r2(r)}</text><text x="${m.l + 62}" y="14">year on year ${r2(pearson(diff(xs), diff(ys)))}</text>`
    return `${s}</svg>`
  }
}

// Lens 2: three series on one axis, each set to 100 in the first year.
function indexedLines(w: number) {
  const wide = w > 520
  const h = wide ? 320 : 260
  const m = { l: 38, r: wide ? 150 : 14, t: 12, b: 28 }
  const series: [string, number[], string][] = [
    ['Nail polish sales', polish, 'var(--c1)'],
    ['Women in manual jobs', manualJobs, 'var(--c2)'],
    ['Women playing sport', sport, 'var(--c3)'],
  ]
  const first = YEARS[0]!
  const last = YEARS[YEARS.length - 1]!
  const ey = extent(series.flatMap((q) => q[1]))
  const x = lin(first, last, m.l, w - m.r)
  const y = lin(ey[0], ey[1], h - m.b, m.t)
  let s = open(w, h, `Nail polish sales, women in manual jobs and women playing sport, set to 100 in ${first}`)
  s += gridY(ticks(ey[0], ey[1], 5), y, m.l, w - m.r) + ticksX(wide ? [2005, 2010, 2015, 2020, 2025] : [2005, 2015, 2025], x, h - m.b)
  s += `<line x1="${m.l}" x2="${w - m.r}" y1="${y(100)}" y2="${y(100)}" stroke="var(--edge)" stroke-width="1.5"/>`
  for (const [, values, colour] of series) {
    s += `<path fill="none" stroke="${colour}" stroke-width="2" stroke-linejoin="round" d="${path(values.map((v, i) => [x(YEARS[i]!), y(v)]))}"/>`
    s += `<circle cx="${x(last)}" cy="${y(values[values.length - 1]!)}" r="4" fill="${colour}" stroke="var(--panel)" stroke-width="2"/>`
  }
  if (wide) {
    // Nudge end labels apart so they never sit on top of each other.
    const ys = series.map((q) => y(q[1][q[1].length - 1]!))
    for (let pass = 0; pass < 4; pass++)
      for (let a = 0; a < ys.length; a++)
        for (let b = a + 1; b < ys.length; b++)
          if (Math.abs(ys[a]! - ys[b]!) < 14) {
            const up = ys[a]! < ys[b]! ? a : b
            const down = up === a ? b : a
            ys[up] = ys[up]! - 4
            ys[down] = ys[down]! + 4
          }
    series.forEach((q, i) => (s += `<text class="lab" x="${x(last) + 10}" y="${ys[i]! + 4}">${q[0]}</text>`))
  }
  const column = (w - m.l - m.r) / (YEARS.length - 1)
  YEARS.forEach((year, i) => {
    const tip = `${year}\n${series.map((q) => `${q[0]}: ${Math.round(q[1][i]!)}`).join('\n')}`
    s += `<rect x="${x(year) - column / 2}" y="${m.t}" width="${column}" height="${h - m.t - m.b}" fill="transparent" tabindex="0" data-tip="${esc(tip)}"/>`
  })
  return `${s}</svg>`
}

// Lens 3: one bar per industry, longest first. On a phone the label sits above its bar.
function industryBars(w: number) {
  const labelWidth = w > 520 ? 230 : 0
  const step = labelWidth ? 30 : 44
  const m = { l: labelWidth + 4, r: 44, t: 22, b: 6 }
  const h = m.t + industries.length * step + m.b
  const x = lin(0, 80, m.l, w - m.r)
  let s = open(w, h, 'Share of women wearing nail polish at work, by UK industry')
  s += `<line x1="${x(INDUSTRY_AVERAGE)}" x2="${x(INDUSTRY_AVERAGE)}" y1="${m.t - 4}" y2="${h - m.b}" stroke="var(--neutral)" stroke-width="1.5" stroke-dasharray="4 4"/>`
  s += `<text x="${x(INDUSTRY_AVERAGE)}" y="12" text-anchor="middle">All working women ${INDUSTRY_AVERAGE}%</text>`
  industries.forEach((d, i) => {
    const top = m.t + i * step
    const barTop = labelWidth ? top + 6 : top + 16
    const width = x(d.share) - x(0)
    s += labelWidth
      ? `<text class="lab" x="${labelWidth - 6}" y="${top + 20}" text-anchor="end" font-size="12">${d.name}</text>`
      : `<text class="lab" x="${m.l}" y="${top + 10}" font-size="12">${d.name}</text>`
    s += `<path d="M${x(0)} ${barTop}h${width - 4}a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-${width - 4}z" fill="var(--c1)" tabindex="0" data-tip="${esc(`${d.name}\n${d.share}% wear polish at work`)}"/>`
    s += `<text class="strong" x="${x(d.share) + 6}" y="${barTop + 13}">${d.share}%</text>`
  })
  return `${s}</svg>`
}

// Lens 4: every country twice, once per kind of hobby.
function covidScatter(w: number) {
  const h = w > 520 ? 360 : 300
  const m = { l: 44, r: 14, t: 14, b: 36 }
  const ex: [number, number] = [30, 100]
  const ey = extent(covid.flatMap((d) => [d.home, d.outdoor]))
  const x = lin(ex[0], ex[1], m.l, w - m.r)
  const y = lin(ey[0], ey[1], h - m.b, m.t)
  let s = open(w, h, 'Change in hobby interest against lockdown strictness, by country')
  s += gridY(ticks(ey[0], ey[1], 5), y, m.l, w - m.r, (t) => `${signed(t)}%`) + ticksX([40, 60, 80, 100], x, h - m.b)
  s += `<line x1="${m.l}" x2="${w - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="var(--edge)" stroke-width="1.5"/>`
  s += `<text x="${w - m.r}" y="${h - 2}" text-anchor="end">Stricter lockdown →</text>`
  const strict = covid.map((d) => d.strict)
  for (const [key, colour] of [['home', 'var(--c1)'], ['outdoor', 'var(--c2)']] as const) {
    const f = fit(strict, covid.map((d) => d[key]))
    s += `<line x1="${x(ex[0])}" y1="${y(f.intercept + f.slope * ex[0])}" x2="${x(ex[1])}" y2="${y(f.intercept + f.slope * ex[1])}" stroke="${colour}" stroke-width="2" stroke-dasharray="4 4" opacity=".7"/>`
  }
  for (const d of covid) {
    const tip = `${d.country}\nLockdown strictness: ${Math.round(d.strict)}\nPainting nails: ${signed(d.home)}%\nOutdoor hobbies: ${signed(d.outdoor)}%`
    s += dot(x(d.strict), y(d.outdoor), 'var(--c2)', tip) + dot(x(d.strict), y(d.home), 'var(--c1)', tip)
    if (['UK', 'India', 'Sweden', 'Brazil'].includes(d.country)) s += `<text class="lab" x="${x(d.strict) + 8}" y="${y(d.home) - 7}">${d.country}</text>`
  }
  return `${s}</svg>`
}

// Lens 5: a row of country dots per way of eating, with the middle country marked.
function eatingStrips(w: number) {
  const rowHeight = 74
  const m = { l: 14, r: 14, t: 8, b: 34 }
  const h = m.t + EAT_GROUPS.length * rowHeight + m.b
  const x = lin(0, 5, m.l, w - m.r)
  let s = open(w, h, 'Nail polish bought per woman, by how the country mostly eats')
  for (let t = 0; t <= 5; t++) s += `<line x1="${x(t)}" x2="${x(t)}" y1="${m.t}" y2="${h - m.b}" stroke="var(--line)"/><text x="${x(t)}" y="${h - m.b + 16}" text-anchor="middle">${t}</text>`
  s += `<text x="${w - m.r}" y="${h - 2}" text-anchor="end">Bottles per woman per year →</text>`
  EAT_GROUPS.forEach((group, gi) => {
    const top = m.t + gi * rowHeight
    const cy = top + 48
    const rows = eating.filter((d) => d.group === group).sort((a, b) => a.bottles - b.bottles)
    const middle = rows[Math.floor(rows.length / 2)]!.bottles
    s += `<text class="lab" x="${m.l}" y="${top + 18}" font-size="12">${group}</text><text x="${w - m.r}" y="${top + 18}" text-anchor="end">middle ${middle.toFixed(1)}</text>`
    s += `<line x1="${x(middle)}" x2="${x(middle)}" y1="${cy - 14}" y2="${cy + 14}" stroke="var(--text)" stroke-width="2"/>`
    const placed: { x: number; offset: number }[] = []
    for (const d of rows) {
      const px = x(d.bottles)
      let offset = 0
      for (const p of placed) if (Math.abs(p.x - px) < 11 && p.offset === offset) offset = offset === 0 ? -9 : 9
      placed.push({ x: px, offset })
      s += dot(px, cy + offset, `var(--c${gi + 1})`, `${d.country}\n${d.bottles.toFixed(1)} bottles per woman per year\n${group}`)
    }
  })
  return `${s}</svg>`
}

// Lens 6: hollow dot is the raw correlation, solid dot the year-on-year one.
function selfCareDumbbells(w: number) {
  const labelWidth = w > 520 ? 150 : 0
  const step = labelWidth ? 40 : 52
  const m = { l: labelWidth + 16, r: 46, t: 24, b: 8 }
  const h = m.t + selfCare.length * step + m.b
  const x = lin(-0.2, 1, m.l, w - m.r)
  let s = open(w, h, 'Correlation between nail salons and each kind of self care, raw and year on year')
  for (const [t, label] of [[0, 'no link'], [0.5, '0.5'], [1, 'move as one']] as const)
    s += `<line x1="${x(t)}" x2="${x(t)}" y1="${m.t - 4}" y2="${h - m.b}" stroke="${t === 0 ? 'var(--edge)' : 'var(--line)'}" stroke-width="${t === 0 ? 1.5 : 1}"/><text x="${x(t)}" y="12" text-anchor="${t === 1 ? 'end' : 'middle'}">${label}</text>`
  selfCare.forEach((d, i) => {
    const cy = m.t + i * step + (labelWidth ? 20 : 28)
    const tip = `${d.name}\nRaw correlation: ${r2(d.raw)}\nYear on year: ${r2(d.yearOnYear)}`
    s += labelWidth
      ? `<text class="lab" x="${labelWidth + 4}" y="${cy + 4}" text-anchor="end" font-size="12">${d.name}</text>`
      : `<text class="lab" x="${m.l}" y="${cy - 14}" font-size="12">${d.name}</text>`
    s += `<line x1="${x(d.yearOnYear)}" x2="${x(d.raw)}" y1="${cy}" y2="${cy}" stroke="var(--neutral)" stroke-width="2"/>`
    s += `<circle cx="${x(d.raw)}" cy="${cy}" r="5.5" fill="var(--panel)" stroke="var(--neutral)" stroke-width="2" tabindex="0" data-tip="${esc(tip)}"/>`
    s += dot(x(d.yearOnYear), cy, 'var(--c1)', tip, 6)
    s += `<text class="strong" x="${w - m.r + 8}" y="${cy + 4}">${r2(d.yearOnYear)}</text>`
  })
  return `${s}</svg>`
}

// Lens 7: every protest lined up at week zero, then averaged.
function protestLag(w: number) {
  const wide = w > 520
  const h = wide ? 320 : 260
  const m = { l: 44, r: 14, t: 26, b: 36 }
  const first = protest[0]!.week
  const last = protest[protest.length - 1]!.week
  const ey = extent(protest.flatMap((d) => [d.low, d.high]), 0.05)
  const x = lin(first, last, m.l, w - m.r)
  const y = lin(ey[0], ey[1], h - m.b, m.t)
  let s = open(w, h, 'Nail salon sales in the weeks around a protest, against normal')
  s += gridY(ticks(ey[0], ey[1], 5), y, m.l, w - m.r, (t) => `${signed(t)}%`) + ticksX(wide ? [-4, -2, 0, 2, 4, 6, 8, 10, 12] : [-4, 0, 4, 8, 12], x, h - m.b)
  s += `<text x="${w - m.r}" y="${h - 2}" text-anchor="end">Weeks after the protest →</text>`
  const band = [...protest.map((d): [number, number] => [x(d.week), y(d.high)]), ...[...protest].reverse().map((d): [number, number] => [x(d.week), y(d.low)])]
  s += `<path fill="var(--band)" stroke="none" d="${path(band)}Z"/>`
  s += `<line x1="${m.l}" x2="${w - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="var(--edge)" stroke-width="1.5"/>`
  s += `<line x1="${x(0)}" x2="${x(0)}" y1="${m.t - 6}" y2="${h - m.b}" stroke="var(--text)" stroke-width="1.5" stroke-dasharray="3 4"/><text class="lab" x="${x(0) + 6}" y="${m.t - 10}">Protest</text>`
  s += `<path fill="none" stroke="var(--c1)" stroke-width="2" stroke-linejoin="round" d="${path(protest.map((d) => [x(d.week), y(d.mean)]))}"/>`
  const peak = protest.reduce((a, b) => (b.mean > a.mean ? b : a))
  s += `<circle cx="${x(peak.week)}" cy="${y(peak.mean)}" r="5" fill="var(--c1)" stroke="var(--panel)" stroke-width="2"/><text class="strong" x="${x(peak.week) + 9}" y="${y(peak.mean) - 8}">${signed(peak.mean, 1)}% in week ${peak.week}</text>`
  const column = (w - m.l - m.r) / (protest.length - 1)
  for (const d of protest) {
    const when = d.week === 0 ? 'Protest week' : d.week < 0 ? `${-d.week} weeks before` : `${d.week} weeks after`
    const tip = `${when}\nSalon sales: ${signed(d.mean, 1)}% against normal\nRange: ${d.low.toFixed(1)}% to ${d.high.toFixed(1)}%`
    s += `<rect x="${x(d.week) - column / 2}" y="${m.t}" width="${column}" height="${h - m.t - m.b}" fill="transparent" tabindex="0" data-tip="${esc(tip)}"/>`
  }
  return `${s}</svg>`
}

export const PLOTS = {
  'pride-births': scatter(salon, births, 'Salon sales', 'Births per 1,000'),
  'pride-promotions': scatter(salon, promotions, 'Salon sales', 'Promotions to women', '%'),
  'pride-dates': scatter(salon, dates, 'Salon sales', 'First dates per 1,000'),
  work: indexedLines,
  industry: industryBars,
  covid: covidScatter,
  hands: eatingStrips,
  selfcare: selfCareDumbbells,
  protest: protestLag,
} satisfies Record<string, (w: number) => string>

export type PlotKey = keyof typeof PLOTS
