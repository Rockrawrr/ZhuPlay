// src/storage/playlistStorage.js
/**
 * 歌单存储门面
 * 注意：写入前必须归一化成纯对象 —— store 传进来的可能是 Pinia 的响应式 Proxy，
 * 而 IndexedDB 的 structured clone 无法克隆 Proxy，会抛 DataCloneError
 */
import { createIndexedDBAdapter } from "./adapters/indexedDBAdapter";

const STORE = "playlists";

// 统一成纯对象：索引 + 去除 Proxy / 补齐默认值
function normalize(playlist) {
  return {
    id: playlist.id,
    name: playlist.name,
    songIds: Array.isArray(playlist.songIds) ? [...playlist.songIds] : [],
    createdAt: playlist.createdAt ?? Date.now(),
    updatedAt: playlist.updatedAt ?? Date.now(),
  };
}

// 歌单持久化门面：只依赖 adapter 接口（put / get / getAll / remove / clear），
// 将来换成 SQLite 或云同步时，只需要换 adapter。
export function createPlaylistStorage(adapter = createIndexedDBAdapter()) {
  // 保存单个歌单（整条覆盖）
  // 注意：调用方传进来的可能是 Pinia 的响应式 Proxy，
  // 而 IndexedDB 的 structured clone 不能克隆 Proxy（会抛 DataCloneError），
  // 所以这里显式拼一个纯对象再写。
  async function savePlaylist(playlist) {
    if (!playlist?.id) return;

    await adapter.put(STORE, normalize(playlist));
  }

  // 批量保存（同一个事务）：批量增删歌曲后一次性落库
  async function savePlaylists(playlists) {
    const rows = (playlists ?? []).filter((item) => item?.id).map(normalize);
    if (rows.length === 0) return;

    await adapter.putMany(STORE, rows);
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

  // 清空全部歌单（设置页“清空全部数据”使用）
  async function clearAll() {
    await adapter.clear(STORE);
  }

  return {
    savePlaylist,
    savePlaylists,
    getPlaylists,
    deletePlaylist,
    clearAll,
  };
}
