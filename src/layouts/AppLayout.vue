<script setup>
// 应用骨架：侧边栏 + 当前页 + 播放条
// viewMap 是当前的“页面注册表”，新增页面时要在这里加一条，并在 Sidebar 加入口；
// 接入 vue-router 后这层会被路由替换
import { computed } from "vue";
import { useNavigation } from "@/composables/useNavigation";
import Sidebar from "@/components/Sidebar.vue";
import PlayerBar from "@/components/player/PlayerBar.vue";
import Home from "@/views/Home.vue";
import Library from "@/views/Library.vue";
import Favorites from "@/views/Favorites.vue";
import RecentPlayed from "@/views/RecentPlayed.vue";
import RecentImported from "@/views/RecentImported.vue";
import Playlists from "@/views/Playlists.vue";

const viewMap = {
  home: Home,
  library: Library,
  favorites: Favorites,
  "recent-played": RecentPlayed,
  "recent-imported": RecentImported,
  playlists: Playlists,
};

const { currentPage } = useNavigation();
const currentView = computed(() => viewMap[currentPage.value] ?? Home);
</script>

<template>
  <div class="app-layout">
    <div class="app-body">
      <Sidebar />
      <component :is="currentView" />
    </div>
    <PlayerBar />
  </div>
</template>

<style scoped>
.app-layout {
  width: 100%;
  height: 100vh;
  min-height: 500px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #121212;
}

.app-body {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 8px;
  padding: 8px 8px 0;
  overflow: hidden;
  box-sizing: border-box;
}
</style>
