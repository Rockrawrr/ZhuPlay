<script setup>
// 应用组合根：
// 只负责启动引导（恢复曲库 / 队列 / 音量）并渲染骨架，
// 具体业务都在 app/、composables/、stores/ 里，App.vue 不承担任何业务逻辑
import { useAppBootstrap } from '@/app/useAppBootstrap'
import AppLayout from '@/layouts/AppLayout.vue'
import AppToast from '@/components/overlays/AppToast.vue'
import AppDialog from '@/components/overlays/AppDialog.vue'
import ContextMenu from '@/components/overlays/ContextMenu.vue'
import SongInfoDialog from '@/components/overlays/SongInfoDialog.vue'
import AddToPlaylistDialog from '@/components/overlays/AddToPlaylistDialog.vue'
import { usePlaylistPicker } from '@/composables/useOverlays'

const { state: pickerState, closePlaylistPicker } = usePlaylistPicker()

useAppBootstrap()
</script>

<template>
  <AppLayout />
  <!-- 全局提示层，用 Teleport 渲染到 body -->
  <AppToast />
  <!-- 全局确认 / 输入对话框 -->
  <AppDialog />
  <!-- 歌曲右键菜单 -->
  <ContextMenu />
  <!-- 歌曲信息 -->
  <SongInfoDialog />
  <!-- 添加到歌单（由右键菜单和音乐库共用） -->
  <AddToPlaylistDialog
    v-if="pickerState.song"
    :song="pickerState.song"
    @close="closePlaylistPicker"
  />
</template>