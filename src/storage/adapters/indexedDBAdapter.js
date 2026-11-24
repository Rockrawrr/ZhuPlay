/**
 * IndexedDB 适配器：把“对象仓库”抽象成 put / get / getAll / remove / clear 五个操作
 * 另外提供 putMany / removeMany：批量写入走同一个事务，避免 N 次事务开销
 * 这样 musicStorage、playlistStorage 都不需要知道底下是 IndexedDB 还是别的存储
 */
import { openDatabase } from "../database";

// IndexedDB 操作适配器
export function createIndexedDBAdapter() {
  // 保存数据
  async function put(storeName, data) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      store.put(data);

      transaction.oncomplete = () => {
        resolve(true);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };

      transaction.onabort = () => {
        reject(transaction.error);
      };
    });
  }

  // 获取单条数据
  async function get(storeName, key) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  // 获取全部数据
  async function getAll(storeName) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  // 删除数据
  async function remove(storeName, key) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      store.delete(key);

      transaction.oncomplete = () => {
        resolve(true);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };

      transaction.onabort = () => {
        reject(transaction.error);
      };
    });
  }

  // 清空数据仓库
  async function clear(storeName) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      store.clear();

      transaction.oncomplete = () => {
        resolve(true);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };

      transaction.onabort = () => {
        reject(transaction.error);
      };
    });
  }

  // 批量保存（同一个事务）
  async function putMany(storeName, items) {
    if (!Array.isArray(items) || items.length === 0) return true;

    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      for (const item of items) store.put(item);

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  // 批量删除（同一个事务）
  async function removeMany(storeName, keys) {
    if (!Array.isArray(keys) || keys.length === 0) return true;

    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      for (const key of keys) store.delete(key);

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  return {
    put,
    putMany,
    get,
    getAll,
    remove,
    removeMany,
    clear,
  };
}
