<script setup>
// 播放进度（纯展示）：当前时间 / 总时长 + 可拖动滑块 + 悬停预览目标时间
import { computed, ref } from "vue";
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

// 悬停预览：显示鼠标位置对应的时间
const hoverTime = ref(null);
const hoverPercent = ref(0);

const hoverLabel = computed(() =>
  hoverTime.value === null ? "" : formatTime(hoverTime.value, "0:00"),
);

function handleMove(event) {
  if (!props.duration) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));

  hoverTime.value = ratio * props.duration;
  hoverPercent.value = ratio * 100;
}

function handleLeave() {
  hoverTime.value = null;
}

function handleInput(event) {
  emit("seek", Number(event.target.value));
}
</script>

<template>
  <div class="progress-container">
    <span>{{ currentLabel }}</span>

    <div
      class="progress-wrap"
      @mousemove="handleMove"
      @mouseleave="handleLeave"
    >
      <span
        v-if="hoverLabel"
        class="progress-tip"
        :style="{ left: `${hoverPercent}%` }"
      >
        {{ hoverLabel }}
      </span>

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
    </div>

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

.progress-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.progress-slider {
  flex: 1;
  min-width: 0;
}

/* 悬停时间气泡 */
.progress-tip {
  position: absolute;
  bottom: 14px;
  transform: translateX(-50%);
  padding: 2px 6px;
  border-radius: 4px;
  background: #2a2a2a;
  color: #f0f0f0;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 4px 10px #0006;
}
</style>
