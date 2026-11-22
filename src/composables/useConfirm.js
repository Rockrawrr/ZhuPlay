// src/composables/useConfirm.js
/**
 * 统一确认 / 输入对话框（模块级单例）
 * 为什么要它：window.confirm 样式割裂，window.prompt 在 Electron 里直接不可用；
 * 这里提供 Promise 化的 confirm() / prompt()，调用方 await 即可，替换成本极低
 *
 * 用法：
 *   const { confirm, prompt } = useConfirm()
 *   if (!(await confirm({ title: "删除歌曲", message: "不可恢复", danger: true }))) return
 *   const name = await prompt({ title: "新建歌单", value: "新建歌单" })
 *   if (name === null) return
 */
import { reactive } from "vue";

const state = reactive({
  visible: false,
  // confirm | prompt
  mode: "confirm",
  title: "",
  message: "",
  confirmText: "确定",
  cancelText: "取消",
  danger: false,
  value: "",
  placeholder: "",
  // 内部保存当前 Promise 的 resolve
  _resolve: null,
});

function open(options = {}) {
  return new Promise((resolve) => {
    state.mode = options.mode ?? "confirm";
    state.title = options.title ?? "";
    state.message = options.message ?? "";
    state.confirmText = options.confirmText ?? "确定";
    state.cancelText = options.cancelText ?? "取消";
    state.danger = Boolean(options.danger);
    state.value = options.value ?? "";
    state.placeholder = options.placeholder ?? "";
    state._resolve = resolve;
    state.visible = true;
  });
}

// 关闭并以 result 结算：confirm 用 true/false，prompt 用 string/null
function settle(result) {
  const resolve = state._resolve;
  state._resolve = null;
  state.visible = false;
  if (resolve) resolve(result);
}

export function useConfirm() {
  return {
    state,
    confirm: (options) => open({ ...options, mode: "confirm" }),
    prompt: (options) => open({ ...options, mode: "prompt" }),
    settle,
  };
}
