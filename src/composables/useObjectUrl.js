// src/composables/useObjectUrl.js
/**
 * 把 Blob 转成 objectURL，并在组件卸载时自动回收
 * 用途：封面不再在导入/启动时批量创建 URL（上万首会占大量内存），
 * 而是每个可见的封面自己创建、卸载即释放
 */
import { onUnmounted, ref, watch } from "vue";

export function useObjectUrl(source) {
  const url = ref("");
  const getBlob = typeof source === "function" ? source : () => source;

  function revoke() {
    if (!url.value) return;
    URL.revokeObjectURL(url.value);
    url.value = "";
  }

  watch(
    getBlob,
    (blob) => {
      revoke();
      if (blob instanceof Blob) url.value = URL.createObjectURL(blob);
    },
    { immediate: true },
  );

  onUnmounted(revoke);

  return url;
}
