<script setup>
// 右键菜单渲染层：挂在 App 根部，Teleport 到 body
// 负责：按点击坐标定位、靠近边缘时自动翻转方向、键盘导航、点外部/Esc/滚动关闭
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useContextMenu } from "@/composables/useOverlays";

const { state, close } = useContextMenu();

const menuRef = ref(null);
const position = ref({ left: 0, top: 0 });

// 可键盘选中的项（跳过分隔线与禁用项）
const enabledIndexes = computed(() =>
  state.items
    .map((item, index) => (item.type === "separator" || item.disabled ? -1 : index))
    .filter((index) => index >= 0),
);

async function placeMenu() {
  await nextTick();

  const el = menuRef.value;
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const padding = 8;

  let left = state.x;
  let top = state.y;

  // 贴近右边缘 → 向左展开；贴近底部 → 向上展开
  if (left + rect.width + padding > window.innerWidth) {
    left = state.x - rect.width;
  }
  if (top + rect.height + padding > window.innerHeight) {
    top = state.y - rect.height;
  }

  position.value = {
    left: Math.max(padding, left),
    top: Math.max(padding, top),
  };

  el.focus();
}

watch(
  () => state.visible,
  (visible) => {
    if (!visible) return;
    // 先放到点击位置，测完尺寸再修正
    position.value = { left: state.x, top: state.y };
    placeMenu();
  },
);

function run(item) {
  if (!item || item.type === "separator" || item.disabled) return;

  close();
  item.action?.();
}

function moveActive(step) {
  const indexes = enabledIndexes.value;
  if (indexes.length === 0) return;

  const current = indexes.indexOf(state.activeIndex);
  const next = current === -1
    ? (step > 0 ? 0 : indexes.length - 1)
    : (current + step + indexes.length) % indexes.length;

  state.activeIndex = indexes[next];
}

function handleKeydown(event) {
  if (!state.visible) return;

  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveActive(1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveActive(-1);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    run(state.items[state.activeIndex]);
  }
}

function handlePointerDown(event) {
  if (!state.visible) return;
  if (menuRef.value?.contains(event.target)) return;

  close();
}

function handleWindowChange() {
  if (state.visible) close();
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("mousedown", handlePointerDown, true);
  window.addEventListener("scroll", handleWindowChange, true);
  window.addEventListener("resize", handleWindowChange);
  window.addEventListener("blur", handleWindowChange);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("mousedown", handlePointerDown, true);
  window.removeEventListener("scroll", handleWindowChange, true);
  window.removeEventListener("resize", handleWindowChange);
  window.removeEventListener("blur", handleWindowChange);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state.visible"
      ref="menuRef"
      class="context-menu"
      role="menu"
      tabindex="-1"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      <template v-for="(item, index) in state.items" :key="item.id ?? `sep-${index}`">
        <div v-if="item.type === 'separator'" class="menu-separator"></div>

        <button
          v-else
          class="menu-item"
          :class="{
            danger: item.danger,
            disabled: item.disabled,
            active: state.activeIndex === index,
          }"
          role="menuitem"
          :disabled="item.disabled"
          @mouseenter="state.activeIndex = index"
          @click="run(item)"
        >
          <component :is="item.icon" v-if="item.icon" :size="16" class="menu-icon" />
          <span class="menu-label">{{ item.label }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1250;
  min-width: 200px;
  padding: 6px;
  border: 1px solid #2e2e2e;
  border-radius: 10px;
  background: #1e1e1e;
  box-shadow: 0 18px 40px #0009;
  outline: none;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #e6e6e6;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
}

.menu-item:hover,
.menu-item.active {
  background: #2f2f2f;
  color: #fff;
}

.menu-item.danger {
  color: #ff8a8a;
}

.menu-item.danger:hover,
.menu-item.danger.active {
  background: #3a2020;
  color: #ffb3b3;
}

.menu-item.disabled {
  opacity: 0.4;
  cursor: default;
}

.menu-icon {
  flex-shrink: 0;
  color: #9d9d9d;
}

.menu-item.danger .menu-icon {
  color: #ff8a8a;
}

.menu-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-separator {
  height: 1px;
  margin: 5px 6px;
  background: #2b2b2b;
}
</style>
