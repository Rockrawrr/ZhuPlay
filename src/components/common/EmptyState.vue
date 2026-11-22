<script setup>
// 统一空状态：图标 + 标题 + 说明 + 可选操作按钮
// compact 用于首页这类嵌在区块里的小空状态
import { Music2 } from "lucide-vue-next";

defineProps({
  title: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  compact: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <div class="state" :class="{ compact }">
    <div class="state-icon">
      <slot name="icon"><Music2 :size="22" /></slot>
    </div>

    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>

    <div v-if="$slots.default" class="state-actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 44px 24px;
  border: 1px dashed #2c2c2c;
  border-radius: 14px;
  background:
    radial-gradient(circle at 50% 0%, #1a2b23 0%, transparent 65%),
    #161616;
  text-align: center;
  color: #8f8f8f;
}

.state-icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  margin-bottom: 2px;
  border-radius: 50%;
  background: #1e2b25;
  color: #7fbfa1;
}

.state h3 {
  margin: 0;
  color: #efefef;
  font-size: 16px;
  font-weight: 650;
}

.state p {
  margin: 0;
  max-width: 380px;
  font-size: 13px;
  line-height: 1.7;
  text-wrap: pretty;
}

.state-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
}

/* 嵌在首页区块里的小号空状态 */
.state.compact {
  padding: 26px 20px;
  gap: 8px;
  border-style: solid;
  border-color: #232323;
  background: #181818;
}

.state.compact .state-icon {
  width: 40px;
  height: 40px;
}

.state.compact h3 {
  font-size: 14px;
}

.state.compact p {
  font-size: 12px;
}

@media (max-width: 700px) {
  .state {
    padding: 32px 18px;
  }

  .state h3 {
    font-size: 15px;
  }
}
</style>
