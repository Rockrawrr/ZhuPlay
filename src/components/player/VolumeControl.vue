<script setup>
import { Volume2, Volume1, VolumeX } from "lucide-vue-next";

defineProps({
  // 0 ~ 1
  volume: {
    type: Number,
    default: 1,
  },
  muted: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["volume-change", "toggle-mute"]);

function handleInput(event) {
  emit("volume-change", Number(event.target.value));
}
</script>

<template>
  <div class="volume-control">
    <button
      class="player-icon"
      :title="muted ? '取消静音' : '静音'"
      @click="emit('toggle-mute')"
    >
      <VolumeX v-if="muted || volume === 0" :size="19" />
      <Volume1 v-else-if="volume < 0.5" :size="19" />
      <Volume2 v-else :size="19" />
    </button>

    <input
      class="player-slider volume-slider"
      type="range"
      min="0"
      max="1"
      step="0.01"
      aria-label="音量"
      :value="muted ? 0 : volume"
      @input="handleInput"
    />
  </div>
</template>

<style scoped>
.volume-control {
  display: flex;
  align-items: center;
  gap: 15px;
}

.volume-slider {
  width: 100px;
}

@media (max-width: 700px) {
  .volume-slider {
    width: 64px;
  }
}
</style>
