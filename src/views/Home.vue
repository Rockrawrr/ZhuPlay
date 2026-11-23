<script setup>
// 首页：快捷入口 + 为你推荐 + 最近导入 + 最近播放
// 三个内容区块已拆到 components/home/ 下，这里只保留装配与快捷入口
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { ArrowLeft, ArrowRight, Clock3, Music2, Play } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useMusicActions } from "@/composables/useMusicActions";
import { useNavigation } from "@/composables/useNavigation";
import HomeAlbumGrid from "@/components/home/HomeAlbumGrid.vue";
import HomeRecentList from "@/components/home/HomeRecentList.vue";
import { currentGreeting } from "@/utils/greeting";

const albums = [
  { id: 1, title: "最近播放", description: "继续聆听你的音乐" },
  { id: 2, title: "最近导入", description: "查看最新添加的歌曲" },
  { id: 4, title: "我的收藏", description: "收藏的音乐都在这里" },
  { id: 6, title: "全部歌曲", description: "浏览你的本地音乐" },
];

const musicStore = useMusicStore();
const { songs, recentSongs, recentImportedSongs, favoriteSongsList } =
  storeToRefs(musicStore);

const { playSong } = useAudioPlayer();
const { clearRecentSongs } = useMusicActions();
const { canGoBack, canGoForward, goBack, goForward, navigateTo } = useNavigation();

// ===== 问候语 =====
const greeting = ref(currentGreeting());
let greetingTimer = null;

// ===== 右上角「访客用户」菜单 =====
const showProfileMenu = ref(false);
const appVersion = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "1.1.0";

function toggleProfileMenu() {
  showProfileMenu.value = !showProfileMenu.value;
}

function closeProfileMenu() {
  showProfileMenu.value = false;
}

function handleDocumentClick() {
  closeProfileMenu();
}

function handleEscape(event) {
  if (event.key === "Escape") closeProfileMenu();
}

function goSettings() {
  closeProfileMenu();
  navigateTo("settings");
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  window.addEventListener("keydown", handleEscape);

  // 每分钟刷新一次问候语，跨时段（如 11:00 中午）时自动变化
  greetingTimer = setInterval(() => {
    greeting.value = currentGreeting();
  }, 60_000);
});

onUnmounted(() => {
  document.removeEventListener("click", handleDocumentClick);
  window.removeEventListener("keydown", handleEscape);

  if (greetingTimer) clearInterval(greetingTimer);
});

// ===== 收藏 =====

// 收藏 ID 集合，供推荐卡片快速判断
const favoriteIds = computed(
  () => new Set(favoriteSongsList.value.map((song) => song.id)),
);

// 首页精选：先收藏、再其它，最多 6 首
const featuredSongs = computed(() => {
  const latestSongs = [...songs.value].reverse();
  const favoriteList = latestSongs.filter((song) =>
    favoriteIds.value.has(song.id),
  );
  const otherList = latestSongs.filter(
    (song) => !favoriteIds.value.has(song.id),
  );

  return [...favoriteList, ...otherList].slice(0, 6);
});

// ===== 快捷入口 =====

// 快捷播放：以对应列表作为播放队列
function handleQuickPlay(id) {
  let list = null;
  if (id === 1) list = recentSongs.value;
  else if (id === 2) list = recentImportedSongs.value;
  else if (id === 4) list = favoriteSongsList.value;
  else if (id === 6) list = songs.value;

  const song = list?.[0];
  if (song) playSong(song, list);
}

