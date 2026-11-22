// src/composables/useMusicActions.js
/**
 * 曲库业务动作
 * 职责：导入（解析 + 落库）、收藏、删除歌曲、清空最近播放
 * 边界：负责“改 store + 落库”，页面只调用这些动作，不直接写 IndexedDB
 */
import { storeToRefs } from "pinia";
import { createSong } from "@/services/musicService";
import { parseMusicMetadata } from "@/services/metadataService";
import { getMusicStorage, getAudioService, getPlaylistStorage } from "@/app/services";
import { useMusicStore } from "@/stores/music";
import { usePlayerStore } from "@/stores/player";
import { usePlaylistStore } from "@/stores/playlist";
import { useToast } from "@/composables/useToast";
import { useConfirm } from "@/composables/useConfirm";
import { STORAGE_KEYS } from "@/storage/keys";
import { releaseAllAudioUrls, releaseSongAudioUrl } from "@/services/assetUrls";
import { persistSafely } from "@/utils/persist";

export function useMusicActions() {
  const musicStore = useMusicStore();
  const playerStore = usePlayerStore();
  const playlistStore = usePlaylistStore();
  const musicStorage = getMusicStorage();
  const playlistStorage = getPlaylistStorage();
  const audioService = getAudioService();
  const toast = useToast();
  const { confirm } = useConfirm();

  const { songs } = storeToRefs(musicStore);
  const { currentSong } = storeToRefs(playerStore);

  // 桌面端：取文件在磁盘上的真实路径（Web 端拿不到，返回空串）
  function resolveFilePath(file) {
    const desktop = window.zhuplayDesktop;
    if (!desktop?.isDesktop) return "";

    try {
      return desktop.getPathForFile(file) || "";
    } catch {
      return "";
    }
  }

  async function importSongs(files) {
    const newSongs = await Promise.all(
      Array.from(files).map(async (file) => {
        let song;

        try {
          const metadata = await parseMusicMetadata(file);
          song = createSong(file, metadata);
        } catch (error) {
          console.error(`音乐解析失败：${file.name}`, error);
          song = createSong(file);
        }

        song.filePath = resolveFilePath(file);

        // 桌面端：没有内嵌歌词时，尝试读同目录下的同名 .lrc
        if (!song.lyrics && song.filePath) {
          try {
            const lrc = await window.zhuplayDesktop.readLyricsFile(song.filePath);
            if (lrc) song.lyrics = lrc;
          } catch {
            // 没找到歌词文件属于正常情况，静默忽略
          }
        }

        return song;
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
      await musicStorage.saveMusicData(STORAGE_KEYS.favorites, [
        ...musicStore.favoriteSongs,
      ]);
    } catch (error) {
      console.error("收藏记录保存失败：", error);
    }
  }

  // 清空最近播放：内存 + 落库都要清，否则刷新后记录会回来
  async function clearRecentSongs() {
    const confirmed = await confirm({
      title: "清空最近播放",
      message: "只清除播放记录，不影响歌曲与歌单，且无法恢复。",
      confirmText: "清空",
      danger: true,
    });
    if (!confirmed) return;

    musicStore.clearRecentSongs();

    try {
      await musicStorage.saveMusicData(STORAGE_KEYS.recentSongs, []);
      toast.success("已清空最近播放");
    } catch (error) {
      console.error("最近播放清空失败：", error);
      toast.error("清空失败，请重试");
    }
  }

  // 从最近播放里移除单首歌（右键菜单用），需要同步落库
  async function removeRecentSong(songId) {    musicStore.removeRecentSong(songId);

    try {
      await musicStorage.saveMusicData(
        STORAGE_KEYS.recentSongs,
        musicStore.recentSongs.map((song) => song.id),
      );
      toast.success("已从最近播放移除");
    } catch (error) {
      console.error("最近播放更新失败：", error);
      toast.error("更新失败，请重试");
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
    await musicStorage.saveMusicData(STORAGE_KEYS.favorites, [
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

    releaseSongAudioUrl(id);
    toast.success("已删除歌曲");
  }

  // 清除所有歌曲：曲库、收藏、最近播放、队列一起清空；
  // 歌单本身保留（名称还在），但里面的歌曲会被清掉，否则会指向不存在的歌
  async function clearAllSongs() {
    const confirmed = await confirm({
      title: "清除所有歌曲",
      message:
        "将删除曲库里的全部歌曲，收藏、最近播放和播放队列会同步清空。歌单本身保留，但其中的歌曲会被移除。此操作无法恢复。",
      confirmText: "全部清除",
      danger: true,
    });
    if (!confirmed) return;

    try {
      audioService.stop();
      playerStore.resetPlayer();
      releaseAllAudioUrls();

      await musicStorage.clearAll();

      const emptiedPlaylists = playlistStore.playlists.map((playlist) => ({
        ...playlist,
        songIds: [],
      }));

      for (const playlist of emptiedPlaylists) {
        await playlistStorage.savePlaylist(playlist);
      }

      playlistStore.setPlaylists(emptiedPlaylists);
      musicStore.setSongs([]);
      musicStore.setFavorites([]);
      musicStore.setRecentSongs([]);

      toast.success("已清除所有歌曲");
    } catch (error) {
      console.error("清除歌曲失败：", error);
      toast.error("清除失败，请重试");
    }
  }

  // 批量删除：歌曲删除、收藏、队列、歌单各只落一次库
  async function removeSongs(ids) {
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (uniqueIds.length === 0) return;

    const idSet = new Set(uniqueIds);

    if (currentSong.value && idSet.has(currentSong.value.id)) {
      audioService.stop();
      playerStore.resetPlayer();
    }

    // 一个事务删掉全部歌曲记录
    await persistSafely(() => musicStorage.deleteSongs(uniqueIds), {
      logLabel: "批量删除歌曲失败",
      toast,
      errorMessage: "部分歌曲删除失败，请刷新后检查",
    });

    for (const id of uniqueIds) {
      playerStore.removeFromQueue(id);
      musicStore.removeSong(id);
      releaseSongAudioUrl(id);
    }

    await persistSafely(
      () =>
        musicStorage.saveMusicData(STORAGE_KEYS.favorites, [
          ...musicStore.favoriteSongs,
        ]),
      { logLabel: "收藏记录保存失败" },
    );

    // 从所有歌单里移除这些歌，所有歌单一次事务落库
    const changedPlaylists = new Map();
    for (const id of uniqueIds) {
      for (const playlist of playlistStore.removeSongFromAll(id)) {
        changedPlaylists.set(playlist.id, playlist);
      }
    }

    if (changedPlaylists.size > 0) {
      await persistSafely(
        () => playlistStorage.savePlaylists([...changedPlaylists.values()]),
        {
          logLabel: "歌单更新失败",
          toast,
          errorMessage: "歌单同步失败，请刷新后检查",
        },
      );
    }

    toast.success(`已删除 ${uniqueIds.length} 首歌曲`);
  }

  return {
    importSongs,
    toggleFavorite,
    clearRecentSongs,
    removeRecentSong,
    removeSong,
    removeSongs,
    clearAllSongs,
  };
}
