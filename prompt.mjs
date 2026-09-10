// 拼 RAG prompt（server 与 CLI 共用）
export function buildPrompt({ q, sources, history = [] }) {
  const context = sources
    .map((t, i) => `[来源${i + 1}] ${t.file}${t.startLine ? `:${t.startLine}` : ''}\n${t.text}`)
    .join('\n\n')

  const historyText = history.length
    ? history.map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`).join('\n')
    : ''

  return [
    '你是代码/文档问答助手，只根据下面资料回答，资料里没有就说不知道。回答末尾列出参考来源。',
    historyText ? `\n历史对话：\n${historyText}` : '',
    `\n资料：\n${context}`,
    `\n问题：${q}\n\n回答：`,
  ].join('\n')
}
