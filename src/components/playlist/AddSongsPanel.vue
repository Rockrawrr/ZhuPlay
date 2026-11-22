<script setup>
// 添加歌曲弹层：列出曲库里“还没加入本歌单”的歌曲，点一下即加入（可连续加）
// 搜索状态是本组件私有的，关闭即销毁；是否已加入由 existingIds 决定
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Music2, Plus, Search, X } from "lucide-vue-next";

const props = defineProps({
  playlistName: {
    type: String,
    default: "",
  },
  // 整个曲库
  songs: {
    type: Array,
    default: () => [],
  },
  // 歌单已有的 songId
  existingIds: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["add", "close"]);

const filter = ref("");

const usedIds = computed(() => new Set(props.existingIds));

// 只显示还没进歌单的歌，并按关键字过滤
const addableSongs = computed(() => {
  const keyword = filter.value.trim().toLowerCase();

  return props.songs.filter((song) => {
    if (usedIds.value.has(song.id)) return false;
    if (!keyword) return true;

    return [song.name, song.artist, song.filename].some((value) =>
      (value || "").toLowerCase().includes(keyword),
    );
  });
});

function handleKeydown(event) {
  if (event.key === "Escape") emit("close");
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
</script>

<template>
  <div class="add-layer">
    <div class="add-backdrop" @click="emit('close')"></div>

    <aside class="add-panel" role="dialog" aria-label="添加歌曲到歌单">
      <header class="add-header">
        <h3 :title="playlistName">添加到「{{ playlistName }}」</h3>
        <button class="icon-action" title="关闭" @click="emit('close')">
          <X :size="18" />
        </button>
      </header>

      <div class="add-search">
        <Search :size="15" />
        <input v-model="filter" type="text" placeholder="搜索歌曲或歌手" />
      </div>

      <div v-if="songs.length === 0" class="add-empty">
        音乐库还是空的，先去「我的音乐库」导入歌曲
      </div>
      <div v-else-if="addableSongs.length === 0" class="add-empty">
        {{ filter ? "没有匹配的歌曲" : "曲库里的歌曲都已经在这个歌单里了" }}
      </div>

      <ul v-else class="add-list">
        <li v-for="song in addableSongs" :key="song.id">
          <button class="add-row" @click="emit('add', song.id)">
            <span class="add-cover">
              <img
                v-if="song.coverUrl"
                :src="song.coverUrl"
                :alt="song.album || song.name"
              />
              <Music2 v-else :size="15" />
            </span>

            <span class="add-info">
              <span class="add-name">{{ song.name }}</span>
              <span class="add-artist">{{ song.artist || song.filename }}</span>
            </span>

            <Plus :size="17" class="add-plus" />
          </button>
        </li>
      </ul>

      <footer class="add-footer">
        <button class="ghost-button" @click="emit('close')">完成</button>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.add-layer {
  position: fixed;
  inset: 0;
  z-index: 800;
}

.add-backdrop {
  position: absolute;
  inset: 0;
  background: #0007;
}

.add-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, calc(100vw - 40px));
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  background: #181818;
  box-shadow: 0 20px 50px #000a;
}

.add-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid #282828;
}

.add-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 18px;
  padding: 9px 12px;
  border-radius: 20px;
  background: #282828;
  color: #999;
}

.add-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: #fff;
  font-size: 13px;
}

.add-empty {
  padding: 32px 20px;
  color: #888;
  font-size: 13px;
  text-align: center;
}

.add-list {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0 8px;
  list-style: none;
  overflow-y: auto;
}

.add-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #fff;
  text-align: left;
  cursor: pointer;
}

.add-row:hover {
  background: #282828;
}

.add-cover {
  width: 36px;
  height: 36px;
  min-width: 36px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 4px;
  background: #282828;
  color: var(--color-primary);
}

.add-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.add-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.add-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-artist {
  color: #999;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-plus {
  color: var(--color-primary);
  flex-shrink: 0;
}

.add-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 18px;
  border-top: 1px solid #282828;
}
</style>
