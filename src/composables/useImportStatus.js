// src/composables/useImportStatus.js
/**
 * 导入进度（模块级单例）
 * 导入可能几百个文件，界面需要能看到进度、能取消
 */
import { reactive } from "vue";

export const importState = reactive({
  active: false,
  done: 0,
  total: 0,
  cancelled: false,
  cancelRequested: false,
  failed: [],
});

export function useImportStatus() {
  return { importState };
}
