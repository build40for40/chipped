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
