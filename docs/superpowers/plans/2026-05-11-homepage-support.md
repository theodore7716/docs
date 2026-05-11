# HomeSupport 首页改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `zh-CN/index.md` 的首页从 `HomeCards.vue` 替换为对标 Figma 设计的 `HomeSupport.vue`，集成 AI 问答 Modal 浮层与 9 大专题网格。

**Architecture:** 方案 B — `HomeSupport.vue` 作为编排组件，挂载 5 个 Section 子组件；AI Modal 通过 Vue `provide/inject` 在任意子组件触发；文档数量通过 VitePress build-time data loader 构建时统计，零运行时开销。

**Tech Stack:** VitePress 1.6, Vue 3 + `<script setup>` + TypeScript, CSS scoped，`bun run dev` / `bun run build`

**Figma source:** `cBCEXqoNoTBRzWmBj7L9ay` node `1:2`

---

## File Map

```
docs/.vitepress/
├── topic-counts.data.ts               [CREATE] build-time doc count loader
└── theme/
    ├── index.ts                       [MODIFY] 注册 HomeSupport
    └── components/
        ├── HomeSupport.vue            [CREATE] 编排组件 + AI Modal state
        ├── AIModal.vue                [CREATE] AI 对话浮层
        └── sections/
            ├── HeroSection.vue        [CREATE] Hero + 搜索框
            ├── FindWaysSection.vue    [CREATE] 三种方式卡片
            ├── AIFeatureSection.vue   [CREATE] AI 功能介绍
            ├── TopicsGrid.vue         [CREATE] 9 大专题网格
            └── FooterCTA.vue          [CREATE] Footer 召唤区

docs/zh-CN/index.md                    [MODIFY] 替换组件引用
```

---

## Task 1: Build-time 文档数量 Data Loader

**Files:**
- Create: `docs/.vitepress/topic-counts.data.ts`

- [ ] **Step 1: 创建 data loader 文件**

```ts
// docs/.vitepress/topic-counts.data.ts
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const TOPICS = [
  'getting-started', 'account', 'deposit', 'withdrawal',
  'transfers-and-fx', 'stock-trading', 'compliance-and-tax',
  'rewards', 'portfolio-and-statements',
] as const

export type TopicKey = typeof TOPICS[number]
export type TopicCounts = Record<TopicKey, number>

function countMdFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0
  let count = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countMdFiles(path.join(dir, entry.name))
    } else if (entry.name.endsWith('.md') && entry.name !== 'index.md') {
      count++
    }
  }
  return count
}

export default {
  load(): TopicCounts {
    const zhCNDir = path.resolve(__dirname, '../zh-CN')
    return Object.fromEntries(
      TOPICS.map(topic => [topic, countMdFiles(path.join(zhCNDir, topic))])
    ) as TopicCounts
  },
}
```

- [ ] **Step 2: 验证 data loader 能被正确识别**

```bash
bun run build 2>&1 | head -20
```

期望：无报错，正常完成构建（不需要完整构建成功，只需无 TS 错误）

- [ ] **Step 3: Commit**

```bash
git add docs/.vitepress/topic-counts.data.ts
git commit -m "feat: add build-time topic doc-count loader"
```

---

## Task 2: AIModal.vue

**Files:**
- Create: `docs/.vitepress/theme/components/AIModal.vue`

> ⚠️ **AI_ENDPOINT 需在实现时填入后端同学确认的接口地址。** 接口约定：POST JSON `{ query: string, history?: { role, content }[] }`，响应为 SSE 流，每行 `data: <text chunk>` 或 `data: [DONE]`。

- [ ] **Step 1: 创建 AIModal.vue**

