<script setup>
// 收藏页：展示喜欢的歌曲，点击即在“收藏列表”内播放
import { storeToRefs } from "pinia";
import { ArrowLeft, Heart, Play } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useMusicActions } from "@/composables/useMusicActions";
import { useNavigation } from "@/composables/useNavigation";
import { useSongMenu } from "@/composables/useSongMenu";
import EmptyState from "@/components/common/EmptyState.vue";
import SongRow from "@/components/common/SongRow.vue";
import VirtualList from "@/components/common/VirtualList.vue";

const musicStore = useMusicStore();
const { favoriteSongsList } = storeToRefs(musicStore);

const { playSong } = useAudioPlayer();
const { toggleFavorite } = useMusicActions();
const { canGoBack, goBack, navigateTo } = useNavigation();
const { openSongMenu } = useSongMenu();

// 以整个收藏列表为播放上下文
function playAll() {
  if (favoriteSongsList.value.length === 0) return;

  playSong(favoriteSongsList.value[0], favoriteSongsList.value);
}

function playFrom(song) {
  playSong(song, favoriteSongsList.value);
}

function handleSongMenu(event, song) {
  openSongMenu(event, song, {
    source: "favorites",
    list: favoriteSongsList.value,
  });
}
</script>

<template>
  <section class="page-shell favorites-page">
    <div class="toolbar">
      <button
        class="back-button"
        :disabled="!canGoBack"
        title="返回上一页"
        @click="goBack"
      >
        <ArrowLeft :size="19" />
      </button>
    </div>

    <!-- 歌单式横幅 -->
    <header class="banner">
      <div class="banner-cover">
        <Heart :size="44" fill="#fff" />
      </div>

      <div class="banner-text">
        <span class="eyebrow">歌单</span>
        <h2>喜欢的音乐</h2>
        <p>你收藏的所有歌曲 · {{ favoriteSongsList.length }} 首</p>

        <button
          class="primary-button"
          :disabled="favoriteSongsList.length === 0"
          @click="playAll"
        >
          <Play :size="18" fill="currentColor" /> 播放全部
        </button>
      </div>
    </header>

    <EmptyState
      v-if="favoriteSongsList.length === 0"
      title="还没有喜欢的音乐"
      description="在音乐库或播放器里点击爱心，收藏的歌曲会出现在这里"
    >
      <button class="ghost-button" @click="navigateTo('library')">
        去音乐库看看
      </button>
    </EmptyState>

    <div v-else class="song-list">
      <VirtualList :items="favoriteSongsList" :item-height="60">
        <template #default="{ item: song, index }">
          <SongRow
            :song="song"
            :index="index"
            removable
            remove-label="取消喜欢"
            @play="playFrom(song)"
            @remove="toggleFavorite(song.id)"
            @contextmenu.prevent="handleSongMenu($event, song)"
          />
        </template>
      </VirtualList>
    </div>
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  margin-bottom: 12px;
}

.banner {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 26px;
  padding: 24px;
  border-radius: 14px;
  background:
    radial-gradient(circle at 18% 0%, #2f7f5c 0%, transparent 62%),
    linear-gradient(135deg, #1f4e3c, #131e1a);
}

.banner-cover {
  width: 132px;
  height: 132px;
  min-width: 132px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #3c8a6d, #1b332a);
  color: #e9fff3;
  box-shadow: 0 12px 30px #0006;
}

.banner-text {
  min-width: 0;
}

.eyebrow {
  font-size: 12px;
  color: #bfe3d2;
}

.banner-text h2 {
  margin: 6px 0 8px;
  font-size: 30px;
  font-weight: 700;
}

.banner-text p {
  margin: 0 0 16px;
  color: #bfe3d2;
  font-size: 12px;
}

/* 页面改为纵向 flex：横幅固定，列表自己滚动（供虚拟列表使用） */
.favorites-page {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.song-list {
  flex: 1;
  min-height: 0;
}

@media (max-width: 700px) {
  .banner {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 18px;
  }

  .banner-cover {
    width: 92px;
    height: 92px;
    min-width: 92px;
  }

  .banner-text h2 {
    font-size: 22px;
  }
}
</style>
