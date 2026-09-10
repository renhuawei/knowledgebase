import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import config from './config.mjs'
import { walk, collectFile } from './chunk.mjs'
import { embed } from './ollama.mjs'

function md5(content) {
  return createHash('md5').update(content).digest('hex')
}

// 扫描所有文件，返回 { "<相对路径>": { hash } }
function scan(root) {
  const files = {}
  for (const file of walk(root)) {
    files[relative(root, file)] = { hash: md5(readFileSync(file, 'utf8')) }
  }
  return files
}

// 批量向量化（原地写入 embedding）
async function embedDocs(docs) {
  const texts = docs.map(d => d.text)
  const BATCH = 50
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    const embs = await embed(batch, config.embedModel, config.ollama)
    batch.forEach((_, j) => { docs[i + j].embedding = embs[j] })
    if (i % 500 === 0) console.log(`  ${Math.min(i + BATCH, texts.length)}/${texts.length}`)
  }
  return docs
}

// 增量构建索引：未变文件复用旧 embedding，只对变化/新增文件重新向量化
export async function buildIndex({ full = false } = {}) {
  const files = scan(config.root)
  console.log(`扫描 ${Object.keys(files).length} 个文件`)

  // 读旧索引（旧格式纯数组 → 视为无索引，全量重建）
  let oldFiles = null
  const oldDocsByFile = {}
  if (!full && existsSync(config.indexFile)) {
    try {
      const old = JSON.parse(readFileSync(config.indexFile, 'utf8'))
      if (!Array.isArray(old) && old.files && old.docs) {
        oldFiles = old.files
        for (const d of old.docs) (oldDocsByFile[d.file] ||= []).push(d)
      }
    } catch { /* 索引损坏则全量重建 */ }
  }

  const docs = []
  const changed = []
  for (const [rel, { hash }] of Object.entries(files)) {
    if (oldFiles && oldFiles[rel]?.hash === hash && oldDocsByFile[rel]) {
      docs.push(...oldDocsByFile[rel])   // 未变，复用
    } else {
      changed.push(rel)                  // 变化或新增
    }
  }

  console.log(`复用 ${docs.length} 个片段，${changed.length} 个文件需重建`)

  if (changed.length) {
    const newDocs = []
    for (const rel of changed) {
      newDocs.push(...collectFile(join(config.root, rel), config.root, config.chunk))
    }
    console.log(`新分块 ${newDocs.length} 个片段，开始向量化…`)
    await embedDocs(newDocs)
    docs.push(...newDocs)
  }

  docs.sort((a, b) => a.file.localeCompare(b.file) || a.part - b.part)

  writeFileSync(config.indexFile, JSON.stringify({
    root: config.root,
    updatedAt: new Date().toISOString(),
    files,
    docs,
  }))
  console.log(`完成，共 ${docs.length} 个片段 → ${config.indexFile}`)
}

// CLI 入口：node ingest.mjs [--full]
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const full = process.argv.includes('--full')
  buildIndex({ full }).catch(e => { console.error(e); process.exit(1) })
}
