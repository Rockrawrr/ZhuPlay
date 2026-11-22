<script setup>
// 歌单详情（纯展示）：头部信息 + 播放全部 + 歌曲列表 + 从歌单移除
// 入参 songs 已经由页面按 songIds 顺序解析成完整歌曲对象，这里不再查 store
import {
  ArrowLeft,
  ListMusic,
  Music2,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-vue-next";

defineProps({
  playlist: {
    type: Object,
    required: true,
  },
  // 已按歌单顺序解析好的歌曲对象
  songs: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  "back",
  "play-all",
  "play",
  "remove-song",
  "rename",
  "delete",
  "add-songs",
]);

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--:--";

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(timestamp) {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleDateString("zh-CN");
}
</script>

<template>
  <section class="page-shell">
    <div class="detail-toolbar">
      <button class="back-button" title="返回歌单列表" @click="emit('back')">
        <ArrowLeft :size="19" />
      </button>
    </div>

    <header class="playlist-header">
      <div class="playlist-hero">
        <ListMusic :size="52" />
      </div>

      <div class="playlist-heading">
        <span class="eyebrow">歌单</span>
        <h2 :title="playlist.name">{{ playlist.name }}</h2>
        <p>
          {{ songs.length }} 首歌曲 · 创建于 {{ formatDate(playlist.createdAt) }}
        </p>

        <div class="header-actions">
          <button
            class="primary-button"
            :disabled="songs.length === 0"
            @click="emit('play-all')"
          >
            <Play :size="18" fill="currentColor" /> 播放全部
          </button>
          <button class="ghost-button" @click="emit('rename')">
            <Pencil :size="16" /> 重命名
          </button>
          <button class="ghost-button danger" @click="emit('delete')">
            <Trash2 :size="16" /> 删除歌单
          </button>
        </div>
      </div>
    </header>

    <div v-if="songs.length === 0" class="empty-state">
      <Music2 :size="42" />
      <h3>歌单里还没有歌曲</h3>
      <p>从音乐库里挑几首歌加进来吧</p>
      <button class="primary-button" @click="emit('add-songs')">
        <Plus :size="18" /> 添加歌曲
      </button>
    </div>

    <div v-else class="song-list">
      <div class="list-toolbar">
        <span class="song-count">{{ songs.length }} 首歌曲</span>
        <button class="ghost-button" @click="emit('add-songs')">
          <Plus :size="16" /> 添加歌曲
        </button>
      </div>

      <div v-for="(song, index) in songs" :key="song.id" class="song-item">
        <span class="song-index">{{ index + 1 }}</span>

        <div class="song-cover" @click="emit('play', song)">
          <img
            v-if="song.coverUrl"
            :src="song.coverUrl"
            :alt="song.album || song.name"
          />
          <Music2 v-else :size="16" />
        </div>

        <div class="song-info" @click="emit('play', song)">
          <div class="song-name">{{ song.name }}</div>
          <div class="song-artist">{{ song.artist || song.filename }}</div>
        </div>

        <span class="song-duration">{{ formatTime(song.duration) }}</span>

        <button
          class="icon-action danger"
          title="从歌单移除"
          @click="emit('remove-song', song.id)"
        >
          <X :size="17" />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.detail-toolbar {
  display: flex;
  margin-bottom: 12px;
}

.playlist-header {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 28px;
  padding: 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #27634d, #172c25);
}

.playlist-hero {
  width: 140px;
  height: 140px;
  min-width: 140px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(135deg, #3c8a6d, #1d332b);
  color: #d9f7e4;
  box-shadow: 0 10px 26px #0005;
}

.playlist-heading {
  min-width: 0;
}

.eyebrow {
  font-size: 12px;
  color: #cfded8;
}

.playlist-heading h2 {
  margin: 8px 0;
  font-size: 30px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-heading p {
  margin: 0 0 16px;
  color: #cfded8;
  font-size: 12px;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* 深色渐变背景上的按钮配色 */
.header-actions :deep(.ghost-button) {
  border-color: #ffffff33;
  color: #eaffe9;
}

.header-actions :deep(.ghost-button:hover) {
  border-color: #ffffff66;
  background: #ffffff14;
  color: #fff;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.song-count {
  color: #999;
  font-size: 12px;
}

.song-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-radius: 6px;
}

.song-item:hover {
  background: #232323;
}

.song-index {
  width: 20px;
  color: #999;
  text-align: center;
  font-size: 12px;
}

.song-cover {
  width: 40px;
  height: 40px;
  min-width: 40px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 5px;
  background: #282828;
  color: var(--color-primary);
  cursor: pointer;
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.song-name {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist {
  margin-top: 4px;
  color: #999;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-duration {
  width: 46px;
  color: #999;
  font-size: 12px;
  text-align: right;
}

@media (max-width: 700px) {
  .playlist-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 18px;
  }

  .playlist-hero {
    width: 96px;
    height: 96px;
    min-width: 96px;
  }

  .playlist-heading h2 {
    font-size: 22px;
  }

  .song-duration {
    display: none;
  }
}
</style>
