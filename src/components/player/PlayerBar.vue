<script setup>
// 播放条容器：播放器里唯一持有 store 与 composable 的组件
// 四个子组件（信息 / 控制 / 进度 / 音量）都是纯展示，通过 props 与 emit 通信
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { ListMusic, ScrollText } from "lucide-vue-next";
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
import LyricsScreen from "@/components/player/LyricsScreen.vue";

const playerStore = usePlayerStore();
const musicStore = useMusicStore();

const {
  currentSong,
  isPlaying,
  isShuffle,
  repeatMode,
  currentTime,
  duration,
  volume,
  isMuted,
} = storeToRefs(playerStore);
const { favoriteSongs } = storeToRefs(musicStore);

const { togglePlay, seek, playPrevious, playNext } = useAudioPlayer();
const { toggleFavorite } = useMusicActions();
const { setVolume, toggleMute } = useVolume();

// 播放队列面板 / 歌词面板
const showQueue = ref(false);
const showLyrics = ref(false);

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
      @open-lyrics="showLyrics = !showLyrics"
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
        class="player-icon"
        :class="{ active: showLyrics }"
        :disabled="!currentSong"
        title="歌词"
        aria-label="歌词"
        :aria-expanded="showLyrics"
        @click="showLyrics = true"
      >
        <ScrollText :size="19" />
      </button>

      <button
        class="player-icon queue-button"
        :class="{ active: showQueue }"
        title="播放队列"
        aria-label="播放队列"
        :aria-expanded="showQueue"
        @click="showQueue = !showQueue"
      >
        <ListMusic :size="19" />
      </button>

      <VolumeControl
        :volume="volume"
        :muted="isMuted"
        @volume-change="setVolume"
        @toggle-mute="toggleMute"
      />
    </div>

    <QueuePanel v-if="showQueue" @close="showQueue = false" />

    <LyricsScreen
      v-if="showLyrics"
      :song="currentSong"
      :current-time="currentTime"
      :duration="duration"
      :is-playing="isPlaying"
      :volume="volume"
      :muted="isMuted"
      :queue-open="showQueue"
      @seek="seek"
      @toggle-play="togglePlay"
      @previous="playPrevious"
      @next="playNext"
      @volume-change="setVolume"
      @toggle-mute="toggleMute"
      @toggle-queue="showQueue = !showQueue"
      @close="showLyrics = false"
    />
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

/* 窄屏 / 竖屏平板：信息行 + 控制行（进度条独占一行），避免播放条撑破视口 */
@media (max-width: 900px) {
  .music-player {
    height: auto;
    min-height: 92px;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "info right"
      "center center";
    gap: 8px 12px;
    padding: 10px 14px;
  }

  /* 子组件根元素会带上父组件的 scope id，可以直接用 grid-area 排版 */
  .track-info {
    grid-area: info;
  }

  .player-right {
    grid-area: right;
    gap: 10px;
  }

  .player-center {
    grid-area: center;
    width: 100%;
    gap: 6px;
  }
}
</style>
