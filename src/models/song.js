/**
 * 歌曲数据模型
 * 说明：file 是用户选中的原始文件（存进 IndexedDB），cover 是封面 Blob；
 * 播放地址由 services/assetUrls 按需创建，封面地址由 SongCover 组件按需创建
 */

// 创建标准歌曲数据模型
export function createSongModel(file, metadata = {}) {
  if (!file) {
    throw new Error('音乐文件不能为空')
  }

  // 获取文件扩展名
  const format = file.name.split('.').pop().toLowerCase()

  // 创建歌曲数据
  return {
    // 唯一标识
    id: crypto.randomUUID(),

    // 音乐元数据
    name: metadata.name || file.name.replace(/\.[^/.]+$/, ''),
    artist: metadata.artist || '',
    album: metadata.album || '',
    albumArtist: metadata.albumArtist || '',
    year: metadata.year ?? null,
    genre: metadata.genre || '',
    trackNumber: metadata.trackNumber ?? null,
    discNumber: metadata.discNumber ?? null,
    duration: metadata.duration ?? 0,
    lyrics: metadata.lyrics || '',
    cover: metadata.cover ?? null,

    // 音频技术信息
    format,
    bitrate: metadata.bitrate ?? null,
    sampleRate: metadata.sampleRate ?? null,
    channels: metadata.channels ?? null,
    fileSize: file.size,

    // 本地管理信息
    filename: file.name,
    size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
    importedAt: Date.now(),
    updatedAt: Date.now(),

    // 本地资源（只存 File / Blob，播放与封面地址按需生成）
    file,

    // 桌面端才有：原始文件在磁盘上的绝对路径（用于「在文件夹中显示」）
    filePath: metadata.filePath ?? ""
  }
}
