import { onMounted } from "vue";

// 音乐数据初始化与恢复
export function useMusicInitialization({
  musicStorage,
  songs,
  favoriteSongs,
  recentSongs,
}) {
  // 从 IndexedDB 恢复数据
  async function initializeMusic() {
    try {
      // 恢复音乐库
      const savedSongs = await musicStorage.getSongs();
      songs.value = savedSongs;
      console.log(`成功恢复 ${savedSongs.length} 首歌曲`);

      // 恢复收藏记录
      const savedFavorites = await musicStorage.getMusicData(
        "favorites",
        [],
      );

      favoriteSongs.value = Array.isArray(savedFavorites)
        ? savedFavorites
        : [];

      console.log(`成功恢复 ${favoriteSongs.value.length} 首收藏`);

      // 恢复最近播放记录
      const savedRecentIds = await musicStorage.getMusicData(
        "recentSongIds",
        [],
      );

      recentSongs.value = (
        Array.isArray(savedRecentIds) ? savedRecentIds : []
      )
        .map((id) => songs.value.find((song) => song.id === id))
        .filter(Boolean);

      console.log(`成功恢复 ${recentSongs.value.length} 首最近播放`);
    } catch (error) {
      console.error("音乐数据恢复失败：", error);
    }
  }

  // 组件挂载时自动初始化
  onMounted(initializeMusic);
}
