<script setup>
// src/views/Settings.vue
// 设置页：本地存储用量、数据统计、数据清理、关于
// 说明：目前只有“数据管理”类设置，播放偏好等选项等有明确需求再加
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Database, HardDrive, Info, Trash2 } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { usePlaylistStore } from "@/stores/playlist";
import { usePlayerStore } from "@/stores/player";
import { getMusicStorage, getPlaylistStorage } from "@/app/services";
import { useMusicActions } from "@/composables/useMusicActions";
import { useToast } from "@/composables/useToast";
import { useConfirm } from "@/composables/useConfirm";
import PageHeader from "@/components/PageHeader.vue";

const musicStore = useMusicStore();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();

const musicStorage = getMusicStorage();
const playlistStorage = getPlaylistStorage();

const { clearRecentSongs } = useMusicActions();
const toast = useToast();
const { confirm } = useConfirm();

const { songs, favoriteSongs, recentSongs } = storeToRefs(musicStore);
const { playlists } = storeToRefs(playlistStore);
const { queue } = storeToRefs(playerStore);

// 存储用量（浏览器估算值，部分浏览器不支持）
const storage = ref({ supported: false, usage: 0, quota: 0 });

// 版本号由 vite define 从 package.json 注入
const version = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";

const usagePercent = computed(() => {
  if (!storage.value.quota) return 0;

  return Math.min(100, Math.round((storage.value.usage / storage.value.quota) * 100));
});

const stats = computed(() => [
  { label: "歌曲", value: songs.value.length },
  { label: "收藏", value: favoriteSongs.value.length },
  { label: "歌单", value: playlists.value.length },
  { label: "队列", value: queue.value.length },
]);

onMounted(loadStorage);

async function loadStorage() {
  if (!navigator.storage?.estimate) return;

  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    storage.value = { supported: true, usage, quota };
  } catch (error) {
    console.error("存储用量读取失败：", error);
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

// 清空最近播放：useMusicActions 里已含二次确认与落库
function handleClearRecent() {
  clearRecentSongs();
}

function handleClearQueue() {
  if (queue.value.length === 0) {
    toast.info("播放队列已经是空的");
    return;
  }

  playerStore.clearQueue();
  toast.success("播放队列已清空");
}

// 清空全部数据：删除歌曲、收藏、歌单与播放记录，然后刷新
async function handleClearAll() {
  const confirmed = await confirm({
    title: "清空全部数据",
    message: "将删除本地的全部歌曲、收藏、歌单与播放记录，且无法恢复。",
    confirmText: "全部删除",
    danger: true,
  });
  if (!confirmed) return;

  try {
    await Promise.all([musicStorage.clearAll(), playlistStorage.clearAll()]);
    window.location.reload();
  } catch (error) {
    console.error("清空数据失败：", error);
    toast.error("清空失败，请重试");
  }
}
</script>

<template>
  <section class="page-shell">
    <div class="settings-inner">
      <PageHeader title="设置" subtitle="本地数据与版本信息" />

      <!-- 存储用量 -->
      <section class="panel">
        <h3 class="panel-title"><HardDrive :size="17" /> 存储用量</h3>

        <template v-if="storage.supported">
          <div class="usagebar">
            <div class="usagebar-fill" :style="{ width: `${usagePercent}%` }"></div>
          </div>
          <p class="panel-hint">
            已用 {{ formatBytes(storage.usage) }} / 可用配额
            {{ formatBytes(storage.quota) }}（{{ usagePercent }}%）
          </p>
        </template>

        <p v-else class="panel-hint">当前浏览器不支持存储用量查询</p>
      </section>

      <!-- 数据统计 -->
      <section class="panel">
        <h3 class="panel-title"><Database :size="17" /> 本地数据</h3>

        <div class="stats">
          <div v-for="item in stats" :key="item.label" class="stat">
            <span class="stat-value">{{ item.value }}</span>
            <span class="stat-label">{{ item.label }}</span>
          </div>
        </div>
      </section>

      <!-- 数据管理 -->
      <section class="panel">
        <h3 class="panel-title"><Trash2 :size="17" /> 数据管理</h3>

        <div class="action-row">
          <div class="action-text">
            <strong>清空最近播放</strong>
            <span>只清除播放记录，不影响歌曲与歌单</span>
          </div>
          <button class="ghost-button" @click="handleClearRecent">清空</button>
        </div>

        <div class="action-row">
          <div class="action-text">
            <strong>清空播放队列</strong>
            <span>当前队列会变空，正在播放的歌曲不受影响</span>
          </div>
          <button class="ghost-button" @click="handleClearQueue">清空</button>
        </div>

        <div class="action-row danger">
          <div class="action-text">
            <strong>清空全部数据</strong>
            <span>删除歌曲、收藏、歌单与播放记录，不可恢复</span>
          </div>
          <button class="ghost-button danger" @click="handleClearAll">删除</button>
        </div>
      </section>

      <!-- 关于 -->
      <section class="panel">
        <h3 class="panel-title"><Info :size="17" /> 关于</h3>
        <p class="panel-hint">
          ZhuPlay v{{ version }} · Vue 3 + Vite + Pinia + IndexedDB
        </p>
        <p class="panel-hint">所有数据保存在本机浏览器中，不上传服务器。</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
/* 设置内容居中成一列，避免宽屏下贴在左上角 */
.settings-inner {
  width: 100%;
  max-width: 780px;
  margin: 0 auto;
}

.panel {
  margin: 0 0 18px;
  padding: 18px 20px;
  border: 1px solid #232323;
  border-radius: 12px;
  background: #181818;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 650;
}

.panel-hint {
  margin: 0;
  color: #999;
  font-size: 12px;
  line-height: 1.7;
}

/* 存储条 */
.usagebar {
  height: 8px;
  margin-bottom: 10px;
  border-radius: 4px;
  background: #2a2a2a;
  overflow: hidden;
}

.usagebar-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s ease;
}

/* 统计 */
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  background: #202020;
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  color: #999;
  font-size: 12px;
}

/* 操作行 */
.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid #232323;
}

.action-row:first-of-type {
  border-top: none;
  padding-top: 0;
}

.action-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-text strong {
  font-size: 13px;
  font-weight: 600;
}

.action-text span {
  color: #999;
  font-size: 12px;
}

.action-row.danger strong {
  color: #ff8a8a;
}

@media (max-width: 700px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .action-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
