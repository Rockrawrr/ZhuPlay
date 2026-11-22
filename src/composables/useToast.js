// src/composables/useToast.js
/**
 * 轻量提示层（模块级单例）
 * 为什么需要：持久化失败、导入完成、歌单操作这些操作原来只有 console，
 * 用户在界面上看不到任何反馈
 * 用法：const toast = useToast(); toast.success("已保存")
 */
import { reactive } from "vue";

// 同时存在的提示列表，由 AppToast 组件渲染
const toasts = reactive([]);

let seed = 0;

function remove(id) {
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index !== -1) toasts.splice(index, 1);
}

function show(message, options = {}) {
  const { type = "info", duration = 2600 } = options;
  const id = ++seed;

  toasts.push({ id, message, type });

  // duration <= 0 表示不自动消失（错误提示可以这样用）
  if (duration > 0) {
    setTimeout(() => remove(id), duration);
  }

  return id;
}

export function useToast() {
  return {
    toasts,
    show,
    remove,
    success: (message, options) => show(message, { ...options, type: "success" }),
    error: (message, options) => show(message, { ...options, type: "error" }),
    info: (message, options) => show(message, { ...options, type: "info" }),
  };
}
