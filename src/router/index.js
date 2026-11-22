/**
 * 路由表
 * 用 hash 模式（#/library）：Electron 用 file:// 加载时不需要服务端回退配置，
 * 刷新也不会 404，桌面封装时最省事
 */
import { ref } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";

import Home from "@/views/Home.vue";

// 首屏只加载首页，其余页面按需加载，首屏 JS 明显更小
const Library = () => import("@/views/Library.vue");
const Favorites = () => import("@/views/Favorites.vue");
const RecentPlayed = () => import("@/views/RecentPlayed.vue");
const RecentImported = () => import("@/views/RecentImported.vue");
const Playlists = () => import("@/views/Playlists.vue");
const Search = () => import("@/views/Search.vue");
const Settings = () => import("@/views/Settings.vue");
const Stats = () => import("@/views/Stats.vue");

export const routes = [
  { path: "/", name: "home", component: Home },
  { path: "/library", name: "library", component: Library },
  { path: "/favorites", name: "favorites", component: Favorites },
  { path: "/recent-played", name: "recent-played", component: RecentPlayed },
  {
    path: "/recent-imported",
    name: "recent-imported",
    component: RecentImported,
  },
  // 歌单详情用可选参数：/playlists 是列表，/playlists/xxx 是详情
  { path: "/playlists/:id?", name: "playlists", component: Playlists },
  { path: "/search", name: "search", component: Search },
  { path: "/stats", name: "stats", component: Stats },
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
