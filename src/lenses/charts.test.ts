import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import { PLOTS, type PlotKey } from './charts'
import Lenses from './Lenses.vue'

const keys = Object.keys(PLOTS) as PlotKey[]

describe('lens charts', () => {
  it.each(keys)('%s draws clean SVG at phone and desktop widths', (key) => {
    for (const width of [326, 358, 780]) {
      const svg = PLOTS[key](width)
      expect(svg.startsWith(`<svg viewBox="0 0 ${width} `)).toBe(true)
      expect(svg.endsWith('</svg>')).toBe(true)
      expect(svg).not.toMatch(/NaN|undefined|Infinity/)
    }
  })

  it.each(keys)('%s never draws text past the right edge', (key) => {
    // Right-aligned and centred labels are placed by their anchor, so only left-aligned ones can overflow.
    const width = 326
    const starts = [...PLOTS[key](width).matchAll(/<text(?![^>]*text-anchor)[^>]* x="([\d.-]+)"[^>]*>([^<]*)</g)]
    for (const [, x, label] of starts) expect(Number(x) + label!.length * 6.7, label).toBeLessThanOrEqual(width + 4)
  })
})

describe('Lenses', () => {
  it('shows all seven questions, each with a chart and a dummy data label', async () => {
    const wrapper = mount(Lenses)
    await flushPromises()

    expect(wrapper.findAll('article')).toHaveLength(7)
    expect(wrapper.findAll('.tag').every((tag) => tag.text() === 'Dummy data')).toBe(true)
    expect(wrapper.findAll('[data-plot] svg')).toHaveLength(keys.length)
  })
})
