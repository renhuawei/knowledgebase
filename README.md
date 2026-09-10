# knowledgebase — 本地代码知识库

面向开发工作的小型知识库：把你的代码/文档向量化，用本地大模型做检索式问答（RAG）。
纯 JS 实现，无 Python，8G 内存的 Mac mini 即可跑。
RAG 的核心其实就 4 步：分块 → 向量化 → 余弦检索 → 拼 prompt 生成。

## 架构

```
代码目录 → 函数级分块 → Ollama 向量化 → index.json
                                      ↓
问题 → 向量化 → 余弦检索 topK → 拼上下文(含历史) → Ollama 流式回答(SSE) → 浏览器 / 终端
```

特性：
- **增量索引**：只对改动的文件重新向量化，未变文件复用旧 embedding
- **函数级分块**：按顶层声明切分，来源可定位到 `文件:行号`（点击跳 VSCode）
- **多轮对话**：单会话带历史，支持连续追问
- **终端 CLI**：不开浏览器直接问

## 目录结构

```
kb/
├── package.json
├── config.mjs        # 配置（路径/模型/端口，读 .env）
├── .env              # 本地环境变量（被 git 忽略）
├── ollama.mjs        # 本地向量化 embed
├── chat.mjs          # 流式生成（本地 Ollama / 云端 OpenAI 兼容）
├── chunk.mjs         # 遍历 + 函数级分块
├── prompt.mjs        # RAG prompt 拼接（server/CLI 共用）
├── ingest.mjs        # 增量建索引（buildIndex 可复用）
├── watch.mjs         # 文件监听，自动增量更新
├── search.mjs        # 检索（余弦 topK）
├── ask.mjs           # 终端 CLI
├── server.mjs        # SSE 流式服务（多轮会话）
└── web/index.html    # 对话 UI
```

## 前置要求

- macOS + Node.js ≥ 18（自带 `fetch`）
- Homebrew

## 安装

### 1. 全局安装 Ollama（一次）

```bash
brew install ollama
brew services start ollama        # 开机自启并后台运行
```

### 2. 拉取模型（全局一次，所有项目共用）

```bash
ollama pull bge-m3        # 向量化模型（中英混排好）
ollama pull qwen3:4b      # 本地回答模型；若生成端走云端则可跳过
```

### 3. 安装项目依赖

```bash
cd knowledgebase
npm i
```

### 4. 配置 `.env`

复制一份 `.env`，填入代码目录和模型。生成端默认走本地 Ollama，也可切云端（OpenAI 兼容）：

```bash
CODE_ROOT=/path/to/your/code/src
EMBED_MODEL=bge-m3

# 本地生成（默认）
CHAT_PROVIDER=ollama
CHAT_MODEL=qwen3:4b

# 切云端（示例 DeepSeek，取消注释并填 key）
# CHAT_PROVIDER=openai
# CHAT_MODEL=deepseek-chat
# CHAT_BASE_URL=https://api.deepseek.com/v1
# CHAT_API_KEY=sk-xxx
```

## 使用

```bash
npm run index              # 建索引（增量；加 --full 强制全量）
npm run ask -- "切换报告走哪条链路"   # 终端直接问
npm run serve              # 起 Web 服务，打开 http://localhost:3001
npm run watch              # 监听代码目录，改动自动增量更新
```

Web 页面支持多轮追问，来源标签显示 `文件:行号`，点击跳转 VSCode。

命令行测试接口：

```bash
curl -X POST localhost:3001/api/ask \
  -H 'Content-Type: application/json' \
  -d '{"q":"切换报告走哪条链路","session":"default"}'
```
