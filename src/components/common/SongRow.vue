<script setup>
// 通用歌曲行：序号 + 封面 + 歌名/歌手 + 元信息（时长或文件大小）+ 可选操作按钮
// 音乐库、收藏、最近播放、最近导入、搜索、歌单详情全部复用这一个组件，
// 差异通过 props 控制：meta 显示什么、显示哪些按钮、移除按钮用什么图标
import { Heart, ListPlus, Music2, Trash2, X } from "lucide-vue-next";
import { formatTime } from "@/utils/format";
import SongCover from "@/components/common/SongCover.vue";

defineProps({
  song: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    default: 0,
  },
  // 右侧元信息：duration（默认）| size | none
  meta: {
    type: String,
    default: "duration",
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  showFavorite: {
    type: Boolean,
    default: false,
  },
  showAddToPlaylist: {
    type: Boolean,
    default: false,
  },
  removable: {
    type: Boolean,
    default: false,
  },
  removeLabel: {
    type: String,
    default: "移除",
  },
  // 移除按钮图标：歌单用 X，音乐库用垃圾桶
  // 不能用 X 当默认值（函数型默认值会被 Vue 当工厂调用），模板里做兜底
  removeIcon: {
    type: [Object, Function],
    default: null,
  },
});

const emit = defineEmits([
  "play",
  "remove",
  "toggle-favorite",
  "add-to-playlist",
]);
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
        <SongCover :blob="song.cover" :alt="song.album || song.name">
          <Music2 :size="16" />
        </SongCover>
      </span>

      <span class="song-text">
        <span class="song-name">{{ song.name }}</span>
        <span class="song-artist">{{ song.artist || song.filename }}</span>
      </span>

      <span v-if="meta === 'duration'" class="song-meta">
        {{ formatTime(song.duration) }}
      </span>
      <span v-else-if="meta === 'size'" class="song-meta">
        {{ song.size }}
      </span>
    </button>

    <button
      v-if="showFavorite"
      class="icon-button"
      :class="{ active: isFavorite }"
      :title="isFavorite ? '取消喜欢' : '添加喜欢'"
      @click="emit('toggle-favorite')"
    >
      <Heart :size="18" :fill="isFavorite ? '#1ed760' : 'none'" />
    </button>

    <button
      v-if="showAddToPlaylist"
      class="icon-button"
      title="添加到歌单"
      @click="emit('add-to-playlist')"
    >
      <ListPlus :size="18" />
    </button>

    <button
      v-if="removable"
      class="icon-button danger"
      :title="removeLabel"
      @click="emit('remove')"
    >
      <component :is="removeIcon || X" :size="17" />
    </button>
  </div>
</template>

<style scoped>
.song-row {
  /* 固定行高：虚拟列表按 60px 计算位置，插槽内容不能超出 */
  height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
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

.song-meta {
  width: 58px;
  flex-shrink: 0;
  color: #8a8a8a;
  font-size: 12px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.icon-button {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #888;
  cursor: pointer;
  transition: 0.15s ease;
}

.icon-button:hover {
  color: #fff;
}

.icon-button.active {
  color: var(--color-primary);
}

.icon-button.danger:hover {
  color: #ff6b6b;
}

@media (max-width: 700px) {
  .song-meta {
    display: none;
  }

  .icon-button {
    width: 30px;
    height: 34px;
  }
}
</style>
