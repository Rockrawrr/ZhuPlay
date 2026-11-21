// 数据库名称
const DB_NAME = 'ZhuPlayDB'

// 数据库版本
const DB_VERSION = 1

// 打开数据库
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    // 数据库首次创建或版本升级
    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // 创建歌曲数据仓库
      if (!db.objectStoreNames.contains('songs')) {
        db.createObjectStore('songs', {
          keyPath: 'id'
        })
      }

      // 创建其他音乐数据仓库
      if (!db.objectStoreNames.contains('musicData')) {
        db.createObjectStore('musicData', {
          keyPath: 'key'
        })
      }
    }

    // 数据库打开成功
    request.onsuccess = () => {
      resolve(request.result)
    }

    // 数据库打开失败
    request.onerror = () => {
      reject(request.error)
    }

    // 数据库升级被其他连接阻止
    request.onblocked = () => {
      reject(new Error('数据库升级被阻止，请关闭其他 ZhuPlay 页面'))
    }
  })
}