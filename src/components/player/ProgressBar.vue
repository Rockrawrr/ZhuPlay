<script setup>
// 播放进度（纯展示）：当前时间 / 总时长 + 可拖动滑块
import { computed } from "vue";

const props = defineProps({
  currentTime: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["seek"]);

function formatTime(time) {
  if (!Number.isFinite(time) || time < 0) return "0:00";
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const currentLabel = computed(() => formatTime(props.currentTime));
const durationLabel = computed(() => formatTime(props.duration));

function handleInput(event) {
  emit("seek", Number(event.target.value));
}
</script>

<template>
  <div class="progress-container">
    <span>{{ currentLabel }}</span>

    <input
      class="player-slider progress-slider"
      type="range"
      min="0"
      :max="duration || 0"
      :value="currentTime"
      :disabled="!duration"
      aria-label="播放进度"
      @input="handleInput"
    />

    <span>{{ durationLabel }}</span>
  </div>
</template>

<style scoped>
.progress-container {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 520px;
  gap: 10px;
  font-size: 10px;
}

.progress-slider {
  flex: 1;
  min-width: 0;
}
</style>
