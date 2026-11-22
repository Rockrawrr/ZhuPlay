import { defineStore } from "pinia";

/**
 * 播放器 store
 * 负责：当前歌曲、播放状态、进度 / 时长、随机与循环、播放队列、音量
 * 边界：不直接操作 <audio>，音频动作由 useAudioPlayer 调 audioService 完成
 * 注意：queue 是“起播列表的快照”，上一首/下一首只在它内部移动
 */
export const usePlayerStore = defineStore("player", {
  // 播放器状态
  state: () => ({
    // 当前播放歌曲
    currentSong: null,

    // 播放状态
    isPlaying: false,

    // 随机播放
    isShuffle: false,

    // 循环模式：all、one、off
    repeatMode: "all",

    // 当前播放时间
    currentTime: 0,

    // 歌曲总时长
    duration: 0,

    // 音量（0~1，与 <audio>.volume 保持同步）
    volume: 1,

    // 是否静音
    isMuted: false,

    // 播放队列：本次播放的上下文（来自某个列表）
    queue: [],

    // 当前歌曲在队列中的下标，-1 表示不在队列中
    currentIndex: -1,
  }),

  getters: {
    // 队列是否为空
    hasQueue: (state) => state.queue.length > 0,

    // 当前是否是队列最后一首
    isLastInQueue: (state) =>
      state.queue.length === 0 || state.currentIndex >= state.queue.length - 1,

    // 当前是否是队列第一首
    isFirstInQueue: (state) => state.currentIndex <= 0,
  },

  // 播放器操作
  actions: {
    // 设置当前歌曲
    setCurrentSong(song) {
      this.currentSong = song;
    },

    // 设置播放状态
    setPlaying(status) {
      this.isPlaying = status;
    },

    // 设置随机播放状态
    setShuffle(status) {
      this.isShuffle = status;
    },

    // 设置循环模式
    setRepeatMode(mode) {
      this.repeatMode = mode;
    },

    // 更新播放进度
    setCurrentTime(time) {
      this.currentTime = time;
    },

    // 更新歌曲总时长
    setDuration(time) {
      this.duration = time;
    },

    // ===== 音量 =====

    // 设置音量，超出 0~1 的值会被夹紧
    setVolume(value) {
      const number = Number(value);
      this.volume = Number.isFinite(number)
        ? Math.min(Math.max(number, 0), 1)
        : 0;
    },

    // 设置静音状态
    setMuted(muted) {
      this.isMuted = Boolean(muted);
    },

    // 切换静音
    toggleMute() {
      this.isMuted = !this.isMuted;
    },

    // ===== 播放队列 =====

    // 设置播放队列：list 为本次播放的上下文，startIndex 为起始下标
    setQueue(list, startIndex = 0) {
      const queue = Array.isArray(list) ? [...list] : [];
      this.queue = queue;

      if (queue.length === 0) {
        this.currentIndex = -1;
        return;
      }

      const index = Number.isInteger(startIndex) ? startIndex : 0;
      this.currentIndex = Math.min(Math.max(index, 0), queue.length - 1);
    },

    // 从队列中移除某首歌（如删除歌曲），并修正当前下标
    removeFromQueue(songId) {
      const currentId = this.currentSong?.id;
      this.queue = this.queue.filter((song) => song.id !== songId);

      if (this.queue.length === 0) {
        this.currentIndex = -1;
        return;
      }

      this.currentIndex = currentId
        ? this.queue.findIndex((song) => song.id === currentId)
        : -1;
    },

    // 清空队列
    clearQueue() {
      this.queue = [];
      this.currentIndex = -1;
    },

    // 重置播放器状态
    resetPlayer() {
      this.currentSong = null;
      this.isPlaying = false;
      this.currentTime = 0;
      this.duration = 0;
      this.queue = [];
      this.currentIndex = -1;
    },
  },
});
