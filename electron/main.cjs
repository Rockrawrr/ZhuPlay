/**
 * ZhuPlay 桌面端主进程
 *
 * 关键点：
 * 1. 生产环境用自定义协议 app:// 而不是 file://
 *    —— file:// 是不透明来源，IndexedDB / Storage 行为不可靠，
 *       而项目所有数据（歌曲、歌单、封面）都存在 IndexedDB 里
 * 2. 开发环境直接连 Vite dev server，保留热更新
 * 3. 渲染进程保持 contextIsolation + 无 node 集成，只通过 preload 暴露少量 API
 */
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  net,
  protocol,
  screen,
  session,
  shell,
  Tray,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_SCHEME = "app";
const APP_HOST = "zhuplay";
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
const IS_DEV = !app.isPackaged;

// 开发者工具：开发期默认可用；打包版默认关闭，避免朋友误触后关不掉
// 需要排查线上问题时，用 `ZhuPlay.exe --devtools` 启动即可
const DEVTOOLS_ENABLED =
  IS_DEV ||
  process.argv.includes("--devtools") ||
  process.env.ZHUPLAY_DEVTOOLS === "1";

// ===== 自定义数据目录 =====
// 指针文件固定在「默认 userData」下，才能在被改到别处后仍找得到自己
const DEFAULT_USER_DATA_DIR = path.join(app.getPath("appData"), app.getName());
const DATA_POINTER_FILE = path.join(DEFAULT_USER_DATA_DIR, "data-location.json");

// 迁移时跳过的纯缓存目录，避免白拷几百 MB
const SKIP_COPY_DIRS = new Set([
  "Cache",
  "Code Cache",
  "GPUCache",
  "DawnGraphiteCache",
  "DawnWebGPUCache",
  "GrShaderCache",
  "GPUPersistentCache",
  "ShaderCache",
  "Dictionaries",
]);

function readCustomDataDir() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_POINTER_FILE, "utf8"));
    const dir = typeof raw?.dataDir === "string" ? raw.dataDir.trim() : "";
    if (!dir) return "";
    if (!fs.existsSync(dir)) return "";
    return dir;
  } catch {
    return "";
  }
}

// 必须在 app ready 之前调用：Chromium 会用 userData 初始化存储
function applyCustomDataDir() {
  const dir = readCustomDataDir();
  if (!dir) return "";

  try {
    fs.mkdirSync(dir, { recursive: true });
    app.setPath("userData", dir);
    return dir;
  } catch (error) {
    console.error("自定义数据目录不可用，回退默认目录：", error);
    return "";
  }
}

applyCustomDataDir();

// 打包后 dist 在 app.asar 内，用 __dirname 相对定位
const DIST_DIR = path.join(__dirname, "..", "dist");

// 自定义协议必须声明为 standard + secure，否则会被当成不透明来源
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
};

// 把 URL 路径安全地映射到 dist 目录内，阻止 ../ 穿越
function resolveAssetPath(pathname) {
  const cleanPath = decodeURIComponent(pathname).replace(/^\/+/, "");
  const target = path.normalize(path.join(DIST_DIR, cleanPath));

  if (target !== DIST_DIR && !target.startsWith(DIST_DIR + path.sep)) {
    return null;
  }

  return target;
}

function registerAppProtocol() {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url);
    const relativePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = resolveAssetPath(relativePath);

    if (!filePath) {
      return new Response("Forbidden", { status: 403 });
    }

    try {
      const response = await net.fetch(pathToFileURL(filePath).toString());
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext];

      if (!mime) return response;

      const headers = new Headers(response.headers);
      headers.set("Content-Type", mime);
      return new Response(response.body, {
        status: response.status,
        headers,
      });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  });
}

// 生产页面的内容安全策略：只允许自身资源与 blob（封面/音频）
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

function applyContentSecurityPolicy() {
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ["app://*/*"] },
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [CONTENT_SECURITY_POLICY],
        },
      });
    },
  );
}

let mainWindow = null;
let tray = null;
let isQuitting = false;
let hasNotifiedTray = false;

// 图标路径：开发期读源码目录；打包后读 resources（extraResources 放了一份，避免 asar 内路径问题）
function resolveIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icon.ico");
  }

  return path.join(__dirname, "..", "build", "icon.ico");
}

// 统一入口：把主窗口显示出来（隐藏 / 最小化 / 已销毁都要处理）
function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}

// ===== 托盘 =====