```vue
<!-- docs/.vitepress/theme/components/AIModal.vue -->
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

// ⚠️ 替换为真实后端地址
const AI_ENDPOINT = '/api/ai/chat'

interface Message {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
}

const props = defineProps<{
  modelValue: boolean
  initialQuery?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

const inputRef = ref<HTMLTextAreaElement>()
const messagesRef = ref<HTMLDivElement>()
const query = ref('')
const messages = ref<Message[]>([])
const isLoading = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      messages.value = []
      query.value = ''
      return
    }
    nextTick(() => {
      if (props.initialQuery) {
        query.value = props.initialQuery
        submit()
      } else {
        inputRef.value?.focus()
      }
    })
  }
)

async function submit() {
  const text = query.value.trim()
  if (!text || isLoading.value) return

  messages.value.push({ role: 'user', content: text })
  query.value = ''
  isLoading.value = true

  const assistantMsg: Message = { role: 'assistant', content: '', loading: true }
  messages.value.push(assistantMsg)

  await nextTick()
  messagesRef.value?.scrollTo({ top: messagesRef.value.scrollHeight, behavior: 'smooth' })

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: text,
        history: messages.value.slice(0, -2).map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!res.body) throw new Error('No response body')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    assistantMsg.loading = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      // Parse SSE lines: "data: <text>" or "data: [DONE]"
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') break
        assistantMsg.content += data
      }
      await nextTick()
      messagesRef.value?.scrollTo({ top: messagesRef.value.scrollHeight, behavior: 'smooth' })
    }
  } catch (e) {
    assistantMsg.content = '抱歉，出现了错误，请稍后重试。'
    assistantMsg.loading = false
  } finally {
    isLoading.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="ai-modal-overlay" @click.self="close">
        <div class="ai-modal">
          <div class="ai-modal-header">
            <span class="ai-modal-title">AI 智能问答</span>
            <button class="ai-modal-close" @click="close" aria-label="关闭">✕</button>
          </div>

          <div ref="messagesRef" class="ai-modal-messages">
            <div v-if="messages.length === 0" class="ai-modal-empty">
              <div class="ai-modal-empty-icon">⚡</div>
              <p>输入你的问题，AI 将基于专业文档库为你解答</p>
            </div>
            <div
              v-for="(msg, i) in messages"
              :key="i"
              class="ai-msg"
              :class="msg.role"
            >
              <div class="ai-msg-bubble">
                <span v-if="msg.loading" class="ai-loading-dots">
                  <span /><span /><span />
                </span>
                <span v-else>{{ msg.content }}</span>
              </div>
            </div>
          </div>

          <div class="ai-modal-input-area">
            <textarea
              ref="inputRef"
              v-model="query"
              class="ai-modal-input"
              placeholder="输入问题，按 Enter 发送，Shift+Enter 换行…"
              rows="2"
              :disabled="isLoading"
              @keydown="onKeydown"
            />
            <button
              class="ai-modal-send"
              :disabled="isLoading || !query.trim()"
              @click="submit"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ai-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.ai-modal {
  background: var(--vp-c-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 680px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 80px rgba(0,0,0,0.2);
}
.ai-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}
.ai-modal-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--vp-c-text-1);
}
.ai-modal-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--vp-c-text-3);
  padding: 4px 8px;
  border-radius: 6px;
}
.ai-modal-close:hover { background: var(--vp-c-bg-soft); }
.ai-modal-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-modal-empty {
  text-align: center;
  color: var(--vp-c-text-3);
  padding: 40px 0;
}
.ai-modal-empty-icon { font-size: 32px; margin-bottom: 12px; }
.ai-msg { display: flex; }
.ai-msg.user { justify-content: flex-end; }
.ai-msg.assistant { justify-content: flex-start; }
.ai-msg-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.user .ai-msg-bubble {
  background: var(--vp-c-brand-1);
  color: white;
}
.assistant .ai-msg-bubble {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
.ai-loading-dots { display: inline-flex; gap: 4px; align-items: center; }
.ai-loading-dots span {
  width: 6px; height: 6px;
  background: var(--vp-c-text-3);
  border-radius: 50%;
  animation: bounce 1.2s infinite;
}
.ai-loading-dots span:nth-child(2) { animation-delay: .2s; }
.ai-loading-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}
.ai-modal-input-area {
  display: flex;
  gap: 8px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}
.ai-modal-input {
  flex: 1;
  resize: none;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  outline: none;
}
.ai-modal-input:focus { border-color: var(--vp-c-brand-1); }
.ai-modal-send {
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity .15s;
}
.ai-modal-send:disabled { opacity: 0.4; cursor: not-allowed; }

.modal-enter-active, .modal-leave-active { transition: opacity .2s; }
.modal-enter-active .ai-modal, .modal-leave-active .ai-modal { transition: transform .2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .ai-modal, .modal-leave-to .ai-modal { transform: translateY(16px); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add docs/.vitepress/theme/components/AIModal.vue
git commit -m "feat: add AIModal component with SSE streaming"
```

