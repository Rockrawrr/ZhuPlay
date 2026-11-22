// src/composables/useMusicActions.js
/**
 * 曲库业务动作
 * 职责：导入（解析 + 落库）、收藏、删除歌曲、清空最近播放
 * 边界：负责“改 store + 落库”，页面只调用这些动作，不直接写 IndexedDB
 */
import { storeToRefs } from "pinia";
import { createSong, releaseSong } from "@/services/musicService";
import { parseMusicMetadata } from "@/services/metadataService";
import { getMusicStorage, getAudioService, getPlaylistStorage } from "@/app/services";
import { useMusicStore } from "@/stores/music";
import { usePlayerStore } from "@/stores/player";
import { usePlaylistStore } from "@/stores/playlist";
import { useToast } from "@/composables/useToast";

export function useMusicActions() {
  const musicStore = useMusicStore();
  const playerStore = usePlayerStore();
  const playlistStore = usePlaylistStore();
  const musicStorage = getMusicStorage();
  const playlistStorage = getPlaylistStorage();
  const audioService = getAudioService();
  const toast = useToast();

  const { songs } = storeToRefs(musicStore);
  const { currentSong } = storeToRefs(playerStore);

  async function importSongs(files) {
    const newSongs = await Promise.all(
      Array.from(files).map(async (file) => {
        try {
          const metadata = await parseMusicMetadata(file);
          return createSong(file, metadata);
        } catch (error) {
          console.error(`音乐解析失败：${file.name}`, error);
          return createSong(file);
        }
      }),
    );

    let failed = 0;

    for (const song of newSongs) {
      try {
        await musicStorage.saveSong(song);
      } catch (error) {
        failed += 1;
        console.error(`歌曲保存失败：${song.filename}`, error);
      }
    }

    musicStore.addSongs(newSongs);

    if (failed > 0) {
      toast.error(`${failed} 首歌曲保存失败，刷新后可能丢失`);
    } else if (newSongs.length > 0) {
      toast.success(`已导入 ${newSongs.length} 首歌曲`);
    }
  }

  async function toggleFavorite(songId) {
    musicStore.toggleFavorite(songId);
    try {
      await musicStorage.saveMusicData("favorites", [
        ...musicStore.favoriteSongs,
      ]);
    } catch (error) {
      console.error("收藏记录保存失败：", error);
    }
  }

  // 清空最近播放：内存 + 落库都要清，否则刷新后记录会回来
  async function clearRecentSongs() {
    if (!window.confirm("确定清空最近播放记录吗？")) return;

    musicStore.clearRecentSongs();

    try {
      await musicStorage.saveMusicData("recentSongIds", []);
      toast.success("已清空最近播放");
    } catch (error) {
      console.error("最近播放清空失败：", error);
      toast.error("清空失败，请重试");
    }
  }

  async function removeSong(id) {
    const song = songs.value.find((item) => item.id === id);
    if (!song) return;

    if (currentSong.value?.id === id) {
      audioService.stop();
      playerStore.resetPlayer();
    } else {
      // 非当前歌曲：只从播放队列中移除，避免下一首又播到已删除的歌
      playerStore.removeFromQueue(id);
    }

    try {
      await musicStorage.deleteSong(id);
    } catch (error) {
      console.error("歌曲删除失败：", error);
      toast.error("删除失败，请重试");
      return;
    }

    musicStore.removeSong(id);
    await musicStorage.saveMusicData("favorites", [
      ...musicStore.favoriteSongs,
    ]);

    // 从所有歌单里移除这首歌，避免歌单里残留已删除的歌
    const changedPlaylists = playlistStore.removeSongFromAll(id);
    for (const playlist of changedPlaylists) {
      try {
        await playlistStorage.savePlaylist(playlist);
      } catch (error) {
        console.error("歌单更新失败：", error);
        toast.error("歌单同步失败，请刷新后检查");
      }
    }

    releaseSong(song);
    toast.success("已删除歌曲");
  }

  return { importSongs, toggleFavorite, clearRecentSongs, removeSong };
}
