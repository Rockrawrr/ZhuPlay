<script setup>
// 通用歌曲行：序号 + 封面 + 歌名/歌手 + 元信息（时长或文件大小）+ 可选操作按钮
// 音乐库、收藏、最近播放、最近导入、搜索、歌单详情全部复用这一个组件，
// 差异通过 props 控制：meta 显示什么、显示哪些按钮、移除按钮用什么图标
import { Check, Heart, ListPlus, Music2, X } from "lucide-vue-next";
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
  // 批量选择模式：显示勾选框，点击整行 = 切换选中，而不是播放
  selectable: {
    type: Boolean,
    default: false,
  },
  selected: {
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
  "toggle-select",
]);

// 列表内方向键移动焦点，方便键盘操作
function focusSibling(event, delta) {
  const buttons = [...document.querySelectorAll(".song-main")];
  const index = buttons.indexOf(event.currentTarget);
  const target = buttons[index + delta];

  if (!target) return;
  target.focus();
  target.scrollIntoView({ block: "nearest" });
}
</script>

<template>
  <div class="song-row" :class="{ selected, selectable }">
    <span
      v-if="selectable"
      class="song-check"
      :class="{ checked: selected }"
      role="checkbox"
      :aria-checked="selected"
      :aria-label="`选择 ${song.name}`"
      aria-hidden="true"
    >
      <Check v-if="selected" :size="13" />
    </span>
    <span v-else class="song-index">{{ index + 1 }}</span>

    <button
      class="song-main"
      :title="selectable ? (selected ? '取消选择' : '选择这首歌') : `播放 ${song.name}`"
      :aria-pressed="selectable ? selected : undefined"
      @click="selectable ? emit('toggle-select') : emit('play')"
      @keydown.down.prevent="focusSibling($event, 1)"
      @keydown.up.prevent="focusSibling($event, -1)"
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
      :aria-label="isFavorite ? '取消喜欢' : '添加喜欢'"
      :aria-pressed="isFavorite"
      @click="emit('toggle-favorite')"
    >
      <Heart :size="18" :fill="isFavorite ? '#1ed760' : 'none'" />
    </button>

    <button
      v-if="showAddToPlaylist"
      class="icon-button"
      title="添加到歌单"
      aria-label="添加到歌单"
      @click="emit('add-to-playlist')"
    >
      <ListPlus :size="18" />
    </button>

    <button
      v-if="removable"
      class="icon-button danger"
      :title="removeLabel"
      :aria-label="removeLabel"
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

.song-row.selected {
  background: #1d2b23;
}

.song-row.selected:hover {
  background: #223429;
}

.song-check {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 1.5px solid #555;
  border-radius: 50%;
  color: #000;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.song-check.checked {
  border-color: var(--color-primary);
  background: var(--color-primary);
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
