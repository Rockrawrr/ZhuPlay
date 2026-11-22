<script setup>
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
} from "lucide-vue-next";

defineProps({
  currentPage: {
    type: String,
    default: "home",
  },
});

const emit = defineEmits(["navigate"]);
</script>

<template>
  <aside class="sidebar">
    <!-- 品牌区域 -->
    <div class="brand">
      <Music2 :size="28" />
      <span>竹</span>
    </div>

    <!-- 主导航 -->
    <nav class="nav-menu">
      <!-- 首页 -->
      <a
        class="nav-item"
        :class="{ active: currentPage === 'home' }"
        href="#"
        @click.prevent="emit('navigate', 'home')"
      >
        <Home :size="21" />
        <span>首页</span>
      </a>

      <!-- 最近播放 -->
      <a
        class="nav-item"
        :class="{ active: currentPage === 'recent-played' }"
        href="#"
        @click.prevent="emit('navigate', 'recent-played')"
      >
        <Clock3 :size="21" />
        <span>最近播放</span>
      </a>

      <a
        class="nav-item"
        :class="{ active: currentPage === 'recent-imported' }"
        href="#"
        @click.prevent="emit('navigate', 'recent-imported')"
      >
        <Download :size="21" />
        <span>最近导入</span>
      </a>

      <!-- 搜索 -->
      <a class="nav-item" href="#">
        <Search :size="21" />
        <span>搜索</span>
      </a>
    </nav>

    <!-- 音乐库 -->
    <div class="library-section">
      <div class="library-header">
        <div
          class="library-title"
          :class="{ active: currentPage === 'library' }"
          @click="emit('navigate', 'library')"
          style="cursor: pointer"
        >
          <Library :size="21" />
          <span>我的音乐库</span>
        </div>

        <button class="icon-button" title="创建歌单">
          <Plus :size="19" />
        </button>
      </div>

      <!-- 喜欢的音乐 -->
      <a
        class="nav-item"
        :class="{ active: currentPage === 'favorites' }"
        href="#"
        @click.prevent="emit('navigate', 'favorites')"
      >
        <Heart :size="21" />
        <span>喜欢的音乐</span>
      </a>

      <!-- 我的歌单 -->
      <a class="nav-item" href="#" @click.prevent="emit('navigate', 'library')">
        <ListMusic :size="21" />
        <span>我的歌单</span>
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
  background: #000;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  color: #1ed760;
  font-size: 23px;
  font-weight: 700;
}

.nav-menu,
.library-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

  .library-title {
    justify-content: center;
  }

  .library-title span,
  .icon-button {
    display: none;
  }
}
</style>
