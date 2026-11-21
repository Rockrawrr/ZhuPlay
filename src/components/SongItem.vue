<script setup>
import { Music2, Trash2, Heart } from "lucide-vue-next";

const props = defineProps({
  song: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    default: 0,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["play", "remove", "toggle-favorite"]);
</script>

<template>
  <div class="song-item">
    <span class="song-index">{{ index + 1 }}</span>

    <!-- 专辑封面 -->
    <div class="song-cover" @click="emit('play', song)">
      <img
        v-if="song.coverUrl"
        :src="song.coverUrl"
        :alt="song.album || song.name"
      />
      <Music2 v-else :size="20" />
    </div>

    <!-- 歌曲信息 -->
    <div class="song-info" @click="emit('play', song)">
      <div class="song-name">{{ song.name }}</div>
      <div class="song-filename">
        {{ song.artist || song.filename }}
      </div>
    </div>

    <span class="song-size">{{ song.size }}</span>

    <!-- 收藏 -->
    <button
      class="favorite-button"
      :class="{ active: isFavorite }"
      :title="isFavorite ? '取消喜欢' : '添加喜欢'"
      @click="emit('toggle-favorite', song.id)"
    >
      <Heart :size="18" :fill="isFavorite ? '#1ed760' : 'none'" />
    </button>

    <!-- 删除 -->
    <button
      class="delete-button"
      title="删除歌曲"
      @click="emit('remove', song.id)"
    >
      <Trash2 :size="17" />
    </button>
  </div>
</template>

<style scoped>
.song-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 6px;
}

.song-item:hover {
  background: #252525;
}

.song-index {
  width: 20px;
  color: #999;
  text-align: center;
}

.song-cover {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  background: #282828;
  border-radius: 5px;
  color: #1ed760;
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
  color: #fff;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-filename {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-size {
  color: #999;
  font-size: 12px;
}

.favorite-button,
.delete-button {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: #888;
  cursor: pointer;
}

.favorite-button:hover,
.favorite-button.active {
  color: #1ed760;
}

.delete-button:hover {
  color: #ff5555;
}

@media (max-width: 700px) {
  .song-item {
    gap: 9px;
    padding: 10px 6px;
  }

  .song-index {
    width: 16px;
    font-size: 12px;
  }

  .song-cover {
    width: 36px;
    height: 36px;
  }

  .song-cover svg {
    width: 17px;
    height: 17px;
  }

  .song-name {
    font-size: 13px;
  }

  .song-filename {
    font-size: 11px;
  }

  .song-size {
    display: none;
  }

  .favorite-button,
  .delete-button {
    width: 30px;
    height: 34px;
  }
}
</style>
