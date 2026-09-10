import config from './config.mjs'
import { search } from './search.mjs'
import { chatStream } from './ollama.mjs'
import { buildPrompt } from './prompt.mjs'

const q = process.argv.slice(2).join(' ').trim()
if (!q) {
  console.error('用法: npm run ask -- "你的问题"')
  process.exit(1)
}

try {
  const sources = await search(q)
  const prompt = buildPrompt({ q, sources })

  await chatStream([{ role: 'user', content: prompt }], config.chatModel, config.ollama, token => {
    process.stdout.write(token)
  })

  console.log('\n\n--- 参考来源 ---')
  sources.forEach(s => console.log(`  ${s.file}:${s.startLine}`))
} catch (e) {
  console.error('\n错误:', e.message || e)
  process.exit(1)
}
