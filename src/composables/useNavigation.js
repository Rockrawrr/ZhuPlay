/**
 * 导航门面（基于 vue-router）
 * 页面只依赖这里的 currentPage / navigateTo / goBack，不直接 import vue-router；
 * 这样以后换路由方案或加过渡动画时，改动集中在一处
 */
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { navigationState } from "@/router";

export function useNavigation() {
  const route = useRoute();
  const router = useRouter();

  // 当前页面名（与路由 name 一致，Sidebar 用它做高亮）
  const currentPage = computed(() => route.name ?? "home");

  // 路由参数（歌单详情用 :id）
  const params = computed(() => route.params);

  function navigateTo(name, routeParams) {
    const target = routeParams ? { name, params: routeParams } : { name };

    // 用解析后的完整路径判断，避免“歌单详情 → 歌单列表”被误判为同一页而跳过
    if (router.resolve(target).fullPath === route.fullPath) return;

    router.push(target);
  }

  function goBack() {
    if (navigationState.canGoBack.value) router.back();
  }

  function goForward() {
    if (navigationState.canGoForward.value) router.forward();
  }

  return {
    currentPage,
    params,
    canGoBack: navigationState.canGoBack,
    canGoForward: navigationState.canGoForward,
    navigateTo,
    goBack,
    goForward,
  };
}
