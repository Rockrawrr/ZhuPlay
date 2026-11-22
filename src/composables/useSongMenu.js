// src/composables/useSongMenu.js
/**
 * 歌曲右键菜单的菜单项定义
 * 调用方只需给出「在哪一行、右键了什么、属于哪个列表」，具体项由这里统一构建
 * context: { source: "library" | "favorites" | "recent" | "recent-imported" | "search" | "playlist", list?, onRemove? }
 */
import {
  Copy,
  Heart,
  Info,
  ListPlus,
  Play,
  SkipForward,
  Trash2,
  X,
} from "lucide-vue-next";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useMusicStore } from "@/stores/music";
import { usePlayerStore } from "@/stores/player";
import { useMusicActions } from "@/composables/useMusicActions";
import {
  useContextMenu,
  usePlaylistPicker,
  useSongInfo,
} from "@/composables/useOverlays";
import { useToast } from "@/composables/useToast";
import { useConfirm } from "@/composables/useConfirm";

export function useSongMenu() {
  const { open } = useContextMenu();
  const musicStore = useMusicStore();
  const playerStore = usePlayerStore();

  const { playSong } = useAudioPlayer();
  const { toggleFavorite, removeSong, removeRecentSong } = useMusicActions();
  const { openPlaylistPicker } = usePlaylistPicker();
  const { openSongInfo } = useSongInfo();
  const { confirm } = useConfirm();
  const toast = useToast();

  async function copyTitle(song) {
    const text = song.artist ? `${song.name} - ${song.artist}` : song.name;

    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制歌名");
    } catch (error) {
      console.error("复制失败：", error);
      toast.error("复制失败，请检查浏览器权限");
    }
  }

  async function deleteSong(song) {
    const confirmed = await confirm({
      title: "删除歌曲",
      message: `将从音乐库删除「${song.name}」，并同时把它从收藏、歌单和播放记录中移除。`,
      confirmText: "删除",
      danger: true,
    });
    if (!confirmed) return;

    await removeSong(song.id);
  }

  // 右键打开菜单
  function openSongMenu(event, song, context = {}) {
    if (!song) return;

    const list =
      Array.isArray(context.list) && context.list.length > 0
        ? context.list
        : [song];
    const isFavorite = musicStore.favoriteSongs.includes(song.id);

    const items = [
      {
        id: "play",
        label: "播放",
        icon: Play,
        action: () => playSong(song, list),
      },
      {
        id: "play-next",
        label: "下一首播放",
        icon: SkipForward,
        action: () => {
          playerStore.insertNext(song);
          toast.success("已设为下一首播放");
        },
      },
      { type: "separator" },
      {
        id: "favorite",
        label: isFavorite ? "取消喜欢" : "添加到喜欢",
        icon: Heart,
        action: () => toggleFavorite(song.id),
      },
      {
        id: "add-to-playlist",
        label: "添加到歌单…",
        icon: ListPlus,
        action: () => openPlaylistPicker(song),
      },
      { type: "separator" },
      {
        id: "info",
        label: "歌曲信息",
        icon: Info,
        action: () => openSongInfo(song),
      },
      {
        id: "copy",
        label: "复制歌名",
        icon: Copy,
        action: () => copyTitle(song),
      },
    ];

    if (context.source === "playlist") {
      items.push(
        { type: "separator" },
        {
          id: "remove-from-playlist",
          label: "从歌单移除",
          icon: X,
          action: () => context.onRemove?.(song),
        },
      );
    } else if (context.source === "recent") {
      items.push(
        { type: "separator" },
        {
          id: "remove-from-recent",
          label: "从最近播放移除",
          icon: X,
          action: () => removeRecentSong(song.id),
        },
      );
    } else if (context.source === "library") {
      items.push(
        { type: "separator" },
        {
          id: "delete",
          label: "删除歌曲",
          icon: Trash2,
          danger: true,
          action: () => deleteSong(song),
        },
      );
    }

    open(event, items);
  }

  return { openSongMenu };
}
