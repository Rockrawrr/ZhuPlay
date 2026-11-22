<script setup>
import Sidebar from "../components/Sidebar.vue";
import Home from "../views/Home.vue";
import Library from "../views/Library.vue";
import Favorites from "../views/Favorites.vue";
import RecentPlayed from "../views/RecentPlayed.vue";
import RecentImported from "../views/RecentImported.vue";
import MusicPlayer from "../components/MusicPlayer.vue";

defineProps({
  currentPage: String,
  pageData: Object,
  pageActions: Object,
  playerProps: Object,
  playerActions: Object,
});

defineEmits(["navigate"]);
</script>

<template>
  <div class="app-layout">
    <div class="app-body">
      <Sidebar
        :current-page="currentPage"
        @navigate="$emit('navigate', $event)"
      />

      <Home
        v-if="currentPage === 'home'"
        v-bind="pageData.home"
        v-on="pageActions.home"
      />

      <RecentPlayed
        v-else-if="currentPage === 'recent-played'"
        v-bind="pageData.recentPlayed"
        v-on="pageActions.recentPlayed"
      />

      <RecentImported
        v-else-if="currentPage === 'recent-imported'"
        v-bind="pageData.recentImported"
        v-on="pageActions.recentImported"
      />

      <Library
        v-else-if="currentPage === 'library'"
        v-bind="pageData.library"
        v-on="pageActions.library"
      />

      <Favorites
        v-else-if="currentPage === 'favorites'"
        v-bind="pageData.favorites"
        v-on="pageActions.favorites"
      />
    </div>

    <MusicPlayer v-bind="playerProps" v-on="playerActions" />
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
