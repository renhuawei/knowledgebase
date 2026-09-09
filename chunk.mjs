import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'

const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.md', '.json'])
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next'])

export function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (EXTS.has(extname(name))) out.push(p)
  }
  return out
}

// 启发式分块：固定大小 + 重叠（v1 换 tree-sitter 按函数切）
export function chunk(text, size = 800, overlap = 200) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    chunks.push(text.slice(start, start + size))
    if (start + size >= text.length) break
    start += size - overlap
  }
  return chunks
}

export function collect(root, { size, overlap }) {
  const files = walk(root)
  const docs = []
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    if (content.trim().length < 20) continue
    for (const [i, c] of chunk(content, size, overlap).entries()) {
      docs.push({ id: `${file}#${i}`, file: relative(root, file), part: i, text: c })
    }
  }
  return docs
}
