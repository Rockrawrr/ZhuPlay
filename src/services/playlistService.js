// src/services/playlistService.js

// 歌单名长度上限
export const MAX_PLAYLIST_NAME_LENGTH = 40;

// 规范歌单名：压缩空白、去掉首尾空格、截断超长，空名兜底
export function normalizePlaylistName(name) {
  const text = String(name ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PLAYLIST_NAME_LENGTH);

  return text || "新建歌单";
}

// 创建歌单数据模型
// 只存 songIds 而不是歌曲对象：歌曲对象里有 File / blob 地址，刷新后失效
export function createPlaylistModel(name) {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    name: normalizePlaylistName(name),
    songIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

// 判断歌单里是否已有某首歌
export function hasSong(playlist, songId) {
  return Array.isArray(playlist?.songIds) && playlist.songIds.includes(songId);
}

// 把歌曲追加到歌单末尾（已存在则原样返回，便于调用方判断“无变化”）
export function appendSong(songIds, songId) {
  if (!songId || !Array.isArray(songIds) || songIds.includes(songId)) {
    return songIds;
  }
  return [...songIds, songId];
}

// 从歌单移除歌曲
export function removeSong(songIds, songId) {
  if (!Array.isArray(songIds) || !songIds.includes(songId)) return songIds;
  return songIds.filter((id) => id !== songId);
}
