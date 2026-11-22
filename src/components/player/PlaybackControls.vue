<script setup>
// 播放控制（纯展示）：随机、上一首、播放/暂停、下一首、循环
// 状态判断全部由父组件传入，这里只负责显示与 emit
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
} from "lucide-vue-next";

defineProps({
  isPlaying: {
    type: Boolean,
    default: false,
  },
  isShuffle: {
    type: Boolean,
    default: false,
  },
  // all / one / off
  repeatMode: {
    type: String,
    default: "all",
  },
  // 没有当前歌曲时禁用主按钮
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "toggle-play",
  "previous",
  "next",
  "toggle-shuffle",
  "cycle-repeat",
]);
</script>

<template>
  <div class="player-controls">
    <button
      class="player-icon"
      :class="{ active: isShuffle }"
      :title="isShuffle ? '关闭随机播放' : '开启随机播放'"
      @click="emit('toggle-shuffle')"
    >
      <Shuffle :size="17" />
    </button>

    <button class="player-icon" title="上一首" @click="emit('previous')">
      <SkipBack :size="20" />
    </button>

    <button
      class="play-button"
      :disabled="disabled"
      :title="isPlaying ? '暂停' : '播放'"
      @click="emit('toggle-play')"
    >
      <Pause v-if="isPlaying" :size="20" fill="currentColor" />
      <Play v-else :size="20" fill="currentColor" />
    </button>

    <button class="player-icon" title="下一首" @click="emit('next')">
      <SkipForward :size="20" />
    </button>

    <button
      class="player-icon"
      :class="{ active: repeatMode !== 'off' }"
      :title="
        repeatMode === 'all'
          ? '列表循环'
          : repeatMode === 'one'
            ? '单曲循环'
            : '关闭循环'
      "
      @click="emit('cycle-repeat')"
    >
      <Repeat :size="17" />
      <span v-if="repeatMode === 'one'" class="repeat-one">1</span>
    </button>
  </div>
</template>

<style scoped>
.player-controls {
  display: flex;
  align-items: center;
  gap: 22px;
}
</style>
