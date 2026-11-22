<script setup>
// 首页：快捷入口、为你推荐、最近导入、最近播放
// 所有播放动作都带上“当前列表”作为队列上下文，避免下一首跳出当前视图
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { Clock3, Play, Music2, ArrowLeft, ArrowRight } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useMusicActions } from "@/composables/useMusicActions";
import { useNavigation } from "@/composables/useNavigation";
import EmptyState from "@/components/EmptyState.vue";

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

// 收藏 ID 集合，供模板快速判断
const favoriteIds = computed(
  () => new Set(favoriteSongsList.value.map((song) => song.id)),
);

// 首页精选歌曲
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

// 首页快捷播放
function handleQuickPlay(id) {
  // 快捷入口：以对应列表作为播放队列，保证下一首仍在该列表内
  let list = null;
  if (id === 1) list = recentSongs.value;
  else if (id === 2) list = recentImportedSongs.value;
  else if (id === 4) list = favoriteSongsList.value;
  else if (id === 6) list = songs.value;

  const song = list?.[0];
  if (song) playSong(song, list);
}

// 处理首页快捷入口点击
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
      <button class="profile-button">访客用户</button>
    </header>

    <section class="welcome-section">
      <h1>早上好</h1>

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

          <span class="quick-title">
            {{ album.title }}
          </span>

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

      <div v-if="featuredSongs.length > 0" class="album-grid">
        <article
          v-for="song in featuredSongs"
          :key="song.id"
          class="album-card"
          @click="playSong(song, featuredSongs)"
        >
          <div class="album-cover">
            <img
              v-if="song.coverUrl"
              :src="song.coverUrl"
              :alt="song.album || song.name"
              loading="lazy"
            />
            <Music2 v-else :size="48" />

            <button
              class="featured-play"
              :title="`播放${song.name}`"
              @click.stop="playSong(song, featuredSongs)"
            >
              <Play :size="18" fill="currentColor" />
            </button>
          </div>

          <h3>{{ song.name }}</h3>

          <p>
            {{ favoriteIds.has(song.id) ? "喜欢的音乐" : "本地音乐" }}
          </p>
        </article>
      </div>

      <EmptyState
        v-else
        compact
        title="暂无推荐歌曲"
        description="导入一些音乐，开始建立你的音乐收藏"
      >
        <template #icon><Music2 :size="20" /></template>
      </EmptyState>
    </section>

    <section id="recent-imported" class="recent-section">
      <div class="section-header">
        <h2>最近导入</h2>
        <button @click="navigateTo('recent-imported')">查看全部</button>
      </div>

      <div v-if="recentImportedSongs.length > 0" class="recent-list">
        <button
          v-for="(song, index) in recentImportedSongs"
          :key="song.id"
          class="recent-item"
          @click="playSong(song, recentImportedSongs)"
        >
          <span class="recent-index">{{ index + 1 }}</span>

          <div class="recent-icon">
            <img
              v-if="song.coverUrl"
              :src="song.coverUrl"
              :alt="song.album || song.name"
              loading="lazy"
            />
            <Music2 v-else :size="20" />
          </div>

          <div class="recent-info">
            <div class="recent-name">{{ song.name }}</div>
            <div class="recent-filename">{{ song.filename }}</div>
          </div>

          <Play :size="18" class="recent-play" />
        </button>
      </div>

      <EmptyState
        v-else
        compact
        title="还没有导入音乐"
        description="导入一些音乐，它们就会出现在这里"
      >
        <template #icon><Music2 :size="20" /></template>
        <button class="ghost-button" @click="navigateTo('library')">
          去导入
        </button>
      </EmptyState>
    </section>

    <section id="recent-played" class="recent-section">
      <div class="section-header">
        <h2>最近播放</h2>

        <div v-if="recentSongs.length > 0" class="recent-actions">
          <button class="clear-recent-button" @click="clearRecentSongs">
            清空记录
          </button>

          <button
            v-if="recentSongs.length > 6"
            @click="navigateTo('recent-played')"
          >
            查看全部
          </button>
        </div>

        <Clock3 v-else :size="20" />
      </div>

      <div v-if="recentSongs.length > 0" class="recent-list">
        <button
          v-for="(song, index) in recentSongs.slice(0, 6)"
          :key="song.id"
          class="recent-item"
          @click="playSong(song, recentSongs)"
        >
          <span class="recent-index">{{ index + 1 }}</span>

          <div class="recent-icon">
            <img
              v-if="song.coverUrl"
              :src="song.coverUrl"
              :alt="song.album || song.name"
              loading="lazy"
            />
            <Music2 v-else :size="20" />
          </div>

          <div class="recent-info">
            <div class="recent-name">{{ song.name }}</div>
            <div class="recent-filename">{{ song.filename }}</div>
          </div>

          <Play :size="18" class="recent-play" />
        </button>
      </div>

      <EmptyState
        v-else
        compact
        title="还没有播放记录"
        description="播放一首歌，最近听过的音乐会出现在这里"
      >
        <template #icon><Clock3 :size="20" /></template>
      </EmptyState>
    </section>
  </main>
