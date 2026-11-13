import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import { data } from '@/lenses/data'
import { clock, DAY, drawChips, share, thin, type Row } from './chip'
import ChipDay from './ChipDay.vue'

const rows: Row[] = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year, i, all) => ({
  label: String(year),
  minutes: 110 - i,
  kind: i === all.length - 1 ? 'latest' : 'year',
}))

describe('the chip in your day', () => {
  it('says time in hours and minutes, and as a share of an eight hour day', () => {
    expect(clock(45)).toBe('45 min')
    expect(clock(60)).toBe('1 hr')
    expect(clock(89.6)).toBe('1 hr 30 min')
    expect(DAY).toBe(480)
    expect(share(96)).toBe('20%')
  })

  it('draws one nail per year on a wide screen and a readable handful on a phone', () => {
    const wide = drawChips(780, rows, { minutes: 110, label: '2010' })
    expect(wide.match(/class="nail"/g)).toHaveLength(16)
    const phone = drawChips(326, rows, { minutes: 110, label: '2010' })
    expect(phone.match(/class="nail"/g)!.length).toBeLessThanOrEqual(7)
    for (const svg of [wide, phone]) expect(svg).not.toMatch(/NaN|undefined|Infinity/)
  })

  it('always keeps the first year and the latest year when thinning', () => {
    const kept = thin(rows, 7)
    expect(kept[0]!.label).toBe('2010')
    expect(kept[kept.length - 1]!.label).toBe('2025')
    expect(kept.length).toBeLessThanOrEqual(7)
  })

  it('makes a deeper chip for a longer shift', () => {
    const edge = (minutes: number) => {
      const svg = drawChips(780, [{ label: 'x', minutes, kind: 'latest' }], { minutes, label: 'x' })
      // The dashed guide sits at the chip depth of the reference, which here is the same nail.
      return Number(svg.match(/y1="([\d.]+)" y2="[\d.]+" stroke="var\(--ink\)"/)![1])
    }
    expect(edge(120)).toBeGreaterThan(edge(60))
  })
})

describe('ChipDay', () => {
  it('states the real UK figures, with no inputs on the exhibit', async () => {
    const wrapper = mount(ChipDay)
    await flushPromises()
    const { years, values } = data.manicure.minutes
    expect(wrapper.find('h2').text()).toContain(`A manicure chips ${clock(values[values.length - 1]!)} off a British woman's working day`)
    expect(wrapper.find('h2').text()).toContain(`In ${years[0]} it took ${clock(values[0]!)}`)
    expect(wrapper.findAll('input')).toHaveLength(0)
    expect(wrapper.findAll('.nail').length).toBeGreaterThan(0)
  })
})
