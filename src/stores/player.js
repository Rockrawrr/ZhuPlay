
import { defineStore } from 'pinia'

export const usePlayerStore = defineStore('player', {
  // 播放器状态
  state: () => ({
    // 当前播放歌曲
    currentSong: null,

    // 播放状态
    isPlaying: false,

    // 随机播放
    isShuffle: false,

    // 循环模式：all、one、off
    repeatMode: 'all',

    // 当前播放时间
    currentTime: 0,

    // 歌曲总时长
    duration: 0
  }),

  // 播放器操作
  actions: {
    // 设置当前歌曲
    setCurrentSong(song) {
      this.currentSong = song
    },

    // 设置播放状态
    setPlaying(status) {
      this.isPlaying = status
    },

    // 设置随机播放状态
    setShuffle(status) {
      this.isShuffle = status
    },

    // 设置循环模式
    setRepeatMode(mode) {
      this.repeatMode = mode
    },

    // 更新播放进度
    setCurrentTime(time) {
      this.currentTime = time
    },

    // 更新歌曲总时长
    setDuration(time) {
      this.duration = time
    },

    // 重置播放器状态
    resetPlayer() {
      this.currentSong = null
      this.isPlaying = false
      this.currentTime = 0
      this.duration = 0
    }
  }
})
