// src/utils/persist.js
/**
 * 持久化容错：写入失败时统一打日志 + 可选提示
 * 之前每个 composable 都手写一遍 try/catch + toast.error，这里收口
 */
export async function persistSafely(action, options = {}) {
  const { logLabel = "持久化失败", toast = null, errorMessage = "" } = options;

  try {
    await action();
    return true;
  } catch (error) {
    console.error(`${logLabel}：`, error);
    if (toast && errorMessage) toast.error(errorMessage);
    return false;
  }
}
