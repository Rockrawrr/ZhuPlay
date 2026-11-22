// src/storage/keys.js
/**
 * IndexedDB 里用到的 key 集中在这里
 * 之前 "favorites" / "recentSongIds" / "playQueue" / "volume" 散落在 4 个文件里，
 * 拼错一个字符就会静默失配，统一收口
 */
export const STORAGE_KEYS = {
  // 收藏的 songId 数组
  favorites: "favorites",
  // 最近播放的 songId 数组
  recentSongs: "recentSongIds",
  // 播放队列快照 { songIds, index }
  queue: "playQueue",
  // 音量与静音 { value, muted }
  volume: "volume",
  // 听歌统计 { plays, daily, totalPlays, totalSeconds }
  stats: "listeningStats",
};
