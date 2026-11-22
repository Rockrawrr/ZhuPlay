<script setup>
// 播放条容器：播放器里唯一持有 store 与 composable 的组件
// 四个子组件（信息 / 控制 / 进度 / 音量）都是纯展示，通过 props 与 emit 通信
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { ListMusic } from "lucide-vue-next";
import { usePlayerStore } from "@/stores/player";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useMusicActions } from "@/composables/useMusicActions";
import { useVolume } from "@/composables/useVolume";
import TrackInfo from "@/components/player/TrackInfo.vue";
import PlaybackControls from "@/components/player/PlaybackControls.vue";
import ProgressBar from "@/components/player/ProgressBar.vue";
import VolumeControl from "@/components/player/VolumeControl.vue";
import QueuePanel from "@/components/player/QueuePanel.vue";

const playerStore = usePlayerStore();
const musicStore = useMusicStore();

const {
  currentSong,
  isPlaying,
  isShuffle,
  repeatMode,
  currentTime,
  duration,
  queue,
  volume,
  isMuted,
} = storeToRefs(playerStore);
const { favoriteSongs } = storeToRefs(musicStore);

const { togglePlay, seek, playPrevious, playNext } = useAudioPlayer();
const { toggleFavorite } = useMusicActions();
const { setVolume, toggleMute } = useVolume();

// 播放队列面板
const showQueue = ref(false);

const isCurrentFavorite = computed(
  () =>
    !!currentSong.value && favoriteSongs.value.includes(currentSong.value.id),
);

function handleToggleFavorite() {
  if (currentSong.value) toggleFavorite(currentSong.value.id);
}

function handleToggleShuffle() {
  playerStore.setShuffle(!isShuffle.value);
}

function handleCycleRepeat() {
  if (repeatMode.value === "all") playerStore.setRepeatMode("one");
  else if (repeatMode.value === "one") playerStore.setRepeatMode("off");
  else playerStore.setRepeatMode("all");
}
</script>

<template>
  <footer class="music-player">
    <TrackInfo
      :song="currentSong"
      :is-favorite="isCurrentFavorite"
      @toggle-favorite="handleToggleFavorite"
    />

    <div class="player-center">
      <PlaybackControls
        :is-playing="isPlaying"
        :is-shuffle="isShuffle"
        :repeat-mode="repeatMode"
        :disabled="!currentSong"
        @toggle-play="togglePlay"
        @previous="playPrevious"
        @next="playNext"
        @toggle-shuffle="handleToggleShuffle"
        @cycle-repeat="handleCycleRepeat"
      />

      <ProgressBar
        :current-time="currentTime"
        :duration="duration"
        @seek="seek"
      />
    </div>

    <div class="player-right">
      <button
        class="player-icon queue-button"
        :class="{ active: showQueue }"
        title="播放队列"
        @click="showQueue = !showQueue"
      >
        <ListMusic :size="19" />
        <span v-if="queue.length > 0" class="queue-badge">
          {{ queue.length }}
        </span>
      </button>

      <VolumeControl
        :volume="volume"
        :muted="isMuted"
        @volume-change="setVolume"
        @toggle-mute="toggleMute"
      />
    </div>

    <QueuePanel v-if="showQueue" @close="showQueue = false" />
  </footer>
</template>

<style scoped>
.music-player {
  height: 90px;
  min-height: 90px;
  width: 100%;
  padding: 12px 20px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-surface-hover);
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  align-items: center;
  gap: 20px;
  color: var(--color-text-secondary);
}

.player-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
}

.player-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 15px;
}

/* 播放队列按钮 */
.queue-button {
  position: relative;
}

.queue-badge {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: var(--color-primary);
  color: #000;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
}
</style>
