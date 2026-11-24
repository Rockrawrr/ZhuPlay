// src/app/appState.js
/**
 * 应用级状态（模块单例）
 * appReady：启动恢复（曲库 / 收藏 / 最近播放 / 歌单）完成后置为 true，
 * 页面在恢复期间显示骨架屏，避免"先闪一下空状态再出现内容"
 */
import { ref } from "vue";

export const appReady = ref(false);
