# ZhuPlay 技术文档

> 版本基线：v1.2.5 · 本地优先的桌面/网页音乐播放器
> 定位：单机、离线可用、数据不过服务器；面向个人与朋友使用

---

## 1. 项目概览

ZhuPlay 是一个**纯本地**的音乐播放器：

- Web 版：Vite + Vue 3 单页应用，数据存浏览器 IndexedDB
- 桌面版：Electron 封装同一份前端产物，数据存 `%APPDATA%\ZhuPlay`
- 没有任何后端：音频文件、歌单、收藏、统计全部在本机

核心能力：导入本地音频（自动读标签/封面/内嵌歌词）、播放队列、歌单、收藏、搜索、
右键菜单、全屏歌词、听歌统计、批量操作、桌面端托盘与窗口记忆、备份导出导入。

---

## 2. 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | Vue 3.5 `<script setup>` | 组合式 API，无 UI 组件库 |
| 构建 | Vite 8 | 产物 `dist/`，Electron 直接加载 |
| 状态 | Pinia 4 | `music` / `player` / `playlist` 三个 store |
| 路由 | vue-router 4（hash 模式） | 桌面端无需服务端回退 |
| 持久化 | IndexedDB（自写 adapter） | 数据库 `ZhuPlayDB` v2 |
| 元数据 | music-metadata | 解析标签、封面、内嵌歌词 |
| 图标 | lucide-vue-next | 全部按需引入 |
| 桌面 | Electron 45 + electron-builder 26 | NSIS 安装包 / 免安装目录 |
| 更新 | electron-updater | GitHub Releases（尚未发布） |
| 质量 | ESLint（flat config）+ Vitest | `npm run lint` / `npm test` |

---

## 3. 分层架构

```
views / components          只做渲染与事件
        │
composables                 有状态的组合逻辑（播放、导入、菜单、统计…）
        │
stores (Pinia)              内存状态（曲库、队列、歌单）
        │
services                    无状态业务（元数据、音频、资源地址、备份）
        │
storage                     持久化门面 + adapter（IndexedDB，可替换）
        │
IndexedDB / File System     Chrome API
```

约定：

- `views` 只放路由级页面；`components` 放可复用 UI
- 只有 `services/*` 与 `storage/*` 直接接触浏览器 API（`<audio>`、IndexedDB）
- 所有持久化 key 集中在 `src/storage/keys.js`
- `app/` 是组合根：单例装配（services）、启动恢复（bootstrap）、队列持久化

---

## 4. 目录结构

```
src/
├─ app/            services.js · useAppBootstrap.js · useQueuePersistence.js
├─ router/         路由表（hash 模式）
├─ layouts/        AppLayout.vue（侧栏 + 内容区 + 播放条）
├─ views/          Home / Library / Favorites / Playlists / Search / Stats / Settings …
├─ components/
│  ├─ common/      EmptyState · PageHeader · SongRow · SongCover · VirtualList
│  ├─ overlays/    AppDialog · AppToast · ContextMenu · SongInfoDialog · AddToPlaylistDialog · DuplicateCleanupDialog
│  ├─ home/        HomeAlbumGrid · HomeRecentList
│  ├─ player/      PlayerBar · TrackInfo · PlaybackControls · ProgressBar · VolumeControl · QueuePanel · LyricsScreen
│  ├─ playlist/    PlaylistCard · PlaylistDetail · AddSongsPanel
│  └─ Sidebar.vue
├─ composables/    useAudioPlayer · useMusicActions · usePlaylistActions · useSongMenu
│                  useOverlays · useMediaSession · useListeningStats · useObjectUrl · useVolume …
├─ services/       audioService · metadataService · musicService · playlistService · assetUrls · backupService
├─ storage/        database · musicStorage · playlistStorage · keys · adapters/indexedDBAdapter
├─ stores/         music · player · playlist
├─ models/         song.js
└─ utils/          format · lyrics · dedupe · greeting · persist
electron/
├─ main.cjs        主进程（协议、窗口、托盘、IPC、自动更新）
└─ preload.cjs     最小暴露面
build/             icon.ico / icon.png / make_icon.py
```

---

## 5. 数据模型与存储

### 5.1 IndexedDB

数据库 `ZhuPlayDB`（版本 2），三个对象仓库：

| 仓库 | 主键 | 内容 |
| --- | --- | --- |
| `songs` | `id` | 歌曲完整记录，含 `file`（原始音频 File/Blob）与 `cover`（封面 Blob） |
| `musicData` | `key` | 键值对：`favorites`、`recentSongIds`、`playQueue`、`volume`、`listeningStats` |
| `playlists` | `id` | `{ id, name, songIds, createdAt, updatedAt }` |

**关键约束**：

