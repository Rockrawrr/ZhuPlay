// src/app/useAppBootstrap.js
/**
 * 启动引导
 * 顺序：先把曲库读进 store，再恢复播放队列（队列里的歌要能按 id 在曲库里找到），
 * 最后恢复音量；卸载时统一释放 blob 地址与音频实例
 */
import { onMounted, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { usePlaylistStore } from "@/stores/playlist";
import { getMusicStorage, getPlaylistStorage } from "@/app/services";
import { releaseAllAudioUrls } from "@/services/assetUrls";
import { destroyAudioPlayer } from "@/composables/useAudioPlayer";
import { useQueuePersistence } from "@/app/useQueuePersistence";
import { useVolume } from "@/composables/useVolume";
import { useToast } from "@/composables/useToast";
import { STORAGE_KEYS } from "@/storage/keys";
import { appReady } from "@/app/appState";

export function useAppBootstrap() {
  const musicStore = useMusicStore();
  const playlistStore = usePlaylistStore();
  const musicStorage = getMusicStorage();
  const playlistStorage = getPlaylistStorage();
  const toast = useToast();
  const { restoreQueue } = useQueuePersistence();
  const { restoreVolume } = useVolume();

  async function initializeMusic() {
    try {
      const savedSongs = await musicStorage.getSongs();
      musicStore.setSongs(savedSongs);

      const savedFavorites = await musicStorage.getMusicData(
        STORAGE_KEYS.favorites,
        [],
      );
      musicStore.setFavorites(savedFavorites);

      const savedRecentIds = await musicStorage.getMusicData(
        STORAGE_KEYS.recentSongs,
        [],
      );
      musicStore.setRecentSongs(savedRecentIds);

      const savedPlaylists = await playlistStorage.getPlaylists();
      playlistStore.setPlaylists(savedPlaylists);

      if (import.meta.env.DEV) {
        console.debug(
          `[bootstrap] 歌曲 ${savedSongs.length} / 收藏 ${musicStore.favoriteSongs.length} / 最近 ${musicStore.recentSongs.length} / 歌单 ${savedPlaylists.length}`,
        );
      }
    } catch (error) {
      console.error("音乐数据恢复失败：", error);
      toast.error("本地数据读取失败，部分内容可能缺失");
    }
  }

  onMounted(async () => {
    try {
      await initializeMusic();
      // 曲库恢复后再还原队列：队列里的歌曲要能在 songs 里按 id 找到
      await restoreQueue();
      // 音量与曲库无关，单独恢复
      await restoreVolume();
    } finally {
      // 无论恢复成功与否都结束骨架屏，否则页面会一直显示占位
      appReady.value = true;
    }
  });

  onUnmounted(() => {
    // 播放地址是复用的缓存，统一在这里释放；封面地址由各组件自己回收
    releaseAllAudioUrls();
    destroyAudioPlayer();
  });
}
