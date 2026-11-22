<script setup>
// 最近播放：按播放时间倒序（store 已维护顺序），点击在“最近播放列表”内播放
import { storeToRefs } from "pinia";
import { Clock3, Music2, Play, Trash2, ArrowLeft } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useMusicActions } from "@/composables/useMusicActions";
import { useNavigation } from "@/composables/useNavigation";

const musicStore = useMusicStore();
const { recentSongs } = storeToRefs(musicStore);

const { playSong } = useAudioPlayer();
const { clearRecentSongs } = useMusicActions();
const { canGoBack, goBack } = useNavigation();
</script>

<template>
  <main class="recent-played">
    <header class="page-header">
      <div class="page-heading">
        <button
          class="back-button"
          :disabled="!canGoBack"
          title="返回上一页"
          @click="goBack"
        >
          <ArrowLeft :size="19" />
        </button>
        <div>
          <h2>最近播放</h2>
          <p>查看你最近听过的音乐</p>
        </div>
      </div>

      <div class="page-actions">
        <span class="song-count">共 {{ recentSongs.length }} 条记录</span>
        <button
          v-if="recentSongs.length > 0"
          class="clear-button"
          @click="clearRecentSongs"
        >
          <Trash2 :size="16" /> 清空记录
        </button>
      </div>
    </header>

    <div v-if="recentSongs.length > 0" class="song-list">
      <button
        v-for="(song, index) in recentSongs"
        :key="song.id"
        class="song-item"
        @click="playSong(song, recentSongs)"
      >
        <span class="song-index">{{ index + 1 }}</span>
        <div class="song-cover">
          <img
            v-if="song.coverUrl"
            :src="song.coverUrl"
            :alt="song.album || song.name"
          />
          <Music2 v-else :size="20" />
        </div>
        <div class="song-info">
          <div class="song-name">{{ song.name }}</div>
          <div class="song-artist">{{ song.artist || song.filename }}</div>
        </div>
        <span class="song-format">{{ song.format?.toUpperCase() }}</span>
        <Play :size="18" class="play-icon" />
      </button>
    </div>

    <div v-else class="empty-state">
      <Clock3 :size="48" />
      <h3>还没有播放记录</h3>
      <p>播放一些音乐，它们就会出现在这里。</p>
    </div>
  </main>
</template>

<style scoped>
.recent-played {
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 28px 32px;
  color: #fff;
}

/* 页面顶部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  flex-shrink: 0;
}

.page-heading {
  display: flex;
  align-items: center;
  gap: 14px;
}

.page-heading h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
}

.page-heading p {
  margin: 0;
  color: #999;
  font-size: 14px;
}

/* 返回按钮 */
.back-button {
  width: 34px;
  height: 34px;
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
  cursor: default;
}

/* 右侧操作 */
.page-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.song-count {
  color: #999;
  font-size: 13px;
}

.clear-button {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  border: none;
  border-radius: 20px;
  background: #282828;
  color: #b3b3b3;
  font-size: 13px;
  cursor: pointer;
  transition: 0.2s;
}

.clear-button:hover {
  background: #383838;
  color: #fff;
}

/* 歌曲列表 */
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

/* 单首歌曲 */
.song-item {
  width: 100%;
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 9px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #fff;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}

.song-item:hover {
  background: #282828;
}

.song-index {
  width: 20px;
  flex-shrink: 0;
  color: #999;
  text-align: center;
  font-size: 13px;
}

.song-cover {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 5px;
  background: linear-gradient(135deg, #365f50, #17241e);
  color: #1ed760;
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-name {
  overflow: hidden;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist {
  overflow: hidden;
  margin-top: 5px;
  color: #999;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-format {
  color: #999;
  font-size: 11px;
  flex-shrink: 0;
}

.play-icon {
  flex-shrink: 0;
  color: #1ed760;
  opacity: 0;
  transition: opacity 0.2s;
}

.song-item:hover .play-icon {
  opacity: 1;
}

/* 空状态 */
.empty-state {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #777;
  text-align: center;
  background: #181818;
  border-radius: 12px;
}

.empty-state h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.empty-state p {
  margin: 0;
  color: #999;
  font-size: 13px;
}
</style>
