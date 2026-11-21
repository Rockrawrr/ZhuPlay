<script setup>
import { ref, onMounted, onUnmounted } from "vue";

import Sidebar from "./components/Sidebar.vue";
import MainContent from "./components/MainContent.vue";
import MusicLibrary from "./components/MusicLibrary.vue";
import FavoriteMusic from "./components/FavoriteMusic.vue";
import MusicPlayer from "./components/MusicPlayer.vue";
import { storeToRefs } from "pinia";
import { useMusicStore } from "./stores/music";
import { usePlayerStore } from "./stores/player";
import { createAudioService } from "./services/audioService";
import { createSong, releaseSong } from "./services/musicService";
import { parseMusicMetadata } from "./services/metadataService";
import { createMusicStorage } from "./storage/musicStorage";

// 初始化音乐数据仓库
const musicStore = useMusicStore();

// 初始化音乐存储服务
const musicStorage = createMusicStorage();

// 初始化播放器数据仓库
const playerStore = usePlayerStore();

// 获取具有响应性的音乐数据
const {
  songs,
  favoriteSongs,
  recentSongs,
  recentImportedSongs,
  favoriteSongsList,
} = storeToRefs(musicStore);

// 获取播放器响应式数据
const { currentSong, isPlaying, isShuffle, repeatMode, currentTime, duration } =
  storeToRefs(playerStore);

// 当前显示的页面
const currentPage = ref("home");

// 页面导航历史
const navigationHistory = ref([]);

// 页面跳转并记录历史
function navigateTo(page) {
  if (page === currentPage.value) return;

  navigationHistory.value.push(currentPage.value);
  currentPage.value = page;
}

// 返回上一页
function goBack() {
  if (navigationHistory.value.length === 0) return;

  currentPage.value = navigationHistory.value.pop();
}

// 清空最近播放记录
function clearRecentSongs() {
  const confirmed = window.confirm("确定清空最近播放记录吗？");
  if (!confirmed) return;

  musicStore.clearRecentSongs();
}

const toggleFavorite = musicStore.toggleFavorite;

// 初始化音频服务
const audioService = createAudioService();

// 页面启动时恢复音乐库
onMounted(async () => {
  try {
    const savedSongs = await musicStorage.getSongs();

    // 恢复歌曲列表
    songs.value = savedSongs;

    console.log(`成功恢复 ${savedSongs.length} 首歌曲`);
  } catch (error) {
    console.error("音乐库恢复失败：", error);
  }
});

// 获取音频对象
const audio = audioService.getAudio();

// 导入音乐文件
async function importSongs(files) {
  const newSongs = await Promise.all(
    Array.from(files).map(async (file) => {
      try {
        // 解析音乐元数据
        const metadata = await parseMusicMetadata(file);

        return createSong(file, metadata);
      } catch (error) {
        console.error(`音乐解析失败：${file.name}`, error);

        // 元数据解析失败时，仍然允许导入歌曲
        return createSong(file);
      }
    }),
  );

  // 保存歌曲到 IndexedDB
  for (const song of newSongs) {
    try {
      await musicStorage.saveSong(song);
    } catch (error) {
      console.error(`歌曲保存失败：${song.filename}`, error);
    }
  }

  // 添加到音乐库
  songs.value.push(...newSongs);
}

function playSong(song) {
  if (!song) return;

  // 如果点击的是当前歌曲，则切换播放状态
  if (currentSong.value?.id === song.id) {
    togglePlay();
    return;
  }

  // 更新最近播放记录
  musicStore.addRecentSong(song);

  // 更新当前歌曲
  playerStore.setCurrentSong(song);

  // 设置音频地址
  audioService.setSource(song.url);

  // 开始播放
  audioService
    .play()
    .then(() => {
      playerStore.setPlaying(true);
    })
    .catch((error) => {
      console.error("播放失败：", error);
      playerStore.setPlaying(false);
    });
}

// 播放上一首
function playPrevious() {
  if (songs.value.length === 0) return;

  const currentIndex = songs.value.findIndex(
    (song) => song.id === currentSong.value?.id,
  );

  const previousIndex =
    currentIndex <= 0 ? songs.value.length - 1 : currentIndex - 1;

  playSong(songs.value[previousIndex]);
}

// 播放下一首
function playNext() {
  if (songs.value.length === 0) return;

  // 开启随机播放
  if (isShuffle.value && songs.value.length > 1) {
    const currentIndex = songs.value.findIndex(
      (song) => song.id === currentSong.value?.id,
    );

    let nextIndex;

    // 随机选择一首不同的歌曲
    do {
      nextIndex = Math.floor(Math.random() * songs.value.length);
    } while (nextIndex === currentIndex);

    playSong(songs.value[nextIndex]);
    return;
  }

  // 关闭随机播放：按照列表顺序播放
  const currentIndex = songs.value.findIndex(
    (song) => song.id === currentSong.value?.id,
  );

  const nextIndex =
    currentIndex >= songs.value.length - 1 ? 0 : currentIndex + 1;

  playSong(songs.value[nextIndex]);
}

