<script setup>
// 统一对话框渲染层：挂在 App 根部，Teleport 到 body
// 支持两种模式：确认（confirm）与文本输入（prompt）
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { AlertTriangle, X } from "lucide-vue-next";
import { useConfirm } from "@/composables/useConfirm";

const { state, settle } = useConfirm();

const inputRef = ref(null);

const isPrompt = computed(() => state.mode === "prompt");

// prompt 模式下没有内容时禁用确认，避免创建空名歌单
const canConfirm = computed(() => {
  if (!isPrompt.value) return true;
  return Boolean(String(state.value ?? "").trim());
});

// 打开时自动聚焦输入框
watch(
  () => state.visible,
  async (visible) => {
    if (!visible) return;
    await nextTick();
    if (isPrompt.value) inputRef.value?.select();
  },
);

function handleConfirm() {
  if (!canConfirm.value) return;

  settle(isPrompt.value ? String(state.value).trim() : true);
}

function handleCancel() {
  settle(isPrompt.value ? null : false);
}

// 键盘：捕获阶段监听，优先于其它组件的 Escape（队列面板、歌单弹层等）
function handleWindowKeydown(event) {
  if (!state.visible) return;

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    handleCancel();
    return;
  }

  if (event.key === "Enter" && !event.isComposing) {
    event.preventDefault();
    event.stopPropagation();
    handleConfirm();
  }
}

onMounted(() => window.addEventListener("keydown", handleWindowKeydown, true));
onUnmounted(() =>
  window.removeEventListener("keydown", handleWindowKeydown, true),
);
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="state.visible"
        class="dialog-layer"
        role="dialog"
        aria-modal="true"
      >
        <div class="dialog-backdrop" @click="handleCancel"></div>

        <div class="dialog-panel">
          <header class="dialog-header">
            <span class="dialog-icon" :class="{ danger: state.danger }">
              <AlertTriangle :size="18" />
            </span>
            <h3>{{ state.title }}</h3>
            <button class="dialog-close" title="关闭" @click="handleCancel">
              <X :size="17" />
            </button>
          </header>

          <p v-if="state.message" class="dialog-message">{{ state.message }}</p>

          <input
            v-if="isPrompt"
            ref="inputRef"
            v-model="state.value"
            class="dialog-input"
            type="text"
            :placeholder="state.placeholder"
            maxlength="40"
          />

          <footer class="dialog-footer">
            <button class="ghost-button" @click="handleCancel">
              {{ state.cancelText }}
            </button>
            <button
              class="primary-button"
              :class="{ danger: state.danger }"
              :disabled="!canConfirm"
              @click="handleConfirm"
            >
              {{ state.confirmText }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: grid;
  place-items: center;
  padding: 20px;
}

.dialog-backdrop {
  position: absolute;
  inset: 0;
  background: #0008;
}

.dialog-panel {
  position: relative;
  width: min(420px, 100%);
  padding: 20px;
  border: 1px solid #2c2c2c;
  border-radius: 14px;
  background: #1b1b1b;
  box-shadow: 0 24px 60px #000a;
  color: #fff;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.dialog-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #2a2a2a;
  color: #d6d6d6;
}

.dialog-icon.danger {
  background: #3a1f1f;
  color: #ff8a8a;
}

.dialog-header h3 {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 16px;
  font-weight: 650;
}

.dialog-close {
  display: grid;
  place-items: center;
  padding: 4px;
  border: none;
  background: transparent;
  color: #888;
  cursor: pointer;
}

.dialog-close:hover {
  color: #fff;
}

.dialog-message {
  margin: 0 0 16px;
  color: #a8a8a8;
  font-size: 13px;
  line-height: 1.7;
  text-wrap: pretty;
}

.dialog-input {
  width: 100%;
  margin-bottom: 18px;
  padding: 11px 14px;
  border: 1px solid #333;
  border-radius: 10px;
  outline: none;
  background: #232323;
  color: #fff;
  font-size: 14px;
}

.dialog-input:focus {
  border-color: var(--color-primary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.primary-button.danger {
  background: #e5484d;
  color: #fff;
}

.primary-button.danger:hover:not(:disabled) {
  background: #f2565b;
}

/* 进出场 */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.18s ease;
}

.dialog-enter-active .dialog-panel,
.dialog-leave-active .dialog-panel {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-panel,
.dialog-leave-to .dialog-panel {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
