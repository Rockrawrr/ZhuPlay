import { defineStore } from "pinia";

export const useMusicStore = defineStore("music", {
  state: () => ({
    songs: [],
    favoriteSongs: [], // 存 songId
    recentSongs: [], // 存完整对象（兼容现有视图）
  }),

  getters: {
    recentImportedSongs: (state) => {
      return [...state.songs]
        .sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0))
        .slice(0, 6);
    },
    favoriteSongsList: (state) => {
      return state.songs.filter((song) =>
        state.favoriteSongs.includes(song.id),
      );
    },
  },

  actions: {
    // ===== 音乐库 =====
    setSongs(songs) {
      this.songs = Array.isArray(songs) ? songs : [];
    },
    addSongs(newSongs) {
      if (!Array.isArray(newSongs) || newSongs.length === 0) return;
      this.songs.push(...newSongs);
    },
    // 删除歌曲：同时清理音乐库、收藏、最近播放三处引用
    removeSong(songId) {
      this.songs = this.songs.filter((s) => s.id !== songId);
      this.favoriteSongs = this.favoriteSongs.filter((id) => id !== songId);
      this.recentSongs = this.recentSongs.filter((s) => s.id !== songId);
    },

    // ===== 收藏 =====
    setFavorites(ids) {
      this.favoriteSongs = Array.isArray(ids) ? ids : [];
    },
    toggleFavorite(songId) {
      if (this.favoriteSongs.includes(songId)) {
        this.favoriteSongs = this.favoriteSongs.filter((id) => id !== songId);
      } else {
        this.favoriteSongs.push(songId);
      }
    },

    // ===== 最近播放 =====
    // 接收 songId 数组（来自 IndexedDB），解析成完整对象
    setRecentSongs(songIds) {
      const ids = Array.isArray(songIds) ? songIds : [];
      this.recentSongs = ids
        .map((id) => this.songs.find((s) => s.id === id))
        .filter(Boolean);
    },
    addRecentSong(song) {
      if (!song) return;
      this.recentSongs = [
        song,
        ...this.recentSongs.filter((item) => item.id !== song.id),
      ].slice(0, 50);
    },
    removeRecentSong(songId) {
      this.recentSongs = this.recentSongs.filter((s) => s.id !== songId);
    },
    clearRecentSongs() {
      this.recentSongs = [];
    },
  },
});