- 写入前必须归一化成纯对象——Pinia 的响应式 Proxy 无法被 structured clone，会抛 `DataCloneError`
- `url` / `coverUrl` 不持久化（blob 地址刷新即失效）

### 5.2 歌曲对象（`models/song.js`）

```js
{
  id, name, artist, album, albumArtist, year, genre, trackNumber, discNumber,
  duration, lyrics, cover,          // 元数据 + 封面 Blob + 歌词文本
  format, bitrate, sampleRate, channels, fileSize,
  filename, size, importedAt, updatedAt,
  file,                             // 原始音频 File（真正的音频数据）
  filePath                          // 仅桌面端：磁盘绝对路径
}
```

### 5.3 存储门面

`storage/adapters/indexedDBAdapter.js` 只暴露 `put / get / getAll / remove / clear`，
上层 `musicStorage` / `playlistStorage` 负责字段裁剪与默认值，
**换 SQLite 或云端 adapter 时，页面与 composable 不用改**。

### 5.4 数据位置

| 端 | 路径 |
| --- | --- |
| 桌面端（默认） | `%APPDATA%\zhuplay\IndexedDB\app_zhuplay_0.indexeddb.{leveldb,blob}` |
| 桌面端（自定义） | 设置页「数据目录 → 更改」选择的位置，目录结构相同 |
| Web | `%LOCALAPPDATA%\Google\Chrome\User Data\Default\IndexedDB\http_localhost_5173...` |

Chromium 把大 Blob 单独放 `.indexeddb.blob`，记录放 `.leveldb`。

### 5.4.1 自定义数据目录

桌面端允许把数据放到任意磁盘（例如 D 盘），实现要点：

- **指针文件固定在默认目录**：`%APPDATA%\zhuplay\data-location.json`，内容 `{ dataDir, updatedAt }`。
  位置固定才能在被改到 D 盘后仍找得到自己；主进程在 `app.whenReady()` 之前读取它并
  `app.setPath("userData", dir)`，Chromium 才会用新目录初始化 IndexedDB。
- **切换时必须重启**：IndexedDB 的位置在进程启动时决定，运行中改路径无效，因此迁移完成后
  `app.relaunch() + app.exit(0)`。
- **迁移是"复制"而不是"移动"**：复制当前 userData 到新目录（跳过 Cache / GPUCache 等纯缓存目录），
  写指针，重启；旧目录保留，出问题可回退。
- **校验**：目标不能等于当前目录，也不能是当前目录的父/子目录。
- **恢复默认**：把数据复制回默认目录并删除指针，再重启。
- 渲染端通过 `data-dir:progress` 事件显示进度遮罩（`app:change-data-dir` 返回前完成复制）。

对应 IPC：`app:get-data-info`、`app:choose-data-dir`、`app:change-data-dir`、`app:reset-data-dir`、`app:relaunch`。

---

## 6. 核心流程

### 6.1 导入

```
选择文件 / 拖拽
   → filterDuplicateFiles()           先按「文件名+大小」（桌面端再加绝对路径）挡掉重复
   → parseMusicMetadata(file)          music-metadata 读标签、封面、内嵌歌词
   → createSong(file, metadata)        生成标准对象（不创建 blob 地址）
   → 桌面端补 filePath + 同名 .lrc
   → musicStorage.saveSong()           写入 songs
   → musicStore.addSongs()
```

去重规则（`utils/dedupe.js`，与备份导入共用）：

- 文件名转小写 + 文件大小相同即视为同一首
- 桌面端额外用文件绝对路径判断（文件改名也能识别）
- 同一次选择里重复选中同一个文件也只导入一次
- 命中重复时不解析元数据，直接跳过并提示「已在音乐库里」

### 6.1.1 重复清理（历史数据）

`1.2.2` 之前重复导入产生的副本不会被自动删除，设置页提供手动清理：

- 「数据管理 → 清理重复歌曲」按同一指纹分组，组内按导入时间升序
- 每组默认保留最早导入的一条，可手动改选
- 删除走 `useMusicActions.removeSongs`：歌曲、收藏、歌单、队列一起清理，单个事务落库

### 6.2 播放

```
playSong(song, list)
   → resolveQueue()                    生成/复用播放队列
   → playerStore.setQueue()
   → musicStore.addRecentSong()        最近播放
   → useListeningStats().recordPlay()  听歌统计 +1
   → audioService.setSource(getSongAudioUrl(song))   按需创建 blob URL
   → audio.play()
```

进度由 `audioService` 的 `timeupdate` 写回 `playerStore.currentTime`，
`ProgressBar` / 歌词高亮 / 听歌统计都基于它。

### 6.3 播放队列与持久化

