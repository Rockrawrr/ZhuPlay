import { createIndexedDBAdapter } from './adapters/indexedDBAdapter'

// 创建音乐存储服务
export function createMusicStorage(
  adapter = createIndexedDBAdapter()
) {

 // 保存单首歌曲
async function saveSong(song) {
  // 排除临时播放地址和封面地址
  const {
    url,
    coverUrl,
    ...songData
  } = song

  await adapter.put('songs', songData)
}

  // 获取全部歌曲
async function getSongs() {
  const songs = await adapter.getAll('songs')

  // 重新生成播放地址和封面地址
  return songs.map((song) => ({
    ...song,

    url: song.file
      ? URL.createObjectURL(song.file)
      : '',

    coverUrl: song.cover
      ? URL.createObjectURL(song.cover)
      : ''
  }))
}

  // 删除歌曲
  async function deleteSong(songId) {
    await adapter.remove('songs', songId)
  }

  // 保存音乐相关数据
  async function saveMusicData(key, value) {
    await adapter.put('musicData', {
      key,
      value
    })
  }

  // 获取音乐相关数据
  async function getMusicData(key, defaultValue = null) {
    const result = await adapter.get('musicData', key)

    return result ? result.value : defaultValue
  }

  // 删除音乐相关数据
  async function deleteMusicData(key) {
    await adapter.remove('musicData', key)
  }

  return {
    saveSong,
    getSongs,
    deleteSong,
    saveMusicData,
    getMusicData,
    deleteMusicData
  }
}