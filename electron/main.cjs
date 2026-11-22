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

let mainWindow = null;
let tray = null;
let isQuitting = false;

// ===== 托盘 =====

function createTray() {
  const iconPath = path.join(__dirname, "..", "build", "icon.ico");
  const image = nativeImage.createFromPath(iconPath);

  tray = new Tray(image.resize({ width: 16, height: 16 }));
  tray.setToolTip("ZhuPlay");

  const showWindow = () => {
    if (!mainWindow) return createWindow();
    mainWindow.show();
    mainWindow.focus();
  };

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "显示 ZhuPlay", click: showWindow },
      { label: "隐藏到托盘", click: () => mainWindow?.hide() },
      { type: "separator" },
      {
        label: "开机自启",
        type: "checkbox",
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => {
          app.setLoginItemSettings({
            openAtLogin: item.checked,
            path: process.execPath,
          });
        },
      },
      { type: "separator" },
      {
        label: "退出",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );

  // 左键点托盘图标：在显示/隐藏之间切换
  tray.on("click", () => {
    if (!mainWindow) return createWindow();
    if (mainWindow.isVisible()) mainWindow.hide();
    else {
      mainWindow.show();
      mainWindow.focus();
    }
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
    icon: path.join(__dirname, "..", "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
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

  // F12 / Ctrl+Shift+I 打开开发者工具，方便桌面端排查
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12") {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 单实例：再次启动时聚焦已有窗口
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    registerAppProtocol();

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

    // 桌面端不需要默认菜单（保留快捷键用 autoHideMenuBar）
    Menu.setApplicationMenu(null);
    createWindow();
    createTray();
    setupAutoUpdate();

    app.on("before-quit", () => {
      isQuitting = true;
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    // 有托盘时窗口隐藏不退出，只有主动退出才结束进程
    if (isQuitting && process.platform !== "darwin") app.quit();
  });
}
