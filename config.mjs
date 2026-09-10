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
  embedModel: process.env.EMBED_MODEL || 'bge-m3',   // 向量化模型（本地）
  ollama: process.env.OLLAMA_URL || 'http://localhost:11434',   // 本地 Ollama 地址（向量化用）
  chat: {
    provider: process.env.CHAT_PROVIDER || 'ollama',   // 'ollama' | 'openai'
    model: process.env.CHAT_MODEL || 'qwen3:4b',
    baseUrl: process.env.CHAT_BASE_URL || 'http://localhost:11434',   // openai 时填 https://xxx/v1
    apiKey: process.env.CHAT_API_KEY || '',
  },
  port: process.env.PORT || 3001,
  topK: 6,
  chunk: { size: 800, overlap: 200 },
}
