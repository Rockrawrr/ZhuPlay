# ZhuPlay

本地音乐播放器（Vue 3 + Vite + Pinia + IndexedDB），目标是在浏览器端先把功能做完整，再封装为桌面应用。

## 目录结构

```
zhuplay
├─ index.html
├─ jsconfig.json
├─ package.json
├─ package-lock.json
├─ vite.config.js
├─ public
│  └─ favicon.ico
└─ src
   ├─ main.js
   ├─ App.vue                  # 组合根（只做装配与渲染）
   ├─ api                      # 云同步接口（预留，尚未实现）
   ├─ app                      # 应用装配层
   │  ├─ services.js           # storage / audio 单例
   │  ├─ useAppBootstrap.js    # 启动恢复：曲库 / 收藏 / 最近播放 / 歌单
   │  └─ useQueuePersistence.js# 播放队列持久化
   ├─ assets
   │  └─ styles
   │     ├─ main.css           # 全局样式与主题变量
   │     ├─ player.css         # 播放器共用控件样式
   │     └─ ui.css             # 通用 UI 原语（页面壳、按钮、空状态）
   ├─ components
   │  ├─ AddToPlaylistDialog.vue # 添加到歌单弹窗
   │  ├─ AppToast.vue          # 全局提示层
   │  ├─ Sidebar.vue           # 侧边栏导航
   │  ├─ SongItem.vue          # 歌曲行
   │  ├─ player                # 播放器 UI
   │  │  ├─ PlayerBar.vue      # 播放条容器（持有状态）
   │  │  ├─ TrackInfo.vue      # 封面 / 歌名 / 喜欢
   │  │  ├─ PlaybackControls.vue # 随机、上一首、播放、下一首、循环
   │  │  ├─ ProgressBar.vue    # 播放进度
   │  │  ├─ VolumeControl.vue  # 音量与静音
   │  │  └─ QueuePanel.vue     # 播放队列面板
   │  └─ playlist              # 歌单 UI
   │     ├─ PlaylistCard.vue   # 歌单卡片
   │     ├─ PlaylistDetail.vue # 歌单详情（头部 + 歌曲列表）
   │     └─ AddSongsPanel.vue  # 添加歌曲弹层
   ├─ composables
   │  ├─ useAudioPlayer.js     # 播放内核（单例）
   │  ├─ useMusicActions.js    # 导入 / 收藏 / 删除
   │  ├─ usePlaylistActions.js # 歌单增删改（store + 落库）
   │  ├─ useToast.js           # 全局提示（模块级单例）
   │  ├─ useNavigation.js      # 页面切换（内存态，待换 vue-router）
   │  └─ useVolume.js          # 音量控制与持久化
   ├─ config
   │  └─ index.js              # 常量与平台开关
   ├─ layouts
   │  └─ AppLayout.vue         # 应用骨架
   ├─ models
   │  └─ song.js               # 歌曲数据模型
   ├─ services                 # 无状态业务
   │  ├─ audioService.js       # <audio> 封装
   │  ├─ metadataService.js    # 标签 / 封面解析
   │  ├─ musicService.js       # 歌曲创建与资源释放
   │  └─ playlistService.js    # 歌单模型与纯函数
   ├─ storage
   │  ├─ database.js           # IndexedDB 连接（v2：songs / musicData / playlists）
   │  ├─ musicStorage.js       # 歌曲存储门面
   │  ├─ playlistStorage.js    # 歌单存储门面
   │  └─ adapters
   │     └─ indexedDBAdapter.js
   ├─ stores
   │  ├─ index.js
   │  ├─ music.js              # 曲库 / 收藏 / 最近播放
   │  ├─ player.js             # 播放状态 / 队列 / 音量
   │  └─ playlist.js           # 歌单列表 / 当前歌单
   └─ views
      ├─ Home.vue
      ├─ Library.vue
      ├─ Favorites.vue
      ├─ Playlists.vue
      ├─ Search.vue
      ├─ Settings.vue
      ├─ RecentPlayed.vue
      └─ RecentImported.vue
```

## 约定

- `views` 只放路由级页面，`components` 放可复用 UI
- 有状态的组合逻辑放 `composables`，无状态的业务放 `services`
- 只有 `services/*` 和 `storage/*` 可以直接碰浏览器 API（`<audio>`、IndexedDB）
- 新增持久化 key 时，读写在对应的 `storage/*Storage.js` 或其上的 composable 里统一处理

## 开发

```bash
npm install
npm run dev     # 开发
npm run build   # 构建
npm run preview # 预览构建产物
```
