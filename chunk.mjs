import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'

const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.md', '.json'])
const CODE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx'])
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

// 定长分块（无行号）
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

// 定长分块 + 行号（非代码文件、超长代码块用；行号按换行数近似）
function chunkWithLines(text, size, overlap, startLine) {
  const out = []
  let start = 0, line = startLine
  while (start < text.length) {
    const piece = text.slice(start, start + size)
    const nLines = piece.split('\n').length
    out.push({ text: piece, startLine: line, endLine: line + nLines - 1 })
    if (start + size >= text.length) break
    start += size - overlap
    line += nLines - 1
  }
  return out
}

// 判断是否为顶层声明行（行首缩进 ≤ 2 空格）
function isDeclarationLine(line) {
  if (line.match(/^\s*/)[0].length > 2) return false
  const code = line.trim()
  if (!code) return false
  return [
    /^export\s+default\s+(async\s+)?(function|class|interface|enum)\b/,
    /^(export\s+)?(async\s+)?function\b/,
    /^(export\s+)?class\b/,
    /^(export\s+)?interface\b/,
    /^(export\s+)?(const\s+)?enum\b/,
    /^(export\s+)?type\s+[\w$]+\s*=/,
    /^(export\s+)?(const|let|var)\s+[\w$]+\s*=/,
  ].some(re => re.test(code))
}

// 函数级分块：按顶层声明切，超长块回退定长。返回 [{text, startLine, endLine}]
export function splitByDeclarations(text, { size, overlap }) {
  const lines = text.split('\n')
  const out = []
  let start = 0
  const emit = (end) => {
    const blockText = lines.slice(start, end).join('\n')
    if (!blockText.trim()) return
    if (blockText.length > 1200) {
      out.push(...chunkWithLines(blockText, size, overlap, start + 1))
    } else {
      out.push({ text: blockText, startLine: start + 1, endLine: end })
    }
  }
  for (let i = 0; i < lines.length; i++) {
    if (i > start && isDeclarationLine(lines[i])) {
      emit(i)
      start = i
    }
  }
  emit(lines.length)
  return out
}

// 单个文件分块（返回 docs，不含 embedding）
export function collectFile(file, root, { size, overlap }) {
  const content = readFileSync(file, 'utf8')
  if (content.trim().length < 20) return []
  const rel = relative(root, file)
  const isCode = CODE_EXTS.has(extname(file))
  const pieces = isCode
    ? splitByDeclarations(content, { size, overlap })
    : chunkWithLines(content, size, overlap, 1)
  return pieces.map((p, i) => ({
    id: `${rel}#${i}`, file: rel, part: i,
    startLine: p.startLine, endLine: p.endLine, text: p.text,
  }))
}

export function collect(root, opts) {
  const docs = []
  for (const file of walk(root)) docs.push(...collectFile(file, root, opts))
  return docs
}
