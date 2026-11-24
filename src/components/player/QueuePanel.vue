<script setup>
// 播放队列面板：展示当前队列、高亮正在播放的一行、点击其它行直接切歌
// 点歌时沿用当前队列作为上下文，保证“下一首”不会跳出这个列表
import { onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { ListMusic, Music2, Play, X } from "lucide-vue-next";
import { usePlayerStore } from "@/stores/player";
import { useAudioPlayer } from "@/composables/useAudioPlayer";
import { useConfirm } from "@/composables/useConfirm";
import SongCover from "@/components/common/SongCover.vue";
import VirtualList from "@/components/common/VirtualList.vue";

const emit = defineEmits(["close"]);

const playerStore = usePlayerStore();
const { queue, currentIndex } = storeToRefs(playerStore);
const { playSong } = useAudioPlayer();
const { state: confirmState } = useConfirm();

// 点击队列里的歌曲：沿用当前队列作为上下文，避免上下文丢失
function playAt(index) {
  if (index === currentIndex.value) return;
  const song = queue.value[index];
  if (song) playSong(song, queue.value);
}

function handleKeydown(event) {
  if (event.key !== "Escape") return;
  // 全局对话框打开时，Esc 先交给它处理
  if (confirmState.visible) return;

  emit("close");
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
</script>

<template>
  <div class="queue-layer">
    <div class="queue-backdrop" @click="emit('close')"></div>

    <aside class="queue-panel" role="dialog" aria-label="播放队列">
      <header class="queue-header">
        <div class="queue-title">
          <ListMusic :size="18" />
          <h3>播放队列</h3>
          <span class="queue-total">{{ queue.length }} 首</span>
        </div>

        <button class="queue-close" title="关闭" @click="emit('close')">
          <X :size="17" />
        </button>
      </header>

      <div v-if="queue.length === 0" class="queue-empty">
        <Music2 :size="34" />
        <p>队列还是空的</p>
        <span>在任意列表里点一首歌，就会从这里开始排队</span>
      </div>

      <div v-else class="queue-list-wrap">
        <VirtualList :items="queue" :item-height="50">
          <template #default="{ item: song, index }">
            <div
              class="queue-item"
              :class="{ current: index === currentIndex }"
            >
              <button
                class="queue-item-button"
                :disabled="index === currentIndex"
                :title="index === currentIndex ? '正在播放' : `播放 ${song.name}`"
                @click="playAt(index)"
              >
                <span class="queue-index">
                  <Play
                    v-if="index === currentIndex"
                    :size="13"
                    fill="currentColor"
                  />
                  <template v-else>{{ index + 1 }}</template>
                </span>

                <span class="queue-cover">
                  <SongCover :blob="song.cover" :alt="song.album || song.name">
                    <Music2 :size="16" />
                  </SongCover>
                </span>

                <span class="queue-info">
                  <span class="queue-name">{{ song.name }}</span>
                  <span class="queue-artist">
                    {{ song.artist || song.filename }}
                  </span>
                </span>
              </button>
            </div>
          </template>
        </VirtualList>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.queue-layer {
  position: fixed;
  inset: 0;
  z-index: 900;
}

.queue-backdrop {
  position: absolute;
  inset: 0;
  background: #0006;
}

.queue-panel {
  position: absolute;
  right: 16px;
  bottom: 100px;
  width: 340px;
  max-height: 46vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  background: #181818;
  box-shadow: 0 16px 40px #000a;
  color: #fff;
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #282828;
  flex-shrink: 0;
}

.queue-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #b3b3b3;
}

.queue-title h3 {
  margin: 0;
  color: #fff;
  font-size: 15px;
  font-weight: 650;
}

.queue-total {
  font-size: 12px;
  color: #b3b3b3;
}

.queue-close {
  display: grid;
  place-items: center;
  padding: 4px;
  border: none;
  background: transparent;
  color: #b3b3b3;
  cursor: pointer;
}

.queue-close:hover {
  color: #fff;
}

.queue-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 36px 20px;
  color: #888;
  text-align: center;
}

.queue-empty p {
  margin: 0;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.queue-empty span {
  font-size: 12px;
  line-height: 1.6;
}

.queue-list-wrap {
  flex: 1;
  min-height: 0;
  padding: 6px;
}

.queue-item {
  height: 50px;
}

.queue-item-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #b3b3b3;
  text-align: left;
  cursor: pointer;
}

.queue-item-button:hover:not(:disabled) {
  background: #282828;
  color: #fff;
}

.queue-item-button:disabled {
  cursor: default;
}

.queue-index {
  width: 18px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: #888;
}

.queue-cover {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 4px;
  background: #282828;
  color: #1ed760;
}

.queue-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.queue-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.queue-name,
.queue-artist {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.queue-name {
  font-size: 13px;
  color: #fff;
}

.queue-artist {
  font-size: 11px;
  color: #999;
}

/* 正在播放的那一行 */
.queue-item.current .queue-index,
.queue-item.current .queue-name {
  color: #1ed760;
}

@media (max-width: 700px) {
  .queue-panel {
    right: 8px;
    left: 8px;
    width: auto;
    bottom: 96px;
    max-height: 52vh;
  }
}
</style>
