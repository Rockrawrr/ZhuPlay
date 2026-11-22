<script setup>
/**
 * 固定行高的虚拟列表
 * 只渲染可视区 + overscan 范围内的行，上万条数据也不会卡：
 * 滚动容器自己持有 scrollTop，内部用撑高的占位层 + translateY 定位真实行
 *
 * 使用前提：每一项的高度固定（itemHeight），并且插槽内容不能超过这个高度
 */
import { computed, onMounted, onUnmounted, ref } from "vue";

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  itemHeight: {
    type: Number,
    default: 60,
  },
  // 可视区上下额外渲染的行数，滚动时更顺滑
  overscan: {
    type: Number,
    default: 6,
  },
  // 取唯一 key：字符串字段名或函数
  itemKey: {
    type: [String, Function],
    default: "id",
  },
});

const viewport = ref(null);
const scrollTop = ref(0);
const viewportHeight = ref(0);

let observer = null;

function measure() {
  viewportHeight.value = viewport.value?.clientHeight ?? 0;
}

const totalHeight = computed(() => props.items.length * props.itemHeight);

const visibleCount = computed(() =>
  Math.max(1, Math.ceil(viewportHeight.value / props.itemHeight)),
);

const startIndex = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan),
);

const endIndex = computed(() =>
  Math.min(
    props.items.length,
    startIndex.value + visibleCount.value + props.overscan * 2,
  ),
);

const offsetY = computed(() => startIndex.value * props.itemHeight);

const visibleItems = computed(() =>
  props.items
    .slice(startIndex.value, endIndex.value)
    .map((item, offset) => ({ item, index: startIndex.value + offset })),
);

function keyOf(entry) {
  if (typeof props.itemKey === "function") return props.itemKey(entry.item);
  return entry.item?.[props.itemKey] ?? entry.index;
}

function handleScroll(event) {
  scrollTop.value = event.target.scrollTop;
}

onMounted(() => {
  measure();
  observer = new ResizeObserver(measure);
  if (viewport.value) observer.observe(viewport.value);
});

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<template>
  <div ref="viewport" class="virtual-viewport" @scroll.passive="handleScroll">
    <div class="virtual-spacer" :style="{ height: `${totalHeight}px` }">
      <div class="virtual-window" :style="{ transform: `translateY(${offsetY}px)` }">
        <template v-for="entry in visibleItems" :key="keyOf(entry)">
          <slot :item="entry.item" :index="entry.index" />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-viewport {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.virtual-viewport::-webkit-scrollbar {
  width: 8px;
}

.virtual-viewport::-webkit-scrollbar-track {
  background: transparent;
}

.virtual-viewport::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.virtual-viewport::-webkit-scrollbar-thumb:hover {
  background: #666;
}

.virtual-spacer {
  position: relative;
}

.virtual-window {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  will-change: transform;
}
</style>
