<script setup>
// 应用骨架：侧边栏 + 路由出口 + 播放条
// 页面注册已交给 src/router/index.js，这里不再维护 viewMap
import Sidebar from "@/components/Sidebar.vue";
import PlayerBar from "@/components/player/PlayerBar.vue";
</script>

<template>
  <div class="app-layout">
    <div class="app-body">
      <Sidebar />
      <router-view />
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
