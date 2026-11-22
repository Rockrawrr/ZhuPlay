# ZhuPlay

> 本地音乐播放器（Web + Electron 桌面端）

完整架构与实现说明见 **[docs/TECHNICAL.md](docs/TECHNICAL.md)**。

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
   │  ├─ Sidebar.vue           # 侧边栏导航
   │  ├─ common                # 跨页面通用 UI
   │  │  ├─ EmptyState.vue     # 统一空状态
   │  │  ├─ PageHeader.vue     # 统一页面头部
   │  │  └─ SongRow.vue        # 统一歌曲行（元信息与按钮由 props 控制）
   │  ├─ overlays              # 全局浮层
   │  │  ├─ AddToPlaylistDialog.vue # 添加到歌单
   │  │  ├─ AppDialog.vue      # 确认 / 输入对话框
   │  │  ├─ AppToast.vue       # 轻提示
   │  │  ├─ ContextMenu.vue    # 右键菜单
   │  │  └─ SongInfoDialog.vue # 歌曲信息
   │  ├─ home                  # 首页区块
   │  │  ├─ HomeAlbumGrid.vue  # 为你推荐网格
   │  │  └─ HomeRecentList.vue # 最近导入 / 最近播放列表
   │  ├─ player                # 播放器 UI
   │  │  ├─ PlayerBar.vue      # 播放条容器（持有状态）
   │  │  ├─ TrackInfo.vue      # 封面 / 歌名 / 喜欢
   │  │  ├─ PlaybackControls.vue # 随机、上一首、播放、下一首、循环
   │  │  ├─ ProgressBar.vue    # 播放进度
   │  │  ├─ VolumeControl.vue  # 音量与静音
   │  │  ├─ QueuePanel.vue     # 播放队列面板
   │  │  └─ LyricsScreen.vue   # 全屏歌词页（模糊封面背景 + 逐句高亮，点击左下角歌曲进入）
   │  └─ playlist              # 歌单 UI
   │     ├─ PlaylistCard.vue   # 歌单卡片
   │     ├─ PlaylistDetail.vue # 歌单详情（头部 + 歌曲列表）
   │     └─ AddSongsPanel.vue  # 添加歌曲弹层
   ├─ composables
   │  ├─ useAudioPlayer.js     # 播放内核（单例）
   │  ├─ useMusicActions.js    # 导入 / 收藏 / 删除
   │  ├─ usePlaylistActions.js # 歌单增删改（store + 落库）
   │  ├─ useToast.js           # 全局提示（模块级单例）
   │  ├─ useConfirm.js         # 确认 / 输入对话框（Promise 化）
   │  ├─ useOverlays.js        # 右键菜单 / 添加到歌单 / 歌曲信息 的开关状态
   │  ├─ useSongMenu.js        # 歌曲右键菜单项定义
   │  ├─ useNavigation.js      # 导航门面（vue-router 封装）
   │  ├─ useMediaSession.js    # 系统媒体控制（媒体键 / 媒体弹窗）
   │  └─ useVolume.js          # 音量控制与持久化
   ├─ layouts
   │  └─ AppLayout.vue         # 应用骨架
   ├─ models
   │  └─ song.js               # 歌曲数据模型
   ├─ router
   │  └─ index.js              # 路由表（hash 模式，桌面端 file:// 也能跑）
   ├─ services                 # 无状态业务
   │  ├─ audioService.js       # <audio> 封装
   │  ├─ metadataService.js    # 标签 / 封面解析
   │  ├─ musicService.js       # 歌曲创建与资源释放
   │  └─ playlistService.js    # 歌单模型与纯函数
   ├─ storage
   │  ├─ database.js           # IndexedDB 连接（v2：songs / musicData / playlists）
   │  ├─ keys.js               # 存储 key 常量
   │  ├─ musicStorage.js       # 歌曲存储门面
   │  ├─ playlistStorage.js    # 歌单存储门面
   │  └─ adapters
   │     └─ indexedDBAdapter.js
   ├─ stores
   │  ├─ music.js              # 曲库 / 收藏 / 最近播放
   │  ├─ player.js             # 播放状态 / 队列 / 音量
   │  └─ playlist.js           # 歌单列表 / 当前歌单
   ├─ utils
   │  ├─ format.js             # 时间 / 大小 / 日期格式化
   │  └─ lyrics.js             # LRC 解析与当前行定位
   └─ views
      ├─ Home.vue
      ├─ Library.vue
      ├─ Favorites.vue
      ├─ Playlists.vue
      ├─ Search.vue
      ├─ Stats.vue             # 听歌统计（次数 / 时长 / 最近 7 天 / 榜单）
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
npm run lint    # ESLint 静态检查
npm test        # Vitest 单元测试
```

## 桌面端（Electron）

```bash
# 1) 先起开发服务器
npm run dev

