<script setup>
// src/views/Settings.vue
// 设置页：本地存储用量、数据统计、数据清理、关于
// 说明：目前只有“数据管理”类设置，播放偏好等选项等有明确需求再加
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { Database, FolderOpen, HardDrive, Info, Trash2 } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { usePlaylistStore } from "@/stores/playlist";
import { usePlayerStore } from "@/stores/player";
import { getMusicStorage } from "@/app/services";
import { useMusicActions } from "@/composables/useMusicActions";
import { usePlaylistActions } from "@/composables/usePlaylistActions";
import { useToast } from "@/composables/useToast";
import { useConfirm } from "@/composables/useConfirm";
import { formatBytes } from "@/utils/format";
import { pathOnly, setPathOnly } from "@/utils/appSettings";
import { exportBackup, importBackup } from "@/services/backupService";
import PageHeader from "@/components/common/PageHeader.vue";
import DuplicateCleanupDialog from "@/components/overlays/DuplicateCleanupDialog.vue";

const musicStore = useMusicStore();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();

const musicStorage = getMusicStorage();

const { clearRecentSongs, clearAllSongs, releaseStoredAudio } = useMusicActions();
const { clearAllPlaylists } = usePlaylistActions();
const toast = useToast();
const { confirm } = useConfirm();

const { songs, favoriteSongs } = storeToRefs(musicStore);
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

// 配额接近用尽时提醒（浏览器一般到 100% 才会拒绝写入，提前预警）
const isStorageTight = computed(
  () => storage.value.quota > 0 && storage.value.usage / storage.value.quota >= 0.8,
);

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

// 清除所有歌曲 / 歌单：二次确认与落库都在对应 composable 里
function handleClearSongs() {
  clearAllSongs();
}

function handleClearPlaylists() {
  clearAllPlaylists();
}

// ===== 桌面端「仅保存路径」 =====

function handlePathOnlyChange(enabled) {
  setPathOnly(enabled);
  toast.success(
    enabled
      ? "已开启：之后导入的歌曲只保存路径"
      : "已关闭：之后导入的歌曲会复制音频到曲库",
  );
}

async function handleReleaseStoredAudio() {
  const storedCount = songs.value.filter(
    (song) => song.file instanceof Blob && song.filePath,
  ).length;

  if (storedCount === 0) {
    toast.info("没有可释放的音频副本");
    return;
  }

  const confirmed = await confirm({
    title: "释放音频副本",
    message: `将删除 ${storedCount} 首歌曲在曲库里的音频副本（原文件不受影响）。之后只能从原路径播放，文件移动或删除后将无法播放。`,
    confirmText: "释放",
    danger: true,
  });
  if (!confirmed) return;

  const { released, skipped } = await releaseStoredAudio();
  toast.success(
    `已释放 ${released} 首${skipped > 0 ? `，${skipped} 首无路径跳过` : ""}`,
  );
  await loadStorage();
}

// ===== 数据目录与备份 =====

const isDesktop = Boolean(window.zhuplayDesktop?.isDesktop);
const dataPath = ref("");
const dataInfo = ref({ current: "", default: "", isCustom: false });

// 迁移数据时的进度与遮罩
const isMigrating = ref(false);
const showDuplicateCleanup = ref(false);
const migrateProgress = ref({ done: 0, total: 0 });
let unsubscribeProgress = null;

const migratePercent = computed(() => {
  const { done, total } = migrateProgress.value;
  if (!total) return 0;
  return Math.min(100, Math.round((done / total) * 100));
});

onMounted(async () => {
  if (!isDesktop) return;

  try {
    const info = await window.zhuplayDesktop.getDataInfo();
    dataInfo.value = info;
    dataPath.value = info.current;

    unsubscribeProgress = window.zhuplayDesktop.onDataDirProgress(
      (progress) => {
        migrateProgress.value = progress;
      },
    );
  } catch (error) {
    console.error("读取数据目录失败：", error);
  }
});

onUnmounted(() => {
  unsubscribeProgress?.();
});

async function handleOpenDataFolder() {
  if (!isDesktop) return;

  const error = await window.zhuplayDesktop.openDataFolder();
  if (error) toast.error("打开目录失败");
}