- `player.queue` 是"本次播放的来源列表"，上一首/下一首只在队列内移动
- `useQueuePersistence` 监听队列与下标，防抖写入 `playQueue = { songIds, index }`
- 启动时按 id 从曲库重新解引用（blob 地址不能跨会话复用）
- 恢复时只准备音频、不自动播放，避免被自动播放策略拦截

### 6.4 歌词

- 来源：内嵌歌词（ID3 USLT/SYLT、Vorbis LYRICS 等）→ 导入时解析成 LRC 文本
- 桌面端兜底：音频同目录同名 `.lrc`（主进程读取，≤512KB）
- 渲染：`utils/lyrics.js` 解析时间轴，`LyricsScreen` 全屏展示、逐句高亮、点击跳转
- 入口：播放条左下角歌曲区域 / 歌词图标 / Esc 关闭

### 6.5 听歌统计

- `musicData.listeningStats = { plays: {songId: {count, seconds, lastAt}}, daily: {"YYYY-MM-DD": seconds}, totalPlays, totalSeconds }`
- 播放开始计次；`watch(currentTime)` 增量累计秒数（>5s 的跳变视为拖动，忽略）
- 4 秒防抖落库；页面卸载前 flush

### 6.6 备份与迁移

```
导出：buildSnapshot()  →  songs(仅元数据) + favorites + recent + playlists + stats  →  JSON
导入：applySnapshot()  →  按「filename + fileSize」把旧 id 映射到本地歌曲
                      →  歌单新建（重名加「（导入）」）、收藏/最近/统计取并集
```

音频不在备份里：换电脑完整迁移靠**复制数据目录**（设置页有入口）。

---

## 7. 播放器架构

```
PlayerBar（唯一持有 store 的播放器组件）
├─ TrackInfo        封面/歌名/跑马灯/喜欢；点击进入全屏歌词
├─ PlaybackControls 随机 / 上一首 / 播放 / 下一首 / 循环
├─ ProgressBar      时间 + 可拖动进度
├─ VolumeControl    音量 + 静音
├─ QueuePanel       播放队列（fixed 覆盖层，z-index 900）
└─ LyricsScreen     全屏歌词（Teleport 到 body，z-index 120）
```

- `useAudioPlayer` 是模块级单例，内部持有唯一 `<audio>`（由 `audioService` 管理）
- 资源地址：`assetUrls.js` 维护 LRU（最多 3 个音频 URL），超出立即 `revoke`
- 封面地址：`useObjectUrl` 按组件生命周期创建/回收，列表只给可视行建 URL
- 系统媒体控制：`useMediaSession` 接管媒体键与 Windows 媒体弹窗

---

## 8. UI 体系

| 组件 | 作用 |
| --- | --- |
| `PageHeader` | 统一页面头（标题 + 副标题 + 右侧插槽） |
| `EmptyState` | 统一空状态（compact 变体用于区块内） |
| `SongRow` | 唯一歌曲行组件：`meta` 决定显示时长/大小，props 控制收藏/加歌单/移除按钮与批量选择 |
| `VirtualList` | 固定行高虚拟滚动（音乐库/收藏/搜索/歌单详情） |
| `AppDialog` | Promise 化的 confirm / prompt，替代原生弹窗 |
| `ContextMenu` | 右键菜单：边缘翻转、键盘 ↑↓/Enter、Esc/外部点击关闭 |

样式分三层：`main.css`（变量与重置）、`ui.css`（页面壳与按钮原语）、组件内 `scoped`。

---

## 9. 桌面端（Electron）

### 9.1 主进程要点

| 主题 | 实现 |
| --- | --- |
| 加载协议 | 生产用自定义 `app://zhuplay/index.html`，**不用 `file://`**（不透明来源，IndexedDB 不可靠）；开发期连 `http://localhost:5173` |
| 安全策略 | `sandbox: true` + `contextIsolation` + 无 node 集成；`app://` 响应附加 CSP（仅允许自身与 blob） |
| 单实例 | `requestSingleInstanceLock`，第二次启动通过 `second-instance` → `showMainWindow()` 把隐藏窗口显示出来 |
| 关闭行为 | 点 × 收进托盘（首次弹气泡提示）；托盘右键「退出」才真正结束 |
| 窗口记忆 | 关闭/移动/缩放写 `%APPDATA%\ZhuPlay\window-state.json`，启动还原；越界只保留尺寸 |
| 图标 | `extraResources` 把 `build/icon.ico` 放到 `resources/icon.ico`，托盘/窗口统一读取 |
| 开发者工具 | 打包版默认禁用；`--devtools` 启动才启用，托盘有「切换开发者工具」兜底 |
| 自动更新 | `electron-updater` + GitHub provider，打包版启动检查，下载完成询问重启 |
| 开机自启 | 托盘菜单 + `setLoginItemSettings`，渲染端也有 IPC |

### 9.2 IPC 一览

