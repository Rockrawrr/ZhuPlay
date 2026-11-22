// src/app/useAppBootstrap.js
import { onMounted, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { getMusicStorage } from "@/app/services";
import { releaseSong } from "@/services/musicService";

// 应用启动引导：恢复数据 + 卸载时释放资源
export function useAppBootstrap() {
  const musicStore = useMusicStore();
  const musicStorage = getMusicStorage();

  async function initializeMusic() {
    try {
      // 恢复音乐库
      const savedSongs = await musicStorage.getSongs();
      musicStore.setSongs(savedSongs);
      console.log(`成功恢复 ${savedSongs.length} 首歌曲`);

      // 恢复收藏
      const savedFavorites = await musicStorage.getMusicData("favorites", []);
      musicStore.setFavorites(savedFavorites);
      console.log(`成功恢复 ${musicStore.favoriteSongs.length} 首收藏`);

      // 恢复最近播放
      const savedRecentIds = await musicStorage.getMusicData(
        "recentSongIds",
        [],
      );
      musicStore.setRecentSongs(savedRecentIds);
      console.log(`成功恢复 ${musicStore.recentSongs.length} 首最近播放`);
    } catch (error) {
      console.error("音乐数据恢复失败：", error);
    }
  }

  onMounted(initializeMusic);

  onUnmounted(() => {
    // 释放所有歌曲的 blob URL
    musicStore.songs.forEach((song) => {
      releaseSong(song);
    });
  });
}
