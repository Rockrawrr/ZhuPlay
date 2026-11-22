// src/utils/lyrics.js
/**
 * 歌词解析
 * 支持两种输入：
 *   1. LRC（带 [mm:ss.xx] 时间轴）→ 返回 { synced: true, lines: [{ time, text }] }
 *   2. 纯文本 → 返回 { synced: false, lines: [{ time: -1, text }] }
 * 解析不出时间轴时不要报错，退化成纯文本展示即可
 */

// [00:12.34] / [00:12.3] / [00:12] 都接受，一行可以有多个时间戳
const TIMESTAMP_RE = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

// LRC 里的元信息标签，例如 [ar:歌手]，不属于正文
const META_RE = /^\[(ti|ar|al|by|offset|re|ve|length):.*\]$/i;

function toSeconds(minutes, seconds, fraction) {
  const frac = fraction ? Number(`0.${fraction}`) : 0;
  return Number(minutes) * 60 + Number(seconds) + frac;
}

export function parseLyrics(raw) {
  if (!raw || typeof raw !== "string") {
    return { synced: false, lines: [] };
  }

  const text = raw.replace(/\r\n?/g, "\n").trim();
  if (!text) return { synced: false, lines: [] };

  const synced = [];
  const plain = [];
  let hasTimestamp = false;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      plain.push("");
      continue;
    }

    if (META_RE.test(line)) continue;

    TIMESTAMP_RE.lastIndex = 0;
    const stamps = [];
    let match;

    while ((match = TIMESTAMP_RE.exec(line)) !== null) {
      stamps.push(toSeconds(match[1], match[2], match[3]));
    }

    if (stamps.length === 0) {
      plain.push(line);
      continue;
    }

    hasTimestamp = true;
    const content = line.replace(TIMESTAMP_RE, "").trim();

    for (const time of stamps) {
      synced.push({ time, text: content });
    }
  }

  if (hasTimestamp) {
    synced.sort((a, b) => a.time - b.time);
    return { synced: true, lines: synced };
  }

  // 纯文本：去掉头部多余空行
  while (plain.length > 0 && plain[0] === "") plain.shift();
  while (plain.length > 0 && plain[plain.length - 1] === "") plain.pop();

  return {
    synced: false,
    lines: plain.map((line) => ({ time: -1, text: line })),
  };
}

// 当前时间对应的歌词下标（找不到返回 -1）
export function findLyricIndex(lines, currentTime) {
  if (!Array.isArray(lines) || lines.length === 0) return -1;
  if (lines[0].time < 0) return -1;

  let index = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].time <= currentTime + 0.2) index = i;
    else break;
  }

  return index;
}