// 更改数据目录：复制现有数据 → 重启（IndexedDB 位置由 userData 决定，必须重启）
async function handleChangeDataDir() {
  if (!isDesktop || isMigrating.value) return;

  const target = await window.zhuplayDesktop.chooseDataDir();
  if (!target) return;

  const confirmed = await confirm({
    title: "更改数据目录",
    message: `会把当前数据（约 ${formatBytes(storage.value.usage)}）复制到：\n${target}\n\n复制完成后应用会自动重启。原目录的数据不会删除。`,
    confirmText: "开始迁移",
  });
  if (!confirmed) return;

  isMigrating.value = true;

  const result = await window.zhuplayDesktop.changeDataDir(target);

  if (!result?.ok) {
    isMigrating.value = false;
    toast.error(result?.error || "迁移失败，请换个目录重试");
    return;
  }

  toast.success("迁移完成，正在重启…");
  setTimeout(() => window.zhuplayDesktop.relaunch(), 800);
}

// 恢复默认数据目录：把数据复制回默认位置再重启
async function handleResetDataDir() {
  if (!isDesktop || isMigrating.value) return;

  const confirmed = await confirm({
    title: "恢复默认数据目录",
    message: `会把数据复制回默认位置：\n${dataInfo.value.default}\n\n复制完成后应用会自动重启。`,
    confirmText: "恢复默认",
  });
  if (!confirmed) return;

  isMigrating.value = true;

  const result = await window.zhuplayDesktop.resetDataDir();

  if (!result?.ok) {
    isMigrating.value = false;
    toast.error(result?.error || "恢复失败，请重试");
    return;
  }

  toast.success("已复制回默认目录，正在重启…");
  setTimeout(() => window.zhuplayDesktop.relaunch(), 800);
}

async function handleExportBackup() {
  try {
    const result = await exportBackup();

    if (!result) return;
    if (result === "download") toast.success("备份文件已下载");
    else toast.success(`已导出到 ${result}`);
  } catch (error) {
    console.error("导出备份失败：", error);
    toast.error("导出失败，请重试");
  }
}

