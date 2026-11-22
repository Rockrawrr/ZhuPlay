<script setup>
// 歌词面板：贴在播放条上方，跟随播放进度高亮当前行，点歌词可跳转
// 数据来源：导入时解析的内嵌歌词 / 桌面端同目录 .lrc，都存成字符串存在歌曲上
import { computed, nextTick, ref, watch } from "vue";
import { Music2, X } from "lucide-vue-next";
import { findLyricIndex, parseLyrics } from "@/utils/lyrics";

const props = defineProps({
  song: {
    type: Object,
    default: null,
  },
  currentTime: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["close", "seek"]);

const listRef = ref(null);

const parsed = computed(() => parseLyrics(props.song?.lyrics || ""));

const activeIndex = computed(() =>
  parsed.value.synced
    ? findLyricIndex(parsed.value.lines, props.currentTime)
    : -1,
);

const hasLyrics = computed(() => parsed.value.lines.length > 0);

// 高亮行变化时把它滚到可视区中间
watch(activeIndex, async (index) => {
  if (index < 0) return;
  await nextTick();
  const activeLine = listRef.value?.querySelector(".lyrics-line.active");
  activeLine?.scrollIntoView({ block: "center", behavior: "smooth" });
});

function handleLineClick(line) {
  if (!parsed.value.synced || line.time < 0) return;
  emit("seek", line.time);
}
</script>

<template>
  <section class="lyrics-panel">
    <header class="lyrics-header">
      <div class="lyrics-title">
        <span class="lyrics-label">歌词</span>
        <span class="lyrics-song">{{ song?.name || "尚未播放歌曲" }}</span>
      </div>

      <div class="lyrics-actions">
        <span v-if="parsed.synced" class="lyrics-badge">逐句</span>
        <button class="lyrics-close" title="关闭歌词" @click="emit('close')">
          <X :size="17" />
        </button>
      </div>
    </header>

    <div v-if="!hasLyrics" class="lyrics-empty">
      <Music2 :size="26" />
      <p>暂无歌词</p>
      <span>
        内嵌歌词会在导入时自动读取；桌面端也可以把同名 .lrc
        放在音频旁边后重新导入
      </span>
    </div>

    <div v-else ref="listRef" class="lyrics-body">
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
    </div>
  </section>
</template>

<style scoped>
.lyrics-panel {
  position: fixed;
  left: 240px;
  right: 0;
  bottom: 90px;
  height: min(46vh, 420px);
  display: flex;
  flex-direction: column;
  background: rgba(18, 18, 18, 0.96);
  backdrop-filter: blur(18px);
  border-top: 1px solid #242424;
  z-index: 40;
}

.lyrics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 22px;
  border-bottom: 1px solid #1f1f1f;
}

.lyrics-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.lyrics-label {
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.lyrics-song {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lyrics-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.lyrics-badge {
  padding: 2px 8px;
  border-radius: 10px;
  background: #1e3a2c;
  color: var(--color-primary);
  font-size: 11px;
}

.lyrics-close {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #b3b3b3;
  cursor: pointer;
}

.lyrics-close:hover {
  background: #242424;
  color: #fff;
}

.lyrics-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 26px 24px 60px;
  text-align: center;
  scrollbar-width: thin;
}

.lyrics-body::-webkit-scrollbar {
  width: 6px;
}

.lyrics-body::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}

.lyrics-line {
  margin: 0 0 14px;
  color: #7a7a7a;
  font-size: 15px;
  line-height: 1.7;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.lyrics-line.past {
  color: #4d4d4d;
}

.lyrics-line.active {
  color: #fff;
  font-size: 17px;
  font-weight: 650;
  transform: scale(1.02);
}

.lyrics-line.clickable {
  cursor: pointer;
}

.lyrics-line.clickable:hover {
  color: #d8d8d8;
}

.lyrics-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: #6f6f6f;
  text-align: center;
}

.lyrics-empty p {
  margin: 0;
  color: #d0d0d0;
  font-size: 14px;
}

.lyrics-empty span {
  max-width: 420px;
  font-size: 12px;
  line-height: 1.7;
}

@media (max-width: 700px) {
  .lyrics-panel {
    left: 64px;
    height: min(52vh, 380px);
  }

  .lyrics-body {
    padding: 18px 14px 48px;
  }

  .lyrics-line {
    font-size: 14px;
  }

  .lyrics-line.active {
    font-size: 15px;
  }
}
</style>
