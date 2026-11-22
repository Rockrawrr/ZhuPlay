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
} from "lucide-vue-next";
import EmptyState from "@/components/EmptyState.vue";
import SongRow from "@/components/SongRow.vue";

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

    <EmptyState
      v-if="songs.length === 0"
      title="歌单里还没有歌曲"
      description="从音乐库里挑几首歌加进来吧"
    >
      <template #icon><Music2 :size="22" /></template>
      <button class="primary-button" @click="emit('add-songs')">
        <Plus :size="18" /> 添加歌曲
      </button>
    </EmptyState>

    <div v-else class="song-list">
      <div class="list-toolbar">
        <span class="song-count">{{ songs.length }} 首歌曲</span>
        <button class="ghost-button" @click="emit('add-songs')">
          <Plus :size="16" /> 添加歌曲
        </button>
      </div>

      <SongRow
        v-for="(song, index) in songs"
        :key="song.id"
        :song="song"
        :index="index"
        removable
        remove-label="从歌单移除"
        @play="emit('play', song)"
        @remove="emit('remove-song', song.id)"
      />
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
}
</style>
