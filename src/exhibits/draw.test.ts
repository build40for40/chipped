import { describe, expect, it } from 'vitest'

import { change, data, erSvg, last, objectsSvg, pick } from './draw'
import { FACTS } from './facts'

const item = (k: string) => data.prices.items.find((i) => i.key === k)!

describe('exhibits', () => {
  it('picks six points from first to last', () => {
    const xs = Array.from({ length: 46 }, (_, i) => i)
    const p = pick(xs)
    expect(p).toHaveLength(6)
    expect(p[0]).toBe(0)
    expect(last(p)).toBe(45)
  })

  it('has salon prices roughly doubling and microchips collapsing after inflation', () => {
    expect(change(item('salon'))).toBeGreaterThan(80)
    expect(Math.abs(change(item('polish')))).toBeLessThan(15)
    expect(change(item('microchips'))).toBeLessThan(-90)
  })

  it('draws one object per shown year', () => {
    const svg = objectsSvg(item('iron-nails'))
    expect(svg.match(/<text/g)).toHaveLength(12)
    expect(svg).toContain('1790')
  })

  it('draws one ER chair per 250 visits', () => {
    const svg = erSvg({ manicure: 1000, nailGun: 500 })
    expect(svg.match(/<g /g)).toHaveLength(6)
  })

  it('keeps every fact free of unfilled numbers and calls the spy alleged', () => {
    for (const f of FACTS) expect(f.text).not.toMatch(/NaN|undefined|Infinity/)
    expect(FACTS.find((f) => f.text.includes('Huang'))!.text).toContain('alleged')
  })
})

describe('polish stripes', async () => {
  const { colour, stripes, stripesSvg } = await import('./stripes')

  it('paints one stripe per month plus the lockdown line', () => {
    const s = stripes()
    expect(s.months.length).toBeGreaterThan(300)
    expect(stripesSvg(s.months).match(/<rect x="\d+" y="0" width="1.06"/g)).toHaveLength(s.months.length)
    expect(stripesSvg(s.months)).toContain('opacity="0.9"')
  })

  it('runs from nude for the quietest month to deep lacquer for the busiest', () => {
    expect(colour(0)).toBe('rgb(239,207,195)')
    expect(colour(1)).toBe('rgb(140,37,57)')
  })

  it('finds the 2016 peak and the 2000 start', () => {
    const s = stripes()
    expect(s.firstYear).toBe('2000')
    expect(s.peakYear).toBe('2016')
    expect(s.peakTotal).toBeGreaterThan(s.firstTotal * 2)
  })
})
