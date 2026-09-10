import { readFileSync, existsSync } from 'node:fs'

// 加载 .env（不依赖 dotenv，任何 Node 版本可用；已存在的环境变量优先，不被覆盖）
const envFile = new URL('./.env', import.meta.url)
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

export default {
  root: process.env.CODE_ROOT || './src',   // 代码目录（可用环境变量 CODE_ROOT 覆盖）
  indexFile: process.env.INDEX_FILE || './index.json',
  embedModel: process.env.EMBED_MODEL || 'bge-m3',   // 中文好
  chatModel: process.env.CHAT_MODEL || 'qwen2.5:7b', // 8G 可跑 7b；省内存改 3b
  ollama: 'http://localhost:11434',
  port: process.env.PORT || 3001,
  topK: 6,
  chunk: { size: 800, overlap: 200 },
}
