<script setup>
import { ref } from "vue";
import { Upload, Music2, Trash2, Heart, ArrowLeft } from "lucide-vue-next";
import SongItem from "./SongItem.vue";

// 接收 App.vue 传递过来的歌曲列表
const props = defineProps({
  songs: {
    type: Array,
    default: () => [],
  },
  favoriteSongs: {
    type: Array,
    default: () => [],
  },
  canGoBack: {
    type: Boolean,
    default: false,
  },
});

// 向 App.vue 发送操作事件
const emit = defineEmits([
  "import-songs",
  "remove-song",
  "play-song",
  "toggle-favorite",
  "go-back",
]);

const fileInput = ref(null);

// 打开电脑文件选择窗口
function openFilePicker() {
  fileInput.value.click();
}

// 导入音乐文件
function importSongs(event) {
  const files = Array.from(event.target.files || []).filter((file) =>
    file.type.startsWith("audio/"),
  );

  emit("import-songs", files);

  // 清空选择框，允许重复选择同一个文件
  event.target.value = "";
}

// 删除歌曲
function removeSong(id) {
  emit("remove-song", id);
}

// 收藏 / 取消收藏歌曲
function toggleFavorite(songId) {
  emit("toggle-favorite", songId);
}
</script>

<template>
  <section class="music-library">
    <div class="library-header">
      <div class="library-heading">
        <button
          class="back-button"
          :disabled="!canGoBack"
          title="返回上一页"
          @click="emit('go-back')"
        >
          <ArrowLeft :size="19" />
        </button>

        <div>
          <h2>我的音乐</h2>
          <p>管理你导入的本地音乐</p>
        </div>
      </div>

      <button class="import-button" @click="openFilePicker">
        <Upload :size="18" />
        导入音乐
      </button>

      <input
        ref="fileInput"
        type="file"
        accept="audio/*"
        multiple
        hidden
        @change="importSongs"
      />
    </div>

    <div v-if="songs.length === 0" class="empty-library">
      <Music2 :size="48" />
      <h3>音乐库还是空的</h3>
      <p>导入电脑中的音乐文件，开始建立你的音乐收藏</p>
      <button class="import-button" @click="openFilePicker">
        <Upload :size="18" />
        选择音乐文件
      </button>
    </div>

    <div v-else class="song-list">
      <div class="song-count">共 {{ songs.length }} 首歌曲</div>

      <SongItem
        v-for="(song, index) in songs"
        :key="song.id"
        :song="song"
        :index="index"
        :is-favorite="favoriteSongs.includes(song.id)"
        @play="emit('play-song', $event)"
        @remove="removeSong"
        @toggle-favorite="toggleFavorite"
      />
    </div>
  </section>
</template>

<style scoped>
.music-library {
  padding: 28px 32px;
  color: #fff;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.library-header h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
}

.library-header p,
.empty-library p {
  color: #999;
  margin: 0;
  font-size: 14px;
}

.import-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 24px;
  padding: 11px 20px;
  background: #1ed760;
  color: #000;
  font-weight: 700;
  cursor: pointer;
}

.import-button:hover {
  background: #3be477;
}

.empty-library {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #777;
  text-align: center;
  background: #181818;
  border-radius: 12px;
}

.empty-library h3 {
  color: #fff;
  margin: 0;
  font-size: 18px;
}

.song-count {
  color: #999;
  font-size: 13px;
  margin-bottom: 12px;
}

.library-heading {
  display: flex;
  align-items: center;
  gap: 14px;
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
</style>
