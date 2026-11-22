// src/storage/playlistStorage.js
/**
 * 歌单存储门面
 * 注意：写入前必须归一化成纯对象 —— store 传进来的可能是 Pinia 的响应式 Proxy，
 * 而 IndexedDB 的 structured clone 无法克隆 Proxy，会抛 DataCloneError
 */
import { createIndexedDBAdapter } from "./adapters/indexedDBAdapter";

const STORE = "playlists";

// 歌单持久化门面：只依赖 adapter 接口（put / get / getAll / remove / clear），
// 将来换成 SQLite 或云同步时，只需要换 adapter。
export function createPlaylistStorage(adapter = createIndexedDBAdapter()) {
  // 保存单个歌单（整条覆盖）
  // 注意：调用方传进来的可能是 Pinia 的响应式 Proxy，
  // 而 IndexedDB 的 structured clone 不能克隆 Proxy（会抛 DataCloneError），
  // 所以这里显式拼一个纯对象再写。
  async function savePlaylist(playlist) {
    if (!playlist?.id) return;

    await adapter.put(STORE, {
      id: playlist.id,
      name: playlist.name,
      songIds: Array.isArray(playlist.songIds) ? [...playlist.songIds] : [],
      createdAt: playlist.createdAt ?? Date.now(),
      updatedAt: playlist.updatedAt ?? Date.now(),
    });
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
