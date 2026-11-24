// src/services/backupService.js
/**
 * 备份导出 / 导入（只含元数据，不含音频）
 * 用途：换电脑、重装、误删后恢复歌单 / 收藏 / 最近播放 / 听歌统计
 * 音频文件本身不导出：桌面端换机时直接复制数据目录更省事（设置页有入口）
 *
 * 导入是「合并」而不是覆盖：
 *   - 歌曲按「文件名 + 文件大小」匹配本地已有的歌
 *   - 歌单以新名字导入（重名会加后缀），只保留匹配上的歌曲
 *   - 收藏 / 最近播放 / 统计做并集
 */
import { useMusicStore } from "@/stores/music";
import { usePlaylistStore } from "@/stores/playlist";
import { getMusicStorage, getPlaylistStorage } from "@/app/services";
import { STORAGE_KEYS } from "@/storage/keys";
import { songFingerprint } from "@/utils/dedupe";

const SONG_FIELDS = [
  "id",
  "name",
  "artist",
  "album",
  "albumArtist",
  "year",
  "genre",
  "trackNumber",
  "discNumber",
  "duration",
  "filename",
  "size",
  "fileSize",
  "format",
  "bitrate",
  "sampleRate",
  "channels",
  "importedAt",
  "lyrics",
];

function appVersion() {
  return typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown";
}

// 跨设备匹配歌曲的依据：文件名 + 文件大小（与导入去重共用同一套规则）
const fingerprint = songFingerprint;

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const MAX_BACKUP_SONGS = 100_000;
const MAX_BACKUP_PLAYLISTS = 10_000;

function validateBackup(snapshot) {
  const fail = () => { throw new Error("备份文件格式无效或内容超出限制"); };
  if (!snapshot || typeof snapshot !== "object" || snapshot.app !== "ZhuPlay" ||
      !Array.isArray(snapshot.songs) || snapshot.songs.length > MAX_BACKUP_SONGS ||
      (snapshot.playlists != null && (!Array.isArray(snapshot.playlists) || snapshot.playlists.length > MAX_BACKUP_PLAYLISTS)) ||
      (snapshot.favorites != null && !Array.isArray(snapshot.favorites)) ||
      (snapshot.recent != null && !Array.isArray(snapshot.recent))) fail();
  const ids = new Set();
  for (const song of snapshot.songs) {
    if (!song || typeof song !== "object" || typeof song.id !== "string" || !song.id ||
        typeof song.filename !== "string" || !Number.isFinite(Number(song.fileSize ?? song.size)) ||
        Number(song.fileSize ?? song.size) < 0 || ids.has(song.id)) fail();
    ids.add(song.id);
  }
  for (const playlist of snapshot.playlists ?? []) {
    if (!playlist || typeof playlist !== "object" || typeof playlist.name !== "string" ||
        !Array.isArray(playlist.songIds) || playlist.songIds.some((id) => typeof id !== "string")) fail();
  }
  for (const list of [snapshot.favorites ?? [], snapshot.recent ?? []]) {
    if (list.some((id) => typeof id !== "string")) fail();
  }
  if (snapshot.stats != null && (typeof snapshot.stats !== "object" || Array.isArray(snapshot.stats))) fail();
  return snapshot;
}

// 生成备份快照
export async function buildSnapshot() {
  const musicStore = useMusicStore();
  const playlistStore = usePlaylistStore();

  const stats = (await getStatsSnapshot()) ?? {
    plays: {},
    daily: {},
    totalPlays: 0,
    totalSeconds: 0,
  };

  return {
    app: "ZhuPlay",
    version: appVersion(),
    exportedAt: Date.now(),
    songs: musicStore.songs.map((song) => {
      const item = {};
      for (const field of SONG_FIELDS) item[field] = song[field] ?? null;
      return item;
    }),
    favorites: [...musicStore.favoriteSongs],
    recent: [...musicStore.recentSongs],
    playlists: playlistStore.playlists.map((playlist) => ({
      name: playlist.name,
      songIds: [...playlist.songIds],
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    })),
    stats: JSON.parse(JSON.stringify(stats)),
  };
}

function getStatsSnapshot() {
  // 直接读 IndexedDB 里的统计（composable 的 state 不对外导出）
  const storage = getMusicStorage();
  return storage.getMusicData(STORAGE_KEYS.stats, null);
}

