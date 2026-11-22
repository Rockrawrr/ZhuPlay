<script setup>
// 收藏页：展示喜欢的歌曲，点击即在“收藏列表”内播放
import { storeToRefs } from "pinia";
import { Music2, Heart, ArrowLeft } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useMusicActions } from "@/composables/useMusicActions";
import { useNavigation } from "@/composables/useNavigation";

const musicStore = useMusicStore();
const { favoriteSongsList } = storeToRefs(musicStore);

const { playSong } = useAudioPlayer();
const { toggleFavorite } = useMusicActions();
const { canGoBack, goBack } = useNavigation();
</script>

<template>
  <section class="favorite-page">
    <div class="favorite-toolbar">
      <button
        class="back-button"
        :disabled="!canGoBack"
        title="返回上一页"
        @click="goBack"
      >
        <ArrowLeft :size="19" />
      </button>
    </div>

    <div class="page-header">
      <div class="favorite-cover">
        <Heart :size="48" fill="#fff" />
      </div>
      <div class="header-info">
        <span>歌单</span>
        <h2>喜欢的音乐</h2>
        <p>你收藏的所有歌曲 · {{ favoriteSongsList.length }} 首歌曲</p>
      </div>
    </div>

    <div v-if="favoriteSongsList.length === 0" class="empty-favorites">
      <Heart :size="42" />
      <h3>还没有喜欢的音乐</h3>
      <p>在音乐库或播放器中点击爱心，收藏你喜欢的歌曲</p>
    </div>

    <div v-else class="song-list">
      <div
        v-for="(song, index) in favoriteSongsList"
        :key="song.id"
        class="song-item"
      >
        <span class="song-index">{{ index + 1 }}</span>
        <div class="song-icon"><Music2 :size="20" /></div>
        <div
          class="song-info"
          @click="playSong(song, favoriteSongsList)"
        >
          <div class="song-name">{{ song.name }}</div>
          <div class="song-filename">{{ song.filename }}</div>
        </div>
        <span class="song-size">{{ song.size }}</span>
        <button
          class="favorite-button"
          title="取消喜欢"
          @click="toggleFavorite(song.id)"
        >
          <Heart :size="18" fill="#1ed760" />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.favorite-page {
  height: 100%;
  min-height: 0;
  padding: 28px 32px;
  color: #fff;
  overflow-y: auto;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 32px;
  padding: 24px;
  background: linear-gradient(135deg, #5142a5, #24205a);
  border-radius: 12px;
}

.favorite-cover {
  width: 150px;
  height: 150px;
  min-width: 150px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #8b7bea, #392b83);
  box-shadow: 0 8px 24px #0005;
}

.header-info span {
  font-size: 13px;
}

.header-info h2 {
  font-size: 30px;
  font-weight: 700;
  margin: 10px 0;
}

.header-info p {
  color: #ddd;
  font-size: 13px;
  margin: 0;
}

.empty-favorites {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #888;
  text-align: center;
  background: #181818;
  border-radius: 12px;
}

.empty-favorites h3 {
  color: #fff;
  font-size: 18px;
  margin: 0;
}

.empty-favorites p {
  font-size: 13px;
  margin: 0;
}

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

.song-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282828;
  border-radius: 5px;
  color: #1ed760;
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
}

.song-size {
  color: #999;
  font-size: 12px;
}

.favorite-button {
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  color: #1ed760;
  cursor: pointer;
}

.favorite-button:hover {
  transform: scale(1.1);
}

.favorite-toolbar {
  display: flex;
  margin-bottom: 12px;
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
