/**
 * 元数据解析：把用户选的音频文件读成标准标签
 * 依赖 music-metadata 的 parseBlob（浏览器可用的解析入口）
 * 注意：解析失败的情况由调用方（useMusicActions.importSongs）兜底成“文件名当歌名”
 */
import { parseBlob } from 'music-metadata'

// 解析音乐文件元数据
export async function parseMusicMetadata(file) {
  if (!file) {
    throw new Error('音乐文件不能为空')
  }

  // 使用 music-metadata 解析文件
  const metadata = await parseBlob(file)

  // 获取通用标签
  const common = metadata.common

  // 获取音频技术信息
  const format = metadata.format

  // 提取专辑封面
  const picture = common.picture?.[0]

  let cover = null

  if (picture) {
    cover = new Blob([picture.data], {
      type: picture.format
    })
  }

  // 返回标准化元数据
  return {
    name: common.title || '',
    artist: common.artist || '',
    album: common.album || '',
    albumArtist: common.albumartist || '',
    year: common.year ?? null,
    genre: common.genre?.join(', ') || '',
    trackNumber: common.track?.no ?? null,
    discNumber: common.disk?.no ?? null,
    duration: format.duration ?? 0,
    lyrics: '',
    cover,

    bitrate: format.bitrate ?? null,
    sampleRate: format.sampleRate ?? null,
    channels: format.numberOfChannels ?? null
  }
}