---

## Task 3: HeroSection.vue

**Files:**
- Create: `docs/.vitepress/theme/components/sections/HeroSection.vue`

- [ ] **Step 1: 创建 sections 目录并写 HeroSection.vue**

```bash
mkdir -p docs/.vitepress/theme/components/sections
```

```vue
<!-- docs/.vitepress/theme/components/sections/HeroSection.vue -->
<script setup lang="ts">
import { ref, inject } from 'vue'
import HomeBackground from '../HomeBackground.vue'

const openAIModal = inject<(query?: string) => void>('openAIModal')!

const query = ref('')

function handleSearch() {
  openAIModal(query.value.trim() || undefined)
}

function scrollToTopics() {
  document.getElementById('topics-section')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <section class="hero">
    <HomeBackground />
    <div class="hero-inner">
      <div class="hero-badge">✨ 长桥官方帮助中心 · AI 智答 · 持续更新</div>
      <h1 class="hero-h1">
        有问题，直接问<br>
        <span class="hero-accent">答案在这里</span>
      </h1>
      <p class="hero-sub">
        覆盖 A 股、期权、ETF、合规等 9 大主题的专业文档库，搭配 AI 问答助手，<br>
        让每一个金融问题都有迹可查。
      </p>
      <div class="hero-search-wrap">
        <input
          v-model="query"
          type="text"
          class="hero-input"
          placeholder="输入关键词或问题，如「如何打开杠杆」"
          @keydown.enter="handleSearch"
        />
        <button class="hero-search-btn" @click="handleSearch">搜索</button>
      </div>
      <div class="hero-actions">
        <button class="hero-btn-primary" @click="openAIModal()">
          ⚡ 向AI提问
        </button>
        <button class="hero-btn-outline" @click="scrollToTopics">
          浏览所有文档
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  padding: 80px 24px 72px;
  text-align: center;
  overflow: hidden;
}
.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto;
}
.hero-badge {
  display: inline-block;
  font-size: 13px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  padding: 4px 14px;
  border-radius: 20px;
  margin-bottom: 24px;
  font-weight: 500;
}
.hero-h1 {
  font-size: clamp(2.4rem, 6vw, 4rem);
  font-weight: 800;
  line-height: 1.15;
  color: var(--vp-c-text-1);
  margin: 0 0 20px;
  letter-spacing: -0.02em;
}
.hero-accent { color: var(--vp-c-brand-1); }
.hero-sub {
  font-size: 16px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin: 0 0 36px;
}
.hero-search-wrap {
  display: flex;
  max-width: 560px;
  margin: 0 auto 24px;
  background: var(--vp-c-bg);
  border: 1.5px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  transition: border-color .2s;
}
.hero-search-wrap:focus-within { border-color: var(--vp-c-brand-1); }
.hero-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 14px 18px;
  font-size: 15px;
  background: transparent;
  color: var(--vp-c-text-1);
}
.hero-search-btn {
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  padding: 0 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.hero-btn-primary {
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  padding: 12px 28px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}
.hero-btn-primary:hover { opacity: 0.88; }
.hero-btn-outline {
  background: transparent;
  color: var(--vp-c-brand-1);
  border: 1.5px solid var(--vp-c-brand-1);
  padding: 12px 28px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.hero-btn-outline:hover { background: var(--vp-c-brand-soft); }
@media (max-width: 640px) {
  .hero { padding: 60px 20px 52px; }
  .hero-sub br { display: none; }
  .hero-actions { flex-direction: column; align-items: center; }
}
</style>
```

