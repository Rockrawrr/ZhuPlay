<script setup>
// 应用组合根：
// 只负责启动引导（恢复曲库 / 队列 / 音量）并渲染骨架，
// 具体业务都在 app/、composables/、stores/ 里，App.vue 不承担任何业务逻辑
import { useAppBootstrap } from '@/app/useAppBootstrap'
import AppLayout from '@/layouts/AppLayout.vue'
import AppToast from '@/components/AppToast.vue'

useAppBootstrap()
</script>

<template>
  <AppLayout />
  <!-- 全局提示层，用 Teleport 渲染到 body -->
  <AppToast />
</template>