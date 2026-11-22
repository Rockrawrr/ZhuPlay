/**
 * 预加载脚本
 * 只向渲染进程暴露只读的桌面端信息，后续需要「在文件夹中显示」等功能时，
 * 在这里加 ipcRenderer.invoke 包装，不要把整个 ipcRenderer 暴露出去
 */
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("zhuplayDesktop", {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
