<script setup>
// 最近导入：按 importedAt 倒序展示曲库，点击在“最近导入顺序”内播放
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { Upload } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useNavigation } from "@/composables/useNavigation";
import PageHeader from "@/components/PageHeader.vue";
import EmptyState from "@/components/EmptyState.vue";
import SongRow from "@/components/SongRow.vue";

const musicStore = useMusicStore();
const { songs } = storeToRefs(musicStore);

const { playSong } = useAudioPlayer();
const { navigateTo } = useNavigation();

// 按导入时间倒序
const sortedSongs = computed(() =>
  [...songs.value].sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0)),
);

function playFrom(song) {
  playSong(song, sortedSongs.value);
}
</script>

<template>
  <section class="page-shell">
    <PageHeader
      title="最近导入"
      :subtitle="`最近添加到音乐库的 ${sortedSongs.length} 首歌`"
    >
      <template #actions>
        <button
          v-if="sortedSongs.length > 0"
          class="ghost-button"
          @click="navigateTo('library')"
        >
          <Upload :size="16" /> 继续导入
        </button>
      </template>
    </PageHeader>

    <EmptyState
      v-if="sortedSongs.length === 0"
      title="还没有导入音乐"
      description="导入电脑里的音频文件，它们会按导入顺序出现在这里"
    >
      <button class="primary-button" @click="navigateTo('library')">
        <Upload :size="18" /> 去导入音乐
      </button>
    </EmptyState>

    <div v-else class="song-list">
      <SongRow
        v-for="(song, index) in sortedSongs"
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
