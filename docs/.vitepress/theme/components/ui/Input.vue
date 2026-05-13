<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '../../lib/utils'

defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <input
    :class="cn(
      'flex w-full px-4 py-0 text-[15px] leading-none',
      'bg-vp-bg text-vp-text1 placeholder:text-vp-text3',
      'border border-vp-border rounded-[14px]',
      'outline-none transition-[border-color,box-shadow] duration-150 ease-out',
      'focus:border-brand focus:shadow-[inset_0_0_0_1.5px_var(--vp-c-brand-1)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      $props.class
    )"
    v-bind="$attrs"
  />
</template>
