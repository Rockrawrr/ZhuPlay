// src/composables/useListeningStats.js
/**
 * 听歌统计（模块级单例）
 * 记录两件事：
 *   1. 每首歌的播放次数与累计收听秒数
 *   2. 每天的收听秒数（用于最近 7 天柱状图）
 * 写入策略：改动后 4 秒防抖落库，切歌/暂停/卸载时也会 flush，避免频繁写 IndexedDB
 */
import { onMounted, onUnmounted, ref, watch } from "vue";
import { usePlayerStore } from "@/stores/player";
import { getMusicStorage } from "@/app/services";
import { STORAGE_KEYS } from "@/storage/keys";

const EMPTY = () => ({
  plays: {},
  daily: {},
  totalPlays: 0,
  totalSeconds: 0,
  updatedAt: 0,
});

const state = ref(EMPTY());

let loaded = false;
let loadPromise = null;
// 加载完成前发生的操作先排队，读取完成后再按顺序重放（避免被 load 覆盖）
const pendingOps = [];
let dirty = false;
let flushTimer = null;

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useListeningStats() {
  const musicStorage = getMusicStorage();
  const playerStore = usePlayerStore();

  async function load() {
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        const saved = await musicStorage.getMusicData(STORAGE_KEYS.stats, null);
        if (saved && typeof saved === "object") {
          state.value = {
            ...EMPTY(),
            ...saved,
            plays: saved.plays ?? {},
            daily: saved.daily ?? {},
          };
        }
      } catch (error) {
        console.error("听歌统计读取失败：", error);
      }

      loaded = true;

      // 重放加载期间积累的操作
      while (pendingOps.length > 0) {
        pendingOps.shift()();
      }
    })();

    return loadPromise;
  }

  // 加载完成前先排队，完成后立即执行
  function runWhenLoaded(operation) {
    if (loaded) {
      operation();
      return;
    }

    pendingOps.push(operation);
    load();
  }

  async function flush() {
    if (!dirty) return;
    dirty = false;

    try {
      // 传纯对象，避免把 Proxy 写进 IndexedDB
      await musicStorage.saveMusicData(
        STORAGE_KEYS.stats,
        JSON.parse(JSON.stringify(state.value)),
      );
    } catch (error) {
      console.error("听歌统计保存失败：", error);
    }
  }

  function scheduleFlush() {
    dirty = true;
    if (flushTimer) return;

    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, 4000);
  }

  // 播放开始时调用：次数 +1
  function recordPlay(song) {
    if (!song?.id) return;

    runWhenLoaded(() => {
      const entry = state.value.plays[song.id] ?? {
        count: 0,
        seconds: 0,
        lastAt: 0,
      };

      entry.count += 1;
      entry.lastAt = Date.now();
      state.value.plays[song.id] = entry;
      state.value.totalPlays += 1;
      state.value.updatedAt = Date.now();
      scheduleFlush();
    });
  }

  // 累积收听秒数（同时记到当天与当前歌曲）
  function addSeconds(seconds) {
    if (!(seconds > 0)) return;

    runWhenLoaded(() => {
      const key = todayKey();
      state.value.daily[key] = (state.value.daily[key] ?? 0) + seconds;

      const song = playerStore.currentSong;
      if (song?.id) {
        const entry = state.value.plays[song.id] ?? {
          count: 0,
          seconds: 0,
          lastAt: 0,
        };
        entry.seconds += seconds;
        state.value.plays[song.id] = entry;
      }

      state.value.totalSeconds += seconds;
      state.value.updatedAt = Date.now();
      scheduleFlush();
    });
  }

  async function clearStats() {
    state.value = EMPTY();
    dirty = true;
    await flush();
  }

  // 在根组件里调用一次：加载历史 + 跟随播放进度累计
  function initStats() {
    load();

    watch(
      () => playerStore.currentTime,
      (time, previous) => {
        if (!playerStore.isPlaying) return;

        const delta = time - previous;
        // 只累计正常的进度推进；拖动进度条造成的跳变（>5s）忽略
        if (delta > 0 && delta <= 5) addSeconds(delta);
      },
    );

    onMounted(() => window.addEventListener("beforeunload", flush));

    onUnmounted(() => {
      window.removeEventListener("beforeunload", flush);
      flush();
    });
  }

  return {
    state,
    load,
    flush,
    recordPlay,
    addSeconds,
    clearStats,
    initStats,
    todayKey,
  };
}
