<script setup>
// 全屏歌词页（网易云风格）：
// 背景是模糊的专辑封面 + 暗色遮罩，中间逐句滚动高亮，底部保留进度与上一首/下一首
// 入口：点击播放条左下角的歌曲区域，或播放条右侧歌词按钮
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  ChevronLeft,
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from "lucide-vue-next";
import { useObjectUrl } from "@/composables/useObjectUrl";
import { findLyricIndex, parseLyrics } from "@/utils/lyrics";
import ProgressBar from "@/components/player/ProgressBar.vue";
import VolumeControl from "@/components/player/VolumeControl.vue";

const props = defineProps({
  song: {
    type: Object,
    default: null,
  },
  currentTime: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number,
    default: 0,
  },
  isPlaying: {
    type: Boolean,
    default: false,
  },
  volume: {
    type: Number,
    default: 1,
  },
  muted: {
    type: Boolean,
    default: false,
  },
  queueOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "close",
  "seek",
  "toggle-play",
  "previous",
  "next",
  "volume-change",
  "toggle-mute",
  "toggle-queue",
]);

const listRef = ref(null);
const coverUrl = useObjectUrl(() => props.song?.cover ?? null);

const parsed = computed(() => parseLyrics(props.song?.lyrics || ""));

const activeIndex = computed(() =>
  parsed.value.synced
    ? findLyricIndex(parsed.value.lines, props.currentTime)
    : -1,
);

const hasLyrics = computed(() => parsed.value.lines.length > 0);

const backdropStyle = computed(() =>
  coverUrl.value
    ? { backgroundImage: `url("${coverUrl.value}")` }
    : undefined,
);

// 当前句滚到中间
watch(activeIndex, async (index) => {
  if (index < 0) return;
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const activeLine = listRef.value?.querySelector(".lyrics-line.active");
  activeLine?.scrollIntoView({ block: "center", behavior: "smooth" });
});

// 刚打开时自动定位到当前行，避免停在顶部
function scrollToActive(behavior = "auto") {
  const activeLine = listRef.value?.querySelector(".lyrics-line.active");
  activeLine?.scrollIntoView({ block: "center", behavior });
}

onMounted(() => {
  scrollToActive("auto");
  window.addEventListener("keydown", handleKeydown, true);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown, true);
});

function handleKeydown(event) {
  if (event.key !== "Escape") return;
  event.stopPropagation();
  emit("close");
}

function handleLineClick(line) {
  if (!parsed.value.synced || line.time < 0) return;
  emit("seek", line.time);
}
</script>

<template>
  <Teleport to="body">
    <section class="lyrics-screen" role="dialog" aria-modal="true">
      <div class="lyrics-backdrop" :style="backdropStyle"></div>
      <div class="lyrics-scrim"></div>

      <header class="lyrics-top">
        <div class="lyrics-heading">
          <button class="lyrics-round" title="收起歌词（Esc）" @click="emit('close')">
            <ChevronLeft :size="20" />
          </button>

          <div class="lyrics-song">
            <h2 :title="song?.name">{{ song?.name || "尚未播放歌曲" }}</h2>
            <p>{{ song?.artist || "未知歌手" }}</p>
          </div>
        </div>

        <div class="lyrics-top-actions">
          <span v-if="parsed.synced" class="lyrics-badge">逐句歌词</span>
          <button class="lyrics-round" title="关闭（Esc）" @click="emit('close')">
            <X :size="19" />
          </button>
        </div>
      </header>

      <main ref="listRef" class="lyrics-body">
        <div v-if="!hasLyrics" class="lyrics-empty">
          <p>暂无歌词</p>
          <span>
            内嵌歌词会在导入时自动读取；桌面端可以把同名 .lrc 放在音频旁边后重新导入
          </span>
        </div>

        <template v-else>
          <p
            v-for="(line, index) in parsed.lines"
            :key="`${index}-${line.time}`"
            class="lyrics-line"
            :class="{
              active: index === activeIndex,
              past: activeIndex >= 0 && index < activeIndex,
              clickable: parsed.synced && line.time >= 0,
            }"
            @click="handleLineClick(line)"
          >
            {{ line.text || "♪" }}
          </p>
        </template>
      </main>

      <footer class="lyrics-footer">
        <ProgressBar
          class="lyrics-progress"
          :current-time="currentTime"
          :duration="duration"
          @seek="emit('seek', $event)"
        />

        <div class="lyrics-bottom">
          <span class="lyrics-spacer" aria-hidden="true"></span>

          <div class="lyrics-controls">
            <button
              class="lyrics-control"
              :disabled="!song"
              title="上一首"
              @click="emit('previous')"
            >
              <SkipBack :size="20" />
            </button>

            <button
              class="lyrics-play"
              :disabled="!song"
              :title="isPlaying ? '暂停' : '播放'"
              @click="emit('toggle-play')"
            >
              <Pause v-if="isPlaying" :size="22" fill="currentColor" />
              <Play v-else :size="22" fill="currentColor" />
            </button>

            <button
              class="lyrics-control"
              :disabled="!song"
              title="下一首"
              @click="emit('next')"
            >
              <SkipForward :size="20" />
            </button>
          </div>

          <div class="lyrics-actions">
            <button
              class="lyrics-control"
              :class="{ active: queueOpen }"
              title="播放队列"
              @click="emit('toggle-queue')"
            >
              <ListMusic :size="20" />
            </button>

            <VolumeControl
              class="lyrics-volume"
              :volume="volume"
              :muted="muted"
              @volume-change="emit('volume-change', $event)"
              @toggle-mute="emit('toggle-mute')"
            />
          </div>
        </div>
      </footer>
    </section>
  </Teleport>
