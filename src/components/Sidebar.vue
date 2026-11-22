<script setup>
// 侧边栏导航：只负责切页与“创建歌单”入口
// 注意：「搜索」入口目前是占位，等功能实现后再接上
import {
  Home,
  Search,
  Library,
  Heart,
  ListMusic,
  Plus,
  Music2,
  Clock3,
  Download,
  Settings,
} from "lucide-vue-next";
import { useNavigation } from "@/composables/useNavigation";
import { usePlaylistActions } from "@/composables/usePlaylistActions";
import { useConfirm } from "@/composables/useConfirm";
import { usePlaylistStore } from "@/stores/playlist";
import { storeToRefs } from "pinia";

const { currentPage, params, navigateTo } = useNavigation();
const { createPlaylist } = usePlaylistActions();
const { prompt } = useConfirm();

// 侧边栏「我的音乐库」下方直接列出已创建的歌单
const { playlists } = storeToRefs(usePlaylistStore());

// 侧边栏「+」：直接建歌单并跳到该歌单详情
async function handleCreatePlaylist() {
  const name = await prompt({
    title: "新建歌单",
    value: "新建歌单",
    placeholder: "歌单名称",
    confirmText: "创建",
  });
  if (name === null) return;

  const playlist = await createPlaylist(name);
  navigateTo("playlists", { id: playlist.id });
}
</script>

<template>
  <aside class="sidebar">
    <div
      class="brand"
      role="button"
      tabindex="0"
      title="返回首页"
      @click="navigateTo('home')"
      @keydown.enter="navigateTo('home')"
    >
      <Music2 :size="28" />
      <span>竹</span>
    </div>

    <div class="sidebar-scroll">
      <nav class="nav-menu">
      <a
        class="nav-item"
        :class="{ active: currentPage === 'home' }"
        href="#"
        @click.prevent="navigateTo('home')"
      >
        <Home :size="21" /><span>首页</span>
      </a>
      <a
        class="nav-item"
        :class="{ active: currentPage === 'recent-played' }"
        href="#"
        @click.prevent="navigateTo('recent-played')"
      >
        <Clock3 :size="21" /><span>最近播放</span>
      </a>
      <a
        class="nav-item"
        :class="{ active: currentPage === 'recent-imported' }"
        href="#"
        @click.prevent="navigateTo('recent-imported')"
      >
        <Download :size="21" /><span>最近导入</span>
      </a>
      <a
        class="nav-item"
        :class="{ active: currentPage === 'search' }"
        href="#"
        @click.prevent="navigateTo('search')"
      >
        <Search :size="21" /><span>搜索</span>
      </a>
    </nav>

    <div class="library-section">
      <div class="library-header">
        <div
          class="library-title"
          :class="{ active: currentPage === 'library' }"
          @click="navigateTo('library')"
          style="cursor: pointer"
        >
          <Library :size="21" /><span>我的音乐库</span>
        </div>
        <button
          class="icon-button"
          title="创建歌单"
          @click="handleCreatePlaylist"
        >
          <Plus :size="19" />
        </button>
      </div>

      <a
        class="nav-item"
        :class="{ active: currentPage === 'favorites' }"
        href="#"
        @click.prevent="navigateTo('favorites')"
      >
        <Heart :size="21" /><span>喜欢的音乐</span>
      </a>
      <a
        class="nav-item"
        :class="{ active: currentPage === 'playlists' }"
        href="#"
        @click.prevent="navigateTo('playlists')"
      >
        <ListMusic :size="21" /><span>我的歌单</span>
      </a>

      <!-- 已创建的歌单：点击直接进入对应歌单 -->
      <div v-if="playlists.length > 0" class="playlist-nav">
        <a
          v-for="playlist in playlists"
          :key="playlist.id"
          class="playlist-item"
          :class="{
            active: currentPage === 'playlists' && params.id === playlist.id,
          }"
          href="#"
          :title="playlist.name"
          @click.prevent="navigateTo('playlists', { id: playlist.id })"
        >
          <span class="playlist-name">{{ playlist.name }}</span>
          <span class="playlist-count">{{ playlist.songIds.length }}</span>
        </a>
      </div>
    </div>
  </div>

    <!-- 底部：设置入口 -->
    <div class="sidebar-footer">
      <a
        class="nav-item"
        :class="{ active: currentPage === 'settings' }"
        href="#"
        @click.prevent="navigateTo('settings')"
      >
        <Settings :size="21" /><span>设置</span>
      </a>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  min-width: 240px;
  height: 100%;
  padding: 24px 16px;
  /* 原来是纯黑 #000，和 #121212 的内容区并排像两块拼板；
     改成与内容区同色，靠留白和内边距区分层级 */
  background: #121212;
  display: flex;
  flex-direction: column;
  gap: 20px;
  /* 窗口变矮时，中间导航区自己滚动，品牌与设置保持可见 */
  overflow: hidden;
}

.sidebar-scroll {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 32px;
  overflow-y: auto;
  overflow-x: hidden;
  /* 给滚动条留一点空间，避免遮住文字 */
  padding-right: 2px;
}

.sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: #4a4a4a;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  color: #1ed760;
  font-size: 23px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.15s ease;
}

.brand:hover {
  opacity: 0.8;
}

.brand:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
  border-radius: 6px;
}

.nav-menu,
.library-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-footer {
  margin-top: auto;
}

/* 已创建的歌单列表（跟随中间区域一起滚动） */
.playlist-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
}

.playlist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px 7px 12px;
  border-radius: 6px;
  color: #a3a3a3;
  font-size: 13px;
  text-decoration: none;
  transition: 0.15s ease;
}

.playlist-item:hover {
  background: #1f1f1f;
  color: #fff;
}

.playlist-item.active {
  background: #242424;
  color: #fff;
}

.playlist-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-count {
  flex-shrink: 0;
  color: #777;
  font-size: 11px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 10px;
  border-radius: 6px;
  color: #b3b3b3;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: 0.2s;
}

.nav-item:hover {
  color: #fff;
}

.nav-item.active {
  color: #fff;
}

.library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 8px;
}

.library-title {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 10px;
  margin: -12px -10px;
  border-radius: 6px;
  color: #b3b3b3;
  font-size: 14px;
  font-weight: 600;
  transition: 0.2s;
}

.library-title:hover {
  color: #fff;
}

.library-title.active {
  color: #fff;
}

.icon-button {
  border: none;
  background: transparent;
  color: #b3b3b3;
  padding: 5px;
  cursor: pointer;
}

.icon-button:hover {
  color: #fff;
}

/* 手机端：收缩侧边栏 */
@media (max-width: 700px) {
  .sidebar {
    width: 64px;
    min-width: 64px;
    padding: 20px 6px;
    gap: 24px;
    align-items: center;
  }

  .brand {
    justify-content: center;
    padding: 0;
  }

  .brand span {
    display: none;
  }

  .nav-menu,
  .library-section {
    width: 100%;
    align-items: center;
  }

  /* 图标栏模式下，滚动区域也要撑满宽度 */
  .sidebar-scroll {
    width: 100%;
    align-items: center;
  }

  .nav-item {
    width: 100%;
    justify-content: center;
    gap: 0;
    padding: 12px 0;
  }

  .nav-item span {
    display: none;
  }

  .library-header {
    width: 100%;
    justify-content: center;
    padding: 0;
    margin-bottom: 0;
  }

  /* 手机端侧栏只剩图标，隐藏歌单列表 */
  .playlist-nav {
    display: none;
  }

  .library-title {
    justify-content: center;
  }

  .library-title span,
  .icon-button {
    display: none;
  }
}
</style>
