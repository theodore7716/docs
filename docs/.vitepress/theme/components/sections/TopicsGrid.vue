<script setup lang="ts">
import { data as _topicCountsRaw } from '../../../topic-counts.data'
import type { TopicKey, TopicCounts } from '../../../topic-counts.data'

const topicCounts = _topicCountsRaw as TopicCounts

const TOPICS: { key: TopicKey; icon: string; label: string; path: string }[] = [
  { key: 'getting-started',          icon: '⚡', label: '新手入门',       path: '/getting-started/' },
  { key: 'account',                  icon: '👤', label: '开户与账户',     path: '/account/' },
  { key: 'deposit',                  icon: '⬇️', label: '入金',           path: '/deposit/' },
  { key: 'withdrawal',               icon: '⬆️', label: '出金',           path: '/withdrawal/' },
  { key: 'transfers-and-fx',         icon: '↔️', label: '资金划转与换汇', path: '/transfers-and-fx/' },
  { key: 'stock-trading',            icon: '📈', label: '股票交易',       path: '/stock-trading/' },
  { key: 'compliance-and-tax',       icon: '🛡️', label: '合规与税务',     path: '/compliance-and-tax/' },
  { key: 'rewards',                  icon: '🎁', label: '活动与奖励',     path: '/rewards/' },
  { key: 'portfolio-and-statements', icon: '📋', label: '资产与账单',     path: '/portfolio-and-statements/' },
]
</script>

<template>
  <section id="topics-section" class="topics">
    <div class="topics-inner">
      <h2 class="topics-title">9 大专题，系统覆盖</h2>
      <div class="topics-grid">
        <a
          v-for="t in TOPICS"
          :key="t.key"
          :href="t.path"
          class="topic-card"
          :aria-label="`${t.label}，${topicCounts[t.key]} 篇文档`"
        >
          <span class="topic-icon" aria-hidden="true">{{ t.icon }}</span>
          <h3 class="topic-name">{{ t.label }}</h3>
          <p class="topic-count">{{ topicCounts[t.key] }} 篇文档</p>
          <span class="topic-link" aria-hidden="true">浏览文档 →</span>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.topics {
  padding: 80px 24px;
}
.topics-inner {
  max-width: 960px;
  margin: 0 auto;
}
.topics-title {
  text-align: center;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 40px;
}
.topics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.topic-card {
  display: flex;
  flex-direction: column;
  padding: 24px 20px;
  border-radius: 16px;
  border: 1.5px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  text-decoration: none;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.topic-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 4px 20px rgba(0, 184, 184, 0.12);
  transform: translateY(-2px);
}
.topic-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}
.topic-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 6px;
}
.topic-count {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  margin: 0 0 auto;
  padding-bottom: 12px;
}
.topic-link {
  font-size: 0.85rem;
  color: var(--vp-c-brand-1);
  font-weight: 600;
  margin-top: 12px;
}
@media (max-width: 768px) {
  .topics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .topics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
