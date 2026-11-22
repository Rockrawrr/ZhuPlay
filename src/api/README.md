# API 层（预留）

云同步相关接口，待实现。

实现时的落点：

- 新建 `storage/adapters/cloudAdapter.js`，与 `indexedDBAdapter` 保持同一套接口
  （`put` / `get` / `getAll` / `remove` / `clear`），这样 `musicStorage` 不需要改
- 网络请求写在 `src/api/` 下，`cloudAdapter` 只做存储语义适配，不直接发请求

当前为空，`musicStorage` 只使用 IndexedDB adapter。
