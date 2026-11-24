<script setup>
// 音乐库：导入本地音频、展示全部歌曲、收藏 / 添加到歌单 / 删除
// 支持两种导入方式：点按钮选择文件、把文件拖进页面
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  Upload,
  Music2,
  ArrowLeft,
  ArrowUpDown,
  Heart,
  HardDrive,
  Trash2,
  Play,
  ListPlus,
  ListChecks,
} from "lucide-vue-next";
import SongRow from "@/components/common/SongRow.vue";
import VirtualList from "@/components/common/VirtualList.vue";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useMusicActions } from "@/composables/useMusicActions";
import { useNavigation } from "@/composables/useNavigation";
import { useToast } from "@/composables/useToast";
import { useSongMenu } from "@/composables/useSongMenu";
import { usePlaylistPicker } from "@/composables/useOverlays";
import { useConfirm } from "@/composables/useConfirm";
import { useImportStatus } from "@/composables/useImportStatus";
import { formatBytes } from "@/utils/format";
import { appReady } from "@/app/appState";

const musicStore = useMusicStore();
const { songs, favoriteSongs } = storeToRefs(musicStore);

const { playSong } = useAudioPlayer();
const { importSongs, cancelImport, removeSong, removeSongs, toggleFavorite } =
  useMusicActions();
const { canGoBack, goBack } = useNavigation();
const toast = useToast();
const { openSongMenu } = useSongMenu();
const { openPlaylistPicker } = usePlaylistPicker();
const { confirm } = useConfirm();
const { importState } = useImportStatus();

const fileInput = ref(null);

// ===== 排序 =====
const SORT_STORAGE_KEY = "zhuplay:library-sort";

const sortOptions = [
  { value: "added", label: "最近添加" },
  { value: "name", label: "歌名" },
  { value: "artist", label: "歌手" },
  { value: "album", label: "专辑" },
  { value: "duration", label: "时长" },
  { value: "size", label: "文件大小" },
];

const sortKey = ref(
  sortOptions.some((item) => item.value === localStorage.getItem(SORT_STORAGE_KEY))
    ? localStorage.getItem(SORT_STORAGE_KEY)
    : "added",
);

function changeSort(value) {
  sortKey.value = value;
  localStorage.setItem(SORT_STORAGE_KEY, value);
}

const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });

const sortedSongs = computed(() => {
  const list = [...songs.value];

  switch (sortKey.value) {
    case "name":
      return list.sort((a, b) => collator.compare(a.name || "", b.name || ""));
    case "artist":
      return list.sort(
        (a, b) =>
          collator.compare(a.artist || "", b.artist || "") ||
          collator.compare(a.name || "", b.name || ""),
      );
    case "album":
      return list.sort(
        (a, b) =>
          collator.compare(a.album || "", b.album || "") ||
          (a.trackNumber ?? 0) - (b.trackNumber ?? 0),
      );
    case "duration":
      return list.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
    case "size":
      return list.sort((a, b) => (b.fileSize ?? 0) - (a.fileSize ?? 0));
    case "added":
    default:
      return list.sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0));
  }
});

// ===== 批量操作 =====
const selectMode = ref(false);
const selectedIds = ref(new Set());

const selectedSongs = computed(() =>
  sortedSongs.value.filter((song) => selectedIds.value.has(song.id)),
);

const allSelected = computed(
  () =>
    sortedSongs.value.length > 0 &&
    selectedIds.value.size === sortedSongs.value.length,
);

const importPercent = computed(() => {
  if (!importState.total) return 0;
  return Math.min(100, Math.round((importState.done / importState.total) * 100));
});

function toggleSelectMode() {
  selectMode.value = !selectMode.value;
  selectedIds.value = new Set();
}

function toggleSelect(song) {
  const next = new Set(selectedIds.value);
  if (next.has(song.id)) next.delete(song.id);
  else next.add(song.id);
  selectedIds.value = next;
}

function toggleSelectAll() {
  selectedIds.value = allSelected.value
    ? new Set()
    : new Set(sortedSongs.value.map((song) => song.id));
}

// 一键播放全部歌曲（按当前排序作为播放队列）
function playAll() {
  if (sortedSongs.value.length === 0) return;
  playSong(sortedSongs.value[0], sortedSongs.value);
}

function playSelected() {
  if (selectedSongs.value.length === 0) return;
  playSong(selectedSongs.value[0], selectedSongs.value);
}

// 批量收藏：只补收藏，不会取消已有的
function favoriteSelected() {
  const targets = selectedSongs.value.filter(
    (song) => !favoriteIds.value.has(song.id),
  );

  if (targets.length === 0) {
    toast.info("选中的歌曲都已在喜欢里");
    return;
  }

  for (const song of targets) toggleFavorite(song.id);
  toast.success(`已收藏 ${targets.length} 首歌曲`);
}

