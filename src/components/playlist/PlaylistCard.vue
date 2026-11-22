<script setup>
// 歌单卡片（纯展示）：封面占位、名称、歌曲数、创建日期 + 重命名/删除入口
// 卡片整体点击 = 打开歌单，所以内部按钮都要 .stop 阻止冒泡
import { ListMusic, Pencil, Trash2 } from "lucide-vue-next";
import { formatDate } from "@/utils/format";

defineProps({
  playlist: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["open", "rename", "delete"]);
</script>

<template>
  <article class="playlist-card" @click="emit('open')">
    <div class="playlist-cover">
      <ListMusic :size="34" />
    </div>

    <div class="playlist-info">
      <h3 :title="playlist.name">{{ playlist.name }}</h3>
      <p>{{ playlist.songIds.length }} 首 · {{ formatDate(playlist.createdAt) }}</p>
    </div>

    <div class="playlist-actions">
      <button class="icon-action" title="重命名" @click.stop="emit('rename')">
        <Pencil :size="16" />
      </button>
      <button
        class="icon-action danger"
        title="删除歌单"
        @click.stop="emit('delete')"
      >
        <Trash2 :size="16" />
      </button>
    </div>
  </article>
</template>

<style scoped>
.playlist-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border-radius: 10px;
  background: #181818;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.playlist-card:hover {
  background: #282828;
  transform: translateY(-2px);
}

.playlist-cover {
  width: 64px;
  height: 64px;
  min-width: 64px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: linear-gradient(135deg, #2f6b55, #16241f);
  color: #d9f7e4;
}

.playlist-info {
  flex: 1;
  min-width: 0;
}

.playlist-info h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-info p {
  margin: 5px 0 0;
  color: #999;
  font-size: 12px;
}

.playlist-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.playlist-card:hover .playlist-actions {
  opacity: 1;
}

@media (max-width: 700px) {
  .playlist-actions {
    opacity: 1;
  }
}
</style>
