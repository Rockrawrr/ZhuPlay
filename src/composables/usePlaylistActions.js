// src/composables/usePlaylistActions.js
/**
 * 歌单业务动作
 * 约定：先改 store（界面立即响应），再落 IndexedDB；
 * 落库失败只记录日志，不回滚内存状态（避免界面闪烁，后续可接提示层）
 */
import { usePlaylistStore } from "@/stores/playlist";
import { getPlaylistStorage } from "@/app/services";

// 歌单的业务动作：先改 store（界面立即响应），再落 IndexedDB
export function usePlaylistActions() {
  const playlistStore = usePlaylistStore();
  const playlistStorage = getPlaylistStorage();

  async function persist(playlist) {
    if (!playlist) return;

    try {
      await playlistStorage.savePlaylist(playlist);
    } catch (error) {
      console.error("歌单保存失败：", error);
    }
  }

  async function createPlaylist(name) {
    const playlist = playlistStore.createPlaylist(name);
    await persist(playlist);
    return playlist;
  }

  async function renamePlaylist(playlistId, name) {
    const playlist = playlistStore.renamePlaylist(playlistId, name);
    await persist(playlist);
    return playlist;
  }

  async function deletePlaylist(playlistId) {
    playlistStore.deletePlaylist(playlistId);

    try {
      await playlistStorage.deletePlaylist(playlistId);
    } catch (error) {
      console.error("歌单删除失败：", error);
    }
  }

  // 返回 true 表示真的加进去了（已存在时返回 false）
  async function addSongToPlaylist(playlistId, songId) {
    const playlist = playlistStore.addSong(playlistId, songId);
    if (!playlist) return false;

    await persist(playlist);
    return true;
  }

  async function removeSongFromPlaylist(playlistId, songId) {
    const playlist = playlistStore.removeSong(playlistId, songId);
    if (!playlist) return false;

    await persist(playlist);
    return true;
  }

  return {
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
  };
}
