// src/stores/playlist.js
import { defineStore } from "pinia";
import {
  appendSong,
  createPlaylistModel,
  normalizePlaylistName,
  removeSong,
} from "@/services/playlistService";

/**
 * 歌单 store
 * 负责：歌单列表、当前查看的歌单、歌单内歌曲的增删
 * 边界：只改内存，落库由 usePlaylistActions 负责
 * 注意：歌单里只存 songId，歌曲对象刷新后由曲库重新解引用
 */
export const usePlaylistStore = defineStore("playlist", {
  state: () => ({
    // [{ id, name, songIds, createdAt, updatedAt }]
    playlists: [],
  }),

  getters: {
    playlistCount: (state) => state.playlists.length,

    playlistById: (state) => (playlistId) =>
      state.playlists.find((playlist) => playlist.id === playlistId) ?? null,
  },

  actions: {
    setPlaylists(playlists) {
      this.playlists = Array.isArray(playlists) ? playlists : [];
    },

    // 新建歌单，插到最前面
    createPlaylist(name) {
      const playlist = createPlaylistModel(name);
      this.playlists.unshift(playlist);
      return playlist;
    },

    renamePlaylist(playlistId, name) {
      const playlist = this.playlistById(playlistId);
      if (!playlist) return null;

      playlist.name = normalizePlaylistName(name);
      playlist.updatedAt = Date.now();
      return playlist;
    },

    deletePlaylist(playlistId) {
      this.playlists = this.playlists.filter(
        (playlist) => playlist.id !== playlistId,
      );
    },

    // 加歌：已存在时返回 null，调用方据此跳过落库
    addSong(playlistId, songId) {
      const playlist = this.playlistById(playlistId);
      if (!playlist || !songId) return null;

      const nextIds = appendSong(playlist.songIds, songId);
      if (nextIds === playlist.songIds) return null;

      playlist.songIds = nextIds;
      playlist.updatedAt = Date.now();
      return playlist;
    },

    // 移除歌：本来就没有也返回 null
    removeSong(playlistId, songId) {
      const playlist = this.playlistById(playlistId);
      if (!playlist) return null;

      const nextIds = removeSong(playlist.songIds, songId);
      if (nextIds === playlist.songIds) return null;

      playlist.songIds = nextIds;
      playlist.updatedAt = Date.now();
      return playlist;
    },

    // 删除某首歌时，把它从所有歌单里清掉；返回被修改的歌单，供落库使用
    removeSongFromAll(songId) {
      const changed = [];

      for (const playlist of this.playlists) {
        const nextIds = removeSong(playlist.songIds, songId);
        if (nextIds === playlist.songIds) continue;

        playlist.songIds = nextIds;
        playlist.updatedAt = Date.now();
        changed.push(playlist);
      }

      return changed;
    },
  },
});
