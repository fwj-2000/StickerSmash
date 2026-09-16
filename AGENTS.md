# StickerSmash 项目约定

## Expo 版本指令（重要）

Expo HAS CHANGED — 写代码前必须先读对应版本文档：
https://docs.expo.dev/versions/v57.0.0/

## 技术栈

- Expo SDK 57（React Native 0.86 / React 19.2 / TypeScript 6.0 strict）
- 路由：Expo Router（file-based routing，`src/app/` 目录）
- 样式：React Native `StyleSheet.create`（不用 NativeWind / styled-components）
- 图片：`expo-image`（不用 react-native 内置 Image）
- 图标：`@expo/vector-icons`（FontAwesome / Ionicons）
- 状态管理：目前只用 `useState`，未引入第三方状态库

## 项目结构

- 路由页面：`src/app/`，Tab 页面在 `src/app/(tabs)/`
- 组件：`src/components/`
- 静态资源：`assets/images/`

## 路径别名

- `@/*` → `src/*`
- `@/assets/*` → `assets/*`

## 代码风格

- 组件默认导出；Props 用 `type Props = {...}` 定义，关键字段加简短 JSDoc
- 样式统一用 `StyleSheet.create`，放在文件底部
- Prettier：双引号、printWidth 120、trailingComma all、bracketSameLine true
- 注释用中文（沿用现有习惯）

## 主题色

- 深色背景：`#25292e`
- 强调色 / active tint：`#ffd33d`

## 功能配置

- `app.json` experiments：`typedRoutes: true`、`reactCompiler: true`
- 路由链接直接写字符串路径（typed routes 已开启，TS 会校验）

## 常用命令

- `npm start` — 启动 dev server
- `npm run android` / `npm run ios` / `npm run web`
- `npm run lint` — ESLint 检查
- `npm run format` / `npm run format:check` — Prettier

## 测试

目前未配置测试框架。
