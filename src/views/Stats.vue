<script setup>
// 听歌统计：总次数 / 总时长 / 最近 7 天趋势 / 最常播放的歌曲与歌手
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { BarChart3, Clock3, Music2, RotateCcw, TrendingUp } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { useListeningStats } from "@/composables/useListeningStats";
import { useConfirm } from "@/composables/useConfirm";
import { useToast } from "@/composables/useToast";
import { formatTime } from "@/utils/format";
import PageHeader from "@/components/common/PageHeader.vue";
import EmptyState from "@/components/common/EmptyState.vue";

const musicStore = useMusicStore();
const { songs } = storeToRefs(musicStore);

const { state, clearStats, todayKey } = useListeningStats();
const { confirm } = useConfirm();
const toast = useToast();

const songById = computed(() => {
  const map = new Map();
  for (const song of songs.value) map.set(song.id, song);
  return map;
});

// 总时长按小时展示更直观
function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  if (total < 60) return `${total} 秒`;

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  return `${minutes} 分 ${total % 60} 秒`;
}

const totalPlays = computed(() => state.value.totalPlays || 0);
const totalDuration = computed(() => formatDuration(state.value.totalSeconds));
const todaySeconds = computed(() => state.value.daily[todayKey()] ?? 0);
const activeDays = computed(() => Object.keys(state.value.daily).length);

const hasData = computed(
  () => totalPlays.value > 0 || Object.keys(state.value.plays).length > 0,
);

// 最近 7 天（含今天）的柱状图数据
const weekBars = computed(() => {
  const bars = [];
  const now = new Date();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    const key = todayKey(date);
    const seconds = state.value.daily[key] ?? 0;

    bars.push({
      key,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      seconds,
      isToday: offset === 0,
    });
  }

  return bars;
});

const weekMax = computed(() =>
  Math.max(1, ...weekBars.value.map((bar) => bar.seconds)),
);

const weekTotal = computed(() =>
  weekBars.value.reduce((sum, bar) => sum + bar.seconds, 0),
);

