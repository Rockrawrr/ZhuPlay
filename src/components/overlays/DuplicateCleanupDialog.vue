<script setup>
// 重复歌曲清理：按「文件名 + 大小」分组，每组选一条保留，其余删除
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { Copy, Trash2, X } from "lucide-vue-next";
import { useMusicStore } from "@/stores/music";
import { useMusicActions } from "@/composables/useMusicActions";
import { useConfirm } from "@/composables/useConfirm";
import { findDuplicateGroups } from "@/utils/dedupe";

const emit = defineEmits(["close"]);

const musicStore = useMusicStore();
const { removeSongs } = useMusicActions();
const { confirm } = useConfirm();

const groups = computed(() => findDuplicateGroups(musicStore.songs));

// 每组保留哪一条，默认第一条（最早导入的）
const keepIds = ref({});

watch(
  groups,
  (list) => {
    const next = { ...keepIds.value };
    for (const group of list) {
      if (!next[group.key]) next[group.key] = group.songs[0].id;
    }
    keepIds.value = next;
  },
  { immediate: true },
);

// 除"保留"之外的所有歌曲都是待删除项
const duplicateIds = computed(() =>
  groups.value.flatMap((group) =>
    group.songs
      .filter((song) => song.id !== keepIds.value[group.key])
      .map((song) => song.id),
  ),
);

const duplicateCount = computed(() => duplicateIds.value.length);

function chooseKeep(group, song) {
  keepIds.value = { ...keepIds.value, [group.key]: song.id };
}

async function handleRemove() {
  if (duplicateCount.value === 0) return;

  const confirmed = await confirm({
    title: "删除重复歌曲",
    message: `将删除 ${duplicateCount.value} 首重复歌曲（每组保留 1 首）。删除后无法恢复，歌曲会同时从歌单与收藏中移除。`,
    confirmText: "删除重复",
    danger: true,
  });
  if (!confirmed) return;

  await removeSongs(duplicateIds.value);
  emit("close");
}

function handleKeydown(event) {
  if (event.key === "Escape") emit("close");
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
</script>

<template>
  <Teleport to="body">
    <div class="dup-layer">
      <div class="dup-backdrop" @click="emit('close')"></div>

      <section class="dup-dialog" role="dialog" aria-label="清理重复歌曲">
        <header class="dup-header">
          <div class="dup-heading">
            <h3><Copy :size="17" /> 清理重复歌曲</h3>
            <p>按「文件名 + 大小」判定重复</p>
          </div>
          <button class="dup-icon" title="关闭" @click="emit('close')">
            <X :size="18" />
          </button>
        </header>

        <div v-if="groups.length === 0" class="dup-empty">
          <p>没有发现重复歌曲</p>
          <span>同一个文件导入多次才会被判定为重复</span>
        </div>

        <template v-else>
          <p class="dup-summary">
            发现 {{ groups.length }} 组重复，共 {{ duplicateCount }} 首多余 ——
            每组选一条保留，其余会被删除
          </p>

          <ul class="dup-list">
            <li v-for="group in groups" :key="group.key" class="dup-group">
              <div class="dup-group-head">
                <span class="dup-group-name">
                  {{ group.songs[0].name }}
                  <span class="dup-group-count">{{ group.songs.length }} 首</span>
                </span>
                <span class="dup-group-meta">
                  {{ group.songs[0].size || "" }}
                </span>
              </div>

              <button
                v-for="song in group.songs"
                :key="song.id"
                class="dup-row"
                :class="{ keep: keepIds[group.key] === song.id }"
                @click="chooseKeep(group, song)"
              >
                <span class="dup-radio" aria-hidden="true"></span>
                <span class="dup-row-text">
                  <span class="dup-row-name">{{ song.filename }}</span>
                  <span class="dup-row-meta">
                    歌手 {{ song.artist || "未知" }} · 导入于
                    {{ new Date(song.importedAt).toLocaleString("zh-CN") }}
                  </span>
                </span>
                <span class="dup-row-tag">
                  {{ keepIds[group.key] === song.id ? "保留" : "删除" }}
                </span>
              </button>
            </li>
          </ul>
        </template>

        <footer class="dup-footer">
          <button class="ghost-button" @click="emit('close')">
            {{ groups.length === 0 ? "关闭" : "取消" }}
          </button>
          <button
            v-if="groups.length > 0"
            class="ghost-button danger"
            :disabled="duplicateCount === 0"
            @click="handleRemove"
          >
            <Trash2 :size="15" /> 删除 {{ duplicateCount }} 首重复
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.dup-layer {
  position: fixed;
  inset: 0;
  z-index: 860;
}

.dup-backdrop {
  position: absolute;
  inset: 0;
  background: #0007;
}

.dup-dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(620px, calc(100vw - 40px));
  max-height: 78vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  background: #181818;
  box-shadow: 0 20px 50px #000a;
  color: #fff;
}

.dup-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid #262626;
}

.dup-heading h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
}

.dup-heading p {
  margin: 6px 0 0;
  color: #8a8a8a;
  font-size: 12px;
}

.dup-icon {
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

.dup-icon:hover {
  background: #262626;
  color: #fff;
}

.dup-summary {
  margin: 0;
  padding: 12px 18px;
  color: #9a9a9a;
  font-size: 12px;
  border-bottom: 1px solid #222;
}

.dup-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin: 0;
  padding: 10px 12px;
  list-style: none;
}

.dup-group {
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 10px;
  background: #1c1c1c;
}

.dup-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 6px 8px;
}

.dup-group-name {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dup-group-count {
  margin-left: 8px;
  padding: 1px 7px;
  border-radius: 8px;
  background: #2a2a2a;
  color: #b3b3b3;
  font-size: 11px;
  font-weight: 400;
}

.dup-group-meta {
  flex-shrink: 0;
  color: #7a7a7a;
  font-size: 11px;
}

.dup-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #d0d0d0;
  text-align: left;
  cursor: pointer;
}

.dup-row:hover {
  background: #242424;
}

.dup-row.keep {
  border-color: #2f5f47;
  background: #17241d;
}

.dup-radio {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 1.5px solid #555;
  border-radius: 50%;
}

.dup-row.keep .dup-radio {
  border-color: var(--color-primary);
  background:
    radial-gradient(
      circle at center,
      var(--color-primary) 0 4px,
      transparent 4.5px
    );
}

.dup-row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dup-row-name {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dup-row-meta {
  color: #7a7a7a;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dup-row-tag {
  flex-shrink: 0;
  color: #8a8a8a;
  font-size: 11px;
}

.dup-row.keep .dup-row-tag {
  color: var(--color-primary);
  font-weight: 600;
}

.dup-empty {
  padding: 40px 20px;
  text-align: center;
  color: #8a8a8a;
}

.dup-empty p {
  margin: 0 0 8px;
  color: #d0d0d0;
  font-size: 14px;
}

.dup-empty span {
  font-size: 12px;
}

.dup-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid #262626;
}

.dup-footer .ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dup-footer .ghost-button.danger {
  color: #ff7b7b;
  border-color: #4a2626;
}

.dup-footer .ghost-button.danger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
