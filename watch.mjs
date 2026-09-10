import { watch } from 'node:fs'
import config from './config.mjs'
import { buildIndex } from './ingest.mjs'

let timer = null
let building = false

async function run() {
  if (building) { schedule(); return }
  building = true
  try {
    console.log('\n[watch] 检测到变更，增量更新…')
    await buildIndex({ full: false })
  } catch (e) {
    console.error('[watch] 更新失败:', e)
  } finally {
    building = false
  }
}

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(run, 500)   // 防抖合并批量变更
}

console.log(`[watch] 监听 ${config.root}`)
watch(config.root, { recursive: true }, (event, filename) => {
  console.log(`[watch] ${event} ${filename}`)
  schedule()
})
