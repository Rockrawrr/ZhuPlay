// ESLint 扁平配置：只保留能抓真问题的规则，格式类规则交给编辑器
import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "release/**", "node_modules/**", "build/icon*"],
  },
  js.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    files: ["**/*.{js,vue}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        __APP_VERSION__: "readonly",
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          // `const { url, coverUrl, ...rest }` 这种剔除字段的写法不算未使用
          ignoreRestSiblings: true,
          caughtErrors: "none",
        },
      ],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  {
    // Electron 主进程是 CommonJS
    files: ["electron/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Vite / Vitest 配置文件运行在 Node 环境
    files: ["*.config.js", "vite.config.js"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
