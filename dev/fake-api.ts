import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Plugin } from 'vite'

const API = '/chipped/api'

const ANSWERS = [
  'This is the fake API talking. Claude is having a cup of tea.',
  'Fake mode says yes, probably. Ask again with a real key for a real answer.',
  'No Claude here, just a canned reply doing its best impression.',
]

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

async function streamJson(res: ServerResponse, value: unknown) {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  const text = JSON.stringify(value)
  for (let index = 0; index < text.length; index += 12) {
    res.write(text.slice(index, index + 12))
    await wait(30)
  }
  res.end()
}

/** `npm run fake`: stands in for the Worker so the page clicks through with no key and no wrangler. */
export function fakeApi(): Plugin {
  let asked = 0
  return {
    name: 'chipped-fake-api',
    apply: (_config, { command, mode }) => command === 'serve' && mode === 'fake',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (!path?.startsWith(API)) return next()

        if (req.method === 'GET' && path === `${API}/greeting`) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ message: 'The fake API says hi.', at: new Date().toISOString() }))
        }

        if (req.method === 'POST' && path === `${API}/ask`) {
          await readBody(req)
          await wait(400)
          return streamJson(res, { answer: ANSWERS[asked++ % ANSWERS.length] })
        }

        res.writeHead(404)
        res.end('Not found')
      })
    },
  }
}
