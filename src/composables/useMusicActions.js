
import { createSong, releaseSong } from "../services/musicService";
import { parseMusicMetadata } from "../services/metadataService";

// 音乐业务操作
export function useMusicActions({
  musicStore,
  musicStorage,
  songs,
  currentSong,
  audioService,
  playerStore,
}) {

  // 导入音乐文件
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

    // 保存歌曲到 IndexedDB
    for (const song of newSongs) {
      try {
        await musicStorage.saveSong(song);
      } catch (error) {
        console.error(`歌曲保存失败：${song.filename}`, error);
      }
    }

    // 添加到音乐库
    songs.value.push(...newSongs);
  }

  // 切换收藏状态并保存到本地数据库
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

  // 清空最近播放记录
  function clearRecentSongs() {
    const confirmed = window.confirm("确定清空最近播放记录吗？");

    if (!confirmed) return;

    musicStore.clearRecentSongs();
  }

  // 删除歌曲
  async function removeSong(id) {
    const song = songs.value.find((item) => item.id === id);

    if (!song) return;

    // 如果删除的是当前播放歌曲，停止播放
    if (currentSong.value?.id === id) {
      audioService.stop();
      playerStore.resetPlayer();
    }

    // 从 IndexedDB 删除歌曲
    try {
      await musicStorage.deleteSong(id);
    } catch (error) {
      console.error("歌曲删除失败：", error);
      return;
    }

    // 从音乐列表中删除
    songs.value = songs.value.filter((item) => item.id !== id);

    // 从最近播放记录中删除
    musicStore.removeRecentSong(id);

    // 从收藏列表中删除
    musicStore.favoriteSongs = musicStore.favoriteSongs.filter(
      (favoriteId) => favoriteId !== id,
    );

    // 同步保存收藏数据
    await musicStorage.saveMusicData("favorites", [
      ...musicStore.favoriteSongs,
    ]);

    // 释放歌曲资源
    releaseSong(song);
  }

  return {
    importSongs,
    toggleFavorite,
    clearRecentSongs,
    removeSong,
  };
}