- [ ] **Step 2: 启动 dev server 确认 Hero 能渲染（不报错即可，后续 Task 8 联调）**

```bash
bun run dev
```

预期：终端显示 `vitepress dev server running`，无 TS/Vue 编译错误

- [ ] **Step 3: Commit**

```bash
git add docs/.vitepress/theme/components/sections/HeroSection.vue
git commit -m "feat: add HeroSection with search and AI trigger"
```

---

## Task 4: FindWaysSection.vue

**Files:**
- Create: `docs/.vitepress/theme/components/sections/FindWaysSection.vue`

- [ ] **Step 1: 创建 FindWaysSection.vue**

```vue
<!-- docs/.vitepress/theme/components/sections/FindWaysSection.vue -->
<script setup lang="ts">
import { inject } from 'vue'

const openAIModal = inject<(query?: string) => void>('openAIModal')!

function triggerSearch() {
  const btn = document.querySelector<HTMLButtonElement>('.VPNavBarSearch button')
  btn?.click()
}

function scrollToTopics() {
  document.getElementById('topics-section')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <section class="find-ways">
    <div class="find-ways-inner">
      <div class="section-label">如何找到答案</div>
      <h2 class="find-ways-title">三种方式，找到你要的答案</h2>

      <div class="cards">
        <!-- 搜索文档 -->
        <div class="card">
          <div class="card-icon">🔍</div>
          <div class="card-tag">精准搜索</div>
          <h3 class="card-title">搜索文档</h3>
          <p class="card-desc">输入关键词，从 2,400+ 专业文档中精准匹配，支持标题与内容全文搜索。</p>
          <button class="card-btn" @click="triggerSearch">开始搜索 →</button>
        </div>

        <!-- AI 智能问答（高亮） -->
        <div class="card card--featured">
          <div class="card-tag card-tag--featured">推荐</div>
          <div class="card-icon">🤖</div>
          <h3 class="card-title card-title--featured">AI 智能问答</h3>
          <p class="card-desc card-desc--featured">用你的语言直接提问，AI 在专业文档库中检索，每次回答均标注来源文档。</p>
          <button class="card-btn card-btn--featured" @click="openAIModal()">向AI提问 →</button>
        </div>

        <!-- 按主题浏览 -->
        <div class="card">
          <div class="card-icon">📚</div>
          <div class="card-tag">系统浏览</div>
          <h3 class="card-title">按主题浏览</h3>
          <p class="card-desc">按 9 大主题出发，逐级深入查找所需内容，适合系统了解某一领域。</p>
          <button class="card-btn" @click="scrollToTopics">浏览分类 →</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.find-ways {
  padding: 72px 24px;
  background: var(--vp-c-bg-soft);
}
.find-ways-inner {
  max-width: 960px;
  margin: 0 auto;
  text-align: center;
}
.section-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--vp-c-brand-1);
  margin-bottom: 12px;
}
.find-ways-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 40px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  text-align: left;
}
.card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 28px;
  position: relative;
  display: flex;
  flex-direction: column;
}
.card--featured {
  background: #0f172a;
  border-color: var(--vp-c-brand-1);
}
.card-icon { font-size: 28px; margin-bottom: 12px; }
.card-tag {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--vp-c-text-3);
  margin-bottom: 8px;
}
.card-tag--featured {
  color: var(--vp-c-brand-1);
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0,184,184,.15);
  padding: 2px 8px;
  border-radius: 10px;
  letter-spacing: 0;
  text-transform: none;
  font-size: 12px;
}
.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 10px;
}
.card-title--featured { color: #fff; }
.card-desc {
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  flex: 1;
  margin: 0 0 20px;
}
.card-desc--featured { color: #94a3b8; }
.card-btn {
  background: none;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  cursor: pointer;
  text-align: left;
  transition: border-color .15s, color .15s;
  width: fit-content;
}
.card-btn:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
.card-btn--featured {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: transparent;
}
.card-btn--featured:hover { opacity: .88; color: white; }
@media (max-width: 768px) {
  .cards { grid-template-columns: 1fr; }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add docs/.vitepress/theme/components/sections/FindWaysSection.vue
git commit -m "feat: add FindWaysSection with three-way navigation cards"
```

