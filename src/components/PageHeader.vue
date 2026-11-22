<script setup>
// 页面统一头部：返回按钮 + 标题 / 副标题 + 右侧操作区
// 二级页面都复用它，保证标题字号、间距、返回按钮位置一致
import { ArrowLeft } from "lucide-vue-next";
import { useNavigation } from "@/composables/useNavigation";

defineProps({
  title: {
    type: String,
    default: "",
  },
  subtitle: {
    type: String,
    default: "",
  },
  // 首页等入口页不需要返回按钮
  back: {
    type: Boolean,
    default: true,
  },
});

const { canGoBack, goBack } = useNavigation();
</script>

<template>
  <header class="page-header">
    <button
      v-if="back"
      class="back-button"
      :disabled="!canGoBack"
      title="返回上一页"
      @click="goBack"
    >
      <ArrowLeft :size="19" />
    </button>

    <div class="header-text">
      <h2>{{ title }}</h2>
      <p v-if="subtitle || $slots.subtitle" class="header-subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </p>
    </div>

    <div v-if="$slots.actions" class="header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  flex-shrink: 0;
}

.header-text {
  min-width: 0;
  margin-right: auto;
}

.header-text h2 {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.header-subtitle {
  margin: 0;
  color: #999;
  font-size: 13px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

@media (max-width: 700px) {
  .page-header {
    flex-wrap: wrap;
    gap: 10px;
  }

  .header-text h2 {
    font-size: 20px;
  }

  .header-actions {
    width: 100%;
  }
}
</style>