// 播放 / 暂停

function togglePlay() {
  if (!currentSong.value) return;

  if (audio.paused) {
    audioService
      .play()
      .then(() => {
        playerStore.setPlaying(true);
      })
      .catch((error) => {
        console.error("播放失败：", error);
        playerStore.setPlaying(false);
      });
  } else {
    audioService.pause();
    playerStore.setPlaying(false);
  }
}

// 跳转到指定播放位置

function seek(time) {
  if (!duration.value) return;

  const targetTime = Math.max(0, Math.min(time, duration.value));

  audioService.seek(targetTime);

  playerStore.setCurrentTime(audio.currentTime);
}

// 删除歌曲

// 删除歌曲
async function removeSong(id) {
  const song = songs.value.find((item) => item.id === id);

  if (!song) return;

  // 如果删除的是当前播放歌曲，停止播放
  if (currentSong.value?.id === id) {
    audioService.stop();
    playerStore.resetPlayer();
  }

  // 从 IndexedDB 删除歌曲
  try {
    await musicStorage.deleteSong(id);
  } catch (error) {
    console.error("歌曲删除失败：", error);
    return;
  }

  // 从音乐列表中删除
  songs.value = songs.value.filter((item) => item.id !== id);

  // 释放歌曲资源
  releaseSong(song);
}

// 监听播放进度
audio.addEventListener("timeupdate", () => {
  playerStore.setCurrentTime(audio.currentTime);
});

// 获取歌曲总时长
audio.addEventListener("loadedmetadata", () => {
  playerStore.setDuration(audio.duration || 0);
});

// 播放结束时更新状态
audio.addEventListener("ended", () => {
  // 单曲循环
  if (repeatMode.value === "one") {
    audioService.seek(0);

    audioService.play().catch((error) => {
      console.error("单曲循环播放失败：", error);
      playerStore.setPlaying(false);
    });

    return;
  }

  // 关闭循环，且没有下一首
  if (
    repeatMode.value === "off" &&
    !isShuffle.value &&
    songs.value.findIndex((song) => song.id === currentSong.value?.id) ===
      songs.value.length - 1
  ) {
    playerStore.setPlaying(false);
    playerStore.setCurrentTime(duration.value);
    return;
  }

  // 其他情况播放下一首
  playNext();
});

onUnmounted(() => {
  // 销毁音频服务
  audioService.destroy();

  // 释放歌曲资源
  songs.value.forEach((song) => {
    releaseSong(song);
  });
});
</script>

<template>
  <div class="app-layout">
    <div class="app-body">
      <Sidebar @navigate="navigateTo" />

      <MainContent
        v-if="currentPage === 'home'"
        :songs="songs"
        :recent-songs="recentSongs"
        :recent-imported-songs="recentImportedSongs"
        @navigate="navigateTo"
        @play-song="playSong"
        :can-go-back="navigationHistory.length > 0"
        @go-back="goBack"
        :favorite-songs="favoriteSongsList"
        @clear-recent="clearRecentSongs"
      />

      <MusicLibrary
        v-else-if="currentPage === 'library'"
        :songs="songs"
        :favorite-songs="favoriteSongs"
        :can-go-back="navigationHistory.length > 0"
        @import-songs="importSongs"
        @remove-song="removeSong"
        @play-song="playSong"
        @toggle-favorite="toggleFavorite"
        @go-back="goBack"
      />

      <FavoriteMusic
        v-else-if="currentPage === 'favorites'"
        :songs="favoriteSongsList"
        :can-go-back="navigationHistory.length > 0"
        @play-song="playSong"
        @toggle-favorite="toggleFavorite"
        @go-back="goBack"
      />
    </div>

    <MusicPlayer
      :current-song="currentSong"
      :is-playing="isPlaying"
      :current-time="currentTime"
      :duration="duration"
      :favorite-songs="favoriteSongs"
      :is-shuffle="isShuffle"
      :repeat-mode="repeatMode"
      @toggle-play="togglePlay"
      @seek="seek"
      @previous="playPrevious"
      @next="playNext"
      @shuffle-change="playerStore.setShuffle($event)"
      @repeat-change="playerStore.setRepeatMode($event)"
      @toggle-favorite="toggleFavorite"
    />
  </div>
</template>

<style>
.app-layout {
  width: 100%;
  height: 100vh;
  min-height: 500px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #121212;
}

.app-body {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 8px;
  padding: 8px 8px 0;
}
</style>
