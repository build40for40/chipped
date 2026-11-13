import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import App from './App.vue'

afterEach(() => vi.unstubAllGlobals())

describe('App', () => {
  it('shows the greeting from the API with the London time', async () => {
    const greeting = { message: 'The Worker says hi.', at: '2026-11-02T09:00:00Z' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(greeting)))

    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.text()).toContain("The Worker says hi. It's 09:00 in London")
  })
})