// 托盘菜单：全部用普通项（不用 checkbox），避免勾选栏让文字看起来没对齐。
// Windows 原生菜单文字是左对齐的，样式不可自定义，只能保证各项一致。
function buildTrayMenu() {
  const autoStart = app.getLoginItemSettings().openAtLogin;

  const template = [
    { label: "打开 ZhuPlay", click: showMainWindow },
    { label: "隐藏到托盘", click: () => mainWindow?.hide() },
    { type: "separator" },
  ];

  // 兜底入口：即使 DevTools 抢了焦点，也能从托盘把它关掉
  if (DEVTOOLS_ENABLED) {
    template.push({
      label: "切换开发者工具",
      click: () => mainWindow?.webContents.toggleDevTools(),
    });
    template.push({ type: "separator" });
  }

  template.push(
    {
      label: `开机自启：${autoStart ? "已开启" : "已关闭"}`,
      click: () => {
        app.setLoginItemSettings({
          openAtLogin: !autoStart,
          path: process.execPath,
        });
        tray.setContextMenu(buildTrayMenu());
      },
    },
    { type: "separator" },
    {
      label: "退出 ZhuPlay",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  );

  return Menu.buildFromTemplate(template);
}

function createTray() {
  const image = nativeImage.createFromPath(resolveIconPath());

  if (image.isEmpty()) {
    console.warn("托盘图标加载失败：", resolveIconPath());
  }

  tray = new Tray(image.resize({ width: 16, height: 16 }));
  tray.setToolTip("ZhuPlay");
  tray.setContextMenu(buildTrayMenu());

  // 左键点托盘图标：在显示/隐藏之间切换
  tray.on("click", () => {
    if (mainWindow?.isVisible()) mainWindow.hide();
    else showMainWindow();
  });
}

// ===== 自动更新 =====

function setupAutoUpdate() {
  if (!app.isPackaged) return;

  let autoUpdater;

  try {
    // 打包后才存在该依赖的使用场景，避免开发期每次启动都检查
    ({ autoUpdater } = require("electron-updater"));
  } catch (error) {
    console.warn("自动更新模块不可用：", error?.message);
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("error", (error) => {
    console.warn("检查更新失败（不影响使用）：", error?.message);
  });

  autoUpdater.on("update-downloaded", async (info) => {
    const { response } = await dialog.showMessageBox({
      type: "info",
      title: "发现新版本",
      message: `ZhuPlay ${info.version} 已下载完成`,
      detail: "重启应用即可完成更新，是否现在重启？",
      buttons: ["立即重启", "稍后"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      isQuitting = true;
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
}

// ===== 窗口位置与大小记忆 =====

const DEFAULT_BOUNDS = { width: 1280, height: 840 };

function windowStateFile() {
  return path.join(app.getPath("userData"), "window-state.json");
}

function loadWindowState() {
  try {
    const state = JSON.parse(fs.readFileSync(windowStateFile(), "utf8"));
    if (!Number.isFinite(state.width) || !Number.isFinite(state.height)) {
      return { ...DEFAULT_BOUNDS };
    }

    // 位置可能来自已拔掉的显示器，落不到任何屏幕内就只保留尺寸
    if (Number.isFinite(state.x) && Number.isFinite(state.y)) {
      const area = screen.getDisplayMatching(state).workArea;
      const visible =
        state.x + 120 > area.x &&
        state.x < area.x + area.width - 120 &&
        state.y + 60 > area.y &&
        state.y < area.y + area.height - 60;

      if (visible) return state;
    }

    return { width: state.width, height: state.height };
  } catch {
    return { ...DEFAULT_BOUNDS };
  }
}

function saveWindowState(win) {
  if (!win || win.isDestroyed() || win.isMaximized() || win.isMinimized()) {
    return;
  }

  try {
    fs.writeFileSync(windowStateFile(), JSON.stringify(win.getBounds()));
  } catch (error) {
    console.error("窗口状态保存失败：", error);
  }
}

// ===== 数据目录切换 =====

// child 是否位于 parent 内部（同一路径不算）
function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

// 校验目标目录，返回错误文案（空串表示可用）
function validateDataDir(target) {
  if (typeof target !== "string" || target.trim() === "") {
    return "没有选择目录";
  }

  const current = path.resolve(app.getPath("userData"));
  const next = path.resolve(target);

  if (next === current) return "这已经是当前数据目录";
  if (isInside(next, current)) return "不能选择当前目录的子目录";
  if (isInside(current, next)) return "不能选择当前目录的父目录";

  return "";
}

// 复制 userData（跳过缓存目录），每 20 个文件回报一次进度
async function copyUserData(source, target, onProgress) {
  const files = [];

  async function walk(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_COPY_DIRS.has(entry.name)) continue;
        await walk(absolute);
      } else {
        files.push(absolute);
      }
    }
  }

  await walk(source);
  await fs.promises.mkdir(target, { recursive: true });

  let done = 0;

  for (const file of files) {
    const destination = path.join(target, path.relative(source, file));
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    await fs.promises.copyFile(file, destination);
    done += 1;

    if (done % 20 === 0 || done === files.length) {
      onProgress?.({ done, total: files.length });
    }
  }

  return files.length;
}

function writeDataPointer(dir) {
  fs.mkdirSync(DEFAULT_USER_DATA_DIR, { recursive: true });
  fs.writeFileSync(
    DATA_POINTER_FILE,
    JSON.stringify({ dataDir: dir, updatedAt: Date.now() }, null, 2),
    "utf8",
  );
}

function restartApp() {
  app.relaunch();
  app.exit(0);
}

function createWindow() {
  const bounds = loadWindowState();

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: "#121212",
    show: false,
    autoHideMenuBar: true,
    title: "ZhuPlay",
    icon: resolveIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // 预加载脚本只用 contextBridge / ipcRenderer / webUtils，这些在沙箱下都可用
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  // 移动/缩放时防抖保存
  let saveTimer = null;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveWindowState(mainWindow), 400);
  };

  mainWindow.on("resize", scheduleSave);
  mainWindow.on("move", scheduleSave);

  // 点关闭按钮时收进托盘，而不是结束进程（托盘菜单里有「退出」）
  mainWindow.on("close", (event) => {
    clearTimeout(saveTimer);
    saveWindowState(mainWindow);

    if (isQuitting) return;

    event.preventDefault();
    mainWindow.hide();

    // 第一次收进托盘时提示一下，避免"双击图标没反应"的困惑
    if (!hasNotifiedTray) {
      hasNotifiedTray = true;
      tray?.displayBalloon({
        title: "ZhuPlay 仍在后台运行",
        content: "点击托盘图标可以重新打开，右键托盘菜单可以退出。",
        iconType: "info",
      });
    }
  });

  // 不在应用内打开新窗口（外链交给系统浏览器）
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  if (IS_DEV) {
    mainWindow.loadURL(DEV_SERVER_URL);
  } else {
    mainWindow.loadURL(`${APP_SCHEME}://${APP_HOST}/index.html`);
  }

  // F12 / Ctrl+Shift+I 开关开发者工具
  // 注意：DevTools 打开后焦点在它的 webContents 上，主窗口收不到按键。
  // 打包版默认禁用；开启时额外给 devToolsWebContents 挂关闭监听，并保留托盘兜底入口
  const isDevToolsToggle = (input) =>
    input.type === "keyDown" &&
    (input.key === "F12" ||
      (input.control && input.shift && input.key.toLowerCase() === "i"));

  if (DEVTOOLS_ENABLED) {
    mainWindow.webContents.on("before-input-event", (event, input) => {
      if (!isDevToolsToggle(input)) return;

      event.preventDefault();
      mainWindow.webContents.toggleDevTools();
    });

    mainWindow.webContents.on("devtools-opened", () => {
      const devTools = mainWindow.webContents.devToolsWebContents;
      if (!devTools) return;

      devTools.on("before-input-event", (event, input) => {
        if (!isDevToolsToggle(input)) return;

        event.preventDefault();
        mainWindow.webContents.closeDevTools();
      });
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 单实例：再次启动时聚焦已有窗口
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // 再次双击图标启动时：把已有窗口（可能藏在托盘里）叫出来
  app.on("second-instance", () => {
    showMainWindow();
  });

  app.whenReady().then(() => {
    registerAppProtocol();
    applyContentSecurityPolicy();

    // 渲染进程请求「在文件夹中显示」
    ipcMain.handle("shell:show-item-in-folder", (_event, filePath) => {
      if (typeof filePath !== "string" || filePath.length === 0) return false;
      shell.showItemInFolder(filePath);
      return true;
    });

    // 读取同目录下的同名 .lrc 歌词
    ipcMain.handle("fs:read-lyrics", async (_event, filePath) => {
      if (typeof filePath !== "string" || filePath.length === 0) return "";

      const lrcPath = filePath.replace(/\.[^./\\]+$/, ".lrc");

      try {
        const stat = await fs.promises.stat(lrcPath);
        if (!stat.isFile() || stat.size > 512 * 1024) return "";
        return await fs.promises.readFile(lrcPath, "utf8");
      } catch {
        return "";
      }
    });

    // 读取音频文件（桌面端「仅记录路径」模式播放时按需读取）
    // 上限 512 MB：一次性读进内存再转 Blob，超大文件不适用
    ipcMain.handle("fs:read-audio", async (_event, filePath) => {
      if (typeof filePath !== "string" || filePath.length === 0) return null;

      try {
        const stat = await fs.promises.stat(filePath);
        if (!stat.isFile() || stat.size > 512 * 1024 * 1024) return null;
        return await fs.promises.readFile(filePath);
      } catch {
        return null;
      }
    });

    // 开机自启
    ipcMain.handle("app:get-open-at-login", () =>
      app.getLoginItemSettings().openAtLogin,
    );
    ipcMain.handle("app:set-open-at-login", (_event, enabled) => {
      app.setLoginItemSettings({
        openAtLogin: Boolean(enabled),
        path: process.execPath,
      });
      return app.getLoginItemSettings().openAtLogin;
    });

    // 数据目录：IndexedDB 等都在这里，换电脑时复制整个目录即可
    ipcMain.handle("app:get-data-path", () => app.getPath("userData"));

    // 数据目录信息（当前 / 默认 / 是否自定义）
    ipcMain.handle("app:get-data-info", () => ({
      current: app.getPath("userData"),
      default: DEFAULT_USER_DATA_DIR,
      isCustom:
        path.resolve(app.getPath("userData")) !==
        path.resolve(DEFAULT_USER_DATA_DIR),
    }));

    // 选择新目录（只选不做，真正迁移走 app:change-data-dir）
    ipcMain.handle("app:choose-data-dir", async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: "选择数据目录",
        properties: ["openDirectory", "createDirectory"],
        defaultPath: app.getPath("userData"),
      });

      if (canceled || filePaths.length === 0) return "";
      return filePaths[0];
    });

    // 迁移到新目录：复制现有数据 → 写指针 → 重启
    ipcMain.handle("app:change-data-dir", async (_event, target) => {
      const invalid = validateDataDir(target);
      if (invalid) return { ok: false, error: invalid };

      try {
        await copyUserData(app.getPath("userData"), target, (progress) => {
          mainWindow?.webContents.send("data-dir:progress", progress);
        });

        writeDataPointer(target);
        return { ok: true, target };
      } catch (error) {
        console.error("数据目录迁移失败：", error);
        return { ok: false, error: String(error?.message || error) };
      }
    });

    // 恢复默认目录：把数据复制回默认位置 → 删除指针 → 重启
    ipcMain.handle("app:reset-data-dir", async () => {
      const current = path.resolve(app.getPath("userData"));
      const fallback = path.resolve(DEFAULT_USER_DATA_DIR);

      if (current === fallback) {
        return { ok: false, error: "已经是默认数据目录" };
      }

      try {
        await copyUserData(current, fallback, (progress) => {
          mainWindow?.webContents.send("data-dir:progress", progress);
        });

        fs.rmSync(DATA_POINTER_FILE, { force: true });
        return { ok: true, target: fallback };
      } catch (error) {
        console.error("恢复默认数据目录失败：", error);
        return { ok: false, error: String(error?.message || error) };
      }
    });

    ipcMain.handle("app:relaunch", () => {
      restartApp();
      return true;
    });

    ipcMain.handle("app:open-data-folder", async () => {
      const dataPath = app.getPath("userData");
      const error = await shell.openPath(dataPath);
      return error || "";
    });

    // 备份导出：让用户选保存位置，再写 JSON
    ipcMain.handle("backup:save", async (_event, json) => {
      if (typeof json !== "string") return "";

      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: "导出 ZhuPlay 备份",
        defaultPath: path.join(
          app.getPath("documents"),
          `zhuplay-backup-${new Date().toISOString().slice(0, 10)}.json`,
        ),
        filters: [{ name: "ZhuPlay 备份", extensions: ["json"] }],
      });

      if (canceled || !filePath) return "";

      await fs.promises.writeFile(filePath, json, "utf8");
      return filePath;
    });

    // 备份导入：让用户选文件，读回文本
    ipcMain.handle("backup:open", async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: "选择 ZhuPlay 备份文件",
        properties: ["openFile"],
        filters: [{ name: "ZhuPlay 备份", extensions: ["json"] }],
      });

      if (canceled || filePaths.length === 0) return null;

      try {
        const stat = await fs.promises.stat(filePaths[0]);
        // 只接受 20MB 以内的备份文件（纯元数据，正常只有几百 KB）
        if (stat.size > 20 * 1024 * 1024) return null;

        return await fs.promises.readFile(filePaths[0], "utf8");
      } catch {
        return null;
      }
    });

    // 桌面端不需要默认菜单（保留快捷键用 autoHideMenuBar）
    Menu.setApplicationMenu(null);
    createWindow();
    createTray();
    setupAutoUpdate();

    app.on("before-quit", () => {
      isQuitting = true;
    });

    app.on("activate", () => {
      // macOS 点 Dock 图标时也要把隐藏的窗口叫回来
      showMainWindow();
    });
  });

  app.on("window-all-closed", () => {
    // 有托盘时窗口隐藏不退出，只有主动退出才结束进程
    if (isQuitting && process.platform !== "darwin") app.quit();
  });
}
