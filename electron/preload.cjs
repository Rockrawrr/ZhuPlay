/**
 * 预加载脚本
 * 只向渲染进程暴露必要的桌面能力，不要把整个 ipcRenderer 交出去
 */
const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("zhuplayDesktop", {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },

  /**
   * 取 File 对象在磁盘上的真实路径
   * Electron 32+ 移除了 File.path，必须走 webUtils.getPathForFile
   */
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file) || "";
    } catch {
      return "";
    }
  },

  // 在资源管理器里定位文件（右键菜单「在文件夹中显示」）
  showItemInFolder: (filePath) =>
    ipcRenderer.invoke("shell:show-item-in-folder", filePath),

  // 读取同目录下的同名 .lrc 歌词，没有则返回空串
  readLyricsFile: (filePath) => ipcRenderer.invoke("fs:read-lyrics", filePath),

  // 开机自启开关
  getOpenAtLogin: () => ipcRenderer.invoke("app:get-open-at-login"),
  setOpenAtLogin: (enabled) =>
    ipcRenderer.invoke("app:set-open-at-login", Boolean(enabled)),

  // ===== 数据迁移 =====

  // 数据目录（IndexedDB、窗口状态都在这里）
  getDataPath: () => ipcRenderer.invoke("app:get-data-path"),
  // 当前 / 默认数据目录与是否自定义
  getDataInfo: () => ipcRenderer.invoke("app:get-data-info"),
  // 在资源管理器里打开数据目录
  openDataFolder: () => ipcRenderer.invoke("app:open-data-folder"),
  // 选择新数据目录（只选不做）
  chooseDataDir: () => ipcRenderer.invoke("app:choose-data-dir"),
  // 迁移到新目录（复制数据 + 写指针，调用方随后需要重启）
  changeDataDir: (target) =>
    ipcRenderer.invoke("app:change-data-dir", target),
  // 恢复默认目录（复制回默认位置 + 删除指针，调用方随后需要重启）
  resetDataDir: () => ipcRenderer.invoke("app:reset-data-dir"),
  // 重启应用
  relaunch: () => ipcRenderer.invoke("app:relaunch"),
  // 迁移进度回调，返回取消订阅函数
  onDataDirProgress: (handler) => {
    const listener = (_event, progress) => handler(progress);
    ipcRenderer.on("data-dir:progress", listener);
    return () => ipcRenderer.removeListener("data-dir:progress", listener);
  },

  // 备份导出：弹出保存对话框，返回实际写入的路径（取消返回空串）
  saveBackup: (json) => ipcRenderer.invoke("backup:save", json),
  // 备份导入：弹出打开对话框，返回文件内容（取消返回 null）
  openBackup: () => ipcRenderer.invoke("backup:open"),
});
