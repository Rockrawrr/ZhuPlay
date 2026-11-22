/**
 * 页面导航（内存态，模块级共享）
 * 现状：只有一个当前页 + 后退栈，刷新会回到首页
 * 计划：接入 vue-router 后这里退化为路由封装，调用方式尽量保持不变
 */
import { ref, computed } from "vue";

// ===== 模块级状态（全应用共享一份）=====
const currentPage = ref("home");
const navigationHistory = ref([]);
const canGoBack = computed(() => navigationHistory.value.length > 0);

function navigateTo(page) {
  if (page === currentPage.value) return;
  navigationHistory.value.push(currentPage.value);
  currentPage.value = page;
}

function goBack() {
  if (navigationHistory.value.length === 0) return;
  currentPage.value = navigationHistory.value.pop();
}

// ===== 对外暴露：任意组件调用都拿到同一份状态 =====
export function useNavigation() {
  return {
    currentPage,
    canGoBack,
    navigationHistory,
    navigateTo,
    goBack,
  };
}
