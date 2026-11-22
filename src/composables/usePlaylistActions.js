// src/composables/usePlaylistActions.js
/**
 * 歌单业务动作
 * 约定：先改 store（界面立即响应），再落 IndexedDB；
 * 落库失败只记录日志，不回滚内存状态（避免界面闪烁，后续可接提示层）
 */
import { usePlaylistStore } from "@/stores/playlist";
import { getPlaylistStorage } from "@/app/services";
import { useToast } from "@/composables/useToast";
import { useConfirm } from "@/composables/useConfirm";
import { persistSafely } from "@/utils/persist";

// 歌单的业务动作：先改 store（界面立即响应），再落 IndexedDB
export function usePlaylistActions() {
  const playlistStore = usePlaylistStore();
  const playlistStorage = getPlaylistStorage();
  const toast = useToast();
  const { confirm } = useConfirm();

  async function persist(playlist) {
    if (!playlist) return;

    await persistSafely(() => playlistStorage.savePlaylist(playlist), {
      logLabel: "歌单保存失败",
      toast,
      errorMessage: "歌单保存失败，刷新后可能丢失",
    });
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

  // 一次性把多首歌加进歌单：store 逐首更新，落库只有一个事务
  async function addSongsToPlaylist(playlistId, songIds) {
    const added = [];

    for (const songId of songIds) {
      const playlist = playlistStore.addSong(playlistId, songId);
      if (playlist) added.push(songId);
    }

    if (added.length === 0) return 0;

    const playlist = playlistStore.playlists.find(
      (item) => item.id === playlistId,
    );
    await persist(playlist);

    return added.length;
  }

  async function removeSongFromPlaylist(playlistId, songId) {
    const playlist = playlistStore.removeSong(playlistId, songId);
    if (!playlist) return false;

    await persist(playlist);
    return true;
  }

  // 清除所有歌单：只删歌单，曲库与播放不受影响
  async function clearAllPlaylists() {
    const confirmed = await confirm({
      title: "清除所有歌单",
      message:
        "将删除全部歌单（包含其中的歌曲归属关系），曲库里的歌曲与收藏不受影响。此操作无法恢复。",
      confirmText: "全部清除",
      danger: true,
    });
    if (!confirmed) return false;

    try {
      await playlistStorage.clearAll();
      playlistStore.setPlaylists([]);
      toast.success("已清除所有歌单");
      return true;
    } catch (error) {
      console.error("清除歌单失败：", error);
      toast.error("清除失败，请重试");
      return false;
    }
  }

  return {
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    clearAllPlaylists,
    addSongToPlaylist,
    addSongsToPlaylist,
    removeSongFromPlaylist,
  };
}
