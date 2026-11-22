<script setup>
// 歌单页容器：列表 / 详情两种模式由 currentPlaylistId 决定
// 这里负责业务动作（新建、改名、删除、加歌、移歌）与播放，UI 细节在 components/playlist/ 下
// 已知限制：新建/重命名用 window.prompt、删除用 window.confirm，
// 而 Electron 不支持 prompt，桌面封装前需要替换成自定义弹窗
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { ArrowLeft, ListMusic, Plus } from "lucide-vue-next";
import { usePlaylistStore } from "@/stores/playlist";
import { useMusicStore } from "@/stores/music";
import { usePlaylistActions } from "@/composables/usePlaylistActions";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useNavigation } from "@/composables/useNavigation";
import PlaylistCard from "@/components/playlist/PlaylistCard.vue";
import PlaylistDetail from "@/components/playlist/PlaylistDetail.vue";
import AddSongsPanel from "@/components/playlist/AddSongsPanel.vue";

const playlistStore = usePlaylistStore();
const musicStore = useMusicStore();

const { playlists, currentPlaylistId } = storeToRefs(playlistStore);
const { songs } = storeToRefs(musicStore);

const {
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
} = usePlaylistActions();
const { playSong } = useAudioPlayer();
const { canGoBack, goBack } = useNavigation();

const currentPlaylist = computed(() =>
  playlistStore.playlistById(currentPlaylistId.value),
);

// 按 songIds 顺序从曲库解引用，已删除的歌曲自动跳过
const currentSongs = computed(() => {
  if (!currentPlaylist.value) return [];

  return currentPlaylist.value.songIds
    .map((songId) => songs.value.find((song) => song.id === songId))
    .filter(Boolean);
});

const showAddPanel = ref(false);

async function handleCreate() {
  const name = window.prompt("新歌单名称", `歌单 ${playlists.value.length + 1}`);
  if (name === null) return;

  const playlist = await createPlaylist(name);
  playlistStore.setCurrentPlaylist(playlist.id);
}

async function handleRename(playlist) {
  const name = window.prompt("重命名歌单", playlist.name);
  if (name === null || name.trim() === playlist.name) return;

  await renamePlaylist(playlist.id, name);
}

async function handleDelete(playlist) {
  const confirmed = window.confirm(
    `确定删除歌单「${playlist.name}」吗？歌单里的歌曲不会被删除。`,
  );
  if (!confirmed) return;

  await deletePlaylist(playlist.id);
}

// 播放整张歌单：以歌单歌曲作为播放上下文
function playAll() {
  const list = currentSongs.value;
  if (list.length === 0) return;

  playSong(list[0], list);
}

function playFrom(song) {
  playSong(song, currentSongs.value);
}

async function handleRemoveSong(songId) {
  if (!currentPlaylistId.value) return;

  await removeSongFromPlaylist(currentPlaylistId.value, songId);
}

async function handleAddSong(songId) {
  if (!currentPlaylistId.value) return;

  await addSongToPlaylist(currentPlaylistId.value, songId);
}

function closeAddPanel() {
  showAddPanel.value = false;
}
</script>

<template>
  <!-- 歌单列表 -->
  <section v-if="!currentPlaylist" class="page-shell">
    <header class="page-toolbar">
      <button
        class="back-button"
        :disabled="!canGoBack"
        title="返回上一页"
        @click="goBack"
      >
        <ArrowLeft :size="19" />
      </button>

      <div class="page-heading">
        <h2>我的歌单</h2>
        <p>把喜欢的歌曲整理成歌单 · 共 {{ playlists.length }} 个</p>
      </div>

      <button class="primary-button" @click="handleCreate">
        <Plus :size="18" /> 新建歌单
      </button>
    </header>

    <div v-if="playlists.length === 0" class="empty-state">
      <ListMusic :size="46" />
      <h3>还没有歌单</h3>
      <p>创建歌单，把歌曲按心情和场景整理起来</p>
      <button class="primary-button" @click="handleCreate">
        <Plus :size="18" /> 新建歌单
      </button>
    </div>

    <div v-else class="playlist-grid">
      <PlaylistCard
        v-for="playlist in playlists"
        :key="playlist.id"
        :playlist="playlist"
        @open="playlistStore.setCurrentPlaylist(playlist.id)"
        @rename="handleRename(playlist)"
        @delete="handleDelete(playlist)"
      />
    </div>
  </section>

  <!-- 歌单详情 -->
  <PlaylistDetail
    v-else
    :playlist="currentPlaylist"
    :songs="currentSongs"
    @back="playlistStore.setCurrentPlaylist(null)"
    @play-all="playAll"
    @play="playFrom"
    @remove-song="handleRemoveSong"
    @rename="handleRename(currentPlaylist)"
    @delete="handleDelete(currentPlaylist)"
    @add-songs="showAddPanel = true"
  />

  <!-- 添加歌曲 -->
  <AddSongsPanel
    v-if="showAddPanel && currentPlaylist"
    :playlist-name="currentPlaylist.name"
    :songs="songs"
    :existing-ids="currentPlaylist.songIds"
    @add="handleAddSong"
    @close="closeAddPanel"
  />
</template>

<style scoped>
.page-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
}

.page-heading {
  flex: 1;
  min-width: 0;
}

.page-heading h2 {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
}

.page-heading p {
  margin: 0;
  color: #999;
  font-size: 13px;
}

.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
</style>
