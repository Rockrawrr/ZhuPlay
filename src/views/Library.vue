<script setup>
// 音乐库：导入本地音频、展示全部歌曲、收藏 / 添加到歌单 / 删除
// 支持两种导入方式：点按钮选择文件、把文件拖进页面
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { Upload, Music2, ArrowLeft, Heart, HardDrive } from "lucide-vue-next";
import SongItem from "@/components/SongItem.vue";
import AddToPlaylistDialog from "@/components/AddToPlaylistDialog.vue";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useMusicActions } from "@/composables/useMusicActions";
import { useNavigation } from "@/composables/useNavigation";
import { useToast } from "@/composables/useToast";

const musicStore = useMusicStore();
const { songs, favoriteSongs } = storeToRefs(musicStore);

const { playSong } = useAudioPlayer();
const { importSongs, removeSong, toggleFavorite } = useMusicActions();
const { canGoBack, goBack } = useNavigation();
const toast = useToast();

const fileInput = ref(null);

// 正在添加到歌单的歌曲（null 时弹窗关闭）
const pendingPlaylistSong = ref(null);

// 拖拽计数：dragenter/dragleave 会冒泡触发很多次，用计数避免闪烁
const dragDepth = ref(0);
const isDragging = computed(() => dragDepth.value > 0);

// 常见音频扩展名兜底：拖进来的文件有时 file.type 为空
const AUDIO_EXTENSIONS = /\.(mp3|flac|wav|ogg|oga|m4a|aac|opus|wma|ape|aiff|alac)$/i;

const totalSize = computed(() =>
  songs.value.reduce((sum, song) => sum + (song.fileSize || 0), 0),
);

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function handleAddToPlaylist(song) {
  pendingPlaylistSong.value = song;
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
            <span><HardDrive :size="13" /> {{ formatSize(totalSize) }}</span>
            <span class="dot" aria-hidden="true">·</span>
            <span><Heart :size="13" /> {{ favoriteSongs.length }} 首收藏</span>
          </p>
        </div>
      </div>

      <button class="import-button" @click="openFilePicker">
        <Upload :size="18" /> <span class="import-label">导入音乐</span>
      </button>

      <input
        ref="fileInput"
        type="file"
        accept="audio/*"
        multiple
        hidden
        @change="onFileChange"
      />
    </div>

    <!-- 空状态 -->
    <div v-if="songs.length === 0" class="empty-library">
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

    <!-- 有歌时的列表 -->
    <div v-else class="song-list">
      <SongItem
        v-for="(song, index) in songs"
        :key="song.id"
        :song="song"
        :index="index"
        :is-favorite="favoriteSongs.includes(song.id)"
        @play="(song) => playSong(song, songs)"
        @remove="removeSong"
        @toggle-favorite="toggleFavorite"
        @add-to-playlist="handleAddToPlaylist"
      />
    </div>

    <!-- 拖拽提示层 -->
    <div v-if="isDragging" class="drop-overlay">
      <div class="drop-box">
        <Upload :size="34" />
        <strong>松开鼠标即可导入</strong>
        <span>支持 MP3 / FLAC / WAV / AAC / OGG / M4A</span>
      </div>
    </div>

    <AddToPlaylistDialog
      v-if="pendingPlaylistSong"
      :song="pendingPlaylistSong"
      @close="pendingPlaylistSong = null"
    />
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
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
}

.song-list::-webkit-scrollbar {
  width: 8px;
}

.song-list::-webkit-scrollbar-track {
  background: transparent;
}

.song-list::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.song-list::-webkit-scrollbar-thumb:hover {
  background: #666;
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