function addSelectedToPlaylist() {
  if (selectedSongs.value.length === 0) return;
  openPlaylistPicker(selectedSongs.value);
}

async function deleteSelected() {
  const targets = selectedSongs.value;
  if (targets.length === 0) return;

  const confirmed = await confirm({
    title: "删除选中的歌曲",
    message: `将从音乐库删除 ${targets.length} 首歌曲，并同时从收藏、歌单与播放记录中移除。此操作无法恢复。`,
    confirmText: "删除",
    danger: true,
  });
  if (!confirmed) return;

  await removeSongs(targets.map((song) => song.id));
  selectedIds.value = new Set();
}

// 拖拽计数：dragenter/dragleave 会冒泡触发很多次，用计数避免闪烁
const dragDepth = ref(0);
const isDragging = computed(() => dragDepth.value > 0);

// 常见音频扩展名兜底：拖进来的文件有时 file.type 为空
const AUDIO_EXTENSIONS = /\.(mp3|flac|wav|ogg|oga|m4a|aac|opus|wma|ape|aiff|alac)$/i;

const totalSize = computed(() =>
  songs.value.reduce((sum, song) => sum + (song.fileSize || 0), 0),
);

// 收藏判断用 Set：1 万收藏时逐行 includes 会变成 O(n²)
const favoriteIds = computed(() => new Set(favoriteSongs.value));

function handleAddToPlaylist(song) {
  openPlaylistPicker(song);
}

// 右键歌曲行：打开统一的歌曲菜单
function handleSongMenu(event, song) {
  openSongMenu(event, song, {
    source: "library",
    list: sortedSongs.value,
  });
}

function openFilePicker() {
  fileInput.value.click();
}

// 统一处理选文件与拖拽两条入口
function handleFiles(fileList) {
  const files = Array.from(fileList ?? []).filter(
    (file) => file.type.startsWith("audio/") || AUDIO_EXTENSIONS.test(file.name),
  );

  if (files.length === 0) {
    toast.info("没有找到可导入的音频文件");
    return;
  }

  importSongs(files);
}

function onFileChange(event) {
  handleFiles(event.target.files);
  event.target.value = "";
}

function onDragEnter(event) {
  if (!event.dataTransfer?.types?.includes("Files")) return;
  dragDepth.value += 1;
}

function onDragOver(event) {
  // 必须阻止默认行为，否则浏览器不会触发 drop
  event.preventDefault();
}

function onDragLeave() {
  dragDepth.value = Math.max(0, dragDepth.value - 1);
}

function onDrop(event) {
  event.preventDefault();
  dragDepth.value = 0;
  handleFiles(event.dataTransfer?.files);
}
</script>

