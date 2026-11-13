import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import AskForm from './AskForm.vue'

afterEach(() => vi.unstubAllGlobals())

function streamed(text: string) {
  const body = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      for (const piece of text.match(/.{1,8}/g) ?? []) controller.enqueue(encoder.encode(piece))
      controller.close()
    },
  })
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

describe('AskForm', () => {
  it('sends the question and shows the streamed answer', async () => {
    const fetch = vi.fn().mockResolvedValue(streamed(JSON.stringify({ answer: 'Bring snacks.' })))
    vi.stubGlobal('fetch', fetch)

    const wrapper = mount(AskForm)
    await wrapper.get('input').setValue('  What should I bring?  ')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Bring snacks.'))

    const [, init] = fetch.mock.calls[0]!
    expect(JSON.parse(init.body)).toEqual({ question: 'What should I bring?' })
  })
})
