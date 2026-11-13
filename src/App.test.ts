import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import App from './App.vue'

describe('App', () => {
  it('leads with the true cost of a salon visit against doing your own nails', () => {
    const wrapper = mount(App)
    expect(wrapper.find('h1').text()).toBe('chipped')
    expect(wrapper.text()).toContain('Painting your own nails costs what it did in 1967. A salon visit costs twice as much as it did.')
  })

  it('switches the true cost chart to another thing', async () => {
    const wrapper = mount(App)
    const chips = wrapper.findAll('.tc-row').find((b) => b.text().startsWith('Potato chips'))!
    await chips.trigger('click')
    expect(chips.attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('a bag in 1980, which is $7.97 in 2025 money')
  })

  it('links to Chipped Capital under the base path', () => {
    const wrapper = mount(App)
    const link = wrapper.find('.capital a')
    expect(link.attributes('href')).toBe(`${import.meta.env.BASE_URL}capital/`)
    expect(wrapper.find('.capital').text()).toContain('$280')
  })

  it('deals one fact per tap and shuffles at the end', async () => {
    const wrapper = mount(App)
    const stack = wrapper.find('.stack')
    await stack.trigger('click')
    expect(wrapper.text()).toContain('Chip 1 of 10')
    for (let i = 0; i < 10; i++) await stack.trigger('click')
    expect(wrapper.text()).toContain('Tap the chips to deal a fact.')
  })
})
