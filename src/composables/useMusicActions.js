// src/composables/useMusicActions.js
import { storeToRefs } from "pinia";
import { createSong, releaseSong } from "@/services/musicService";
import { parseMusicMetadata } from "@/services/metadataService";
import { getMusicStorage, getAudioService } from "@/app/services";
import { useMusicStore } from "@/stores/music";
import { usePlayerStore } from "@/stores/player";

export function useMusicActions() {
  const musicStore = useMusicStore();
  const playerStore = usePlayerStore();
  const musicStorage = getMusicStorage();
  const audioService = getAudioService();

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
    const song = songs.value.find((item) => item.id === id);
    if (!song) return;

    if (currentSong.value?.id === id) {
      audioService.stop();
      playerStore.resetPlayer();
    }

    try {
      await musicStorage.deleteSong(id);
    } catch (error) {
      console.error("歌曲删除失败：", error);
      return;
    }

    musicStore.removeSong(id);
    await musicStorage.saveMusicData("favorites", [
      ...musicStore.favoriteSongs,
    ]);
    releaseSong(song);
  }

  return { importSongs, toggleFavorite, clearRecentSongs, removeSong };
}
