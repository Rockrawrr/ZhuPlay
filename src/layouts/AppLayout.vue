<script setup>
import { computed } from "vue";
import { useNavigation } from "@/composables/useNavigation";
import Sidebar from "@/components/Sidebar.vue";
import MusicPlayer from "@/components/MusicPlayer.vue";
import Home from "@/views/Home.vue";
import Library from "@/views/Library.vue";
import Favorites from "@/views/Favorites.vue";
import RecentPlayed from "@/views/RecentPlayed.vue";
import RecentImported from "@/views/RecentImported.vue";

const viewMap = {
  home: Home,
  library: Library,
  favorites: Favorites,
  "recent-played": RecentPlayed,
  "recent-imported": RecentImported,
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
    <MusicPlayer />
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
