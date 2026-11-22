import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'

// 引入 Bootstrap 样式
import 'bootstrap/dist/css/bootstrap.min.css'

// 引入 ZhuPlay 全局样式
import './assets/styles/main.css'

// 播放器内部共用样式（图标按钮、滑块）
import './assets/styles/player.css'

// 创建 Vue 应用
const app = createApp(App)

// 创建 Pinia
const pinia = createPinia()

// 注册 Pinia
app.use(pinia)

// 挂载应用
app.mount('#app')