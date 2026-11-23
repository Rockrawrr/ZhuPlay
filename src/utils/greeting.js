// src/utils/greeting.js
/**
 * 首页问候语：按小时返回
 * 早上 05–11 / 中午 11–13 / 下午 13–18 / 晚上 18–05（含凌晨）
 */

export function greetingForHour(hour) {
  const value = Number(hour);

  if (!Number.isFinite(value)) return "你好";

  if (value >= 5 && value < 11) return "早上好";
  if (value >= 11 && value < 13) return "中午好";
  if (value >= 13 && value < 18) return "下午好";
  return "晚上好";
}

// 当前时间的问候语
export function currentGreeting(date = new Date()) {
  return greetingForHour(date.getHours());
}
