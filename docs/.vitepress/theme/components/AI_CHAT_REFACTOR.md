# AI Chat 消息数据结构重构

把 `Message` 从「`role + content` 单字符串」改造为「`id + role + parts[]`」的多 part 形态，对齐 Vercel AI SDK `UIMessage` 与业界主流 chat 协议。本期只动数据结构与渲染层，附件上传 UI 仍保持 disabled。

---

## 1. 问题

变更前 `Message` 接口（`composables/useAIModal.ts`）：

```ts
interface Message {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  final?: boolean
}
```

它在三个地方与下游代码硬耦合：

| 位置 | 耦合方式 |
|------|---------|
| `AiChatDrawer.vue` 渲染 | 用户气泡 `{{ msg.content }}`；助手气泡 `MarkdownRender :content="msg.content"` |
| `AiChatDrawer.vue` 提交 | `body: JSON.stringify({ message: trimmed })` |
| `AiChatDrawer.vue` 流式累加 | `assistantMsg.content += piece` |

直接后果：输入框右下角的附件按钮长期 `disabled`，因为消息模型根本没有承载图片/文件的位置——按钮 UI 做了没有意义。

---

## 2. 根本原因

### 2.1 内容载体单一
`content: string` 把所有消息内容压成一段纯文本。任何非纯文本的内容形态——图片、PDF、tool-call、引用块、富文本片段——都无处安放。这是表面问题的源头。

### 2.2 消息无稳定 ID
没有 `id` 字段意味着：复制、重试、未来的"在这条消息上分叉"全部依赖数组下标。数组下标会随插入/删除/清空漂移，是脆弱的引用方式。

### 2.3 与业界协议割裂
Vercel AI SDK 的 `UIMessage`、OpenAI Chat Completions 的多模态 `content` 数组、Anthropic Messages 的 `content` block 列表，**都**收敛到「每条 message 是一组打了 `type` 标签的 part」这一形态。当前接口形态既无法直接对接这些 SDK，也无法消费后端推过来的 file / tool-call / citation 等结构化块。

> 三个缺陷里 2.1 是直接病因，2.2 是被掩盖的隐患，2.3 是阻断未来演进的天花板。

---

## 3. 目标形态

```ts
type TextPart = { type: 'text'; text: string }
type FilePart = { type: 'file'; mediaType: string; url: string; filename?: string }
type MessagePart = TextPart | FilePart

interface Message {
  id: string
  role: 'user' | 'assistant'
  parts: MessagePart[]
  loading?: boolean
  final?: boolean
}
```

请求体：

```json
{
  "message": {
    "id": "msg_xxx",
    "role": "user",
    "parts": [
      { "type": "text", "text": "这张截图是什么意思？" },
      { "type": "file", "mediaType": "image/png", "url": "data:image/png;base64,..." }
    ]
  }
}
```

---

## 4. 实施改动

### 4.1 `composables/useAIModal.ts`
- 重新导出 `TextPart` / `FilePart` / `MessagePart` / `Message`。
- 新增 `newMessageId()` —— 本地生成稳定 id。
- 新增 `messageText(msg)` —— 把 `parts` 里的 text 部分按序拼接，供复制、a11y、错误兜底使用。
- localStorage key 从 `lb-ai-chat` 改为 `lb-ai-chat-v2`，旧数据丢弃（无版本迁移代码，简洁）。

### 4.2 `components/AiChatDrawer.vue`

| 改造点 | 旧 | 新 |
|--------|----|----|
| 用户气泡渲染 | `{{ msg.content }}` | 遍历 `msg.parts`，text/image/file 分别渲染 |
| 助手气泡渲染 | `MarkdownRender :content="msg.content"` | `MarkdownRender :content="messageText(msg)"`，附带 file part 渲染 |
| loading 判定 | `msg.loading && !msg.content` | `msg.loading && !msg.parts.length` |
| 流式累加 | `assistantMsg.content += piece` | `appendAssistantText(msg, piece)`（尾部 text part 追加，否则新建） |
| 提交 body | `{ message: string }` | `{ message: { id, role, parts } }` |
| 复制 | `copy(msg.content, index)` | `copy(msg)` 内部走 `messageText(msg)` |
| 重试 | 按下标定位 user 消息 | 按 assistant `id` 反查上一条 user 消息，拷贝 parts 重发 |
| `:key` | 数组下标 `i` | 稳定的 `msg.id` |
| 错误兜底 | `assistantMsg.content = ... || t('ai.error')` | 若 `messageText(msg)` 为空，则 `appendAssistantText(msg, t('ai.error'))` |

### 4.3 样式
新增 `.ai-msg-text` / `.ai-msg-image` / `.ai-msg-file`（含 user 气泡上的反白版本），为 file part 渲染提供视觉容器。

### 4.4 不动的语义
- 仅发送当前一条 user message（不带历史）—— 维持原有简化策略。
- 流式协议：保留对 `text-delta` / `delta` / `delta.content` / `content` / `text` 字段的兼容解析，`[DONE]` 终结不变。
- 附件按钮维持 disabled。

---

## 5. 扩展点

未来要把任何新内容类型接进来，只需顺着 part 的形态扩三处：

1. `MessagePart` 联合类型补一个变体（例：`ToolCallPart`、`CitationPart`、`AudioPart`）。
2. `appendAssistantText` 旁加一个 `appendAssistantXxx` 或在解析分支里 push 对应 part。
3. 用户/助手气泡的渲染 `template` 里加一个 `v-else-if="part.type === 'xxx'"` 分支。

请求体、`messageText`、`localStorage` 序列化、`retry`、`copy`、`clearMessages`——这六处都不用动。这就是把字符串拆成结构化数组带来的杠杆。

---

## 6. 文件清单

- `docs/.vitepress/theme/composables/useAIModal.ts` —— 类型 / 工具函数 / 存储
- `docs/.vitepress/theme/components/AiChatDrawer.vue` —— 渲染 / 提交 / 流式累加 / 重试 / 复制 / 样式
- `docs/.vitepress/theme/components/AI_CHAT_REFACTOR.md` —— 本报告