<template>
  <section
    class="music-library"
    @dragenter.prevent="onDragEnter"
    @dragover="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop="onDrop"
  >
    <div class="library-header">
      <div class="library-heading">
        <button
          class="back-button"
          :disabled="!canGoBack"
          title="返回上一页"
          @click="goBack"
        >
          <ArrowLeft :size="19" />
        </button>

        <div>
          <h2>我的音乐</h2>
          <p v-if="songs.length === 0">管理你导入的本地音乐</p>
          <p v-else class="library-stats">
            <span>{{ songs.length }} 首歌曲</span>
            <span class="dot" aria-hidden="true">·</span>
            <span><HardDrive :size="13" /> {{ formatBytes(totalSize) }}</span>
            <span class="dot" aria-hidden="true">·</span>
            <span><Heart :size="13" /> {{ favoriteSongs.length }} 首收藏</span>
          </p>
        </div>
      </div>

      <div class="header-actions">
        <label v-if="sortedSongs.length > 0" class="sort-control">
          <ArrowUpDown :size="14" />
          <select
            :value="sortKey"
            aria-label="排序方式"
            @change="changeSort($event.target.value)"
          >
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <button
          v-if="songs.length > 0"
          class="ghost-button header-action"
          title="按当前排序把整个音乐库加入播放队列"
          @click="playAll"
        >
          <Play :size="16" /> 播放全部
        </button>

        <button
          v-if="songs.length > 0"
          class="ghost-button header-action"
          :class="{ active: selectMode }"
          title="批量选择歌曲进行操作"
          @click="toggleSelectMode"
        >
          <ListChecks :size="16" /> {{ selectMode ? "完成" : "批量操作" }}
        </button>

        <button class="import-button" @click="openFilePicker">
          <Upload :size="18" /> <span class="import-label">导入音乐</span>
        </button>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="audio/*"
        multiple
        hidden
        @change="onFileChange"
      />
    </div>

    <!-- 导入进度 -->
    <div v-if="importState.active" class="import-progress">
      <div class="import-progress-info">
        <span>正在导入 {{ importState.done }} / {{ importState.total }}</span>
        <span class="import-progress-percent">{{ importPercent }}%</span>
      </div>
      <div class="import-progress-track">
        <div class="import-progress-fill" :style="{ width: `${importPercent}%` }"></div>
      </div>
      <button class="batch-link" @click="cancelImport">取消</button>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="selectMode && sortedSongs.length > 0" class="batch-bar">
      <div class="batch-info">
        <span class="batch-count">已选 {{ selectedIds.size }} 首</span>
        <button class="batch-link" @click="toggleSelectAll">
          {{ allSelected ? "取消全选" : "全选" }}
        </button>
      </div>

      <div class="batch-actions">
        <button
          class="ghost-button"
          :disabled="selectedIds.size === 0"
          @click="playSelected"
        >
          <Play :size="15" /> 播放
        </button>
        <button
          class="ghost-button"
          :disabled="selectedIds.size === 0"
          @click="favoriteSelected"
        >
          <Heart :size="15" /> 收藏
        </button>
        <button
          class="ghost-button"
          :disabled="selectedIds.size === 0"
          @click="addSelectedToPlaylist"
        >
          <ListPlus :size="15" /> 加入歌单
        </button>
        <button
          class="ghost-button danger"
          :disabled="selectedIds.size === 0"
          @click="deleteSelected"
        >
          <Trash2 :size="15" /> 删除
        </button>
      </div>
    </div>

    <!-- 首屏骨架：数据恢复完成前先占位，避免空状态闪一下 -->
    <div v-if="!appReady" class="song-skeleton">
      <div v-for="index in 8" :key="index" class="skeleton-line"></div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="songs.length === 0" class="empty-library">
      <div class="empty-card">
        <div class="empty-badge">
          <Music2 :size="38" />
        </div>

        <h3>音乐库还是空的</h3>
        <p class="empty-desc">
          导入电脑里的音乐，ZhuPlay 会自动读取歌名、歌手、专辑和封面。<br />
          歌曲只保存在本机浏览器中，不会上传。
        </p>

        <button class="import-button large" @click="openFilePicker">
          <Upload :size="19" /> 选择音乐文件
        </button>

        <p class="empty-hint">也可以直接把音频文件拖到这里</p>

        <div class="format-chips">
          <span>MP3</span>
          <span>FLAC</span>
          <span>WAV</span>
          <span>AAC</span>
          <span>OGG</span>
          <span>M4A</span>
        </div>
      </div>
    </div>

    <!-- 有歌时的列表：上万首也只渲染可视区 -->
    <div v-else class="song-list">
      <VirtualList :items="sortedSongs" :item-height="60">
        <template #default="{ item: song, index }">
          <SongRow
            :song="song"
            :index="index"
            :is-favorite="favoriteIds.has(song.id)"
            :selectable="selectMode"
            :selected="selectedIds.has(song.id)"
            meta="size"
            show-favorite
            show-add-to-playlist
            removable
            remove-label="删除歌曲"
            :remove-icon="Trash2"
            @play="playSong(song, sortedSongs)"
            @toggle-select="toggleSelect(song)"
            @remove="removeSong(song.id)"
            @toggle-favorite="toggleFavorite(song.id)"
            @add-to-playlist="handleAddToPlaylist(song)"
            @contextmenu.prevent="handleSongMenu($event, song)"
          />
        </template>
      </VirtualList>
    </div>

    <!-- 拖拽提示层 -->
    <div v-if="isDragging" class="drop-overlay">
      <div class="drop-box">
        <Upload :size="34" />
        <strong>松开鼠标即可导入</strong>
        <span>支持 MP3 / FLAC / WAV / AAC / OGG / M4A</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.music-library {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 28px 32px;
  color: #fff;
  overflow: hidden;
}

/* ===== 顶部 ===== */

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-shrink: 0;
}

.library-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.library-header h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 6px;
}

.library-header p {
  color: #999;
  margin: 0;
  font-size: 13px;
}

.library-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.library-stats span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.library-stats .dot {
  color: #555;
}

/* 头部操作区：播放全部 / 批量操作 / 导入 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.header-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 20px;
  font-size: 13px;
}

.header-action.active {
  background: #1d2b23;
  color: var(--color-primary);
  border-color: #2f5f47;
}

/* 排序选择器 */
.sort-control {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid #2f2f2f;
  border-radius: 18px;
  color: #b3b3b3;
}

