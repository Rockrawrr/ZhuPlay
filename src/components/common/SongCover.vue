<script setup>
// 封面图：把歌曲里的 cover Blob 按需转成 URL，卸载时自动回收
// 没有封面时渲染默认内容（slot）
import { useObjectUrl } from "@/composables/useObjectUrl";

const props = defineProps({
  blob: {
    type: Blob,
    default: null,
  },
  alt: {
    type: String,
    default: "",
  },
});

const url = useObjectUrl(() => props.blob);
</script>

<template>
  <img v-if="url" class="cover-image" :src="url" :alt="alt" loading="lazy" />
  <slot v-else />
</template>

<style scoped>
.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
