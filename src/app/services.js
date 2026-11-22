// src/app/services.js
/**
 * 服务单例工厂
 * 为什么写成单例：<audio> 元素、IndexedDB 连接、存储门面都应该全应用只创建一次，
 * 否则会出现多个音频实例互相打断、连接重复打开等问题
 */
import { createMusicStorage } from "@/storage/musicStorage";
import { createPlaylistStorage } from "@/storage/playlistStorage";
import { createAudioService } from "@/services/audioService";

let _musicStorage = null;
let _playlistStorage = null;
let _audioService = null;

// 音乐存储单例：整个应用只创建一次
export function getMusicStorage() {
  if (!_musicStorage) {
    _musicStorage = createMusicStorage();
  }
  return _musicStorage;
}

// 歌单存储单例
export function getPlaylistStorage() {
  if (!_playlistStorage) {
    _playlistStorage = createPlaylistStorage();
  }
  return _playlistStorage;
}

// 音频服务单例：整个应用只创建一个 <audio>
export function getAudioService() {
  if (!_audioService) {
    _audioService = createAudioService();
  }
  return _audioService;
}
