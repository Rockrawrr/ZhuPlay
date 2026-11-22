import { createSong, releaseSong } from "@/services/musicService";
import { parseMusicMetadata } from "@/services/metadataService";
import { getMusicStorage } from "@/app/services";
import { useMusicStore } from "@/stores/music";
import { usePlayerStore } from "@/stores/player";
import { storeToRefs } from "pinia";

export function useMusicActions({ songs, currentSong, audioService } = {}) {
  const musicStore = useMusicStore();
  const playerStore = usePlayerStore();
  const musicStorage = getMusicStorage();

  // 兼容外部仍传 songs/currentSong；未传则内部从 store 取
  const songsRef = songs ?? storeToRefs(musicStore).songs;
  const currentSongRef = currentSong ?? storeToRefs(playerStore).currentSong;

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

    for (const song of newSongs) {
      try {
        await musicStorage.saveSong(song);
      } catch (error) {
        console.error(`歌曲保存失败：${song.filename}`, error);
      }
    }

    musicStore.addSongs(newSongs);
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

  function clearRecentSongs() {
    if (!window.confirm("确定清空最近播放记录吗？")) return;
    musicStore.clearRecentSongs();
  }

  async function removeSong(id) {
    const song = songsRef.value.find((item) => item.id === id);
    if (!song) return;

    if (currentSongRef.value?.id === id) {
      audioService?.stop();
      playerStore.resetPlayer();
    }

    try {
      await musicStorage.deleteSong(id);
    } catch (error) {
      console.error("歌曲删除失败：", error);
      return;
    }

    // 一次清理音乐库、收藏、最近播放
    musicStore.removeSong(id);

    await musicStorage.saveMusicData("favorites", [
      ...musicStore.favoriteSongs,
    ]);

    releaseSong(song);
  }

  return { importSongs, toggleFavorite, clearRecentSongs, removeSong };
}
