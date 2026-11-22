import { defineStore } from "pinia";

export const useMusicStore = defineStore("music", {
  // 音乐数据
  state: () => ({
    // 全部音乐
    songs: [],

    // 收藏歌曲 ID
    favoriteSongs: [],

    // 最近播放记录
    recentSongs: [],
  }),

  // 计算属性
  getters: {
    // 最近导入的 6 首歌曲
    recentImportedSongs: (state) => {
      return [...state.songs]
        .sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0))
        .slice(0, 6);
    },

    // 获取收藏歌曲完整信息
    favoriteSongsList: (state) => {
      return state.songs.filter((song) =>
        state.favoriteSongs.includes(song.id),
      );
    },
  },

  // 数据操作
  actions: {
    // 切换收藏状态
    toggleFavorite(songId) {
      if (this.favoriteSongs.includes(songId)) {
        this.favoriteSongs = this.favoriteSongs.filter((id) => id !== songId);
      } else {
        this.favoriteSongs.push(songId);
      }
    },

    // 添加最近播放记录
    addRecentSong(song) {
      this.recentSongs = [
        song,
        ...this.recentSongs.filter((item) => item.id !== song.id),
      ].slice(0, 50); // 保留最近 50 条记录
    },

    // 删除指定歌曲的最近播放记录
removeRecentSong(songId) {
  this.recentSongs = this.recentSongs.filter(
    (song) => song.id !== songId
  );
},

    // 清空最近播放记录
    clearRecentSongs() {
      this.recentSongs = [];
    },
  },
});
