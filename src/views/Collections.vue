<script setup>
// 歌手 / 专辑聚合：/collections/artists · /collections/albums
// 列表模式展示分组，带上 name 参数则展示该分组的歌曲
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { Disc3, Mic2, Play } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useSongMenu } from "@/composables/useSongMenu";
import { useNavigation } from "@/composables/useNavigation";
import PageHeader from "@/components/common/PageHeader.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import SongRow from "@/components/common/SongRow.vue";
import SongCover from "@/components/common/SongCover.vue";
import VirtualList from "@/components/common/VirtualList.vue";

const { params, navigateTo } = useNavigation();
const musicStore = useMusicStore();
const { songs } = storeToRefs(musicStore);
const { playSong } = useAudioPlayer();
const { openSongMenu } = useSongMenu();

const kind = computed(() =>
  params.value.kind === "albums" ? "albums" : "artists",
);
const isArtists = computed(() => kind.value === "artists");
const activeName = computed(() =>
  params.value.name ? String(params.value.name) : "",
);

const groups = computed(() => {
  const map = new Map();

  for (const song of songs.value) {
    const raw = isArtists.value ? song.artist : song.album;
    const key =
      String(raw || "").trim() || (isArtists.value ? "未知歌手" : "未知专辑");

    if (!map.has(key)) {
      map.set(key, { name: key, songs: [], cover: null });
    }

    const group = map.get(key);
    group.songs.push(song);
    if (!group.cover && song.cover) group.cover = song.cover;
  }

  return [...map.values()]
    .sort((a, b) => b.songs.length - a.songs.length)
    .map((group) => ({
      ...group,
      songs: isArtists.value
        ? [...group.songs].sort(
            (a, b) =>
              String(a.album || "").localeCompare(String(b.album || ""), "zh-CN") ||
              (a.trackNumber ?? 0) - (b.trackNumber ?? 0),
          )
        : [...group.songs].sort(
            (a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0),
          ),
    }));
});

const activeGroup = computed(
  () => groups.value.find((group) => group.name === activeName.value) || null,
);

const list = computed(() => activeGroup.value?.songs ?? []);

function playAll() {
  if (list.value.length === 0) return;
  playSong(list.value[0], list.value);
}

function playFrom(song) {
  playSong(song, list.value);
}

function openGroup(group) {
  navigateTo("collections", { kind: kind.value, name: group.name });
}

function handleSongMenu(event, song) {
  openSongMenu(event, song, { source: "collection", list: list.value });
}
</script>

<template>
  <section
    class="page-shell"
    :class="{ 'collection-detail': Boolean(activeGroup) }"
  >
    <PageHeader
      v-if="activeGroup"
      :title="activeGroup.name"
      :subtitle="`${list.length} 首歌曲`"
    >
      <template #actions>
        <button
          class="primary-button"
          :disabled="list.length === 0"
          @click="playAll"
        >
          <Play :size="17" fill="currentColor" /> 播放全部
        </button>
      </template>
    </PageHeader>

    <PageHeader
      v-else
      :title="isArtists ? '歌手' : '专辑'"
      :subtitle="`共 ${groups.length} 个${isArtists ? '歌手' : '专辑'}`"
    />

    <EmptyState
      v-if="groups.length === 0"
      title="曲库还是空的"
      description="导入一些音乐，这里会按歌手和专辑自动归类"
    >
      <template #icon><Mic2 :size="22" /></template>
      <button class="ghost-button" @click="navigateTo('library')">
        去导入音乐
      </button>
    </EmptyState>

    <template v-else-if="activeGroup">
      <div v-if="list.length === 0" class="collection-empty">
        这个分组下没有歌曲
      </div>

      <div v-else class="song-list">
        <VirtualList :items="list" :item-height="60">
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
    </template>

    <div v-else class="group-grid">
      <button
        v-for="group in groups"
        :key="group.name"
        class="group-card"
        :title="group.name"
        @click="openGroup(group)"
      >
        <span class="group-cover">
          <SongCover :blob="group.cover" :alt="group.name">
            <component :is="isArtists ? Mic2 : Disc3" :size="20" />
          </SongCover>
        </span>

        <span class="group-text">
          <strong>{{ group.name }}</strong>
          <span>{{ group.songs.length }} 首</span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.group-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: #181818;
  color: #fff;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.group-card:hover {
  background: #242424;
}

.group-cover {
  width: 46px;
  height: 46px;
  min-width: 46px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, #2f6b55, #16241f);
  color: #d9f7e4;
}

.group-cover :deep(.cover-image) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.group-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.group-text strong {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-text span {
  color: #8a8a8a;
  font-size: 11px;
}

/* 详情模式：头部固定，列表自己滚动 */
.collection-detail {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.song-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.collection-empty {
  padding: 40px 0;
  color: #8a8a8a;
  font-size: 13px;
  text-align: center;
}
</style>
