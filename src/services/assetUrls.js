// src/services/assetUrls.js
/**
 * 音频 objectURL 的小缓存
 * 为什么需要：<audio> 播放需要 URL，但给上万首歌都常驻 URL 会占大量内存。
 * 这里只在真正播放时创建，并且最多保留 3 个（当前 + 最近切过的），
 * 超出的立即 revoke。
 */

const MAX_CACHED = 3;

// songId -> objectURL（Map 的插入顺序即 LRU 顺序）
const audioUrls = new Map();

// 取歌曲的播放地址：命中缓存直接返回，否则按需创建
export function getSongAudioUrl(song) {
  if (!song) return "";

  const cached = audioUrls.get(song.id);
  if (cached) {
    // 命中后移到队尾，保持 LRU
    audioUrls.delete(song.id);
    audioUrls.set(song.id, cached);
    return cached;
  }

  // 没有 File（理论上不该出现）时退回旧字段
  if (!(song.file instanceof Blob)) return song.url || "";

  const url = URL.createObjectURL(song.file);
  audioUrls.set(song.id, url);

  while (audioUrls.size > MAX_CACHED) {
    const [oldestId, oldestUrl] = audioUrls.entries().next().value;
    audioUrls.delete(oldestId);
    URL.revokeObjectURL(oldestUrl);
  }

  return url;
}

// 删除某首歌的缓存（歌曲被删除时调用）
export function releaseSongAudioUrl(songId) {
  const url = audioUrls.get(songId);
  if (!url) return;

  URL.revokeObjectURL(url);
  audioUrls.delete(songId);
}

// 应用卸载时统一释放
export function releaseAllAudioUrls() {
  for (const url of audioUrls.values()) {
    URL.revokeObjectURL(url);
  }
  audioUrls.clear();
}
