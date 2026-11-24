// src/composables/useAudioPlayer.js
/**
 * 播放内核（模块级单例）
 * 职责：串起 store 状态、<audio> 元素与播放队列，对外暴露播放/切歌/进度动作
 * 为什么是单例：<audio> 的事件监听只能绑一次，多处调用必须共享同一份实例
 * 生命周期：由 useAppBootstrap 调用 destroyAudioPlayer() 统一清理
 */
import { storeToRefs } from "pinia";
import { useMusicStore } from "@/stores/music";
import { usePlayerStore } from "@/stores/player";
import { getAudioService, getMusicStorage } from "@/app/services";
import { STORAGE_KEYS } from "@/storage/keys";
import { getSongAudioUrlAsync } from "@/services/assetUrls";
import { useListeningStats } from "@/composables/useListeningStats";
import { useToast } from "@/composables/useToast";

const toast = useToast();

// ===== 播放进度记忆（按歌曲记住上次听到哪） =====
const POSITION_KEY = "zhuplay:play-positions";
const MIN_RESUME_SECONDS = 10;

let positions = {};
let positionsTimer = null;
let pendingResume = 0;

try {
  positions = JSON.parse(localStorage.getItem(POSITION_KEY) || "{}") || {};
} catch {
  positions = {};
}

function persistPositions() {
  if (positionsTimer) clearTimeout(positionsTimer);
  positionsTimer = setTimeout(() => {
    positionsTimer = null;
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(positions));
    } catch (error) {
      console.warn("播放进度保存失败：", error);
    }
  }, 800);
}

function rememberPosition(store, song) {
  if (!song || !store) return;

  const time = store.currentTime;
  if (!(time > MIN_RESUME_SECONDS)) return;

  if (store.duration && time > store.duration - MIN_RESUME_SECONDS) {
    delete positions[song.id];
  } else {
    positions[song.id] = Math.floor(time);
  }

  persistPositions();
}

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
  // resetProgress：切歌（上一首 / 下一首）时从头播放，不恢复上次进度
  async function playSong(song, playList = null, { resetProgress = false } = {}) {
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
            toast.error("无法播放这首歌，文件可能已损坏或已被移动");
          });
        return;
      }

      togglePlay();
      return;
    }

    playerStore.setQueue(context, startIndex);

    // 切歌前先记住上一首的进度
    if (currentSong.value) rememberPosition(playerStore, currentSong.value);

    musicStore.addRecentSong(song);
    // 听歌统计：记录一次播放
    useListeningStats().recordPlay(song);
    musicStorage
      .saveMusicData(
        STORAGE_KEYS.recentSongs,
        musicStore.recentSongs.map((item) => item.id),
      )
      .catch((error) => console.error("最近播放记录保存失败：", error));

    playerStore.setCurrentSong(song);
    // 下次 loadedmetadata 时跳回上次位置（见 handleLoadedMetadata）
    // 上一首 / 下一首属于"切歌"，必须从 0 开始，并清掉这首歌的旧进度
    if (resetProgress) {
      delete positions[song.id];
      persistPositions();
      pendingResume = 0;
    } else {
      pendingResume = Number(positions[song.id]) || 0;
    }

    // 播放地址按需创建（缓存最近 3 首，超出自动回收）
    // 有 File 直接建 URL；「仅保存路径」的歌需要先通过主进程读文件
    let source;

    try {
      source = await getSongAudioUrlAsync(song);
    } catch (error) {
      console.error("读取音频文件失败：", error);
      toast.error("无法读取音频文件，可能已被移动或删除");
      playerStore.setPlaying(false);
      return;
    }

    // 读取期间用户可能又点了别的歌
    if (playerStore.currentSong?.id !== song.id) return;

    if (!source) {
      toast.error("无法读取音频文件，可能已被移动或删除");
      playerStore.setPlaying(false);
      return;
    }

    audioService.setSource(source);

    audioService
      .play()
      .then(() => playerStore.setPlaying(true))
      .catch((error) => {
        console.error("播放失败：", error);
        playerStore.setPlaying(false);
        toast.error("无法播放这首歌，文件可能已损坏或已被移动");
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

    playSong(queue[previousIndex], queue, { resetProgress: true });
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

    playSong(queue[nextIndex], queue, { resetProgress: true });
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
          toast.error("无法播放这首歌，文件可能已损坏或已被移动");
        });
    } else {
      audioService.pause();
      playerStore.setPlaying(false);
      // 暂停时记住进度
      if (currentSong.value) rememberPosition(playerStore, currentSong.value);
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

    // 续播：上次听到的位置（离结尾太近则不恢复）
    if (pendingResume > 0 && audio.duration && pendingResume < audio.duration - 5) {
      audioService.seek(pendingResume);
      playerStore.setCurrentTime(pendingResume);
    }

    pendingResume = 0;
  }
  function handleEnded() {
    if (repeatMode.value === "one") {
      audioService.seek(0);
      audioService.play().catch((error) => {
        console.error("单曲循环播放失败：", error);
        playerStore.setPlaying(false);
        toast.error("无法循环播放这首歌");
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