async function handleImportBackup() {
  const confirmed = await confirm({
    title: "导入备份",
    message:
      "会与当前数据合并：歌单、收藏、最近播放与听歌统计。不会删除现有内容；歌曲按「文件名 + 大小」匹配，没匹配上的歌会被跳过。",
    confirmText: "导入",
  });
  if (!confirmed) return;

  try {
    const summary = await importBackup();
    if (!summary) return;

    const playlistText = summary.playlists.length
      ? `，新增 ${summary.playlists.length} 个歌单`
      : "";

    toast.success(
      `导入完成：匹配 ${summary.matched} 首，跳过 ${summary.missing} 首${playlistText}`,
    );
  } catch (error) {
    console.error("导入备份失败：", error);
    toast.error("导入失败：不是有效的备份文件");
  }
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
    await musicStorage.clearAll();
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
            <div
              class="usagebar-fill"
              :class="{ tight: isStorageTight }"
              :style="{ width: `${usagePercent}%` }"
            ></div>
          </div>
          <p class="panel-hint">
            已用 {{ formatBytes(storage.usage) }} / 可用配额
            {{ formatBytes(storage.quota) }}（{{ usagePercent }}%）
          </p>
          <p v-if="isStorageTight" class="panel-hint storage-warning">
            存储空间即将用尽，建议清理重复歌曲或删除不需要的歌曲，否则新导入可能失败。
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

      <!-- 数据与备份 -->
      <section class="panel">
        <h3 class="panel-title"><FolderOpen :size="17" /> 数据与备份</h3>

        <div v-if="isDesktop" class="action-row">
          <div class="action-text">
            <strong>
              数据目录
              <span v-if="dataInfo.isCustom" class="data-badge">自定义</span>
            </strong>
            <span class="data-path" :title="dataPath">{{ dataPath || "读取中…" }}</span>
          </div>

          <div class="row-actions">
            <button class="ghost-button" @click="handleOpenDataFolder">
              打开
            </button>
            <button
              class="ghost-button"
              :disabled="isMigrating"
              @click="handleChangeDataDir"
            >
              更改
            </button>
            <button
              v-if="dataInfo.isCustom"
              class="ghost-button"
              :disabled="isMigrating"
              @click="handleResetDataDir"
            >
              恢复默认
            </button>
          </div>
        </div>

        <div v-if="isDesktop" class="action-row">
          <div class="action-text">
            <strong>仅保存路径</strong>
            <span>
              新导入的歌曲只记录文件位置，不复制音频，最多省一半磁盘；
              文件被移动或删除后无法播放
            </span>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              :checked="pathOnly"
              @change="handlePathOnlyChange($event.target.checked)"
            />
            <span class="switch-track"></span>
          </label>
        </div>

        <div v-if="isDesktop && pathOnly" class="action-row">
          <div class="action-text">
            <strong>释放已保存的音频副本</strong>
            <span>把已导入歌曲的音频副本从曲库删掉，只保留路径（原文件不动）</span>
          </div>
          <button class="ghost-button" @click="handleReleaseStoredAudio">
            释放
          </button>
        </div>

        <div class="action-row">
          <div class="action-text">
            <strong>导出备份</strong>
            <span>歌单 / 收藏 / 最近播放 / 听歌统计，不含音频（几百 KB）</span>
          </div>
          <button class="ghost-button" @click="handleExportBackup">导出</button>
        </div>

        <div class="action-row">
          <div class="action-text">
            <strong>导入备份</strong>
            <span>与当前数据合并，按「文件名 + 大小」匹配本地歌曲</span>
          </div>
          <button class="ghost-button" @click="handleImportBackup">导入</button>
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

        <div class="action-row">
          <div class="action-text">
            <strong>清理重复歌曲</strong>
            <span>检测同名同大小的重复曲目，可选择每组保留哪一条</span>
          </div>
          <button class="ghost-button" @click="showDuplicateCleanup = true">
            检查
          </button>
        </div>

        <div class="action-row danger">
          <div class="action-text">
            <strong>清除所有歌曲</strong>
            <span>
              删除曲库全部歌曲，收藏、最近播放与队列同步清空；歌单保留但会变空
            </span>
          </div>
          <button class="ghost-button danger" @click="handleClearSongs">
            清除
          </button>
        </div>

        <div class="action-row danger">
          <div class="action-text">
            <strong>清除所有歌单</strong>
            <span>删除全部歌单，曲库歌曲与收藏不受影响</span>
          </div>
          <button class="ghost-button danger" @click="handleClearPlaylists">
            清除
          </button>
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
      </section>
    </div>

    <!-- 数据目录迁移遮罩：复制期间不允许操作 -->
    <div v-if="isMigrating" class="migrate-mask">
      <div class="migrate-card">
        <strong>正在迁移数据</strong>
        <p v-if="migrateProgress.total">
          {{ migrateProgress.done }} / {{ migrateProgress.total }} 个文件
        </p>
        <p v-else>正在准备…</p>

        <div class="migrate-bar">
          <div class="migrate-fill" :style="{ width: `${migratePercent}%` }"></div>
        </div>

        <span class="migrate-hint">请勿关闭应用，完成后会自动重启</span>
      </div>
    </div>

    <!-- 重复歌曲清理 -->
    <DuplicateCleanupDialog
      v-if="showDuplicateCleanup"
      @close="showDuplicateCleanup = false"
    />
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

.panel-title {  display: flex;
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

/* 数据目录路径：过长时省略，悬停看完整路径 */
.data-path {
  max-width: 460px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #7f9c8c;
  font-size: 12px;
}

.data-badge {
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 8px;
  background: #1e3a2c;
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 600;
  vertical-align: middle;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 迁移遮罩 */
.migrate-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(4px);
}

.migrate-card {
  width: min(380px, calc(100vw - 40px));
  padding: 22px;
  border-radius: 12px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  color: #fff;
  text-align: center;
}

.migrate-card strong {
  display: block;
  font-size: 15px;
  margin-bottom: 8px;
}

.migrate-card p {
  margin: 0 0 14px;
  color: #9a9a9a;
  font-size: 12px;
}

.migrate-bar {
  height: 6px;
  border-radius: 3px;
  background: #2a2a2a;
  overflow: hidden;
}

.migrate-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.2s ease;
}

.migrate-hint {
  display: block;
  margin-top: 12px;
  color: #6f6f6f;
  font-size: 11px;
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

.usagebar-fill.tight {
  background: #e06262;
}

.storage-warning {
  margin-top: 6px;
  color: #e79393;
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

/* 开关 */
.switch {
  position: relative;
  display: inline-flex;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
  cursor: pointer;
}

.switch input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.switch-track {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 11px;
  background: #3a3a3a;
  transition: background 0.2s ease;
}

.switch-track::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
}

.switch input:checked + .switch-track {
  background: var(--color-primary);
}

.switch input:checked + .switch-track::after {
  transform: translateX(18px);
}

.switch input:focus-visible + .switch-track {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
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