---

## Task 5: AIFeatureSection.vue

**Files:**
- Create: `docs/.vitepress/theme/components/sections/AIFeatureSection.vue`

> 右侧 AI 对话界面用 CSS mockup 占位，待有真实截图时替换 `.ai-preview` 内容为 `<img>`。

- [ ] **Step 1: 创建 AIFeatureSection.vue**

```vue
<!-- docs/.vitepress/theme/components/sections/AIFeatureSection.vue -->
<script setup lang="ts">
import { inject } from 'vue'

const openAIModal = inject<(query?: string) => void>('openAIModal')!
</script>

<template>
  <section class="ai-feature">
    <div class="ai-feature-inner">
      <div class="ai-feature-text">
        <div class="section-label">AI 智能助手</div>
        <h2 class="ai-feature-h2">
          用自然语言提问，<br>秒级获得专业解答
        </h2>
        <ul class="ai-feature-list">
          <li>基于 2,400+ 专业文档实时检索，答案有据可查</li>
          <li>每日自动同步最新文档，信息始终准确</li>
          <li>支持追问与多轮对话，像咨询顾问一样交流</li>
          <li>内容经过合规筛查，验证合法合规性及投资风险</li>
        </ul>
        <button class="ai-feature-btn" @click="openAIModal()">
          ⚡ 立即体验 AI 助手
        </button>
      </div>

      <!-- AI 对话界面 mockup（替换为真实截图时删除此注释并修改内部内容） -->
      <div class="ai-preview" aria-hidden="true">
        <div class="ai-preview-bar">
          <span class="dot" /><span class="dot" /><span class="dot" />
          <span class="ai-preview-title">AI 问答助手</span>
        </div>
        <div class="ai-preview-body">
          <div class="preview-msg user-msg">Theta 值如何影响我的期权持仓？</div>
          <div class="preview-msg ai-msg">
            Theta 表示期权每日时间价值损耗。买方持有期权时，随时间流逝 Theta
            会持续侵蚀期权价值；卖方则相反，时间流逝对其有利…
            <div class="preview-source">📄 期权交易手册 · 第 3 章</div>
          </div>
          <div class="preview-msg user-msg">那我应该如何对冲？</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ai-feature {
  padding: 80px 24px;
}
.ai-feature-inner {
  max-width: 960px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}
.section-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--vp-c-brand-1);
  margin-bottom: 12px;
}
.ai-feature-h2 {
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.3;
  margin: 0 0 24px;
}
.ai-feature-list {
  list-style: none;
  padding: 0;
  margin: 0 0 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-feature-list li {
  font-size: 14px;
  color: var(--vp-c-text-2);
  padding-left: 22px;
  position: relative;
  line-height: 1.6;
}
.ai-feature-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--vp-c-brand-1);
  font-weight: 700;
}
.ai-feature-btn {
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  padding: 12px 28px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}
.ai-feature-btn:hover { opacity: .88; }

/* AI 对话 mockup */
.ai-preview {
  background: #0f172a;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,.2);
}
.ai-preview-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: #1e293b;
}
.dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #475569;
}
.ai-preview-title {
  font-size: 13px;
  color: #94a3b8;
  margin-left: 8px;
}
.ai-preview-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.preview-msg {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
}
.user-msg {
  background: #1e293b;
  color: #e2e8f0;
  align-self: flex-end;
  max-width: 80%;
}
.ai-msg {
  background: #065f46;
  color: #a7f3d0;
  max-width: 90%;
}
.preview-source {
  font-size: 11px;
  color: #6ee7b7;
  margin-top: 8px;
  opacity: .8;
}
@media (max-width: 768px) {
  .ai-feature-inner { grid-template-columns: 1fr; gap: 36px; }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add docs/.vitepress/theme/components/sections/AIFeatureSection.vue
git commit -m "feat: add AIFeatureSection with feature list and chat mockup"
```

