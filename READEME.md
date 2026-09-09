# knowledgebase — 本地代码知识库

面向开发工作的小型知识库：把你的代码/文档向量化，用本地大模型做检索式问答（RAG）。
纯 JS 实现，无 Python，8G 内存的 Mac mini 即可跑。

## 架构（MVP）

代码目录 → 分块 → Ollama 向量化 → index.json
↓
问题 → 向量化 → 余弦检索 topK → 拼上下文 → Ollama 流式回答（SSE）→ 浏览器


## 目录结构

kb/
├── package.json
├── config.mjs        # 配置（路径/模型/端口）
├── ollama.mjs        # embed + 流式 chat 封装
├── chunk.mjs         # 遍历 + 分块
├── ingest.mjs        # 建索引
├── search.mjs        # 检索（余弦 topK）
├── server.mjs        # SSE 流式服务
└── web/index.html    # 最小 UI

## 前置要求

- macOS + Node.js ≥ 18（自带 `fetch`）
- Homebrew

## 安装

### 1. 全局安装 Ollama（一次）

```bash
brew install ollama
brew services start ollama        # 开机自启并后台运行
# 或手动：ollama serve
```
### 2. 拉取模型（全局一次，所有项目共用）

ollama pull bge-m3        # 向量化模型（中英混排好）
ollama pull qwen2.5:3b    # 回答模型（8G 能常驻）
# 纯英文代码可把 bge-m3 换成更小的 nomic-embed-text
### 3. 安装项目依赖（本地，不要 -g）

cd knowledgebase
npm i

## 使用
建索引（代码改动后需重跑）

npm run index
启动服务

npm run serve
打开 http://localhost:3001 ，在输入框提问，例如：
	•	「切换报告走哪条链路」
	•	「图片管理怎么实现的」

命令行测试接口
curl -X POST localhost:3001/api/ask \
  -H 'Content-Type: application/json' \
  -d '{"q":"切换报告走哪条链路"}'
