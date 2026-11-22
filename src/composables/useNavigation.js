import { ref, computed } from "vue";

// 页面导航管理
export function useNavigation() {
  // 当前显示的页面
  const currentPage = ref("home");

  // 页面导航历史
  const navigationHistory = ref([]);

  // 是否可以返回上一页
  const canGoBack = computed(() => navigationHistory.value.length > 0);

  // 页面跳转并记录历史
  function navigateTo(page) {
    if (page === currentPage.value) return;

    navigationHistory.value.push(currentPage.value);
    currentPage.value = page;
  }

  // 返回上一页
  function goBack() {
    if (navigationHistory.value.length === 0) return;

    currentPage.value = navigationHistory.value.pop();
  }

  return {
    currentPage,
    canGoBack,
    navigationHistory,
    navigateTo,
    goBack,
  };
}
