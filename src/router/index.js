/**
 * 路由表
 * 用 hash 模式（#/library）：Electron 用 file:// 加载时不需要服务端回退配置，
 * 刷新也不会 404，桌面封装时最省事
 */
import { ref } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";

import Home from "@/views/Home.vue";
import Library from "@/views/Library.vue";
import Favorites from "@/views/Favorites.vue";
import RecentPlayed from "@/views/RecentPlayed.vue";
import RecentImported from "@/views/RecentImported.vue";
import Playlists from "@/views/Playlists.vue";
import Search from "@/views/Search.vue";
import Settings from "@/views/Settings.vue";

export const routes = [
  { path: "/", name: "home", component: Home },
  { path: "/library", name: "library", component: Library },
  { path: "/favorites", name: "favorites", component: Favorites },
  { path: "/recent-played", name: "recent-played", component: RecentPlayed },
  { path: "/recent-imported", name: "recent-imported", component: RecentImported },
  // 歌单详情用可选参数：/playlists 是列表，/playlists/xxx 是详情
  { path: "/playlists/:id?", name: "playlists", component: Playlists },
  { path: "/search", name: "search", component: Search },
  { path: "/settings", name: "settings", component: Settings },
  // 未知路径回首页
  { path: "/:pathMatch(.*)*", redirect: { name: "home" } },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// 前进/后退是否可用由 history.state 决定，这里同步成响应式状态供 UI 使用
export const navigationState = {
  canGoBack: ref(false),
  canGoForward: ref(false),
};

router.afterEach(() => {
  const state = window.history.state ?? {};
  navigationState.canGoBack.value = Boolean(state.back);
  navigationState.canGoForward.value = Boolean(state.forward);
});
