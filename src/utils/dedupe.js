// src/utils/dedupe.js
/**
 * 歌曲去重
 * 判定依据（任一命中即视为同一首）：
 *   1. 桌面端：文件绝对路径相同
 *   2. 文件名（小写）+ 文件大小相同
 * 说明：不算文件内容哈希 —— 导入时读整个文件太慢，
 * 而「同名同大小」对本地曲库足够用，且与备份导入的匹配规则一致
 */

// 歌曲对象的指纹（用于备份匹配 / 去重）
export function songFingerprint(song) {
  const name = String(song?.filename || song?.name || "").toLowerCase();
  return `${name}|${song?.fileSize ?? 0}`;
}

// 文件对象的指纹（File 的 name/size）
export function fileFingerprint(file) {
  return `${String(file?.name || "").toLowerCase()}|${file?.size ?? 0}`;
}

/**
 * 从待导入文件里挑出真正的新歌
 * @param {File[]|FileList} files 用户选择的文件
 * @param {Array} existingSongs 已在曲库里的歌曲
 * @param {(file: File) => string} resolvePath 取文件绝对路径（Web 端传空函数）
 * @returns {{ fresh: File[], duplicates: File[] }}
 */
export function filterDuplicateFiles(files, existingSongs = [], resolvePath = () => "") {
  const knownFingerprints = new Set(existingSongs.map(songFingerprint));
  const knownPaths = new Set(
    existingSongs.map((song) => song.filePath).filter(Boolean),
  );

  const fresh = [];
  const duplicates = [];

  for (const file of Array.from(files ?? [])) {
    const fingerprint = fileFingerprint(file);
    const filePath = resolvePath(file) || "";

    const duplicated =
      knownFingerprints.has(fingerprint) ||
      (filePath !== "" && knownPaths.has(filePath));

    if (duplicated) {
      duplicates.push(file);
      continue;
    }

    // 同一次选择里重复选中同一个文件也要挡掉
    knownFingerprints.add(fingerprint);
    if (filePath) knownPaths.add(filePath);
    fresh.push(file);
  }

  return { fresh, duplicates };
}
