<script setup lang="ts">
import { journeySteps } from '../../data/journey'
import StepCard from './StepCard.vue'
</script>

<template>
  <div class="journey-steps">
    <div class="journey-steps__inner">
      <div class="journey-steps__grid">
        <template v-for="(step, index) in journeySteps" :key="step.id">
          <StepCard :step="step" />
          <!-- 仅在同行相邻两卡之间放箭头（每行第 3 张后不加） -->
          <div
            v-if="index % 3 !== 2"
            class="journey-steps__connector"
            aria-hidden="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--vp-c-divider)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.journey-steps {
  background: var(--vp-c-bg-alt);
  padding: 48px 48px 96px;
}

.journey-steps__inner {
  max-width: 1200px;
  margin: 0 auto;
}

/* desktop: card · arrow · card · arrow · card (10 items = 2 rows of 5) */
.journey-steps__grid {
  display: grid;
  grid-template-columns: 1fr 24px 1fr 24px 1fr;
  gap: 24px 0;
  align-items: start;
}

.journey-steps__connector {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 36px;
}

@media (max-width: 1024px) {
  .journey-steps {
    padding: 48px 24px 80px;
  }

  /* 2-column card grid, connectors hidden */
  .journey-steps__grid {
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .journey-steps__connector {
    display: none;
  }
}

@media (max-width: 640px) {
  .journey-steps {
    padding: 40px 16px 64px;
  }

  .journey-steps__grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .journey-steps__connector {
    display: none;
  }
}
</style>
