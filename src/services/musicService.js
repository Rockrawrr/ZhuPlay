import { createSongModel } from '../models/song'

// 创建歌曲信息
export function createSong(file, metadata = {}) {
  if (!file) {
    throw new Error('音乐文件不能为空')
  }

  if (!file.type.startsWith('audio/')) {
    throw new Error('请选择有效的音频文件')
  }

  // 创建标准歌曲对象
  const song = createSongModel(file, metadata)

  // 创建音乐播放地址
  song.url = URL.createObjectURL(file)

  // 创建专辑封面地址
  if (song.cover) {
    song.coverUrl = URL.createObjectURL(song.cover)
  }

  return song
}

// 释放歌曲资源
export function releaseSong(song) {
  if (!song) return

  // 释放音乐播放地址
  if (song.url) {
    URL.revokeObjectURL(song.url)
  }

  // 释放专辑封面地址
  if (song.coverUrl) {
    URL.revokeObjectURL(song.coverUrl)
  }
}