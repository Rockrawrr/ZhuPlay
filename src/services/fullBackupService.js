// src/services/fullBackupService.js
/**
 * 完整备份（含音频）：桌面端专用，单文件容器 .zhuplay
 *
 * 文件结构：
 *   "ZHUPBACKUP1\n" | uint32 头长度 | JSON 头 | 音频字节依次拼接
 * JSON 头包含 snapshot（歌曲元数据 / 歌单 / 收藏 / 最近播放 / 统计）
 * 与 entries（id、文件名、大小、音频字节数），顺序与音频字节一致。
 *
 * 读写都在主进程流式进行（4 MB 分块 + 背压），避免一次性把大文件读进内存。
 */
import { buildSnapshot, applySnapshot } from "@/services/backupService";
import { createSong } from "@/services/musicService";
import { mimeForPath } from "@/services/assetUrls";
import { getMusicStorage } from "@/app/services";
import { useMusicStore } from "@/stores/music";
import { songFingerprint } from "@/utils/dedupe";

const MAGIC_TEXT = "ZHUPBACKUP1\n";
const FORMAT = "zhuplay-full-backup";
const CHUNK_SIZE = 4 * 1024 * 1024;

function desktopApi() {
  const desktop = window.zhuplayDesktop;
  if (!desktop?.createFullBackup) {
    throw new Error("完整备份仅支持桌面端");
  }
  return desktop;
}

function encodeHeader(header) {
  const json = new TextEncoder().encode(JSON.stringify(header));
  const buffer = new Uint8Array(4 + json.length);
  new DataView(buffer.buffer).setUint32(0, json.length, true);
  buffer.set(json, 4);
  return buffer;
}

async function blobForSong(song) {
  if (song.file instanceof Blob) return song.file;

  const desktop = window.zhuplayDesktop;
  if (!song.filePath || !desktop?.readAudioFile) return null;

  const data = await desktop.readAudioFile(song.filePath);
  if (!data || !data.length) return null;

  return new Blob([data], { type: mimeForPath(song.filePath) });
}

/**
 * 导出完整备份
 * @param {(progress: {phase: string, done: number, total: number}) => void} onProgress
 * @returns {Promise<null | {path: string, bytes: number, songs: number, withoutAudio: number}>}
 */
export async function exportFullBackup(onProgress) {
  const desktop = desktopApi();

  const musicStore = useMusicStore();
  const songs = [...musicStore.songs];
  const snapshot = await buildSnapshot();

  const blobs = [];
  const entries = [];

  for (let index = 0; index < songs.length; index += 1) {
    const song = songs[index];
    let blob = null;

    try {
      blob = await blobForSong(song);
    } catch {
      // 单个文件读取失败不影响整体备份，按"无音频"处理
    }

    blobs.push(blob);
    entries.push({
      id: song.id,
      filename: song.filename,
      fileSize: song.fileSize ?? 0,
      audioSize: blob?.size ?? 0,
    });

    onProgress?.({ phase: "scan", done: index + 1, total: songs.length });
  }

  const targetPath = await desktop.chooseFullBackupTarget();
  if (!targetPath) return null;

  const header = {
    format: FORMAT,
    version: 1,
    createdAt: Date.now(),
    appVersion: typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev",
    magic: MAGIC_TEXT.trim(),
    snapshot,
    entries,
  };

  const token = await desktop.createFullBackup(targetPath);

  try {
    await desktop.writeFullBackup(token, encodeHeader(header));

    for (let index = 0; index < entries.length; index += 1) {
      const blob = blobs[index];

      if (blob) {
        for (let offset = 0; offset < blob.size; offset += CHUNK_SIZE) {
          const slice = blob.slice(
            offset,
            Math.min(offset + CHUNK_SIZE, blob.size),
          );
          await desktop.writeFullBackup(
            token,
            new Uint8Array(await slice.arrayBuffer()),
          );
        }
      }

      onProgress?.({ phase: "write", done: index + 1, total: entries.length });
    }

    const bytes = await desktop.finishFullBackup(token);

    return {
      path: targetPath,
      bytes,
      songs: entries.length,
      withoutAudio: entries.filter((entry) => entry.audioSize === 0).length,
    };
  } catch (error) {
    // 出错时尽量结束会话，避免留下写了一半的文件句柄
    try {
      await desktop.finishFullBackup(token);
    } catch {
      // 忽略：会话可能已经结束
    }
    throw error;
  }
}

/**
 * 导入完整备份：先恢复音频歌曲，再用 applySnapshot 合并歌单 / 收藏 / 统计
 * @returns {Promise<null | {imported: number, skipped: number, missing: number}>}
 */
export async function importFullBackup(onProgress) {
  const desktop = desktopApi();

  const filePath = await desktop.chooseFullBackupFile();
  if (!filePath) return null;

  const opened = await desktop.openFullBackup(filePath);
  if (!opened?.header || opened.header.format !== FORMAT) {
    throw new Error("不是有效的 ZhuPlay 完整备份");
  }

  const { header, audioOffset } = opened;
  const snapshot = header.snapshot;
  const musicStore = useMusicStore();
  const musicStorage = getMusicStorage();

  const metaById = new Map(
    (snapshot?.songs ?? []).map((song) => [song.id, song]),
  );
  const existing = new Set(musicStore.songs.map(songFingerprint));

  const newSongs = [];
  let offset = audioOffset;
  let skipped = 0;
  let missing = 0;

  for (let index = 0; index < header.entries.length; index += 1) {
    const entry = header.entries[index];
    const fingerprint = `${String(entry.filename).toLowerCase()}|${entry.fileSize ?? 0}`;

    let file = null;

    if (entry.audioSize > 0) {
      const data = await desktop.readFullBackupAudio(
        filePath,
        offset,
        entry.audioSize,
      );
      offset += entry.audioSize;

      if (data && data.length) {
        const mime = mimeForPath(entry.filename);
        file = new File([data], entry.filename, {
          type: mime.startsWith("audio/") ? mime : "audio/mpeg",
        });
      }
    }

    if (!file) {
      missing += 1;
      continue;
    }

    if (existing.has(fingerprint)) {
      skipped += 1;
      continue;
    }

    const meta = metaById.get(entry.id) ?? {};
    const song = createSong(file, { ...meta, filePath: "" });

    if (meta.importedAt) song.importedAt = meta.importedAt;
    if (meta.updatedAt) song.updatedAt = meta.updatedAt;

    newSongs.push(song);
    existing.add(fingerprint);

    onProgress?.({
      phase: "import",
      done: index + 1,
      total: header.entries.length,
    });
  }

  if (newSongs.length > 0) {
    await musicStorage.saveSongs(newSongs);
    musicStore.addSongs(newSongs);
  }

  if (snapshot) await applySnapshot(snapshot);

  return {
    imported: newSongs.length,
    skipped,
    missing,
    total: header.entries.length,
  };
}