</template>

<style scoped>
.lyrics-screen {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
}

/* 背景：封面模糊放大 */
.lyrics-backdrop {
  position: absolute;
  inset: -60px;
  background: center / cover no-repeat #1c1c1c;
  filter: blur(70px) saturate(1.25) brightness(0.75);
  transform: scale(1.15);
}

/* 遮罩：中间压暗，保证文字可读 */
.lyrics-scrim {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(0, 0, 0, 0.35) 0%, rgba(10, 10, 10, 0.92) 100%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.5), rgba(10, 10, 10, 0.95));
}

.lyrics-top {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 30px;
}

.lyrics-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.lyrics-song {
  min-width: 0;
}

.lyrics-song h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lyrics-song p {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.lyrics-top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.lyrics-badge {
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(30, 215, 96, 0.16);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 600;
}

.lyrics-round {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s ease;
}

.lyrics-round:hover {
  background: rgba(255, 255, 255, 0.18);
}

.lyrics-body {
  position: relative;
  z-index: 2;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12vh 24px 20vh;
  text-align: center;
  scrollbar-width: thin;
  scroll-behavior: smooth;
}

.lyrics-body::-webkit-scrollbar {
  width: 6px;
}

.lyrics-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.lyrics-line {
  max-width: 760px;
  margin: 0 auto 22px;
  color: rgba(255, 255, 255, 0.42);
  font-size: 17px;
  line-height: 1.6;
  transition:
    color 0.25s ease,
    transform 0.25s ease,
    font-size 0.25s ease;
}

.lyrics-line.past {
  color: rgba(255, 255, 255, 0.24);
}

.lyrics-line.active {
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  transform: scale(1.02);
  text-shadow: 0 2px 24px rgba(30, 215, 96, 0.35);
}

.lyrics-line.clickable {
  cursor: pointer;
}

.lyrics-line.clickable:hover {
  color: rgba(255, 255, 255, 0.78);
}

.lyrics-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 40vh;
  color: rgba(255, 255, 255, 0.55);
  text-align: center;
}

.lyrics-empty p {
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 18px;
  font-weight: 600;
}

.lyrics-empty span {
  max-width: 420px;
  font-size: 13px;
  line-height: 1.8;
}

.lyrics-footer {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  padding: 0 24px 26px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 进度条占满底栏并居中（ProgressBar 默认 max-width: 520px） */
:deep(.progress-container) {
  max-width: 100%;
}

.lyrics-bottom {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
}

.lyrics-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.lyrics-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
}

.lyrics-control.active {
  color: var(--color-primary);
}

.lyrics-control {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
}

.lyrics-control:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.lyrics-play {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: #fff;
  color: #000;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.lyrics-play:hover:not(:disabled) {
  transform: scale(1.05);
}

.lyrics-control:disabled,
.lyrics-play:disabled {
  opacity: 0.35;
  cursor: default;
}

@media (max-width: 700px) {
  .lyrics-top {
    padding: 16px;
  }

  .lyrics-body {
    padding: 8vh 16px 16vh;
  }

  .lyrics-line {
    font-size: 15px;
    margin-bottom: 18px;
  }

  .lyrics-line.active {
    font-size: 19px;
  }

  .lyrics-footer {
    padding: 0 18px 20px;
  }

  /* 窄屏：控制仍居中，音量交给系统，只保留队列按钮 */
  .lyrics-bottom {
    grid-template-columns: 1fr auto 1fr;
    gap: 8px;
  }

  .lyrics-volume {
    display: none;
  }
}
</style>
