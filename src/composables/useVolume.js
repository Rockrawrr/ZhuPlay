// src/composables/useVolume.js
/**
 * 音量控制
 * 职责：把 store 的音量/静音状态同步到 <audio>，并持久化（拖动时防抖写入）
 * 注意：静音状态下拖动滑块会自动解除静音，避免“拖了没声音”的困惑
 */
import { usePlayerStore } from "@/stores/player";
import { getAudioService, getMusicStorage } from "@/app/services";
import { STORAGE_KEYS } from "@/storage/keys";

const VOLUME_KEY = STORAGE_KEYS.volume;

// 拖动滑块会连续触发，写入做 300ms 防抖
const SAVE_DELAY = 300;
let saveTimer = null;

function clampVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(Math.max(number, 0), 1);
}

// 音量控制：store 存状态，audioService 落到 <audio>，IndexedDB 持久化
export function useVolume() {
  const playerStore = usePlayerStore();
  const audioService = getAudioService();
  const musicStorage = getMusicStorage();

  // 把 store 的音量状态应用到 <audio> 元素
  function applyVolume() {
    audioService.setVolume(playerStore.volume);
    audioService.setMuted(playerStore.isMuted);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      musicStorage
        .saveMusicData(VOLUME_KEY, {
          value: playerStore.volume,
          muted: playerStore.isMuted,
        })
        .catch((error) => console.error("音量保存失败：", error));
    }, SAVE_DELAY);
  }

  // 设置音量：静音状态下拖动会顺带解除静音
  function setVolume(value) {
    playerStore.setVolume(clampVolume(value));

    if (playerStore.isMuted && playerStore.volume > 0) {
      playerStore.setMuted(false);
    }

    applyVolume();
    scheduleSave();
  }

  // 切换静音
  function toggleMute() {
    playerStore.toggleMute();
    applyVolume();
    scheduleSave();
  }

  // 启动时恢复上次的音量/静音状态
  async function restoreVolume() {
    try {
      const saved = await musicStorage.getMusicData(VOLUME_KEY, null);

      if (saved) {
        playerStore.setVolume(clampVolume(saved.value ?? 1));
        playerStore.setMuted(Boolean(saved.muted));
      }
    } catch (error) {
      console.error("音量恢复失败：", error);
    } finally {
      applyVolume();
    }
  }

  return { setVolume, toggleMute, restoreVolume, applyVolume };
}
