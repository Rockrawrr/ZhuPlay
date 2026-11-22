// src/composables/useOverlays.js
/**
 * 全局浮层的开关状态（模块级单例）
 * 这里集中三个最"薄"的浮层：
 *   useContextMenu    —— 右键菜单（坐标 + 菜单项）
 *   usePlaylistPicker —— 「添加到歌单」弹窗（当前歌曲）
 *   useSongInfo       —— 「歌曲信息」弹窗（当前歌曲）
 * 三个状态互不相关，但都属于"全局唯一、任何页面都能打开"的浮层，
 * 拆成三个 20 行的文件反而更难找，所以放一起
 */
import { reactive } from "vue";

// ===== 右键菜单 =====

const menuState = reactive({
  visible: false,
  x: 0,
  y: 0,
  items: [],
  // 键盘导航用的高亮下标
  activeIndex: -1,
});

function openMenu(event, items = []) {
  if (!items.length) return;

  menuState.items = items;
  menuState.x = event.clientX ?? 0;
  menuState.y = event.clientY ?? 0;
  menuState.activeIndex = -1;
  menuState.visible = true;
}

function closeMenu() {
  menuState.visible = false;
  menuState.items = [];
  menuState.activeIndex = -1;
}

export function useContextMenu() {
  return { state: menuState, open: openMenu, close: closeMenu };
}

// ===== 「添加到歌单」弹窗 =====

const pickerState = reactive({
  // 当前要添加的歌曲，null 表示弹窗关闭
  // 要添加的歌曲列表（单选时长度为 1）
  songs: [],
});

// 支持传单首歌曲或歌曲数组（批量操作）
function openPlaylistPicker(input) {
  if (!input) return;

  const list = Array.isArray(input) ? input.filter(Boolean) : [input];
  if (list.length === 0) return;

  pickerState.songs = list;
}

function closePlaylistPicker() {
  pickerState.songs = [];
}

export function usePlaylistPicker() {
  return { state: pickerState, openPlaylistPicker, closePlaylistPicker };
}

// ===== 「歌曲信息」弹窗 =====

const infoState = reactive({
  song: null,
});

function openSongInfo(song) {
  if (!song) return;
  infoState.song = song;
}

function closeSongInfo() {
  infoState.song = null;
}

export function useSongInfo() {
  return { state: infoState, openSongInfo, closeSongInfo };
}
