<script setup>
// 「添加到歌单」弹窗
// 支持单首（右键菜单 / 歌曲行按钮）与多首（音乐库批量操作）
// 已在歌单里的条目会置灰 + 打勾，防止重复添加
import { computed, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { Check, ListMusic, Plus, X } from "lucide-vue-next";
import { usePlaylistStore } from "@/stores/playlist";
import { usePlaylistActions } from "@/composables/usePlaylistActions";
import { useToast } from "@/composables/useToast";
import { useConfirm } from "@/composables/useConfirm";

const props = defineProps({
  // 要添加的歌曲（多选时长度 > 1）
  songs: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close"]);

const playlistStore = usePlaylistStore();
const { playlists } = storeToRefs(playlistStore);
const { addSongsToPlaylist, createPlaylist } = usePlaylistActions();
const toast = useToast();
const { prompt, state: confirmState } = useConfirm();

const isBatch = computed(() => props.songs.length > 1);
const headingText = computed(() =>
  isBatch.value ? `${props.songs.length} 首歌曲` : props.songs[0]?.name || "",
);

// 目标歌曲里有多少首还没在这个歌单里
function pendingCount(playlist) {
  return props.songs.filter((song) => !playlist.songIds.includes(song.id)).length;
}

function hasSong(playlist) {
  return pendingCount(playlist) === 0;
}

async function addAllTo(playlist) {
  const targets = props.songs.filter(
    (song) => !playlist.songIds.includes(song.id),
  );
  if (targets.length === 0) return;

  // 一次事务写入整个歌单
  const added = await addSongsToPlaylist(
    playlist.id,
    targets.map((song) => song.id),
  );

  toast.success(
    added > 1
      ? `已把 ${added} 首歌曲添加到「${playlist.name}」`
      : `已添加到「${playlist.name}」`,
  );
  emit("close");
}

// 加入已有歌单后直接关闭
async function handleAdd(playlist) {
  await addAllTo(playlist);
}

// 新建歌单并把当前歌曲一起放进去
async function handleCreate() {
  const name = await prompt({
    title: "新建歌单并添加",
    value: "新建歌单",
    placeholder: "歌单名称",
    confirmText: "创建",
    message: isBatch.value
      ? `会把 ${props.songs.length} 首歌曲放进新歌单`
      : `会把「${props.songs[0]?.name}」放进新歌单`,
  });
  if (name === null) return;

  const playlist = await createPlaylist(name);
  await addAllTo(playlist);
}

function handleKeydown(event) {
  if (event.key !== "Escape") return;
  // 全局对话框（新建歌单）打开时，Esc 先交给它处理
  if (confirmState.visible) return;

  emit("close");
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
</script>

<template>
  <div class="dialog-layer">
    <div class="dialog-backdrop" @click="emit('close')"></div>

    <aside class="dialog" role="dialog" aria-label="添加到歌单">
      <header class="dialog-header">
        <div class="dialog-heading">
          <h3>添加到歌单</h3>
          <p :title="headingText">{{ headingText }}</p>
        </div>
        <button class="dialog-close" title="关闭" @click="emit('close')">
          <X :size="18" />
        </button>
      </header>

      <button class="create-row" @click="handleCreate">
        <span class="create-icon"><Plus :size="17" /></span>
        <span>新建歌单并添加</span>
      </button>

      <div v-if="playlists.length === 0" class="dialog-empty">
        还没有歌单，点上面新建一个
      </div>

      <ul v-else class="playlist-list">
        <li v-for="playlist in playlists" :key="playlist.id">
          <button
            class="playlist-row"
            :disabled="hasSong(playlist)"
            :title="
              hasSong(playlist)
                ? '已在这个歌单里'
                : `添加${pendingCount(playlist)}首到「${playlist.name}」`
            "
            @click="handleAdd(playlist)"
          >
            <span class="row-icon"><ListMusic :size="17" /></span>

            <span class="row-info">
              <span class="row-name">{{ playlist.name }}</span>
              <span class="row-count">{{ playlist.songIds.length }} 首</span>
            </span>

            <Check v-if="hasSong(playlist)" :size="17" class="row-check" />
            <Plus v-else :size="17" class="row-plus" />
          </button>
        </li>
      </ul>

      <footer class="dialog-footer">
        <button class="ghost-button" @click="emit('close')">取消</button>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 850;
}

.dialog-backdrop {
  position: absolute;
  inset: 0;
  background: #0007;
}

.dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(420px, calc(100vw - 40px));
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  background: #181818;
  box-shadow: 0 20px 50px #000a;
  color: #fff;
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid #282828;
}

.dialog-heading {
  min-width: 0;
}

.dialog-heading h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}

.dialog-heading p {
  margin: 6px 0 0;
  color: #999;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-close {
  display: grid;
  place-items: center;
  padding: 4px;
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
}

.dialog-close:hover {
  color: #fff;
}

.create-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 12px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: #282828;
  color: #fff;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.create-row:hover {
  background: #323232;
}

.create-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 5px;
  background: #1ed760;
  color: #000;
}

.dialog-empty {
  padding: 24px 20px;
  color: #888;
  font-size: 13px;
  text-align: center;
}

.playlist-list {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0 8px 8px;
  list-style: none;
  overflow-y: auto;
}

.playlist-row {
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

.playlist-row:hover:not(:disabled) {
  background: #282828;
}

.playlist-row:disabled {
  cursor: default;
  opacity: 0.6;
}

.row-icon {
  width: 34px;
  height: 34px;
  min-width: 34px;
  display: grid;
  place-items: center;
  border-radius: 5px;
  background: #282828;
  color: #1ed760;
}

.row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.row-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-count {
  color: #999;
  font-size: 11px;
}

.row-plus {
  color: #1ed760;
  flex-shrink: 0;
}

.row-check {
  color: #1ed760;
  flex-shrink: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 10px 16px 14px;
  border-top: 1px solid #282828;
}

.ghost-button {
  padding: 8px 16px;
  border: 1px solid #3a3a3a;
  border-radius: 18px;
  background: transparent;
  color: #ddd;
  font-size: 12px;
  cursor: pointer;
}

.ghost-button:hover {
  border-color: #666;
  color: #fff;
  background: #232323;
}
</style>
