<script setup lang="ts">
import { ref, inject } from 'vue'
import { featuredAsks } from '../../data/featured-asks'
import UiInput from '../ui/Input.vue'

const openAIModal = inject<(q: string) => void>('openAIModal', () => {})

const inputValue = ref('')
const placeholder = '比如 “美股 W-8BEN 怎么填”'

function submit() {
  const q = inputValue.value.trim()
  if (!q) return
  openAIModal(q)
  inputValue.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function askPreset(ask: { q: string; initialPrompt: string }) {
  openAIModal(ask.initialPrompt)
}
</script>

<template>
  <section class="ask-hero">
    <div class="ask-hero__inner">
      <!-- 标题区 -->
      <div class="ask-hero__heading">
        <h1 class="ask-hero__title">
          长桥账户、交易、资金、税务，问就行。
        </h1>
        <p class="ask-hero__subtitle">
          港股 · 美股 · 新加坡 &nbsp;·&nbsp; 170+ 篇官方资料 &nbsp;·&nbsp; 每日同步
        </p>
      </div>

      <!-- 输入框 -->
      <div class="ask-hero__input-wrap">
        <UiInput
          v-model="inputValue"
          :placeholder="placeholder"
          class="ask-hero__input"
          @keydown="handleKeydown"
        />
        <button
          class="ask-hero__submit"
          :disabled="!inputValue.trim()"
          aria-label="提问"
          @click="submit"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- 热门问题 chip 网格 -->
      <div class="ask-hero__chips" role="list" aria-label="热门问题">
        <button
          v-for="ask in featuredAsks"
          :key="ask.q"
          class="ask-hero__chip"
          role="listitem"
          @click="askPreset(ask)"
        >
          {{ ask.q }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ask-hero {
  background: var(--vp-c-bg);
  padding: 96px 48px;
}

.ask-hero__inner {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* 标题 */
.ask-hero__heading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ask-hero__title {
  font-size: clamp(32px, 4vw, 48px);
  font-weight: 700;
  line-height: 1.2;
  color: var(--vp-c-text-1);
  letter-spacing: -0.02em;
  margin: 0;
}

.ask-hero__subtitle {
  font-size: 15px;
  color: var(--vp-c-text-3);
  margin: 0;
  font-weight: 400;
}

/* 输入框 */
.ask-hero__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.ask-hero__input {
  height: 64px !important;
  padding-right: 56px !important;
  font-size: 16px !important;
}

.ask-hero__submit {
  position: absolute;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  border-radius: 8px;
  transition: color 150ms ease-out, background 150ms ease-out;
}

.ask-hero__submit:hover:not(:disabled) {
  background: var(--vp-c-brand-soft);
}

.ask-hero__submit:disabled {
  color: var(--vp-c-text-3);
  cursor: not-allowed;
}

/* Chip 网格 */
.ask-hero__chips {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.ask-hero__chip {
  display: block;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 400;
  color: var(--vp-c-text-1);
  background: none;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  cursor: pointer;
  transition: background 150ms ease-out, border-color 150ms ease-out;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ask-hero__chip:hover {
  background: var(--vp-c-bg-alt);
  border-color: var(--vp-c-text-3);
}

/* 响应式 */
@media (max-width: 768px) {
  .ask-hero {
    padding: 64px 16px;
  }

  .ask-hero__chips {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .ask-hero__chips {
    grid-template-columns: 1fr;
  }
}
</style>
