// 本地 Ollama 向量化（生成端见 chat.mjs）
export async function embed(texts, model, base) {
  const res = await fetch(`${base}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: texts }),
  })
  if (!res.ok) throw new Error(`embed failed: ${res.status}`)
  return (await res.json()).embeddings
}
