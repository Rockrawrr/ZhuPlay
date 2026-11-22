// src/composables/useMediaSession.js
/**
 * 系统媒体控制（Windows 的媒体弹窗 / 键盘媒体键 / 蓝牙耳机按键）
 * 走的是浏览器标准 navigator.mediaSession，Electron 里同样生效
 * 只在桌面端挂载：Web 端也支持，但网页短暂播放时提示框容易打扰
 */
import { onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { usePlayerStore } from "@/stores/player";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useObjectUrl } from "@/composables/useObjectUrl";

export function useMediaSession() {
  const playerStore = usePlayerStore();
  const { currentSong, isPlaying } = storeToRefs(playerStore);

  const { playNext, playPrevious, togglePlay } = useAudioPlayer();

  // 封面按需转 URL，切歌时自动换、卸载时释放
  const artworkUrl = useObjectUrl(() => currentSong.value?.cover ?? null);

  const supported = typeof navigator !== "undefined" && "mediaSession" in navigator;

  function updateMetadata() {
    if (!supported) return;

    const song = currentSong.value;

    if (!song) {
      navigator.mediaSession.metadata = null;
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.name,
      artist: song.artist || "未知歌手",
      album: song.album || "",
      artwork: artworkUrl.value
        ? [{ src: artworkUrl.value, sizes: "512x512", type: "image/png" }]
        : [],
    });
  }

  function updatePlaybackState() {
    if (!supported) return;

    if (!currentSong.value) {
      navigator.mediaSession.playbackState = "none";
    } else {
      navigator.mediaSession.playbackState = isPlaying.value ? "playing" : "paused";
    }
  }

  watch([currentSong, artworkUrl], updateMetadata);
  watch(isPlaying, updatePlaybackState);

  onMounted(() => {
    if (!supported) return;

    updateMetadata();
    updatePlaybackState();

    navigator.mediaSession.setActionHandler("play", () => {
      if (!isPlaying.value) togglePlay();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      if (isPlaying.value) togglePlay();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => playNext());
    navigator.mediaSession.setActionHandler("previoustrack", () =>
      playPrevious(),
    );

    // 拖动系统媒体弹窗上的进度条（部分系统支持）
    navigator.mediaSession.setActionHandler("seekto", (event) => {
      if (!Number.isFinite(event.seekTime)) return;
      const audio = document.querySelector("audio");
      if (audio) audio.currentTime = event.seekTime;
    });
  });

  onUnmounted(() => {
    if (!supported) return;

    for (const action of [
      "play",
      "pause",
      "nexttrack",
      "previoustrack",
      "seekto",
    ]) {
      navigator.mediaSession.setActionHandler(action, null);
    }
  });
}
