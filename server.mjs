import express from 'express'
import cors from 'cors'
import config from './config.mjs'
import { search } from './search.mjs'
import { chatStream } from './ollama.mjs'

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static('web'))

app.post('/api/ask', async (req, res) => {
  const q = req.body.q
  if (!q) return res.status(400).json({ error: 'q required' })

  const top = await search(q)
  const context = top.map((t, i) => `[来源${i + 1}] ${t.file}\n${t.text}`).join('\n\n')
  const prompt = `你是代码/文档问答助手，只根据下面资料回答，资料里没有就说不知道。回答末尾列出参考来源。\n\n资料：\n${context}\n\n问题：${q}\n\n回答：`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.write(`data: ${JSON.stringify({ type: 'sources', sources: top.map(t => ({ file: t.file, part: t.part })) })}\n\n`)

  try {
    await chatStream([{ role: 'user', content: prompt }], config.chatModel, config.ollama, token => {
      res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`)
    })
  } catch (e) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: String(e) })}\n\n`)
  }
  res.end()
})

app.listen(config.port, () => console.log(`http://localhost:${config.port}`))
