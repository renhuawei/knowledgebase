import { writeFileSync } from 'node:fs'
import config from './config.mjs'
import { collect } from './chunk.mjs'
import { embed } from './ollama.mjs'

async function main() {
  console.log('扫描文件…')
  const docs = collect(config.root, config.chunk)
  console.log(`共 ${docs.length} 个片段，开始向量化…`)

  const texts = docs.map(d => d.text)
  const embeddings = []
  const BATCH = 50
  for (let i = 0; i < texts.length; i += BATCH) {
    embeddings.push(...await embed(texts.slice(i, i + BATCH), config.embedModel, config.ollama))
    if (i % 500 === 0) console.log(`  ${Math.min(i + BATCH, texts.length)}/${texts.length}`)
  }

  embeddings.forEach((e, i) => (docs[i].embedding = e))
  writeFileSync(config.indexFile, JSON.stringify(docs))
  console.log(`完成，索引已写入 ${config.indexFile}`)
}
main().catch(e => { console.error(e); process.exit(1) })
