// src/composables/useKeyboardShortcuts.js
/**
 * 全局快捷键（桌面端体验）
 *   空格            播放 / 暂停
 *   ← / →           快退 / 快进 5 秒
 *   Shift + ← / →   上一首 / 下一首
 *   Ctrl/Cmd + F    跳到搜索
 * 输入框内、或任意浮层打开时不拦截
 */
import { onMounted, onUnmounted } from "vue";
import { usePlayerStore } from "@/stores/player";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useNavigation } from "@/composables/useNavigation";
import { useConfirm } from "@/composables/useConfirm";
import {
  useContextMenu,
  usePlaylistPicker,
  useSongInfo,
} from "@/composables/useOverlays";

const SEEK_STEP = 5;

export function useKeyboardShortcuts() {
  const playerStore = usePlayerStore();
  const { togglePlay, playNext, playPrevious, seek } = useAudioPlayer();
  const { navigateTo } = useNavigation();
  const { state: confirmState } = useConfirm();
  const { state: menuState } = useContextMenu();
  const { state: pickerState } = usePlaylistPicker();
  const { state: infoState } = useSongInfo();

  function isTyping(target) {
    if (!target) return false;
    const tag = target.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      Boolean(target.isContentEditable)
    );
  }

  function overlayOpen() {
    return (
      confirmState.visible ||
      menuState.visible ||
      pickerState.songs.length > 0 ||
      Boolean(infoState.song)
    );
  }

  function handleKeydown(event) {
    if (event.defaultPrevented || isTyping(event.target) || overlayOpen()) return;

    const withModifier = event.ctrlKey || event.metaKey;

    // Ctrl/Cmd + F：搜索
    if (withModifier && event.key.toLowerCase() === "f") {
      event.preventDefault();
      navigateTo("search");
      return;
    }

    // 其它带修饰键的组合不接管（留给系统 / 浏览器）
    if (withModifier || event.altKey) return;

    if (!playerStore.currentSong) return;

    switch (event.key) {
      case " ":
        event.preventDefault();
        togglePlay();
        break;

      case "ArrowRight":
        event.preventDefault();
        if (event.shiftKey) playNext();
        else seek(Math.min(playerStore.duration, playerStore.currentTime + SEEK_STEP));
        break;

      case "ArrowLeft":
        event.preventDefault();
        if (event.shiftKey) playPrevious();
        else seek(Math.max(0, playerStore.currentTime - SEEK_STEP));
        break;

      default:
        break;
    }
  }

  onMounted(() => window.addEventListener("keydown", handleKeydown));
  onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
}
