<script setup>
// 首页「最近导入 / 最近播放」列表（纯展示）
// 两个区块原本是两段几乎相同的模板，合并成一个组件：
// props 控制标题、是否限制条数、是否显示"清空记录"、空状态文案
import { computed } from "vue";
import { Music2, Play } from "lucide-vue-next";
import EmptyState from "@/components/common/EmptyState.vue";
import SongCover from "@/components/common/SongCover.vue";
import { useSongMenu } from "@/composables/useSongMenu";

const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  // 区块锚点 id（首页快捷入口会滚动到这里）
  sectionId: {
    type: String,
    default: "",
  },
  songs: {
    type: Array,
    default: () => [],
  },
  // 只展示前 N 条，0 表示全部
  limit: {
    type: Number,
    default: 0,
  },
  viewAllTo: {
    type: String,
    default: "",
  },
  showClear: {
    type: Boolean,
    default: false,
  },
  emptyTitle: {
    type: String,
    default: "",
  },
  emptyDescription: {
    type: String,
    default: "",
  },
  emptyIcon: {
    type: [Object, Function],
    // 这里不能直接用 Music2 当默认值：Vue 会把函数型默认值当工厂调用，
    // 而 lucide 图标是函数式组件，被直接调用会丢掉第二个参数
    default: null,
  },
  source: {
    type: String,
    default: "home",
  },
});

const emit = defineEmits(["play", "clear", "view-all"]);

const { openSongMenu } = useSongMenu();

const displayed = computed(() =>
  props.limit > 0 ? props.songs.slice(0, props.limit) : props.songs,
);

// 「查看全部」：有目标地址，且（不限制条数 或 条数超过限制）时才显示
const showViewAll = computed(
  () =>
    Boolean(props.viewAllTo) &&
    (props.limit === 0 || props.songs.length > props.limit),
);

const showClearButton = computed(() => props.showClear && props.songs.length > 0);

function handleMenu(event, song) {
  openSongMenu(event, song, { source: props.source, list: props.songs });
}
</script>

<template>
  <section :id="sectionId" class="recent-section">
    <div class="section-header">
      <h2>{{ title }}</h2>

      <div v-if="showClearButton || showViewAll" class="recent-actions">
        <button v-if="showClearButton" class="clear-recent-button" @click="emit('clear')">
          清空记录
        </button>
        <button v-if="showViewAll" @click="emit('view-all')">查看全部</button>
      </div>
    </div>

    <div v-if="displayed.length > 0" class="recent-list">
      <button
        v-for="(song, index) in displayed"
        :key="song.id"
        class="recent-item"
        @click="emit('play', song)"
        @contextmenu.prevent="handleMenu($event, song)"
      >
        <span class="recent-index">{{ index + 1 }}</span>

        <div class="recent-icon">
          <SongCover :blob="song.cover" :alt="song.album || song.name">
            <Music2 :size="20" />
          </SongCover>
        </div>

        <div class="recent-info">
          <div class="recent-name">{{ song.name }}</div>
          <div class="recent-filename">{{ song.filename }}</div>
        </div>

        <Play :size="18" class="recent-play" />
      </button>
    </div>

    <EmptyState
      v-else
      compact
      :title="emptyTitle"
      :description="emptyDescription"
    >
      <template #icon>
        <component :is="emptyIcon || Music2" :size="20" />
      </template>
      <slot name="empty-action" />
    </EmptyState>
  </section>
</template>

<style scoped>
.recent-section {
  margin-top: 42px;
}

.recent-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.clear-recent-button {
  cursor: pointer;
}

.clear-recent-button:hover {
  color: #fff;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #fff;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
}

.recent-item:hover {
  background: #282828;
}

.recent-index {
  width: 20px;
  color: #999;
  text-align: center;
}

.recent-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #282828;
  border-radius: 5px;
  color: var(--color-primary);
}

.recent-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.recent-info {
  flex: 1;
  min-width: 0;
}

.recent-name {
  font-size: 14px;
  color: #fff;
}

.recent-filename {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.recent-name,
.recent-filename {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-play {
  color: var(--color-primary);
  opacity: 0;
  transform: translateX(-4px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.recent-item:hover .recent-play {
  opacity: 1;
  transform: translateX(0);
}

@media (max-width: 700px) {
  .recent-actions {
    gap: 8px;
    flex-shrink: 0;
  }

  .clear-recent-button {
    font-size: 11px;
  }
}

/* 触屏设备：不依赖悬停显示播放按钮 */
@media (hover: none) {
  .recent-play {
    opacity: 1;
    transform: none;
  }
}
</style>
