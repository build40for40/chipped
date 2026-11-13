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
  it('shows all seven questions, each with a chart, what was asked and where the data came from', async () => {
    const wrapper = mount(Lenses)
    await flushPromises()

    expect(wrapper.findAll('article')).toHaveLength(7)
    expect(wrapper.findAll('.tag').map((tag) => tag.text())).toEqual(['Real data', 'Real data', 'Needs a poll', 'Real data', 'Real data', 'Real data', 'Real data'])
    expect(wrapper.findAll('.asked')).toHaveLength(7)
    expect(wrapper.findAll('.source').every((source) => source.text().length > 20)).toBe(true)
    expect(wrapper.text()).not.toMatch(/dummy|made up/i)
    expect(wrapper.findAll('[data-plot] svg')).toHaveLength(keys.length)
  })
})
