<script setup lang="ts">
import { ref, provide } from 'vue'
import HeroSection from './sections/HeroSection.vue'
import FindWaysSection from './sections/FindWaysSection.vue'
import AIFeatureSection from './sections/AIFeatureSection.vue'
import TopicsGrid from './sections/TopicsGrid.vue'
import FooterCTA from './sections/FooterCTA.vue'
import AIModal from './AIModal.vue'

const modalOpen = ref(false)
const initialQuery = ref('')

function openAIModal(query?: string) {
  initialQuery.value = query ?? ''
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
  min-height: 100vh;
}
</style>
