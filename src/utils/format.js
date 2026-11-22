// src/utils/format.js
/**
 * 通用格式化函数
 * 之前 formatTime / formatBytes 在多个组件里各写了一份，这里统一
 */

// 秒 → m:ss（或 h:mm:ss）；invalidFallback 用于没有时长信息的情况
export function formatTime(seconds, invalidFallback = "--:--") {
  if (!Number.isFinite(seconds) || seconds < 0) return invalidFallback;

  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${m}:${String(s).padStart(2, "0")}`;
}

// 字节 → 人类可读大小
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

// 时间戳 → 2026/11/22
export function formatDate(timestamp) {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleDateString("zh-CN");
}

// 时间戳 → 2026/11/22 23:04:14
export function formatDateTime(timestamp) {
  if (!timestamp) return "未知";

  return new Date(timestamp).toLocaleString("zh-CN");
}

// 秒数 → 口语化时长（统计页用：3 小时 12 分 / 25 分 30 秒）
export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  if (total < 60) return `${total} 秒`;

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  return `${minutes} 分 ${total % 60} 秒`;
}
