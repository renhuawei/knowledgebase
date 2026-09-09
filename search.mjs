import { readFileSync } from 'node:fs'
import config from './config.mjs'
import { embed } from './ollama.mjs'

const docs = JSON.parse(readFileSync(config.indexFile, 'utf8'))

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2 }
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

export async function search(query) {
  const [qv] = await embed([query], config.embedModel, config.ollama)
  return docs
    .map(d => ({ ...d, score: cosine(qv, d.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, config.topK)
}