.sort-control select {
  border: none;
  background: transparent;
  color: #d0d0d0;
  font-size: 12px;
  cursor: pointer;
  outline: none;
}

.sort-control select option {
  background: #1c1c1c;
  color: #fff;
}

/* 首屏骨架 */
.song-skeleton {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
}

.skeleton-line {
  height: 56px;
  border-radius: 8px;
  background: linear-gradient(90deg, #1b1b1b 25%, #262626 37%, #1b1b1b 63%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.4s ease infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0 50%;
  }
}

/* 导入进度 */.import-progress {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #16241d;
  border: 1px solid #24402f;
}

.import-progress-info {
  grid-column: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #d0d0d0;
  font-size: 12px;
}

.import-progress-percent {
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.import-progress-track {
  grid-column: 1 / -1;
  height: 5px;
  border-radius: 3px;
  background: #22322a;
  overflow: hidden;
}

.import-progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.2s ease;
}

.import-progress .batch-link {
  grid-row: 1;
  grid-column: 2;
}

/* 批量操作栏 */
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #17211c;
  border: 1px solid #24402f;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-count {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.batch-link {
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.batch-link:hover {
  text-decoration: underline;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.batch-actions .ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  font-size: 12px;
  border-radius: 16px;
}

.batch-actions .ghost-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.batch-actions .ghost-button.danger {
  color: #ff7b7b;
  border-color: #4a2626;
}

.batch-actions .ghost-button.danger:hover:not(:disabled) {
  background: #2a1616;
  color: #ff9b9b;
}

.import-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 11px 20px;
  border: none;
  border-radius: 24px;
  background: var(--color-primary);
  color: #000;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.import-button:hover {
  background: #3be477;
  transform: scale(1.02);
}

.import-button.large {
  padding: 13px 26px;
  font-size: 14px;
}

.back-button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: #282828;
  color: #b3b3b3;
  cursor: pointer;
  transition: 0.2s;
}

.back-button:hover:not(:disabled) {
  background: #383838;
  color: #fff;
}

.back-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ===== 空状态 ===== */

.empty-library {
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 8px 0 16px;
  border-radius: 16px;
  background:
    radial-gradient(circle at 50% 0%, #1d3a2c 0%, transparent 62%),
    #141414;
  border: 1px solid #202020;
  overflow: auto;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  max-width: 480px;
  padding: 40px 32px;
  text-align: center;
}

.empty-badge {
  width: 84px;
  height: 84px;
  display: grid;
  place-items: center;
  margin-bottom: 4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2f7f5c, #183028);
  color: #d9f7e4;
  box-shadow:
    0 0 0 10px #1ed76010,
    0 14px 32px #0006;
}

.empty-card h3 {
  margin: 0;
  font-size: 21px;
  font-weight: 700;
}

.empty-desc {
  margin: 0;
  color: #a0a0a0;
  font-size: 13px;
  line-height: 1.9;
}

.empty-hint {
  margin: 2px 0 0;
  color: #777;
  font-size: 12px;
}

.format-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 6px;
}

.format-chips span {
  padding: 4px 10px;
  border: 1px solid #2f2f2f;
  border-radius: 20px;
  background: #1c1c1c;
  color: #8f8f8f;
  font-size: 11px;
  letter-spacing: 0.04em;
}

/* ===== 列表 ===== */

.song-list {
  flex: 1;
  min-height: 0;
  padding-right: 8px;
}

/* ===== 拖拽层 ===== */

.drop-overlay {
  position: absolute;
  inset: 12px;
  z-index: 20;
  display: grid;
  place-items: center;
  border: 2px dashed #1ed76080;
  border-radius: 16px;
  background: #0d1a14e6;
  backdrop-filter: blur(2px);
  pointer-events: none;
}

.drop-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #b7f5cd;
  text-align: center;
}

.drop-box strong {
  font-size: 17px;
}

.drop-box span {
  color: #7ea78f;
  font-size: 12px;
}

@media (max-width: 700px) {
  .music-library {
    padding: 20px 16px;
  }

  .library-header h2 {
    font-size: 20px;
  }

  /* 窄屏只留图标，空状态里还有大按钮作为主入口 */
  .import-label {
    display: none;
  }

  .import-button {
    padding: 10px 12px;
  }

  .empty-card {
    padding: 28px 18px;
  }

  .empty-badge {
    width: 68px;
    height: 68px;
  }

  .empty-card h3 {
    font-size: 18px;
  }

  .empty-desc br {
    display: none;
  }
}
</style>
