// src/app/services.js
import { createMusicStorage } from "@/storage/musicStorage";
import { createAudioService } from "@/services/audioService";

let _musicStorage = null;
let _audioService = null;

// 音乐存储单例：整个应用只创建一次
export function getMusicStorage() {
  if (!_musicStorage) {
    _musicStorage = createMusicStorage();
  }
  return _musicStorage;
}

// 音频服务单例：整个应用只创建一个 <audio>
export function getAudioService() {
  if (!_audioService) {
    _audioService = createAudioService();
  }
  return _audioService;
}
