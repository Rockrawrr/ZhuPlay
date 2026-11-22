<script setup>
// src/views/Search.vue
// 全局搜索：在曲库与歌单里按关键字过滤
// 点歌曲会用「当前搜索结果」作为播放队列，所以下一首仍在结果里
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { ArrowLeft, ListMusic, Music2, Search, X } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { usePlaylistStore } from "@/stores/playlist";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useNavigation } from "@/composables/useNavigation";
import { useSongMenu } from "@/composables/useSongMenu";
import EmptyState from "@/components/common/EmptyState.vue";
import SongRow from "@/components/common/SongRow.vue";
import VirtualList from "@/components/common/VirtualList.vue";

const musicStore = useMusicStore();
const playlistStore = usePlaylistStore();
const { songs } = storeToRefs(musicStore);
const { playlists } = storeToRefs(playlistStore);

const { playSong } = useAudioPlayer();
const { canGoBack, goBack, navigateTo } = useNavigation();
const { openSongMenu } = useSongMenu();

const keywordInputValue = ref("");
const keyword = ref("");
const keywordInput = ref(null);

// 输入防抖：上万首时每次按键都全量过滤会卡，停顿 220ms 后再搜
let debounceTimer = null;

watch(keywordInputValue, (value) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    keyword.value = value;
  }, 220);
});

onUnmounted(() => clearTimeout(debounceTimer));

// 动态插入的输入框 autofocus 不一定生效，这里手动聚焦
onMounted(() => keywordInput.value?.focus());

const normalized = computed(() => keyword.value.trim().toLowerCase());

// 歌名 / 歌手 / 专辑 / 文件名 任一命中即可
const matchedSongs = computed(() => {
  const text = normalized.value;
  if (!text) return [];

  return songs.value.filter((song) =>
    [song.name, song.artist, song.album, song.filename].some((value) =>
      (value || "").toLowerCase().includes(text),
    ),
  );
});

const matchedPlaylists = computed(() => {
  const text = normalized.value;
  if (!text) return [];

  return playlists.value.filter((playlist) =>
    playlist.name.toLowerCase().includes(text),
  );
});

function openPlaylist(playlist) {
  navigateTo("playlists", { id: playlist.id });
}

function playFrom(song) {
  playSong(song, matchedSongs.value);
}

function handleSongMenu(event, song) {
  openSongMenu(event, song, {
    source: "search",
    list: matchedSongs.value,
  });
}

function clearKeyword() {
  clearTimeout(debounceTimer);
  keywordInputValue.value = "";
  keyword.value = "";
}
</script>

<template>
  <section class="page-shell search-page">
    <header class="search-header">
      <button
        class="back-button"
        :disabled="!canGoBack"
        title="返回上一页"
        @click="goBack"
      >
        <ArrowLeft :size="19" />
      </button>

      <div class="search-box">
        <Search :size="17" />
        <input
          ref="keywordInput"
          v-model="keywordInputValue"
          type="text"
          placeholder="搜索歌曲、歌手、专辑或歌单"
          aria-label="搜索"
          autofocus
        />
        <button
          v-if="keywordInputValue"
          class="clear-button"
          title="清空"
          @click="clearKeyword"
        >
          <X :size="15" />
        </button>
      </div>
    </header>

    <!-- 未输入 -->
    <div v-if="!normalized" class="search-empty">
      <EmptyState title="搜索你的音乐" description="输入歌名、歌手、专辑或歌单名称">
        <template #icon><Search :size="22" /></template>
      </EmptyState>
    </div>

    <!-- 无结果 -->
    <div
      v-else-if="matchedSongs.length === 0 && matchedPlaylists.length === 0"
      class="search-empty"
    >
      <EmptyState title="没有找到相关内容" description="试试其它关键字，或先去音乐库导入歌曲">
        <template #icon><Music2 :size="22" /></template>
      </EmptyState>
    </div>

    <div v-else class="search-results">
      <!-- 歌单结果 -->
      <section v-if="matchedPlaylists.length > 0" class="result-section playlist-section">
        <h2 class="result-title">歌单 · {{ matchedPlaylists.length }}</h2>

        <div class="playlist-results">
          <button
            v-for="playlist in matchedPlaylists"
            :key="playlist.id"
            class="playlist-result"
            @click="openPlaylist(playlist)"
          >
            <span class="result-cover"><ListMusic :size="19" /></span>
            <span class="result-info">
              <span class="result-name">{{ playlist.name }}</span>
              <span class="result-meta">{{ playlist.songIds.length }} 首</span>
            </span>
          </button>
        </div>
      </section>

      <!-- 歌曲结果：搜索结果可能有上千条，用虚拟列表 -->
      <section v-if="matchedSongs.length > 0" class="result-section song-section">
        <h2 class="result-title">歌曲 · {{ matchedSongs.length }}</h2>

        <div class="song-scroll">
          <VirtualList :items="matchedSongs" :item-height="60">
            <template #default="{ item: song, index }">
              <SongRow
                :song="song"
                :index="index"
                @play="playFrom(song)"
                @contextmenu.prevent="handleSongMenu($event, song)"
              />
            </template>
          </VirtualList>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.search-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 26px;
}

.search-box {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 560px;
  padding: 10px 16px;
  border-radius: 24px;
  background: #282828;
  color: #b3b3b3;
  transition: background 0.2s ease;
}

.search-box:focus-within {
  background: #323232;
  color: #fff;
}

.search-box input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: #fff;
  font-size: 14px;
}

.clear-button {
  display: grid;
  place-items: center;
  padding: 2px;
  border: none;
  background: transparent;
  color: #b3b3b3;
  cursor: pointer;
}

.clear-button:hover {
  color: #fff;
}

/* 页面纵向 flex：搜索框固定，结果区自己滚动（供虚拟列表使用） */
.search-page {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-empty {
  flex: 1;
  min-height: 0;
}

.search-results {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.result-section {
  margin-bottom: 24px;
}

/* 歌单结果固定高度，剩下的空间全给歌曲列表 */
.playlist-section {
  flex-shrink: 0;
  max-height: 34vh;
  overflow-y: auto;
}

.song-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
}

.song-scroll {
  flex: 1;
  min-height: 0;
}

.result-title {
  margin: 0 0 14px;
  font-size: 17px;
  font-weight: 700;
}

.playlist-results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.playlist-result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: #181818;
  color: #fff;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
}

.playlist-result:hover {
  background: #282828;
}

.result-cover {
  width: 46px;
  height: 46px;
  min-width: 46px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: linear-gradient(135deg, #2f6b55, #16241f);
  color: #d9f7e4;
}

.result-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta {
  color: #999;
  font-size: 11px;
}
</style>
