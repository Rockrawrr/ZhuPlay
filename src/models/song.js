
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
    coverUrl: '',

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

    // 本地资源
    file,
    url: ''
  }
}
