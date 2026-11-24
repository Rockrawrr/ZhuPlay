/**
 * 歌曲存储门面
 * 职责：歌曲与零散音乐数据（收藏、最近播放、队列、音量）的读写
 * 关键点：写入时剥离 url / coverUrl；读取时也不生成 blob 地址（按需创建，见 assetUrls / useObjectUrl）
 * 依赖抽象：只认 adapter 接口，换 SQLite / 云端实现时上层不用改
 */
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
  // 不再为每首歌创建 objectURL：上万首时会占用大量内存，
  // 播放地址由 assetUrls 按需创建，封面地址由 SongCover 组件按需创建
  async function getSongs() {
    return adapter.getAll('songs')
  }

  // 删除歌曲
  async function deleteSong(songId) {
    await adapter.remove('songs', songId)
  }

  // 批量删除歌曲（同一个事务，批量操作用）
  async function deleteSongs(songIds) {
    await adapter.removeMany('songs', songIds)
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

  // 清空歌曲与零散音乐数据（设置页“清空全部数据”使用）
  async function clearAll() {
    await adapter.transaction(['songs', 'musicData', 'playlists'], (stores) => {
      stores.songs.clear()
      stores.musicData.clear()
      stores.playlists.clear()
    })
  }

  async function clearSongsAndMusicData(playlistRows = []) {
    await adapter.transaction(['songs', 'musicData', 'playlists'], (stores) => {
      stores.songs.clear()
      stores.musicData.clear()
      stores.playlists.clear()
      for (const playlist of playlistRows) stores.playlists.put(playlist)
    })
  }

  async function saveBackupMerge({ favorites, recentSongs, stats, playlists }) {
    await adapter.transaction(['musicData', 'playlists'], (stores) => {
      stores.musicData.put({ key: 'favorites', value: favorites })
      stores.musicData.put({ key: 'recentSongIds', value: recentSongs })
      if (stats) stores.musicData.put({ key: 'listeningStats', value: stats })
      for (const playlist of playlists) stores.playlists.put(playlist)
    })
  }

  return {
    saveSong,
    getSongs,
    deleteSong,
    deleteSongs,
    saveMusicData,
    getMusicData,
    clearAll
    ,clearSongsAndMusicData
    ,saveBackupMerge
  }
}