---

## Task 6: TopicsGrid.vue

**Files:**
- Create: `docs/.vitepress/theme/components/sections/TopicsGrid.vue`

- [ ] **Step 1: 创建 TopicsGrid.vue**

```vue
<!-- docs/.vitepress/theme/components/sections/TopicsGrid.vue -->
<script setup lang="ts">
import { withBase } from 'vitepress'
import { data as topicCounts } from '../../../topic-counts.data'
import type { TopicKey } from '../../../topic-counts.data'

interface Topic {
  key: TopicKey
  icon: string
  label: string
  desc: string
}

const TOPICS: Topic[] = [
  { key: 'getting-started',          icon: '⚡', label: '新手入门',     desc: '开户、KYC 核验、首笔交易完整流程' },
  { key: 'account',                  icon: '👤', label: '开户与账户',   desc: '账户类型、费率权益、安全设置' },
  { key: 'deposit',                  icon: '⬇️', label: '入金',         desc: 'eDDA、FPS、电汇等所有入金方式' },
  { key: 'withdrawal',               icon: '⬆️', label: '出金',         desc: '出金操作步骤与到账时间说明' },
  { key: 'transfers-and-fx',         icon: '↔️', label: '资金划转与换汇', desc: '账户间转账与多币种外汇兑换' },
  { key: 'stock-trading',            icon: '📈', label: '股票交易',     desc: '交易时间、费用、订单类型全覆盖' },
  { key: 'compliance-and-tax',       icon: '🛡️', label: '合规与税务',   desc: '监管文件、合规要求、税务说明' },
  { key: 'rewards',                  icon: '🎁', label: '活动与奖励',   desc: '任务中心、邀请奖励、积分兑换' },
  { key: 'portfolio-and-statements', icon: '📋', label: '资产与账单',   desc: '持仓查看、账单下载、报表说明' },
]
</script>

<template>
  <section id="topics-section" class="topics">
    <div class="topics-inner">
      <div class="section-label">专题</div>
      <h2 class="topics-title">9 大专题，系统覆盖</h2>

      <div class="topics-grid">
        <a
          v-for="topic in TOPICS"
          :key="topic.key"
          :href="withBase(`/${topic.key}/`)"
          class="topic-card"
        >
          <div class="topic-card-top">
            <span class="topic-icon">{{ topic.icon }}</span>
            <span class="topic-count">{{ topicCounts[topic.key] }} 篇</span>
          </div>
          <h3 class="topic-label">{{ topic.label }}</h3>
          <p class="topic-desc">{{ topic.desc }}</p>
          <span class="topic-link">浏览文档 →</span>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.topics {
  padding: 72px 24px;
  background: var(--vp-c-bg-soft);
}
.topics-inner {
  max-width: 960px;
  margin: 0 auto;
}
.section-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--vp-c-brand-1);
  margin-bottom: 12px;
}
.topics-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 36px;
}
.topics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.topic-card {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  padding: 22px;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  transition: border-color .15s, box-shadow .15s, transform .15s;
}
.topic-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 4px 20px rgba(0,184,184,.1);
  transform: translateY(-2px);
}
.topic-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.topic-icon { font-size: 22px; }
.topic-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  padding: 2px 8px;
  border-radius: 10px;
}
.topic-label {
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 6px;
}
.topic-desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  flex: 1;
  margin: 0 0 14px;
}
.topic-link {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}
@media (max-width: 768px) {
  .topics-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .topics-grid { grid-template-columns: 1fr; }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add docs/.vitepress/theme/components/sections/TopicsGrid.vue
git commit -m "feat: add TopicsGrid with dynamic doc counts"
```

