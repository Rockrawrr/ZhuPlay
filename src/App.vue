<script setup>
import { computed } from "vue";
import { useNavigation } from "./composables/useNavigation";
import AppLayout from "./layouts/AppLayout.vue";
import { storeToRefs } from "pinia";
import { useMusicStore } from "./stores/music";
import { usePlayerStore } from "./stores/player";
import { useMusicActions } from "./composables/useMusicActions";
import { useAudioPlayer } from "./composables/useAudioPlayer";
import { getAudioService, getMusicStorage } from "./app/services";
import { useAppBootstrap } from "./app/useAppBootstrap";

// 初始化音乐数据仓库
const musicStore = useMusicStore();

// 初始化音乐存储服务
const musicStorage = getMusicStorage();

// 初始化播放器数据仓库
const playerStore = usePlayerStore();

// 初始化音频服务（单例）
const audioService = getAudioService();

// 应用启动引导：恢复数据 + 卸载释放资源
useAppBootstrap();

// 初始化页面导航模块
const { currentPage, canGoBack, navigateTo, goBack } = useNavigation();

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

const sortedImportedSongs = computed(() => {
  return [...songs.value].sort(
    (a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0),
  );
});

// 初始化音频播放模块
const { playSong, playPrevious, playNext, togglePlay, seek } = useAudioPlayer({
  songs,
  currentSong,
  isShuffle,
  repeatMode,
  duration,
  playerStore,
  musicStore,
  musicStorage,
  audioService,
});

// 初始化音乐业务操作
const { importSongs, toggleFavorite, clearRecentSongs, removeSong } =
  useMusicActions({
    songs,
    currentSong,
    audioService,
  });

// 页面所需的数据
const pageData = computed(() => {
  return {
    home: {
      songs: songs.value,
      recentSongs: recentSongs.value,
      recentImportedSongs: recentImportedSongs.value,
      favoriteSongs: favoriteSongsList.value,
      canGoBack: canGoBack.value,
    },

    recentPlayed: {
      songs: recentSongs.value,
      canGoBack: canGoBack.value,
    },

    recentImported: {
      songs: sortedImportedSongs.value,
      canGoBack: canGoBack.value,
    },

    library: {
      songs: songs.value,
      favoriteSongs: favoriteSongs.value,
      canGoBack: canGoBack.value,
    },

    favorites: {
      songs: favoriteSongsList.value,
      canGoBack: canGoBack.value,
    },
  };
});

const pageActions = {
  home: {
    navigate: navigateTo,
    "play-song": playSong,
    "go-back": goBack,
    "clear-recent": clearRecentSongs,
  },

  recentPlayed: {
    "play-song": playSong,
    "clear-recent": clearRecentSongs,
    "go-back": goBack,
  },

  recentImported: {
    "play-song": playSong,
    "go-back": goBack,
  },

  library: {
    "import-songs": importSongs,
    "remove-song": removeSong,
    "play-song": playSong,
    "toggle-favorite": toggleFavorite,
    "go-back": goBack,
  },

  favorites: {
    "play-song": playSong,
    "toggle-favorite": toggleFavorite,
    "go-back": goBack,
  },
};

const playerActions = {
  "toggle-play": togglePlay,
  seek,
  previous: playPrevious,
  next: playNext,
  "shuffle-change": (value) => playerStore.setShuffle(value),
  "repeat-change": (value) => playerStore.setRepeatMode(value),
  "toggle-favorite": toggleFavorite,
};

// 播放器需要的数据
const playerProps = computed(() => ({
  currentSong: currentSong.value,
  isPlaying: isPlaying.value,
  currentTime: currentTime.value,
  duration: duration.value,
  favoriteSongs: favoriteSongs.value,
  isShuffle: isShuffle.value,
  repeatMode: repeatMode.value,
}));
</script>

<template>
  <AppLayout
    :current-page="currentPage"
    :page-data="pageData"
    :page-actions="pageActions"
    :player-props="playerProps"
    :player-actions="playerActions"
    @navigate="navigateTo"
  />
</template>
