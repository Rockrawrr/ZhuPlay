// 数据库名称
const DB_NAME = "ZhuPlayDB";

// 数据库版本
const DB_VERSION = 1;

// 数据库连接缓存（Promise 单例）
let _dbPromise = null;

// 打开数据库
export function openDatabase() {
  // 已打开或正在打开，直接复用同一个 Promise
  if (_dbPromise) {
    return _dbPromise;
  }

  _dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // 数据库首次创建或版本升级
    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 创建歌曲数据仓库
      if (!db.objectStoreNames.contains("songs")) {
        db.createObjectStore("songs", {
          keyPath: "id",
        });
      }

      // 创建其他音乐数据仓库
      if (!db.objectStoreNames.contains("musicData")) {
        db.createObjectStore("musicData", {
          keyPath: "key",
        });
      }
    };

    // 数据库打开成功
    request.onsuccess = () => {
      const db = request.result;

      // 连接被浏览器意外关闭时（如其他标签页升级版本），清除缓存以便下次重开
      db.onclose = () => {
        _dbPromise = null;
      };

      resolve(db);
    };

    // 数据库打开失败
    request.onerror = () => {
      _dbPromise = null;
      reject(request.error);
    };

    // 数据库升级被其他连接阻止
    request.onblocked = () => {
      _dbPromise = null;
      reject(new Error("数据库升级被阻止，请关闭其他 ZhuPlay 页面"));
    };
  });

  return _dbPromise;
}