| 通道 | 方向 | 用途 |
| --- | --- | --- |
| `shell:show-item-in-folder` | R→M | 右键「在文件夹中显示」 |
| `fs:read-lyrics` | R→M | 读同目录 `.lrc` |
| `app:get-open-at-login` / `app:set-open-at-login` | R→M | 开机自启 |
| `app:get-data-path` / `app:open-data-folder` | R→M | 数据目录 |
| `backup:save` / `backup:open` | R→M | 备份导出/导入（主进程弹系统对话框） |

preload 只暴露上述方法的薄包装与 `getPathForFile`，不把 `ipcRenderer` 交给页面。

---

## 10. 性能设计

| 问题 | 方案 |
| --- | --- |
| 上万首常驻 blob URL | 音频 LRU 缓存（≤3）、封面按可见性创建、列表虚拟滚动 |
| 长列表 DOM 爆炸 | `VirtualList`：固定 60px 行高，仅渲染可视区 + overscan；数据变短时自动夹紧滚动位置 |
| 搜索卡顿 | 输入 220ms 防抖 |
| 频繁写库 | 队列/统计 4s 防抖；批量删除/批量加歌单只用一个事务 |
| 首屏体积 | 仅首页静态引入，其余路由懒加载；移除未使用的 Bootstrap 全量 CSS |
| 收藏判断 | 列表用 `computed Set`，避免逐行 `includes` 的 O(n²) |

体积对比（本次优化前后）：

| 指标 | 优化前 | 优化后 |
| --- | --- | --- |
| CSS（首屏） | 278.7 KB | **33.3 KB** |
| 主 JS chunk | 310.5 KB | 272.1 KB（页面拆成独立 chunk，如 Library 6.7 KB） |

实测（2000 首注入）：音乐库渲染 22 行、`scrollHeight = 120000`，滚动到底最后一行正确；
搜索 480ms 出结果、渲染 22 行；收藏 1200 首 → 19 行；歌单 900 首 → 18 行。

---

## 11. 构建与发布

```bash
npm run dev            # Web 开发
npm run build          # 产物到 dist/
npm run preview        # 预览产物

npm run electron:dev   # 桌面窗口连 dev server
npm run electron:pack  # 免安装目录 release/win-unpacked/ZhuPlay.exe
npm run electron:build # NSIS 安装包 release/ZhuPlay-x.y.z-setup.exe
```

- 版本号：`package.json` + `package-lock.json` 两处同步，构建时注入 `__APP_VERSION__`
- 图标：`python build/make_icon.py` 生成多尺寸 `.ico` 与 `.png`
- 国内网络：Electron 二进制与 electron-builder 依赖走 npmmirror 镜像
- 代码签名：设置 `CSC_LINK` / `CSC_KEY_PASSWORD` 后 electron-builder 自动签名；未签名会触发 SmartScreen 提示

发布流程：改版本 → `electron:build` → `git commit/tag` → `git push --follow-tags`；
自动更新需要 `--publish always` 上传到 GitHub Releases。

---

## 12. 调试与验证

- **Web**：Chrome DevTools → Application → IndexedDB → `ZhuPlayDB`
- **桌面**：`ZhuPlay.exe --devtools`（或托盘菜单）打开 DevTools
- **静态检查**：`npm run lint`（ESLint flat config，Vue essential 规则）
- **单元测试**：`npm test`（Vitest；覆盖歌词解析、格式化、导入去重）
- **自动化验证**：无头 Chrome + CDP
  - `Runtime.evaluate` 注入 store 数据、读取 DOM 状态
  - `Emulation.setDeviceMetricsOverride` 模拟手机宽度
  - `Page.captureScreenshot` 截图核对
  - `Page.setInterceptFileChooserDialog` + `DOM.setFileInputFiles` 测文件导入
  - 桌面端同理，`ZhuPlay.exe --remote-debugging-port=PORT`

---

## 13. 已知限制

1. **音频占用双份磁盘**：原文件 + IndexedDB 各一份（桌面端可优化为"只存路径"）
2. **换机需复制数据目录**：备份只含元数据，音频不随备份走
3. **歌词依赖文件本身**：没有在线歌词匹配
4. **无账号/无同步**：多设备之间不互通
5. **未签名**：Windows 首次运行会提示未知发布者
6. **队列面板未虚拟化**：极端长队列（上万）可能变慢
7. **虚拟列表固定行高**：行高变化（如未来加多行歌词预览）需要改造

---

## 14. 后续方向

- 桌面端"仅记录路径"模式，避免复制音频
- 单文件备份包（含音频，压缩后跨机恢复）
- 队列面板虚拟化 / 队列拖拽排序
- 歌词在线匹配（可选）
- 自定义代码签名与正式 Release 分发
- 若需多设备：只同步元数据的轻量后端（SQLite/Postgres + 邀请码账号）
