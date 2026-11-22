<script setup>
// 播放进度（纯展示）：当前时间 / 总时长 + 可拖动滑块
import { computed } from "vue";
import { formatTime } from "@/utils/format";

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

const currentLabel = computed(() => formatTime(props.currentTime, "0:00"));
const durationLabel = computed(() => formatTime(props.duration, "0:00"));

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
