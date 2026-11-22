/**
 * 歌曲对象工厂
 * 负责：校验文件类型、生成数据模型
 * 注意：这里不创建 blob 地址 —— 播放地址由 services/assetUrls.js 按需创建，
 * 封面地址由组件里的 useObjectUrl 按需创建，避免上万首歌常驻 URL
 */
import { createSongModel } from "../models/song";

// 创建歌曲信息
export function createSong(file, metadata = {}) {
  if (!file) {
    throw new Error("音乐文件不能为空");
  }

  if (!file.type.startsWith("audio/")) {
    throw new Error("请选择有效的音频文件");
  }

  return createSongModel(file, metadata);
}
