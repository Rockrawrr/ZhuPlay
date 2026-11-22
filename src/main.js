/**
 * 应用入口
 * 职责：创建 Vue 实例、挂载 Pinia、按顺序引入全局样式、兜底错误处理
 * 约定：未来接 vue-router 时也在这里注册，保持“入口只做装配”
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { router } from './router'
import { useToast } from '@/composables/useToast'

// 引入 ZhuPlay 全局样式
import './assets/styles/main.css'

// 播放器内部共用样式（图标按钮、滑块）
import './assets/styles/player.css'

// 通用 UI 原语（页面壳、按钮、空状态）
import './assets/styles/ui.css'

// 创建 Vue 应用
const app = createApp(App)

// 创建 Pinia
const pinia = createPinia()

// 注册 Pinia
app.use(pinia)

// 注册路由（hash 模式，桌面端用 file:// 也能直接跑）
app.use(router)

// 兜底错误处理：组件里抛出的异常不再直接白屏，至少给用户一个提示
app.config.errorHandler = (error, instance, info) => {
  console.error(`组件错误（${info}）：`, error, instance)

  try {
    const toast = useToast()
    toast.error('页面出现异常，操作可能未生效')
  } catch (toastError) {
    console.error('提示层不可用：', toastError)
  }
}

// 挂载应用
app.mount('#app')