---

## Task 7: FooterCTA.vue

**Files:**
- Create: `docs/.vitepress/theme/components/sections/FooterCTA.vue`

- [ ] **Step 1: 创建 FooterCTA.vue**

```vue
<!-- docs/.vitepress/theme/components/sections/FooterCTA.vue -->
<script setup lang="ts">
import { inject } from 'vue'
import { withBase } from 'vitepress'

const openAIModal = inject<(query?: string) => void>('openAIModal')!
</script>

<template>
  <section class="footer-cta">
    <div class="footer-cta-inner">
      <div class="section-label">随时随地</div>
      <h2 class="footer-cta-h2">
        你的金融问题，<br>这里都有答案
      </h2>
      <p class="footer-cta-sub">
        无论你是证券投资新人还是进阶投资者，这里都能找到专业、权威、翔实的金融知识。
      </p>
      <div class="footer-cta-actions">
        <button class="cta-btn-primary" @click="openAIModal()">
          ⚡ 向AI提问
        </button>
        <a :href="withBase('/getting-started/')" class="cta-btn-outline">
          浏览文档库
        </a>
      </div>
      <div class="footer-stats">
        <div class="stat-item">
          <span class="stat-num">2,400+</span>
          <span class="stat-label">专业文档</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-num">AI</span>
          <span class="stat-label">智能助手</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-num">✓</span>
          <span class="stat-label">合规审计保障</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.footer-cta {
  padding: 80px 24px;
  text-align: center;
}
.footer-cta-inner { max-width: 600px; margin: 0 auto; }
.section-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--vp-c-brand-1);
  margin-bottom: 12px;
}
.footer-cta-h2 {
  font-size: 32px;
  font-weight: 800;
  color: var(--vp-c-text-1);
  line-height: 1.25;
  margin: 0 0 16px;
}
.footer-cta-sub {
  font-size: 15px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin: 0 0 36px;
}
.footer-cta-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 40px;
}
.cta-btn-primary {
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  padding: 12px 28px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
  text-decoration: none;
}
.cta-btn-primary:hover { opacity: .88; }
.cta-btn-outline {
  background: transparent;
  color: var(--vp-c-brand-1);
  border: 1.5px solid var(--vp-c-brand-1);
  padding: 12px 28px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: background .15s;
}
.cta-btn-outline:hover { background: var(--vp-c-brand-soft); }
.footer-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 28px;
}
.stat-num {
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.2;
}
.stat-label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-top: 4px;
}
.stat-divider {
  width: 1px;
  height: 32px;
  background: var(--vp-c-divider);
}
@media (max-width: 480px) {
  .footer-cta-actions { flex-direction: column; align-items: center; }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add docs/.vitepress/theme/components/sections/FooterCTA.vue
git commit -m "feat: add FooterCTA section"
```

---

## Task 8: HomeSupport.vue（编排组件）

**Files:**
- Create: `docs/.vitepress/theme/components/HomeSupport.vue`

- [ ] **Step 1: 创建 HomeSupport.vue**

```vue
<!-- docs/.vitepress/theme/components/HomeSupport.vue -->
<script setup lang="ts">
import { ref, provide } from 'vue'
import AIModal from './AIModal.vue'
import HeroSection from './sections/HeroSection.vue'
import FindWaysSection from './sections/FindWaysSection.vue'
import AIFeatureSection from './sections/AIFeatureSection.vue'
import TopicsGrid from './sections/TopicsGrid.vue'
import FooterCTA from './sections/FooterCTA.vue'

const modalOpen = ref(false)
const initialQuery = ref<string | undefined>(undefined)

function openAIModal(query?: string) {
  initialQuery.value = query
  modalOpen.value = true
}

provide('openAIModal', openAIModal)
</script>

<template>
  <div class="home-support">
    <HeroSection />
    <FindWaysSection />
    <AIFeatureSection />
    <TopicsGrid />
    <FooterCTA />

    <AIModal v-model="modalOpen" :initial-query="initialQuery" />
  </div>
</template>

<style scoped>
.home-support {
  width: 100%;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add docs/.vitepress/theme/components/HomeSupport.vue
git commit -m "feat: add HomeSupport orchestrator component"
```

