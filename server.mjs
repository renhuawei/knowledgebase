import express from 'express'
import cors from 'cors'
import { join } from 'node:path'
import config from './config.mjs'
import { search } from './search.mjs'
import { chatStream } from './ollama.mjs'
import { buildPrompt } from './prompt.mjs'

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static('web'))

const sessions = new Map()   // sessionId -> [{role, content}]

function history(session) {
  if (!sessions.has(session)) sessions.set(session, [])
  return sessions.get(session)
}

app.post('/api/ask', async (req, res) => {
  const q = req.body.q
  const session = req.body.session || 'default'
  if (!q) return res.status(400).json({ error: 'q required' })

  const his = history(session)
  const sources = await search(q)
  const prompt = buildPrompt({ q, sources, history: his })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.write(`data: ${JSON.stringify({ type: 'sources', sources: sources.map(t => ({ file: t.file, abs: join(config.root, t.file), startLine: t.startLine, endLine: t.endLine })) })}\n\n`)

  let answer = ''
  try {
    await chatStream([{ role: 'user', content: prompt }], config.chatModel, config.ollama, token => {
      answer += token
      res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`)
    })
  } catch (e) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: String(e) })}\n\n`)
  }
  res.end()

  // 追加历史（上限 20 条 / 10 轮）
  his.push({ role: 'user', content: q })
  if (answer.trim()) his.push({ role: 'assistant', content: answer })
  if (his.length > 20) his.splice(0, his.length - 20)
})

app.post('/api/reset', (req, res) => {
  const session = req.body.session || 'default'
  sessions.delete(session)
  res.json({ ok: true })
})

app.listen(config.port, () => console.log(`http://localhost:${config.port}`))
