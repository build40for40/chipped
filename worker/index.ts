import { createAnthropic } from '@ai-sdk/anthropic'
import { createTextStreamResponse, Output, streamText, toTextStream } from 'ai'

import { answerSchema, askSchema } from '../src/ask/schema'

interface Env {
  ANTHROPIC_API_KEY?: string
}

const API = '/chipped/api'
const MODEL = 'claude-sonnet-5-5'
const INSTRUCTIONS =
  'You answer questions for viewers of 40 for 40, a live Twitch show building one app a day in London. ' +
  'Reply in one or two short sentences of plain UK English, warm and a little funny.'

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)

    if (request.method === 'GET' && pathname === `${API}/greeting`) {
      return Response.json({ message: 'The Worker says hi.', at: new Date().toISOString() })
    }
    if (request.method === 'POST' && pathname === `${API}/ask`) return ask(request, env)
    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>

async function ask(request: Request, env: Env) {
  if (!env.ANTHROPIC_API_KEY) {
    return new Response("Claude isn't set up here yet: the Worker has no ANTHROPIC_API_KEY.", { status: 503 })
  }
  const parsed = askSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new Response('That question could not be read.', { status: 400 })

  const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const result = streamText({
    model: anthropic(MODEL),
    instructions: INSTRUCTIONS,
    messages: [{ role: 'user', content: parsed.data.question }],
    output: Output.object({ schema: answerSchema, name: 'answer' }),
    providerOptions: { anthropic: { effort: 'low', fallbacks: 'default' } },
    // The default handler logs the whole request, which holds what the user typed.
    onError: ({ error }) => console.error('Ask failed:', error instanceof Error ? error.name : 'Unknown error'),
  })

  return createTextStreamResponse({ stream: toTextStream({ stream: result.stream }) })
}
