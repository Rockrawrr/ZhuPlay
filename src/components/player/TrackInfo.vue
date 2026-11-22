<script setup>
// 当前歌曲信息（纯展示）：封面、歌名（过长时跑马灯）、歌手、喜欢按钮
import { Music2, Heart } from "lucide-vue-next";
import SongCover from "@/components/common/SongCover.vue";

// 歌名超过这个长度时启用跑马灯
const MARQUEE_THRESHOLD = 12;

defineProps({
  // 当前歌曲，未播放时为 null
  song: {
    type: Object,
    default: null,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["toggle-favorite"]);
</script>

<template>
  <div class="track-info">
    <div class="track-cover">
      <SongCover :blob="song?.cover" :alt="song?.album || song?.name || ''">
        <Music2 :size="24" />
      </SongCover>
    </div>

    <div class="track-text">
      <div class="track-name" :title="song ? song.name : '尚未播放歌曲'">
        <div
          class="track-name-marquee"
          :class="{ scrolling: song && song.name.length > MARQUEE_THRESHOLD }"
        >
          <span>{{ song ? song.name : "尚未播放歌曲" }}</span>
          <span v-if="song && song.name.length > MARQUEE_THRESHOLD" aria-hidden="true">
            {{ song.name }}
          </span>
        </div>
      </div>

      <div class="track-artist">
        {{ song ? song.artist || "本地音乐" : "选择一首音乐开始播放" }}
      </div>
    </div>

    <button
      class="player-icon"
      :class="{ active: isFavorite }"
      :disabled="!song"
      :title="isFavorite ? '取消喜欢' : '添加喜欢'"
      @click="emit('toggle-favorite')"
    >
      <Heart :size="19" :fill="isFavorite ? '#1ed760' : 'none'" />
    </button>
  </div>
</template>

<style scoped>
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

/* 歌名跑马灯 */
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
  color: var(--color-text-secondary);
  font-size: 11px;
  margin-top: 5px;
}

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
