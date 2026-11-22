<script setup>
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { Upload, Music2, ArrowLeft } from "lucide-vue-next";
import SongItem from "@/components/SongItem.vue";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useMusicActions } from "@/composables/useMusicActions";
import { useNavigation } from "@/composables/useNavigation";

const musicStore = useMusicStore();
const { songs, favoriteSongs } = storeToRefs(musicStore);

const { playSong } = useAudioPlayer();
const { importSongs, removeSong, toggleFavorite } = useMusicActions();
const { canGoBack, goBack } = useNavigation();

const fileInput = ref(null);

function openFilePicker() {
  fileInput.value.click();
}

function onFileChange(event) {
  const files = Array.from(event.target.files || []).filter((file) =>
    file.type.startsWith("audio/"),
  );
  importSongs(files);
  event.target.value = "";
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
          @click="goBack"
        >
          <ArrowLeft :size="19" />
        </button>
        <div>
          <h2>我的音乐</h2>
          <p>管理你导入的本地音乐</p>
        </div>
      </div>

      <button class="import-button" @click="openFilePicker">
        <Upload :size="18" /> 导入音乐
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

    <div v-if="songs.length === 0" class="empty-library">
      <Music2 :size="48" />
      <h3>音乐库还是空的</h3>
      <p>导入电脑中的音乐文件，开始建立你的音乐收藏</p>
      <button class="import-button" @click="openFilePicker">
        <Upload :size="18" /> 选择音乐文件
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
        @play="playSong"
        @remove="removeSong"
        @toggle-favorite="toggleFavorite"
      />
    </div>
  </section>
</template>

<style scoped>
.music-library {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 28px 32px;
  color: #fff;
  overflow: hidden;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  flex-shrink: 0;
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
  flex-shrink: 0;
}

.import-button:hover {
  background: #3be477;
}

.empty-library {
  flex: 1;
  min-height: 0;
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

.song-count {
  position: sticky;
  top: 0;
  z-index: 1;
  color: #999;
  font-size: 13px;
  padding: 4px 0 12px;
  margin-bottom: 4px;
  background: #121212;
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