// 把快照合并进当前数据，返回合并结果摘要
export async function applySnapshot(snapshot) {
  validateBackup(snapshot);

  const musicStore = useMusicStore();
  const playlistStore = usePlaylistStore();
  const musicStorage = getMusicStorage();
  const playlistStorage = getPlaylistStorage();

  // 1. 建立 旧id → 本地歌曲id 的映射
  const byFingerprint = new Map();
  for (const song of musicStore.songs) {
    byFingerprint.set(fingerprint(song), song.id);
  }

  const idMap = new Map();
  let matched = 0;

  for (const oldSong of snapshot.songs) {
    const localId = byFingerprint.get(fingerprint(oldSong));
    if (localId) {
      idMap.set(oldSong.id, localId);
      matched += 1;
    }
  }

  // 2. 先在临时数组中准备歌单，不提前修改 store 或 IndexedDB。
  const existingNames = new Set(
    playlistStore.playlists.map((playlist) => playlist.name),
  );
  const createdPlaylists = [];

  for (const old of snapshot.playlists ?? []) {
    const mappedIds = (old.songIds ?? [])
      .map((id) => idMap.get(id))
      .filter(Boolean);

    if (mappedIds.length === 0) continue;

    let name = old.name || "导入的歌单";
    if (existingNames.has(name)) name = `${name}（导入）`;
    existingNames.add(name);

    const playlist = {
      id: crypto.randomUUID(), name, songIds: [...new Set(mappedIds)],
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    createdPlaylists.push({ name, count: playlist.songIds.length, row: playlist });
  }

  // 3. 收藏 / 最近播放：并集
  const mappedFavorites = (snapshot.favorites ?? [])
    .map((id) => idMap.get(id))
    .filter(Boolean);

  const nextFavorites = [...new Set([...musicStore.favoriteSongs, ...mappedFavorites])];

  const mappedRecent = (snapshot.recent ?? [])
    .map((id) => idMap.get(id))
    .filter(Boolean);

  const recentById = new Map(musicStore.recentSongs.map((song) => [song.id, song]));
  for (const id of [...mappedRecent].reverse()) {
    const song = musicStore.songs.find((item) => item.id === id);
    if (song) { recentById.delete(id); recentById.set(id, song); }
  }
  const nextRecent = [...recentById.values()].slice(-50).reverse();

  // 4. 听歌统计：合并次数与时长
  let mergedStats = null;
  if (snapshot.stats && typeof snapshot.stats === "object") {
    const current =
      (await musicStorage.getMusicData(STORAGE_KEYS.stats, null)) ?? {
        plays: {},
        daily: {},
        totalPlays: 0,
        totalSeconds: 0,
      };

    for (const [oldId, entry] of Object.entries(snapshot.stats.plays ?? {})) {
      const localId = idMap.get(oldId);
      if (!localId) continue;

      const target = current.plays[localId] ?? {
        count: 0,
        seconds: 0,
        lastAt: 0,
      };
      target.count += entry.count ?? 0;
      target.seconds += entry.seconds ?? 0;
      target.lastAt = Math.max(target.lastAt, entry.lastAt ?? 0);
      current.plays[localId] = target;
    }

    for (const [day, seconds] of Object.entries(snapshot.stats.daily ?? {})) {
      current.daily[day] = (current.daily[day] ?? 0) + (seconds ?? 0);
    }

    current.totalPlays = Object.values(current.plays).reduce(
      (sum, item) => sum + (item.count ?? 0),
      0,
    );
    current.totalSeconds = Object.values(current.plays).reduce(
      (sum, item) => sum + (item.seconds ?? 0),
      0,
    );
    current.updatedAt = Date.now();

    mergedStats = current;
  }

  const playlistRows = createdPlaylists.map(({ row }) => row);
  await musicStorage.saveBackupMerge({
    favorites: nextFavorites,
    recentSongs: nextRecent.map((song) => song.id),
    stats: mergedStats,
    playlists: playlistRows,
  });
  musicStore.setFavorites(nextFavorites);
  musicStore.setRecentSongs(nextRecent.map((song) => song.id));
  playlistStore.setPlaylists([...playlistRows, ...playlistStore.playlists]);

  return {
    matched,
    missing: snapshot.songs.length - matched,
    playlists: createdPlaylists.map(({ name, count }) => ({ name, count })),
  };
}

// 导出：桌面端弹保存框，Web 端直接下载
export async function exportBackup() {
  const snapshot = await buildSnapshot();
  const json = JSON.stringify(snapshot, null, 2);

  if (window.zhuplayDesktop?.isDesktop) {
    return window.zhuplayDesktop.saveBackup(json);
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `zhuplay-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  return "download";
}

// 导入：读取备份文本并合并
export async function importBackup() {
  let text;

  if (window.zhuplayDesktop?.isDesktop) {
    text = await window.zhuplayDesktop.openBackup();
  } else {
    text = await pickFileInBrowser();
  }

  if (!text) return null;

  if (typeof text !== "string" || text.length > MAX_BACKUP_BYTES) {
    throw new Error("备份文件超过 20 MB 限制");
  }
  return applySnapshot(JSON.parse(text));
}

function pickFileInBrowser() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.style.display = "none";
    document.body.appendChild(input);

    const cleanup = () => input.remove();

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      cleanup();
      resolve(file ? await file.text() : null);
    });

    // 用户取消选择时触发 cancel（Chrome 113+），避免 Promise 永远挂着
    input.addEventListener("cancel", () => {
      cleanup();
      resolve(null);
    });

    input.click();
  });
}
