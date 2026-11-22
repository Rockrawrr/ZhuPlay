// src/stores/index.js
// 统一出口：将来按领域继续拆 store 时，外部 import 路径不用跟着改
export { useMusicStore } from "./music";
export { usePlayerStore } from "./player";
export { usePlaylistStore } from "./playlist";
