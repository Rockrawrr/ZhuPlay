<script setup>
// 歌曲信息弹窗：展示标签信息与音频技术参数
import { computed, onMounted, onUnmounted } from "vue";
import { Info, X } from "lucide-vue-next";
import { useSongInfo } from "@/composables/useOverlays";
import { formatTime, formatDateTime } from "@/utils/format";
import SongCover from "@/components/common/SongCover.vue";

const { state, closeSongInfo } = useSongInfo();

function formatBitrate(bitrate) {
  return Number.isFinite(bitrate) && bitrate > 0
    ? `${Math.round(bitrate / 1000)} kbps`
    : "未知";
}

function formatSampleRate(rate) {
  return Number.isFinite(rate) && rate > 0
    ? `${(rate / 1000).toFixed(1)} kHz`
    : "未知";
}

// 只展示有值的字段，避免一排"未知"
const rows = computed(() => {
  const song = state.song;
  if (!song) return [];

  return [
    ["歌名", song.name],
    ["歌手", song.artist],
    ["专辑", song.album],
    ["专辑艺人", song.albumArtist],
    ["年份", song.year],
    ["流派", song.genre],
    ["音轨", song.trackNumber],
    ["时长", formatTime(song.duration, "未知")],
    ["格式", song.format?.toUpperCase()],
    ["码率", formatBitrate(song.bitrate)],
    ["采样率", formatSampleRate(song.sampleRate)],
    ["声道", song.channels],
    ["文件大小", song.size],
    ["文件名", song.filename],
    ["导入时间", formatDateTime(song.importedAt)],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");
});

function handleKeydown(event) {
  if (event.key === "Escape" && state.song) {
    event.stopPropagation();
    closeSongInfo();
  }
}

onMounted(() => window.addEventListener("keydown", handleKeydown, true));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown, true));
</script>

<template>
  <Teleport to="body">
    <Transition name="info">
      <div v-if="state.song" class="info-layer">
        <div class="info-backdrop" @click="closeSongInfo"></div>

        <div class="info-panel" role="dialog" aria-modal="true">
          <header class="info-header">
            <div class="info-cover">
              <SongCover
                :blob="state.song.cover"
                :alt="state.song.album || state.song.name"
              >
                <Info :size="18" />
              </SongCover>
            </div>

            <div class="info-heading">
              <h3>{{ state.song.name }}</h3>
              <p>{{ state.song.artist || "未知歌手" }}</p>
            </div>

            <button class="info-close" title="关闭" @click="closeSongInfo">
              <X :size="17" />
            </button>
          </header>

          <dl class="info-list">
            <div v-for="[label, value] in rows" :key="label" class="info-row">
              <dt>{{ label }}</dt>
              <dd :title="String(value)">{{ value }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.info-layer {
  position: fixed;
  inset: 0;
  z-index: 1280;
  display: grid;
  place-items: center;
  padding: 20px;
}

.info-backdrop {
  position: absolute;
  inset: 0;
  background: #0008;
}

.info-panel {
  position: relative;
  width: min(460px, 100%);
  max-height: 76vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #2c2c2c;
  border-radius: 14px;
  background: #1b1b1b;
  box-shadow: 0 24px 60px #000a;
  color: #fff;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid #282828;
}

.info-cover {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #282828;
  color: var(--color-primary);
}

.info-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info-heading {
  flex: 1;
  min-width: 0;
}

.info-heading h3 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-heading p {
  margin: 0;
  color: #999;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-close {
  display: grid;
  place-items: center;
  padding: 4px;
  border: none;
  background: transparent;
  color: #888;
  cursor: pointer;
}

.info-close:hover {
  color: #fff;
}

.info-list {
  margin: 0;
  padding: 8px 18px 16px;
  overflow-y: auto;
}

.info-row {
  display: flex;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #232323;
  font-size: 12.5px;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row dt {
  width: 76px;
  flex-shrink: 0;
  color: #8f8f8f;
}

.info-row dd {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: #e8e8e8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-enter-active,
.info-leave-active {
  transition: opacity 0.16s ease;
}

.info-enter-from,
.info-leave-to {
  opacity: 0;
}
</style>
