<!-- docs/.vitepress/theme/components/AIModal.vue -->
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const AI_ENDPOINT = import.meta.env.VITE_AI_API_ENDPOINT || '/api/ai/v1/invoke'

const AI_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'account-channel': import.meta.env.VITE_AI_ACCOUNT_CHANNEL,
  'app-id': import.meta.env.VITE_AI_APP_ID,
  'X-Agent-Key': import.meta.env.VITE_AI_AGENT_KEY,
}

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
      isLoading.value = false
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
      headers: AI_HEADERS,
      body: JSON.stringify({ message: text }),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!res.body) throw new Error('No response body')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let firstChunk = true

    outer: while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') break outer

        let piece: string
        try {
          const parsed = JSON.parse(data)
          if (parsed && typeof parsed === 'object') {
            piece = parsed.delta?.content
              ?? parsed.delta
              ?? parsed.content
              ?? parsed.text
              ?? parsed.message
              ?? parsed.data
              ?? parsed.output
              ?? ''
          } else {
            piece = String(parsed)
          }
        } catch {
          piece = data
        }

        if (!piece) continue
        if (firstChunk) { assistantMsg.loading = false; firstChunk = false }
        assistantMsg.content += piece
      }

      await nextTick()
      messagesRef.value?.scrollTo({ top: messagesRef.value.scrollHeight, behavior: 'smooth' })
    }

    if (firstChunk) assistantMsg.loading = false
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
  <Transition name="drawer">
    <div v-if="modelValue" class="ai-drawer">
      <!-- Header -->
      <div class="ai-drawer-header">
        <div class="ai-drawer-title">
          <svg class="ai-star-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.5 9.5L21 11L13.5 12.5L12 20L10.5 12.5L3 11L10.5 9.5L12 2Z"
              fill="currentColor" />
          </svg>
          <span>Assistant</span>
        </div>
        <button class="ai-drawer-close" @click="close" aria-label="关闭">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <div ref="messagesRef" class="ai-drawer-messages">
        <div v-if="messages.length === 0" class="ai-drawer-empty">
          <div class="ai-drawer-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L13.5 9.5L21 11L13.5 12.5L12 20L10.5 12.5L3 11L10.5 9.5L12 2Z"
                fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          <p>向 AI 提问，基于专业文档库为你解答</p>
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

      <!-- Input area -->
      <div class="ai-drawer-input-wrap">
        <div class="ai-drawer-input-box">
          <textarea
            ref="inputRef"
            v-model="query"
            class="ai-drawer-input"
            placeholder="Ask a question..."
            rows="1"
            :disabled="isLoading"
            @keydown="onKeydown"
          />
          <div class="ai-drawer-input-actions">
            <button
              class="ai-drawer-send"
              :disabled="isLoading || !query.trim()"
              @click="submit"
              aria-label="发送"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Drawer panel */
.ai-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 380px;
  max-width: 100vw;
  background: var(--vp-c-bg);
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 32px rgba(0, 0, 0, 0.12);
  z-index: 100;
}

/* Header */
.ai-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}
.ai-drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: var(--vp-c-text-1);
}
.ai-star-icon {
  color: #3b82f6;
  flex-shrink: 0;
}
.ai-drawer-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--vp-c-text-3);
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  line-height: 1;
}
.ai-drawer-close:hover { background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); }

/* Messages */
.ai-drawer-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ai-drawer-empty {
  text-align: center;
  color: var(--vp-c-text-3);
  padding: 60px 0;
}
.ai-drawer-empty-icon { margin-bottom: 12px; }
.ai-drawer-empty p { font-size: 14px; line-height: 1.6; }

.ai-msg { display: flex; }
.ai-msg.user { justify-content: flex-end; }
.ai-msg.assistant { justify-content: flex-start; }

.user .ai-msg-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 18px 18px 4px 18px;
  background: #f0f0f0;
  color: #1a1a1a;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.assistant .ai-msg-bubble {
  max-width: 90%;
  padding: 4px 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
}

/* Dark mode user bubble */
:root.dark .user .ai-msg-bubble {
  background: #2a2a2a;
  color: #f0f0f0;
}

/* Loading dots */
.ai-loading-dots { display: inline-flex; gap: 4px; align-items: center; padding: 6px 0; }
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
  40% { transform: translateY(-5px); }
}

/* Input area */
.ai-drawer-input-wrap {
  padding: 12px 16px 20px;
  flex-shrink: 0;
}
.ai-drawer-input-box {
  border: 1.5px solid var(--vp-c-divider);
  border-radius: 20px;
  background: var(--vp-c-bg-soft);
  padding: 12px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color .15s;
}
.ai-drawer-input-box:focus-within {
  border-color: #3b82f6;
}
.ai-drawer-input {
  width: 100%;
  resize: none;
  border: none;
  background: transparent;
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  max-height: 120px;
  overflow-y: auto;
}
.ai-drawer-input::placeholder { color: var(--vp-c-text-3); }
.ai-drawer-input-actions {
  display: flex;
  justify-content: flex-end;
}
.ai-drawer-send {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: opacity .15s, background .15s;
  flex-shrink: 0;
}
.ai-drawer-send:hover:not(:disabled) { background: #2563eb; }
.ai-drawer-send:disabled { opacity: 0.35; cursor: not-allowed; }

/* Slide-in animation */
.drawer-enter-active,
.drawer-leave-active {
  transition: transform .25s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}

/* Mobile full width */
@media (max-width: 480px) {
  .ai-drawer { width: 100vw; }
}
</style>
