<script setup>
// 最近播放：按播放时间倒序（store 已维护顺序），点击在“最近播放列表”内播放
import { storeToRefs } from "pinia";
import { Trash2 } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useMusicActions } from "@/composables/useMusicActions";
import { useNavigation } from "@/composables/useNavigation";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import SongRow from "@/components/SongRow.vue";

const musicStore = useMusicStore();
const { recentSongs } = storeToRefs(musicStore);

const { playSong } = useAudioPlayer();
const { clearRecentSongs } = useMusicActions();
const { navigateTo } = useNavigation();

function playFrom(song) {
  playSong(song, recentSongs.value);
}
</script>

<template>
  <section class="page-shell">
    <PageHeader
      title="最近播放"
      :subtitle="`最近听过的 ${recentSongs.length} 首歌`"
    >
      <template #actions>
        <button
          v-if="recentSongs.length > 0"
          class="ghost-button"
          @click="clearRecentSongs"
        >
          <Trash2 :size="16" /> 清空记录
        </button>
      </template>
    </PageHeader>

    <EmptyState
      v-if="recentSongs.length === 0"
      title="还没有播放记录"
      description="播放一些音乐，最近听过的歌曲会按时间记录在这里"
    >
      <button class="ghost-button" @click="navigateTo('library')">
        去音乐库看看
      </button>
    </EmptyState>

    <div v-else class="song-list">
      <SongRow
        v-for="(song, index) in recentSongs"
        :key="song.id"
        :song="song"
        :index="index"
        @play="playFrom(song)"
      />
    </div>
  </section>
</template>

<style scoped>
.song-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
