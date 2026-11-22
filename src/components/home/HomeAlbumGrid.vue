<script setup>
// 首页「为你推荐」卡片网格（纯展示）
// 封面 + 歌名 + 来源（喜欢/本地）+ 悬浮播放按钮，右键同样接入歌曲菜单
import { Music2, Play } from "lucide-vue-next";
import EmptyState from "@/components/common/EmptyState.vue";
import SongCover from "@/components/common/SongCover.vue";
import { useSongMenu } from "@/composables/useSongMenu";

const props = defineProps({
  songs: {
    type: Array,
    default: () => [],
  },
  // 收藏的 songId 集合，用来显示"喜欢的音乐"副标题
  favoriteIds: {
    type: Set,
    default: () => new Set(),
  },
  source: {
    type: String,
    default: "home",
  },
});

const emit = defineEmits(["play"]);

const { openSongMenu } = useSongMenu();

function handleMenu(event, song) {
  openSongMenu(event, song, { source: props.source, list: props.songs });
}
</script>

<template>
  <div v-if="songs.length > 0" class="album-grid">
    <article
      v-for="song in songs"
      :key="song.id"
      class="album-card"
      @click="emit('play', song)"
      @contextmenu.prevent="handleMenu($event, song)"
    >
      <div class="album-cover">
        <SongCover :blob="song.cover" :alt="song.album || song.name">
          <Music2 :size="48" />
        </SongCover>

        <button
          class="featured-play"
          :title="`播放${song.name}`"
          @click.stop="emit('play', song)"
        >
          <Play :size="18" fill="currentColor" />
        </button>
      </div>

      <h3>{{ song.name }}</h3>

      <p>{{ favoriteIds.has(song.id) ? "喜欢的音乐" : "本地音乐" }}</p>
    </article>
  </div>

  <EmptyState
    v-else
    compact
    title="暂无推荐歌曲"
    description="导入一些音乐，开始建立你的音乐收藏"
  >
    <template #icon><Music2 :size="20" /></template>
  </EmptyState>
</template>

<style scoped>
.album-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
}

.album-card {
  min-width: 0;
  padding: 14px;
  border-radius: 8px;
  background: #181818;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
  cursor: pointer;
}

.album-card:hover {
  background: #282828;
  transform: translateY(-3px);
}

.album-cover {
  aspect-ratio: 1;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 5px;
  background: linear-gradient(135deg, #365f50, #17241e);
  color: #d9f7e4;
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.featured-play {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: #1ed760;
  color: #000;
  cursor: pointer;
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.featured-play:hover {
  background: #3be477;
  transform: scale(1.06);
}

.album-card:hover .featured-play {
  opacity: 1;
  transform: translateY(0);
}

.album-card h3 {
  margin: 14px 0 6px;
  color: #fff;
  font-size: 14px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-card p {
  margin: 0;
  color: #b3b3b3;
  font-size: 12px;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .album-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .album-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 触屏设备：不依赖悬停显示播放按钮 */
@media (hover: none) {
  .featured-play {
    opacity: 1;
    transform: none;
  }
}
</style>
