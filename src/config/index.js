// src/config/index.js
// 平台检测：web / electron / tauri
const isElectron = typeof window !== "undefined" && !!window.electronAPI;
const isTauri = typeof window !== "undefined" && !!window.__TAURI__;

export const PLATFORM = isElectron ? "electron" : isTauri ? "tauri" : "web";

export const config = {
  platform: PLATFORM,
  storage: { adapter: "indexedDB" },
  audio: { service: "html5" },
};