// 最常播放的歌曲
const topSongs = computed(() => {
  return Object.entries(state.value.plays)
    .map(([id, entry]) => {
      const song = songById.value.get(id);
      return {
        id,
        name: song?.name ?? "已删除的歌曲",
        artist: song?.artist || song?.filename || "",
        count: entry.count || 0,
        seconds: entry.seconds || 0,
        lastAt: entry.lastAt || 0,
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || b.seconds - a.seconds)
    .slice(0, 10);
});

// 最常听的歌手（按播放次数聚合）
const topArtists = computed(() => {
  const map = new Map();

  for (const [id, entry] of Object.entries(state.value.plays)) {
    const song = songById.value.get(id);
    if (!song) continue;

    const artist = song.artist || "未知歌手";
    const current = map.get(artist) ?? { artist, count: 0, seconds: 0 };
    current.count += entry.count || 0;
    current.seconds += entry.seconds || 0;
    map.set(artist, current);
  }

  return [...map.values()]
    .sort((a, b) => b.count - a.count || b.seconds - a.seconds)
    .slice(0, 5);
});

function barHeight(seconds) {
  if (!(seconds > 0)) return "0%";
  return `${Math.max((seconds / weekMax.value) * 100, 6)}%`;
}

async function handleClearStats() {
  const confirmed = await confirm({
    title: "清空听歌统计",
    message: "将删除全部播放次数与收听时长记录，不影响歌曲与歌单。",
    confirmText: "清空",
    danger: true,
  });
  if (!confirmed) return;

  await clearStats();
  toast.success("听歌统计已清空");
}
</script>

<template>
  <section class="page-shell">
    <div class="stats-inner">
      <PageHeader title="听歌统计" subtitle="你听过多少，都在这里" />

      <div class="stat-cards">
        <div class="stat-card">
          <Music2 :size="20" />
          <span class="stat-value">{{ totalPlays }}</span>
          <span class="stat-label">总播放次数</span>
        </div>
        <div class="stat-card">
          <Clock3 :size="20" />
          <span class="stat-value">{{ totalDuration }}</span>
          <span class="stat-label">总收听时长</span>
        </div>
        <div class="stat-card">
          <TrendingUp :size="20" />
          <span class="stat-value">{{ formatDuration(todaySeconds) }}</span>
          <span class="stat-label">今日收听</span>
        </div>
        <div class="stat-card">
          <BarChart3 :size="20" />
          <span class="stat-value">{{ activeDays }}</span>
          <span class="stat-label">有记录天数</span>
        </div>
      </div>

      <EmptyState
        v-if="!hasData"
        title="还没有听歌记录"
        description="播放几首歌，这里会显示你的收听统计"
      >
        <template #icon><BarChart3 :size="22" /></template>
      </EmptyState>

      <template v-else>
        <section class="panel">
          <header class="panel-head">
            <h3>最近 7 天</h3>
            <span>共 {{ formatDuration(weekTotal) }}</span>
          </header>

          <div class="chart">
            <div v-for="bar in weekBars" :key="bar.key" class="chart-col">
              <span class="chart-value">
                {{ bar.seconds > 0 ? formatDuration(bar.seconds) : "" }}
              </span>
              <div class="chart-track">
                <div
                  class="chart-bar"
                  :class="{ today: bar.isToday }"
                  :style="{ height: barHeight(bar.seconds) }"
                ></div>
              </div>
              <span class="chart-label">{{ bar.label }}</span>
            </div>
          </div>
        </section>

        <section class="panel">
          <header class="panel-head">
            <h3>最常播放</h3>
            <span>Top {{ topSongs.length }}</span>
          </header>

          <ol class="rank-list">
            <li v-for="(item, index) in topSongs" :key="item.id" class="rank-item">
              <span class="rank-index">{{ index + 1 }}</span>
              <span class="rank-info">
                <span class="rank-name">{{ item.name }}</span>
                <span class="rank-artist">{{ item.artist }}</span>
              </span>
              <span class="rank-meta">
                {{ item.count }} 次 · {{ formatDuration(item.seconds) }}
              </span>
            </li>
          </ol>
        </section>

        <section class="panel">
          <header class="panel-head">
            <h3>最常听的歌手</h3>
            <span>Top {{ topArtists.length }}</span>
          </header>

          <div class="artist-list">
            <div v-for="item in topArtists" :key="item.artist" class="artist-item">
              <span class="artist-name">{{ item.artist }}</span>
              <span class="artist-meta">
                {{ item.count }} 次 · {{ formatTime(item.seconds) }}
              </span>
            </div>
          </div>
        </section>

        <button class="ghost-button clear-stats" @click="handleClearStats">
          <RotateCcw :size="15" /> 清空听歌统计
        </button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.stats-inner {
  max-width: 880px;
  margin: 0 auto;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 22px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border-radius: 10px;
  background: #1a1a1a;
  color: var(--color-primary);
}

.stat-value {
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  color: #8a8a8a;
  font-size: 12px;
}

.panel {
  margin-bottom: 18px;
  padding: 18px;
  border-radius: 12px;
  background: #161616;
}

.panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-head h3 {
  margin: 0;
  color: #fff;
  font-size: 15px;
}

.panel-head span {
  color: #8a8a8a;
  font-size: 12px;
}

.chart {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  height: 180px;
  align-items: end;
}

.chart-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
}

.chart-value {
  height: 14px;
  color: #7a7a7a;
  font-size: 10px;
  white-space: nowrap;
}

.chart-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  border-radius: 6px;
  background: #1f1f1f;
  overflow: hidden;
}

.chart-bar {
  width: 100%;
  border-radius: 6px 6px 0 0;
  background: #2f5f47;
  transition: height 0.3s ease;
}

.chart-bar.today {
  background: var(--color-primary);
}

.chart-label {
  color: #8a8a8a;
  font-size: 11px;
}

.rank-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
}

.rank-item:hover {
  background: #1e1e1e;
}

.rank-index {
  width: 20px;
  color: #8a8a8a;
  font-size: 12px;
  text-align: center;
}

.rank-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.rank-name {
  color: #fff;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-artist {
  color: #8a8a8a;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-meta {
  flex-shrink: 0;
  color: #999;
  font-size: 12px;
}

.artist-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.artist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
}

.artist-item:hover {
  background: #1e1e1e;
}

.artist-name {
  color: #fff;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artist-meta {
  flex-shrink: 0;
  color: #999;
  font-size: 12px;
}

.clear-stats {
  margin-top: 6px;
}

@media (max-width: 700px) {
  .stat-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart {
    height: 140px;
  }
}
</style>