# 2) 另开一个终端，以桌面窗口加载 dev server（保留热更新）
npm run electron:dev

# 3) 打免安装包（产物在 release/win-unpacked/ZhuPlay.exe，用于快速验证）
npm run electron:pack

# 4) 打 Windows 安装包（产物在 release/ZhuPlay-x.y.z-setup.exe）
npm run electron:build
```

Electron 相关的设计：

- **自定义协议 `app://`**：生产环境不用 `file://`。`file://` 属于不透明来源，IndexedDB 行为不可靠，而歌曲、歌单、封面全部存在 IndexedDB 里
- **主进程用 `.cjs`**：项目 `package.json` 是 `"type": "module"`，主进程保持 CommonJS 才能用 `require`
- **preload 只暴露必要能力**：`window.zhuplayDesktop` 提供 `isDesktop` / `platform` / `versions` / `getPathForFile` / `showItemInFolder` / 数据目录与备份相关接口
- **开发者工具**：打包版默认禁用（避免误触后关不掉）；排查问题时用 `ZhuPlay.exe --devtools` 启动，托盘菜单里也有「切换开发者工具」兜底

桌面端专属能力：

| 能力 | 说明 |
| --- | --- |
| 窗口记忆 | 关闭时把位置与大小写入 `%APPDATA%/ZhuPlay/window-state.json`，下次启动还原；显示器拔掉导致越界时只保留尺寸 |
| 系统媒体控制 | 通过 `navigator.mediaSession` 接入媒体键 / Windows 媒体弹窗，显示封面与歌名，支持播放、暂停、上/下一首 |
| 在文件夹中显示 | 右键菜单项，仅桌面端且歌曲有真实路径时出现（Web 端 `<input type=file>` 拿不到路径；桌面端在导入时用 `webUtils.getPathForFile` 记录） |
| 托盘 | 关闭窗口收进托盘而不是退出；托盘菜单可显示/隐藏、开机自启、退出 |
| 自动更新 | `electron-updater` + GitHub Releases；打包版启动时检查，下载完成后询问是否重启安装 |
| 应用图标 | `build/icon.ico`（16~256 多尺寸），由 `build/make_icon.py` 生成 |

## 数据存储与迁移

- 所有数据都在本机 IndexedDB（`ZhuPlayDB`）：`songs`（含音频 File 与封面 Blob）、`musicData`（收藏 / 最近播放 / 队列 / 音量 / 听歌统计）、`playlists`
- 桌面端数据目录：`%APPDATA%\ZhuPlay`（设置页可直接打开）
- **换电脑完整迁移**：关闭应用 → 复制整个数据目录到新电脑同一路径 → 打开即为完整环境（含音频）
- **备份导出/导入**（设置页）：只含歌单、收藏、最近播放、听歌统计，几百 KB；导入按「文件名 + 大小」匹配本地歌曲并合并

## 歌词

- 导入时解析内嵌歌词（ID3 USLT / SYLT、Vorbis LYRICS、MP4 ©lyr 等）
- 桌面端如果没有内嵌歌词，会尝试读取音频同目录下的同名 `.lrc`
- 播放条右侧「歌词」按钮，或直接点**左下角的歌曲区域**，进入全屏歌词页（模糊封面背景，Esc / 关闭按钮退出）
- 全屏页底栏：居中进度条、上一首/播放/下一首、音量、播放队列
- 解析逻辑在 `src/utils/lyrics.js`：带时间轴的按 LRC 处理，纯文本按静态歌词展示

## 发布与签名

```powershell
# 打安装包（不发布）
npm run electron:build

# 打安装包并上传到 GitHub Releases（自动更新用）
$env:GH_TOKEN="<github token>"
npx electron-builder --publish always
```

未签名时 Windows SmartScreen 会提示「未知发布者」。要消除提示需要代码签名证书，设置环境变量后 electron-builder 会自动签名：

```powershell
$env:CSC_LINK="C:\path\to\cert.pfx"     # 或 base64
$env:CSC_KEY_PASSWORD="证书密码"
npm run electron:build
```


首次安装依赖如果 Electron 二进制下载失败，可指定镜像：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
node node_modules/electron/install.js
```