function handleQuickCardClick(id) {
  if (id === 1) {
    document
      .getElementById("recent-played")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (id === 2) {
    document
      .getElementById("recent-imported")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (id === 4) {
    navigateTo("favorites");
  } else if (id === 6) {
    navigateTo("library");
  }
}

// ===== 各区块播放（都以自己所在列表为队列） =====

function playFeatured(song) {
  playSong(song, featuredSongs.value);
}

function playImported(song) {
  playSong(song, recentImportedSongs.value);
}

function playRecent(song) {
  playSong(song, recentSongs.value);
}
</script>

<template>
  <main class="main-content">
    <header class="top-bar">
      <div class="history-buttons">
        <button :disabled="!canGoBack" title="返回上一页" @click="goBack">
          <ArrowLeft :size="19" />
        </button>

        <button :disabled="!canGoForward" title="前进" @click="goForward">
          <ArrowRight :size="19" />
        </button>
      </div>
      <button class="profile-button" @click.stop="toggleProfileMenu">
        访客用户
      </button>

      <div v-if="showProfileMenu" class="profile-menu" @click.stop>
        <div class="profile-menu-head">
          <span class="profile-menu-avatar">访</span>
          <div>
            <div class="profile-menu-name">访客模式</div>
            <div class="profile-menu-version">ZhuPlay v{{ appVersion }}</div>
          </div>
        </div>

        <button class="profile-menu-item" @click="goSettings">设置</button>
        <button class="profile-menu-item" disabled>
          登录 / 注册（开发中）
        </button>
      </div>
    </header>

    <section class="welcome-section">
      <h1>{{ greeting }}</h1>

      <div class="quick-grid">
        <div
          v-for="album in albums"
          :key="album.id"
          class="quick-card"
          @click="handleQuickCardClick(album.id)"
        >
          <div class="quick-cover">
            <Music2 :size="26" />
          </div>

          <span class="quick-title">{{ album.title }}</span>

          <button
            class="quick-play"
            :title="`播放${album.title}`"
            @click.stop="handleQuickPlay(album.id)"
          >
            <Play :size="16" fill="currentColor" />
          </button>
        </div>
      </div>
    </section>

    <section class="recommend-section">
      <div class="section-header">
        <h2>为你推荐</h2>
        <button @click="navigateTo('recent-imported')">查看全部</button>
      </div>

      <HomeAlbumGrid
        :songs="featuredSongs"
        :favorite-ids="favoriteIds"
        @play="playFeatured"
      />
    </section>

    <HomeRecentList
      section-id="recent-imported"
      title="最近导入"
      :songs="recentImportedSongs"
      view-all-to="recent-imported"
      empty-title="还没有导入音乐"
      empty-description="导入一些音乐，它们就会出现在这里"
      source="recent-imported"
      @view-all="navigateTo('recent-imported')"
      @play="playImported"
    >
      <template #empty-action>
        <button class="ghost-button" @click="navigateTo('library')">
          去导入
        </button>
      </template>
    </HomeRecentList>

    <HomeRecentList
      section-id="recent-played"
      title="最近播放"
      :songs="recentSongs"
      :limit="6"
      view-all-to="recent-played"
      show-clear
      :empty-icon="Clock3"
      empty-title="还没有播放记录"
      empty-description="播放一首歌，最近听过的音乐会出现在这里"
      source="recent"
      @view-all="navigateTo('recent-played')"
      @clear="clearRecentSongs"
      @play="playRecent"
    />
  </main>
</template>

<style scoped>
.main-content {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  padding: 0 32px 40px;
  /* 绿色微光放在右上角而不是左上角：左上角紧邻侧边栏，
     光晕贴边会让"侧栏 / 内容区"的接缝显得很重 */
  background:
    radial-gradient(760px 300px at 78% -14%, #1b3529 0%, transparent 62%),
    #121212;
}

.top-bar {
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

/* ===== 访客用户菜单 ===== */

.profile-menu {
  position: absolute;
  top: 62px;
  right: 0;
  width: 220px;
  padding: 8px;
  border-radius: 10px;
  background: #1c1c1c;
  border: 1px solid #2a2a2a;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  z-index: 60;
}

.profile-menu-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 12px;
  border-bottom: 1px solid #262626;
  margin-bottom: 6px;
}

.profile-menu-avatar {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #ffffff12;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 700;
}

.profile-menu-name {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.profile-menu-version {
  margin-top: 3px;
  color: #8a8a8a;
  font-size: 11px;
}

.profile-menu-item {
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #d0d0d0;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.profile-menu-item:hover:not(:disabled) {
  background: #262626;
  color: #fff;
}

.profile-menu-item:disabled {
  color: #666;
  cursor: default;
}

.history-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-buttons button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: #282828;
  color: #b3b3b3;
  cursor: pointer;
  transition: 0.2s;
}

.history-buttons button:hover:not(:disabled) {
  background: #383838;
  color: #fff;
}

.history-buttons button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.profile-button {
  height: 34px;
  width: auto;
  padding: 0 16px;
  border: none;
  border-radius: 20px;
  background: #282828;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.profile-button:hover {
  background: #383838;
}

.welcome-section h1 {
  font-size: 30px;
  font-weight: 750;
  margin: 22px 0;
  color: #fff;
}

.recommend-section {
  margin-top: 42px;
}

/* ===== 快捷入口 ===== */

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.quick-card {
  height: 76px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 48px 0 10px;
  /* 与「最近导入」列表项同一套表面语言：实心中性灰 + 悬停浅一档 */
  background: #1c1c1c;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 650;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: background 0.15s ease;
}

.quick-card:hover {
  background: #2a2a2a;
}

.quick-card:active {
  background: #303030;
}

.quick-title {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.quick-play {
  position: absolute;
  top: 50%;
  right: 10px;
  margin-top: -16px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: #1ed760;
  color: #000;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.2s ease,
    background 0.2s ease;
}

.quick-card:hover .quick-play {
  opacity: 1;
}

.quick-play:hover {
  background: #3be477;
}

.quick-cover {
  height: 56px;
  width: 56px;
  min-width: 56px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  /* 低调灰底 + 绿色图标，避免和卡片底色割裂 */
  background: #ffffff12;
  color: var(--color-primary);
  position: relative;
}

@media (max-width: 1100px) {
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .main-content {
    padding: 0 16px 30px;
  }

  /* 手机端：快捷入口单列，避免卡片过窄把标题挤成两个字 */
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .quick-card {
    height: 56px;
    gap: 10px;
    padding: 0 40px 0 8px;
    font-size: 13px;
  }

  .quick-cover {
    width: 40px;
    min-width: 40px;
    height: 40px;
    border-radius: 5px;
  }

  .quick-title {
    display: block;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .quick-play {
    width: 28px;
    height: 28px;
    right: 6px;
    margin-top: -14px;
  }
}

/* 触屏设备：不依赖悬停显示播放按钮 */
@media (hover: none) {
  .quick-play {
    opacity: 1;
    transform: none;
  }
}

@media (hover: none), (pointer: coarse) {
  .quick-card:hover {
    background: #1c1c1c;
  }

  .quick-card:active {
    background: #2a2a2a;
  }
}
</style>
