<script setup>
// 通用歌曲行：序号 + 封面 + 歌名 / 歌手 + 时长 + 可选移除按钮
// 收藏 / 最近播放 / 最近导入 / 搜索结果 / 歌单详情都复用它，
// 音乐库用的是功能更全的 SongItem（多收藏、加入歌单、删除）
import { Music2, X } from "lucide-vue-next";

defineProps({
  song: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    default: 0,
  },
  // 是否显示右侧移除按钮
  removable: {
    type: Boolean,
    default: false,
  },
  removeLabel: {
    type: String,
    default: "移除",
  },
  // 没有时长信息时可以关掉这一列
  showDuration: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["play", "remove"]);

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--:--";

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
</script>

<template>
  <div class="song-row">
    <span class="song-index">{{ index + 1 }}</span>

    <button
      class="song-main"
      :title="`播放 ${song.name}`"
      @click="emit('play')"
    >
      <span class="song-cover">
        <img
          v-if="song.coverUrl"
          :src="song.coverUrl"
          :alt="song.album || song.name"
        />
        <Music2 v-else :size="16" />
      </span>

      <span class="song-text">
        <span class="song-name">{{ song.name }}</span>
        <span class="song-artist">{{ song.artist || song.filename }}</span>
      </span>

      <span v-if="showDuration" class="song-duration">
        {{ formatTime(song.duration) }}
      </span>
    </button>

    <button
      v-if="removable"
      class="icon-action danger"
      :title="removeLabel"
      @click="emit('remove')"
    >
      <X :size="17" />
    </button>
  </div>
</template>

<style scoped>
.song-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.song-row:hover {
  background: #232323;
}

.song-index {
  width: 22px;
  flex-shrink: 0;
  color: #8a8a8a;
  font-size: 12px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.song-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #fff;
  text-align: left;
  cursor: pointer;
}

.song-cover {
  width: 40px;
  height: 40px;
  min-width: 40px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 6px;
  background: #282828;
  color: var(--color-primary);
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.song-name {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist {
  color: #999;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-duration {
  width: 46px;
  flex-shrink: 0;
  color: #8a8a8a;
  font-size: 12px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 700px) {
  .song-duration {
    display: none;
  }
}
</style>
