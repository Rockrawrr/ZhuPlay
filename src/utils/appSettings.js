// src/utils/appSettings.js
/**
 * 轻量应用设置（localStorage）
 * pathOnly：桌面端「仅保存路径」——导入时不把音频复制进 IndexedDB
 */
import { ref } from "vue";

const PATH_ONLY_KEY = "zhuplay:path-only";

export const pathOnly = ref(localStorage.getItem(PATH_ONLY_KEY) === "1");

export function setPathOnly(enabled) {
  pathOnly.value = Boolean(enabled);
  localStorage.setItem(PATH_ONLY_KEY, pathOnly.value ? "1" : "0");
}
