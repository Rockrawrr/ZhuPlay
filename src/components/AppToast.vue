<script setup>
// 全局提示渲染层：挂在 App 根部，用 Teleport 放到 body，避免被布局的 overflow 裁掉
// 点击任意一条可立即关闭
import { CheckCircle2, AlertCircle, Info } from "lucide-vue-next";
import { useToast } from "@/composables/useToast";

const { toasts, remove } = useToast();
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast-${toast.type}`"
        role="status"
        @click="remove(toast.id)"
      >
        <CheckCircle2 v-if="toast.type === 'success'" :size="16" />
        <AlertCircle v-else-if="toast.type === 'error'" :size="16" />
        <Info v-else :size="16" />
        <span class="toast-text">{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  left: 50%;
  bottom: 104px;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transform: translateX(-50%);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(420px, calc(100vw - 40px));
  padding: 10px 16px;
  border: 1px solid #2f2f2f;
  border-radius: 22px;
  background: #232323;
  box-shadow: 0 10px 26px #0007;
  color: #f2f2f2;
  font-size: 13px;
  cursor: pointer;
  pointer-events: auto;
}

.toast-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toast-success {
  border-color: #1ed76055;
  color: #b7f5cd;
}

.toast-success svg {
  color: var(--color-primary);
}

.toast-error {
  border-color: #ff6b6b55;
  color: #ffc2c2;
}

.toast-error svg {
  color: #ff6b6b;
}

.toast-info svg {
  color: #b3b3b3;
}

/* 进出场动画 */
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
