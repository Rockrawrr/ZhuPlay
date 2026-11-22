// src/app/useAppBootstrap.js
import { onMounted, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { usePlaylistStore } from "@/stores/playlist";
import { getMusicStorage, getPlaylistStorage } from "@/app/services";
import { releaseSong } from "@/services/musicService";
import { destroyAudioPlayer } from "@/composables/useAudioPlayer";
import { useQueuePersistence } from "@/app/useQueuePersistence";
import { useVolume } from "@/composables/useVolume";

export function useAppBootstrap() {
  const musicStore = useMusicStore();
  const playlistStore = usePlaylistStore();
  const musicStorage = getMusicStorage();
  const playlistStorage = getPlaylistStorage();
  const { restoreQueue } = useQueuePersistence();
  const { restoreVolume } = useVolume();

  async function initializeMusic() {
    try {
      const savedSongs = await musicStorage.getSongs();
      musicStore.setSongs(savedSongs);
      console.log(`成功恢复 ${savedSongs.length} 首歌曲`);

      const savedFavorites = await musicStorage.getMusicData("favorites", []);
      musicStore.setFavorites(savedFavorites);
      console.log(`成功恢复 ${musicStore.favoriteSongs.length} 首收藏`);

      const savedRecentIds = await musicStorage.getMusicData(
        "recentSongIds",
        [],
      );
      musicStore.setRecentSongs(savedRecentIds);
      console.log(`成功恢复 ${musicStore.recentSongs.length} 首最近播放`);

      const savedPlaylists = await playlistStorage.getPlaylists();
      playlistStore.setPlaylists(savedPlaylists);
      console.log(`成功恢复 ${savedPlaylists.length} 个歌单`);
    } catch (error) {
      console.error("音乐数据恢复失败：", error);
    }
  }

  onMounted(async () => {
    await initializeMusic();
    // 曲库恢复后再还原队列：队列里的歌曲要能在 songs 里按 id 找到
    await restoreQueue();
    // 音量与曲库无关，单独恢复
    await restoreVolume();
  });

  onUnmounted(() => {
    musicStore.songs.forEach(releaseSong);
    destroyAudioPlayer();
  });
}
