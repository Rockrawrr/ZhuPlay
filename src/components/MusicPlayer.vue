<script setup>
import { storeToRefs } from "pinia";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Heart,
  Shuffle,
  Repeat,
  ListMusic,
  Music2,
} from "lucide-vue-next";
import { usePlayerStore } from "@/stores/player";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useMusicActions } from "@/composables/useMusicActions";

const playerStore = usePlayerStore();
const musicStore = useMusicStore();

const { currentSong, isPlaying, isShuffle, repeatMode, currentTime, duration } =
  storeToRefs(playerStore);
const { favoriteSongs } = storeToRefs(musicStore);

const { togglePlay, seek, playPrevious, playNext } = useAudioPlayer();
const { toggleFavorite } = useMusicActions();

function toggleRepeat() {
  let nextMode;
  if (repeatMode.value === "all") nextMode = "one";
  else if (repeatMode.value === "one") nextMode = "off";
  else nextMode = "all";
  playerStore.setRepeatMode(nextMode);
}

function formatTime(time) {
  if (!Number.isFinite(time) || time < 0) return "0:00";
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
</script>

<template>
  <footer class="music-player">
    <div class="track-info">
      <div class="track-cover">
        <img
          v-if="currentSong?.coverUrl"
          :src="currentSong.coverUrl"
          :alt="currentSong.album || currentSong.name"
        />
        <Music2 v-else :size="24" />
      </div>

      <div class="track-text">
        <div
          class="track-name"
          :title="currentSong ? currentSong.name : '尚未播放歌曲'"
        >
          <div
            class="track-name-marquee"
            :class="{ scrolling: currentSong && currentSong.name.length > 12 }"
          >
            <span>{{ currentSong ? currentSong.name : "尚未播放歌曲" }}</span>
            <span
              v-if="currentSong && currentSong.name.length > 12"
              aria-hidden="true"
              >{{ currentSong.name }}</span
            >
          </div>
        </div>
        <div class="track-artist">
          {{
            currentSong
              ? currentSong.artist || "本地音乐"
              : "选择一首音乐开始播放"
          }}
        </div>
      </div>

      <button
        class="player-icon"
        :class="{
          active: currentSong && favoriteSongs.includes(currentSong.id),
        }"
        :disabled="!currentSong"
        :title="
          currentSong && favoriteSongs.includes(currentSong.id)
            ? '取消喜欢'
            : '添加喜欢'
        "
        @click="toggleFavorite(currentSong.id)"
      >
        <Heart
          :size="19"
          :fill="
            currentSong && favoriteSongs.includes(currentSong.id)
              ? '#1ed760'
              : 'none'
          "
        />
      </button>
    </div>

    <div class="player-center">
      <div class="player-controls">
        <button
          class="player-icon"
          :class="{ active: isShuffle }"
          @click="playerStore.setShuffle(!isShuffle)"
          :title="isShuffle ? '关闭随机播放' : '开启随机播放'"
        >
          <Shuffle :size="17" />
        </button>
        <button class="player-icon" @click="playPrevious">
          <SkipBack :size="20" />
        </button>
        <button
          class="play-button"
          :disabled="!currentSong"
          @click="togglePlay"
          :title="isPlaying ? '暂停' : '播放'"
        >
          <Pause v-if="isPlaying" :size="20" fill="currentColor" />
          <Play v-else :size="20" fill="currentColor" />
        </button>
        <button class="player-icon" @click="playNext">
          <SkipForward :size="20" />
        </button>
        <button
          class="player-icon"
          :class="{ active: repeatMode !== 'off' }"
          @click="toggleRepeat"
          :title="
            repeatMode === 'all'
              ? '列表循环'
              : repeatMode === 'one'
                ? '单曲循环'
                : '关闭循环'
          "
        >
          <Repeat :size="17" />
          <span v-if="repeatMode === 'one'" class="repeat-one">1</span>
        </button>
      </div>

      <div class="progress-container">
        <span>{{ formatTime(currentTime) }}</span>
        <input
          class="progress-slider"
          type="range"
          min="0"
          :max="duration || 0"
          :value="currentTime"
          :disabled="!duration"
          @input="seek(Number($event.target.value))"
        />
        <span>{{ formatTime(duration) }}</span>
      </div>
    </div>

    <div class="player-right">
      <ListMusic :size="19" />
      <Volume2 :size="19" />
      <div class="volume-track"><div class="volume-fill"></div></div>
    </div>
  </footer>
</template>

<style scoped>
.music-player {
  height: 90px;
  min-height: 90px;
  width: 100%;
  padding: 12px 20px;
  background: #181818;
  border-top: 1px solid #282828;
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  align-items: center;
  gap: 20px;
  color: #b3b3b3;
}

/* 当前歌曲信息 */
.track-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.track-cover {
  width: 55px;
  height: 55px;
  min-width: 55px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 4px;
  background: linear-gradient(135deg, #365f50, #17241e);
  color: #fff;
}

.track-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.track-text {
  min-width: 0;
}

.track-name {
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  color: #fff;
  font-size: 13px;
  font-weight: 650;
}

/* 歌名滚动 */
.track-name-marquee {
  display: flex;
  width: max-content;
}

.track-name-marquee span {
  flex-shrink: 0;
  white-space: nowrap;
  padding-right: 40px;
}

.track-name-marquee.scrolling {
  animation: track-marquee 22s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .track-name-marquee.scrolling {
    animation: none;
  }
}

.track-artist {
  color: #b3b3b3;
  font-size: 11px;
  margin-top: 5px;
}

/* 中间播放控制 */
.player-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 22px;
}

.player-icon {
  display: grid;
  place-items: center;
  position: relative;
  padding: 4px;
  border: none;
  background: transparent;
  color: #b3b3b3;
  cursor: pointer;
}

.player-icon:hover {
  color: #fff;
}

.player-icon.active {
  color: #1ed760;
}

.player-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.repeat-one {
  position: absolute;
  font-size: 9px;
  font-weight: bold;
  top: -1px;
  right: -2px;
}

.play-button {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: #fff;
  color: #000;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.play-button:hover {
  transform: scale(1.06);
}

.play-button:disabled {
  opacity: 0.4;
  cursor: default;
}

.play-button:disabled:hover {
  transform: none;
}

/* 播放进度 */
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
  height: 4px;
  appearance: none;
  background: #535353;
  border-radius: 5px;
  cursor: pointer;
}

.progress-slider::-webkit-slider-thumb {
  appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
}

.progress-slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border: none;
  border-radius: 50%;
  background: #fff;
}

.progress-slider:disabled {
  cursor: default;
  opacity: 0.5;
}

/* 右侧音量控制 */
.player-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 15px;
}

.volume-track {
  height: 4px;
  background: #535353;
  border-radius: 5px;
  flex: 1;
  max-width: 100px;
}

.volume-fill {
  height: 100%;
  width: 65%;
  background: #fff;
  border-radius: 5px;
}

/* 歌名滚动动画 */
@keyframes track-marquee {
  0%,
  13.64% {
    transform: translateX(0);
  }

  50% {
    transform: translateX(-50%);
  }

  63.64% {
    transform: translateX(-50%);
  }

  63.65%,
  100% {
    transform: translateX(0);
  }
}
</style>