</template>

<style scoped>
.main-content {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  padding: 0 32px 40px;
  background: linear-gradient(180deg, #263b32 0, #181818 330px);
}

.top-bar {
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  padding: 0 48px 0 12px;

  background: #ffffff1c;
  border: 1px solid transparent;
  border-radius: 7px;

  color: #fff;
  font-size: 14px;
  font-weight: 650;

  position: relative;
  overflow: hidden;
  cursor: pointer;

  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.quick-title {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.quick-title small {
  color: #b3b3b3;
  font-size: 11px;
  font-weight: 400;
}

.quick-card:hover {
  background: #ffffff30;
  border-color: #1ed76080;
  transform: translateY(-3px);
  box-shadow: 0 5px 15px #0003;
}

.quick-card:active {
  transform: translateY(-1px) scale(0.99);
}

/* 快捷卡片上的播放按钮：悬停时出现，移动端常显 */
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
  height: 76px;
  width: 76px;
  min-width: 76px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, #27634d, #172c25);
  position: relative;
}

.favorite-count {
  position: absolute;
  right: 4px;
  bottom: 4px;

  min-width: 16px;
  height: 16px;
  padding: 0 4px;

  display: grid;
  place-items: center;

  border-radius: 10px;
  background: #1ed760;
  color: #000;

  font-size: 10px;
  font-weight: 700;
}

.recommend-section,
.recent-section {
  margin-top: 42px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  color: #fff;
}

.section-header h2 {
  font-size: 23px;
  font-weight: 700;
  margin: 0;
}

.section-header button {
  border: none;
  background: transparent;
  color: #b3b3b3;
  font-size: 12px;
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
}

.album-card {
  min-width: 0;
  padding: 14px;
  border-radius: 8px;
  background: #181818;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
  cursor: pointer;
}

.album-card:hover {
  background: #282828;
  transform: translateY(-3px);
}

.album-card:hover {
  background: #282828;
}

.album-cover {
  aspect-ratio: 1;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 5px;
  background: linear-gradient(135deg, #365f50, #17241e);
  color: #d9f7e4;
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.featured-play {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: #1ed760;
  color: #000;
  cursor: pointer;

  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.featured-play:hover {
  background: #3be477;
  transform: scale(1.06);
}

.album-card:hover .featured-play {
  opacity: 1;
  transform: translateY(0);
}

.album-card h3 {
  margin: 14px 0 6px;
  color: #fff;
  font-size: 14px;
  font-weight: 650;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-card p {
  margin: 0;
  color: #b3b3b3;
  font-size: 12px;
  line-height: 1.6;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #fff;
  text-align: left;
  cursor: pointer;

  transition: background 0.2s ease;
}

.recent-item:hover {
  background: #282828;
}

.recent-index {
  width: 20px;
  color: #999;
  text-align: center;
}

.recent-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #282828;
  border-radius: 5px;
  color: #1ed760;
}

.recent-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.recent-info {
  flex: 1;
  min-width: 0;
}

.recent-name {
  font-size: 14px;
  color: #fff;
}

.recent-filename {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.recent-play {
  color: #1ed760;
  opacity: 0;
  transform: translateX(-4px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.recent-item:hover .recent-play {
  opacity: 1;
  transform: translateX(0);
}

.history-buttons button:disabled {
  opacity: 0.35;
  cursor: default;
}

@media (max-width: 1100px) {
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .album-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .main-content {
    padding: 0 16px 30px;
  }

  /* 手机端：快捷入口改成单列，避免卡片过窄把标题挤成两个字 */
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .album-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
    height: 56px;
  }

  .quick-title {
    display: block;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .quick-title small {
    font-size: 10px;
  }

  .quick-play {
    width: 28px;
    height: 28px;
    right: 6px;
    margin-top: -14px;
  }

  /* 手机端首页标题优化 */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: nowrap;
  }

  .section-header h2 {
    font-size: 18px;
    line-height: 1.4;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .section-header > button {
    font-size: 11px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* 最近播放操作按钮 */
  .recent-actions {
    gap: 8px;
    flex-shrink: 0;
  }

  .clear-recent-button {
    font-size: 11px;
  }
}

.recent-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.clear-recent-button {
  cursor: pointer;
}

.clear-recent-button:hover {
  color: #fff;
}

.recent-name,
.recent-filename {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 触屏设备：不依赖鼠标悬停显示播放按钮 */
@media (hover: none) {
  .quick-play,
  .featured-play,
  .recent-play {
    opacity: 1;
    transform: none;
  }
}

/* 手机和平板触屏设备交互 */
@media (hover: none), (pointer: coarse) {
  /* 不保留鼠标悬停效果 */
  .quick-card:hover {
    background: #ffffff1c;
    border-color: transparent;
    transform: none;
    box-shadow: none;
  }

  /* 手指按下时的短暂反馈 */
  .quick-card:active {
    background: #ffffff30;
    border-color: transparent;
    transform: scale(0.98);
    box-shadow: none;
  }
}
</style>
