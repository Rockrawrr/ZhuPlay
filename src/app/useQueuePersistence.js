// src/app/useQueuePersistence.js
/**
 * 播放队列持久化
 * 只存 songId 数组 + 当前下标；刷新后从曲库重新解引用（blob 地址本来就会失效）
 * 恢复时只准备音频、不自动播放，避免被浏览器的自动播放策略拦截
 */
import { watch } from "vue";
import { useMusicStore } from "@/stores/music";
import { usePlayerStore } from "@/stores/player";
import { getMusicStorage, getAudioService } from "@/app/services";
import { STORAGE_KEYS } from "@/storage/keys";
import { getSongAudioUrl } from "@/services/assetUrls";

const QUEUE_KEY = STORAGE_KEYS.queue;

// 播放队列持久化
// 只存 songId 数组 + 当前下标：File / blob 地址刷新后都会失效，
// 恢复时再从曲库（getSongs 已重新生成 url）里按 id 取回完整歌曲对象。
export function useQueuePersistence() {
  const musicStore = useMusicStore();
  const playerStore = usePlayerStore();
  const musicStorage = getMusicStorage();
  const audioService = getAudioService();

  // 上一次写入的快照签名，避免相同内容重复落库
  let lastSaved = "";

  function buildSnapshot() {
    return {
      songIds: playerStore.queue.map((song) => song.id),
      index: playerStore.currentIndex,
    };
  }

  function signatureOf(snapshot) {
    return `${snapshot.songIds.join(",")}#${snapshot.index}`;
  }

  async function persistQueue() {
    const snapshot = buildSnapshot();
    const signature = signatureOf(snapshot);

    if (signature === lastSaved) return;
    lastSaved = signature;

    try {
      await musicStorage.saveMusicData(QUEUE_KEY, snapshot);
    } catch (error) {
      console.error("播放队列保存失败：", error);
    }
  }

  async function restoreQueue() {
    try {
      const snapshot = await musicStorage.getMusicData(QUEUE_KEY, null);
      if (!snapshot || !Array.isArray(snapshot.songIds)) return;
      if (snapshot.songIds.length === 0) return;

      // 只认曲库里还存在的歌曲，已删除的直接丢掉
      const queue = snapshot.songIds
        .map((id) => musicStore.songs.find((song) => song.id === id))
        .filter(Boolean);

      if (queue.length === 0) return;

      const index = Math.min(
        Math.max(Number(snapshot.index) || 0, 0),
        queue.length - 1,
      );

      playerStore.setQueue(queue, index);

      // 只把歌曲准备好（不自动播放，浏览器会拦截无用户手势的播放）
      const song = queue[index];
      playerStore.setCurrentSong(song);
      if (song.file) audioService.setSource(getSongAudioUrl(song));

      // 恢复本身不应再触发一次保存
      lastSaved = signatureOf({ songIds: queue.map((item) => item.id), index });
    } catch (error) {
      console.error("播放队列恢复失败：", error);
    }
  }

  // 队列或当前下标变化时落库（setQueue / removeFromQueue / resetPlayer 都会替换数组）
  watch([() => playerStore.queue, () => playerStore.currentIndex], persistQueue);

  return { restoreQueue };
}