---

## Task 9: 注册组件并切换首页

**Files:**
- Modify: `docs/.vitepress/theme/index.ts`
- Modify: `docs/zh-CN/index.md`

- [ ] **Step 1: 在 index.ts 注册 HomeSupport**

在 `docs/.vitepress/theme/index.ts` 中：

```ts
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './vars.css'
import './sidebar.css'
import Layout from './layouts/Layout.vue'
import HomeCards from './components/HomeCards.vue'
import HomeSupport from './components/HomeSupport.vue'   // ← 新增
import HomeCardsA from './components/HomeCards_A.vue'
import HomeCardsB from './components/HomeCards_B.vue'
import HomeCardsC from './components/HomeCards_C.vue'
import Tabs from './components/Tabs.vue'
import TabItem from './components/TabItem.vue'
import LinkGraph from './components/LinkGraph.vue'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('HomeCards', HomeCards)
    app.component('HomeSupport', HomeSupport)            // ← 新增
    app.component('HomeCardsA', HomeCardsA)
    app.component('HomeCardsB', HomeCardsB)
    app.component('HomeCardsC', HomeCardsC)
    app.component('Tabs', Tabs)
    app.component('TabItem', TabItem)
    app.component('LinkGraph', LinkGraph)
  },
} satisfies Theme
```

- [ ] **Step 2: 修改 zh-CN/index.md 切换组件**

将 `docs/zh-CN/index.md` 改为：

```md
---
layout: page
sidebar: false
---

<HomeSupport />
```

- [ ] **Step 3: 启动 dev server 完整验证**

```bash
bun run dev
```

在浏览器打开 `http://localhost:5173`，依次验证：
1. Hero 区域显示正确：标题、搜索框、两个按钮
2. 点击「向AI提问」→ AI Modal 弹出（内容为空 query）
3. 在搜索框输入文字 → 回车 → Modal 弹出且 query 预填
4. FindWays 三张卡片正确显示，中间卡片深色背景
5. AIFeatureSection 左文右图布局
6. TopicsGrid 9 张卡片，每张显示文档数量（数字 > 0）
7. FooterCTA 底部显示，「向AI提问」能触发 Modal
8. 响应式：缩小浏览器到 <768px，网格切换为单列

- [ ] **Step 4: 构建验证**

```bash
bun run build 2>&1 | tail -20
```

预期：`build complete` 无报错

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/theme/index.ts docs/zh-CN/index.md
git commit -m "feat: switch zh-CN homepage to HomeSupport

Replace HomeCards with new HomeSupport component based on Figma design.
Includes Hero, FindWays, AIFeature, TopicsGrid and FooterCTA sections.
AI Modal wired up with provide/inject, doc counts from build-time loader."
```

---

## Self-Review Checklist

- [x] **Spec coverage**: Hero ✓, FindWays ✓, AIFeature ✓, TopicsGrid ✓, FooterCTA ✓, AI Modal ✓, 最火热榜 (intentionally excluded per spec) ✓, 9 topics ✓, dynamic counts ✓, provide/inject state ✓
- [x] **No placeholders**: `AI_ENDPOINT` 是唯一 TBD，已明确注释位置和格式约定
- [x] **Type consistency**: `TopicKey` / `TopicCounts` 在 Task 1 定义，Task 6 正确 import；`openAIModal: (query?: string) => void` 在 Task 8 provide，Tasks 3/4/5/7 正确 inject
- [x] **`id="topics-section"`**: Tasks 3 和 4 中 `scrollToTopics()` 都用 `topics-section`，Task 6 中 `<section id="topics-section">` 确认对应
