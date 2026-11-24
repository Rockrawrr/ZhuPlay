<script setup>
// 智能歌单：按规则动态生成，不落库
//   frequent：按听歌统计的播放次数
//   recent：按导入时间
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { Play, Sparkles } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useSongMenu } from "@/composables/useSongMenu";
import { useNavigation } from "@/composables/useNavigation";
import { useListeningStats } from "@/composables/useListeningStats";
import PageHeader from "@/components/common/PageHeader.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import SongRow from "@/components/common/SongRow.vue";
import VirtualList from "@/components/common/VirtualList.vue";

const { params, navigateTo } = useNavigation();
const musicStore = useMusicStore();
const { songs } = storeToRefs(musicStore);
const { playSong } = useAudioPlayer();
const { openSongMenu } = useSongMenu();
const { state: stats } = useListeningStats();

const type = computed(() => String(params.value.type || "recent"));

const meta = computed(() =>
  type.value === "frequent"
    ? {
        title: "最常播放",
        description: "按播放次数排序的歌曲（最多 100 首）",
      }
    : {
        title: "最近添加",
        description: "最近导入的歌曲（最多 100 首）",
      },
);

const list = computed(() => {
  if (type.value === "frequent") {
    return [...songs.value]
      .map((song) => ({
        song,
        count: stats.value.plays[song.id]?.count ?? 0,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 100)
      .map((item) => item.song);
  }

  return [...songs.value]
    .sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0))
    .slice(0, 100);
});

function playAll() {
  if (list.value.length === 0) return;
  playSong(list.value[0], list.value);
}

function playFrom(song) {
  playSong(song, list.value);
}

function handleSongMenu(event, song) {
  openSongMenu(event, song, { source: "smart", list: list.value });
}
</script>

<template>
  <section class="page-shell smart-page">
    <div class="smart-header">
      <PageHeader :title="meta.title" :subtitle="meta.description">
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

      <span class="smart-badge">
        <Sparkles :size="13" /> 自动生成 · {{ list.length }} 首
      </span>
    </div>

    <EmptyState
      v-if="list.length === 0"
      :title="type === 'frequent' ? '还没有播放记录' : '曲库还是空的'"
      :description="
        type === 'frequent'
          ? '播放几首歌，这里会按播放次数排序'
          : '导入一些音乐，最近添加的歌会出现在这里'
      "
    >
      <button class="ghost-button" @click="navigateTo('library')">
        {{ type === "frequent" ? "去音乐库播放" : "去导入音乐" }}
      </button>
    </EmptyState>

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
  </section>
</template>

<style scoped>
.smart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.smart-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  background: #1d2b23;
  color: var(--color-primary);
  font-size: 11px;
  white-space: nowrap;
}

.song-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 页面改为纵向 flex：头部固定，列表自己滚动 */
.smart-page {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
