// src/storage/playlistStorage.js
import { createIndexedDBAdapter } from "./adapters/indexedDBAdapter";

const STORE = "playlists";

// 歌单持久化门面：只依赖 adapter 接口（put / get / getAll / remove / clear），
// 将来换成 SQLite 或云同步时，只需要换 adapter。
export function createPlaylistStorage(adapter = createIndexedDBAdapter()) {
  // 保存单个歌单（整条覆盖）
  async function savePlaylist(playlist) {
    await adapter.put(STORE, playlist);
  }

  // 读取全部歌单，并对旧数据补默认值
  async function getPlaylists() {
    const playlists = await adapter.getAll(STORE);

    return playlists.map((playlist) => ({
      id: playlist.id,
      name: playlist.name || "未命名歌单",
      songIds: Array.isArray(playlist.songIds) ? playlist.songIds : [],
      createdAt: playlist.createdAt ?? 0,
      updatedAt: playlist.updatedAt ?? playlist.createdAt ?? 0,
    }));
  }

  // 删除歌单
  async function deletePlaylist(playlistId) {
    await adapter.remove(STORE, playlistId);
  }

  return {
    savePlaylist,
    getPlaylists,
    deletePlaylist,
  };
}
