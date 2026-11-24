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

// 按扩展名猜 MIME：桌面端「仅记录路径」模式需要用 Blob 包一层
const AUDIO_MIME = {
  mp3: "audio/mpeg",
  flac: "audio/flac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  aiff: "audio/aiff",
  aif: "audio/aiff",
  wma: "audio/x-ms-wma",
};

export function mimeForPath(filePath) {
  const ext = String(filePath || "")
    .toLowerCase()
    .split(".")
    .pop();

  return AUDIO_MIME[ext] || "application/octet-stream";
}

function remember(songId, url) {
  audioUrls.set(songId, url);

  while (audioUrls.size > MAX_CACHED) {
    const [oldestId, oldestUrl] = audioUrls.entries().next().value;
    audioUrls.delete(oldestId);
    URL.revokeObjectURL(oldestUrl);
  }

  return url;
}

// 取歌曲的播放地址：命中缓存直接返回，否则按需创建
// 只处理「歌曲自带 File」的情况；只有路径的歌曲用 getSongAudioUrlAsync
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

  return remember(song.id, URL.createObjectURL(song.file));
}

/**
 * 异步取播放地址：
 *   1. 歌曲自带 File → 走同步逻辑
 *   2. 只有 filePath（桌面端「仅记录路径」）→ 通过主进程读文件再包成 Blob
 * 读取失败会抛出，由调用方给用户提示
 */
export async function getSongAudioUrlAsync(song) {
  if (!song) return "";

  if (song.file instanceof Blob) return getSongAudioUrl(song);

  const cached = audioUrls.get(song.id);
  if (cached) {
    audioUrls.delete(song.id);
    audioUrls.set(song.id, cached);
    return cached;
  }

  const desktop = window.zhuplayDesktop;
  if (!song.filePath || !desktop?.readAudioFile) {
    return song.url || "";
  }

  const data = await desktop.readAudioFile(song.filePath);
  if (!data || !data.length) {
    throw new Error("读取音频文件失败");
  }

  const blob = new Blob([data], { type: mimeForPath(song.filePath) });
  return remember(song.id, URL.createObjectURL(blob));
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
