import config from './config.mjs'

// 统一的流式生成入口：根据 config.chat.provider 分发到本地 Ollama 或 OpenAI 兼容云端
export async function chatStream(messages, onToken) {
  const { provider, model, baseUrl, apiKey } = config.chat
  return provider === 'openai'
    ? openaiStream(messages, model, baseUrl, apiKey, onToken)
    : ollamaStream(messages, model, baseUrl, onToken)
}

async function ollamaStream(messages, model, base, onToken) {
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: true, messages }),
  })
  if (!res.ok) throw new Error(`chat failed: ${res.status}`)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (!line.trim()) continue
      const token = JSON.parse(line).message?.content ?? ''
      if (token) onToken(token)
    }
  }
}

async function openaiStream(messages, model, base, apiKey, onToken) {
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, stream: true, messages }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`chat failed: ${res.status} ${err.slice(0, 200)}`)
  }
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      const s = line.trim()
      if (!s.startsWith('data:')) continue
      const data = s.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const j = JSON.parse(data)
        const token = j.choices?.[0]?.delta?.content ?? ''
        if (token) onToken(token)
      } catch { /* 忽略无法解析的行 */ }
    }
  }
}
