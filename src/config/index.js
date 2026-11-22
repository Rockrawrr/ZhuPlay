// src/config/index.js
// 注意：这里的平台探测目前只有定义，尚未被业务代码引用。
// 封装桌面端时由 platform/ 消费，决定文件选择、系统通知、窗口控制走哪套实现。
// 平台检测：web / electron / tauri
const isElectron = typeof window !== "undefined" && !!window.electronAPI;
const isTauri = typeof window !== "undefined" && !!window.__TAURI__;

export const PLATFORM = isElectron ? "electron" : isTauri ? "tauri" : "web";

export const config = {
  platform: PLATFORM,
  storage: { adapter: "indexedDB" },
  audio: { service: "html5" },
};
