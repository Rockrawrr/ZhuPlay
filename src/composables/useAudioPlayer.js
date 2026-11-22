// src/composables/useAudioPlayer.js
import { storeToRefs } from "pinia";
import { useMusicStore } from "@/stores/music";
import { usePlayerStore } from "@/stores/player";
import { getAudioService, getMusicStorage } from "@/app/services";

// 模块级单例
let instance = null;

function createInstance() {
  const musicStore = useMusicStore();
  const playerStore = usePlayerStore();
  const audioService = getAudioService();
  const musicStorage = getMusicStorage();
  const audio = audioService.getAudio();

  const { songs } = storeToRefs(musicStore);
  const { currentSong, isShuffle, repeatMode, duration } =
    storeToRefs(playerStore);

  // 播放歌曲
  function playSong(song) {
    if (!song) return;

    if (currentSong.value?.id === song.id) {
      togglePlay();
      return;
    }

    musicStore.addRecentSong(song);
    musicStorage
      .saveMusicData(
        "recentSongIds",
        musicStore.recentSongs.map((item) => item.id),
      )
      .catch((error) => console.error("最近播放记录保存失败：", error));

    playerStore.setCurrentSong(song);
    audioService.setSource(song.url);

    audioService
      .play()
      .then(() => playerStore.setPlaying(true))
      .catch((error) => {
        console.error("播放失败：", error);
        playerStore.setPlaying(false);
      });
  }

  // 播放上一首
  function playPrevious() {
    if (songs.value.length === 0) return;
    const currentIndex = songs.value.findIndex(
      (s) => s.id === currentSong.value?.id,
    );
    const previousIndex =
      currentIndex <= 0 ? songs.value.length - 1 : currentIndex - 1;
    playSong(songs.value[previousIndex]);
  }

  // 播放下一首
  function playNext() {
    if (songs.value.length === 0) return;

    if (isShuffle.value && songs.value.length > 1) {
      const currentIndex = songs.value.findIndex(
        (s) => s.id === currentSong.value?.id,
      );
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * songs.value.length);
      } while (nextIndex === currentIndex);
      playSong(songs.value[nextIndex]);
      return;
    }

    const currentIndex = songs.value.findIndex(
      (s) => s.id === currentSong.value?.id,
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
        .then(() => playerStore.setPlaying(true))
        .catch((error) => {
          console.error("播放失败：", error);
          playerStore.setPlaying(false);
        });
    } else {
      audioService.pause();
      playerStore.setPlaying(false);
    }
  }

  // 跳转
  function seek(time) {
    if (!duration.value) return;
    const targetTime = Math.max(0, Math.min(time, duration.value));
    audioService.seek(targetTime);
    playerStore.setCurrentTime(targetTime); // 顺手修了原代码里读旧 currentTime 的 bug
  }

  // 事件处理
  function handleTimeUpdate() {
    playerStore.setCurrentTime(audio.currentTime);
  }
  function handleLoadedMetadata() {
    playerStore.setDuration(audio.duration || 0);
  }
  function handleEnded() {
    if (repeatMode.value === "one") {
      audioService.seek(0);
      audioService.play().catch((error) => {
        console.error("单曲循环播放失败：", error);
        playerStore.setPlaying(false);
      });
      return;
    }
    if (
      repeatMode.value === "off" &&
      !isShuffle.value &&
      songs.value.findIndex((s) => s.id === currentSong.value?.id) ===
        songs.value.length - 1
    ) {
      playerStore.setPlaying(false);
      playerStore.setCurrentTime(duration.value);
      return;
    }
    playNext();
  }

  audio.addEventListener("timeupdate", handleTimeUpdate);
  audio.addEventListener("loadedmetadata", handleLoadedMetadata);
  audio.addEventListener("ended", handleEnded);

  function cleanup() {
    audio.removeEventListener("timeupdate", handleTimeUpdate);
    audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    audio.removeEventListener("ended", handleEnded);
    audioService.destroy();
  }

  return { playSong, playPrevious, playNext, togglePlay, seek, cleanup };
}

export function useAudioPlayer() {
  if (!instance) instance = createInstance();
  return instance;
}

// 应用卸载时统一清理，由 useAppBootstrap 调用
export function destroyAudioPlayer() {
  if (instance) {
    instance.cleanup();
    instance = null;
  }
}
