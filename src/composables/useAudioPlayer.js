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

  const { currentSong, isShuffle, repeatMode, duration } =
    storeToRefs(playerStore);

  // 解析本次播放的上下文队列
  // 1. 优先使用调用方传入的列表（收藏页、音乐库页等各自的列表）
  // 2. 没传时退回全曲库，保证旧调用点仍能正常播放
  // 3. 歌曲不在曲库里时，队列只有它自己
  function resolveQueue(song, playList) {
    if (Array.isArray(playList) && playList.length > 0) return playList;
    if (musicStore.songs.some((item) => item.id === song.id)) {
      return musicStore.songs;
    }
    return [song];
  }

  // 播放歌曲
  // playList：本次播放所在的列表，决定上一首/下一首的边界
  function playSong(song, playList = null) {
    if (!song) return;

    const context = resolveQueue(song, playList);
    const startIndex = Math.max(
      0,
      context.findIndex((item) => item.id === song.id),
    );

    // 同一首歌：只更新播放上下文，再切换播放/暂停，避免重新加载音频
    if (currentSong.value?.id === song.id) {
      playerStore.setQueue(context, startIndex);

      // 已经播完的同一首歌：从头重播，而不是切换成暂停
      if (audio.ended) {
        audioService.seek(0);
        audioService
          .play()
          .then(() => playerStore.setPlaying(true))
          .catch((error) => {
            console.error("播放失败：", error);
            playerStore.setPlaying(false);
          });
        return;
      }

      togglePlay();
      return;
    }

    playerStore.setQueue(context, startIndex);

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
    const queue = playerStore.queue;
    if (queue.length === 0) return;

    let previousIndex = playerStore.currentIndex - 1;
    if (previousIndex < 0) {
      // 队列第一首：不循环模式直接停在当前
      if (repeatMode.value === "off") return;
      previousIndex = queue.length - 1;
    }

    playSong(queue[previousIndex], queue);
  }

  // 播放下一首
  function playNext() {
    const queue = playerStore.queue;
    if (queue.length === 0) return;

    let nextIndex;

    if (isShuffle.value && queue.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (nextIndex === playerStore.currentIndex);
    } else {
      nextIndex = playerStore.currentIndex + 1;

      // 队列播完且不循环：停在当前歌曲（播完时的停止由 handleEnded 负责）
      if (nextIndex >= queue.length) {
        if (repeatMode.value === "off") return;
        nextIndex = 0;
      }
    }

    playSong(queue[nextIndex], queue);
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

    const isLastInQueue =
      playerStore.currentIndex >= playerStore.queue.length - 1;

    if (repeatMode.value === "off" && !isShuffle.value && isLastInQueue) {
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
