# Vue 3 → React Native 迁移指南（基于 StickerSmash 实际代码）

这份文档假设你已经熟悉 Vue 3（Composition API + `<script setup>`），现在要从头理解 RN 项目的代码结构。所有示例都取自本项目真实代码，不是抽象概念。

## 心智模型：最大的范式差异

Vue 3 的 SFC 是"模板 + 逻辑 + 样式"三段式。React 没有模板——**JSX 就是 JavaScript**，你写的是函数，返回的是"描述 UI 的 JS 对象"。没有 directives、没有 `v-` 前缀、没有 `<script>` / `<template>` / `<style>` 分区。

| Vue 3 写法             | React / RN 等价                                |
| ---------------------- | ---------------------------------------------- |
| `ref(0)`               | `useState(0)`                                  |
| `computed(() => ...)`  | 直接在 JSX 里写表达式                          |
| `watch(source, cb)`    | `useEffect(() => ..., [deps])`                 |
| `v-if="cond"`          | `{cond ? <A/> : <B/>}` 或 `{cond && <A/>}`     |
| `v-for="item in list"` | `list.map(item => <View key={...}/>)`          |
| `v-model="text"`       | `<TextInput value={text} onChangeText={...}/>` |
| `<slot/>`              | `{children}`（见 EmojiPicker）                 |
| `@click="handler"`     | `onPress={handler}`                            |
| `defineProps({...})`   | 函数参数解构                                   |
| `defineEmits`          | 接收回调 prop 并调用                           |

关键心态转变：Vue 里你声明"这个状态变化时要更新"，React 里你写"这次渲染要画什么"。渲染函数每次 state 变化都会重新执行，所以**不要在 JSX 旁边直接写副作用**——放到 `useEffect` 里。

## 路由：Expo Router vs vue-router

Expo Router 是文件即路由，和 `pages/` 目录约定类似，但结构有差异：

```
src/app/
├── _layout.tsx          ← 根布局（类似 App.vue 的 <router-view>）
├── +not-found.tsx       ← 404（类似 catch-all 路由）
└── (tabs)/
    ├── _layout.tsx      ← Tab 导航布局（类似 <router-view> + <tab-bar>）
    ├── index.tsx        ← "/" 首页
    └── about.tsx        ← "/about"
```

- `_layout.tsx` 是布局文件，决定子路由怎么渲染（Stack = 堆栈导航，Tabs = 底部 Tab 导航）。它**不渲染自身内容**，只提供导航容器，功能上接近 App.vue 里只包一层 `<router-view/>`。
- `(tabs)/` 圆括号目录是"路由分组"，URL 里不会出现 `(tabs)`，只是组织文件用。
- 页面跳转用 `<Link href="/about">`（类似 `<router-link to="/about">`），或者用 `router.push("/about")`。
- 导航参数通过文件名约定传递：`[id].tsx` 对应 `/about/:id`（类似动态路由参数）。

本项目的根 `_layout.tsx` 只有一行 `<Stack>`，意思是"子路由用堆栈切换"（A 页面推到 B 页面，可以返回）。`(tabs)/_layout.tsx` 用 `<Tabs>` 定义了 Home / About 两个底部 Tab，并配置了 tab 图标和主题色。

## Props & Events：没有 defineProps / defineEmits

React 里 props 就是函数参数，事件就是回调 props。以本项目的 `Button.tsx` 为例：

```tsx
type Props = {
  label: string;
  theme?: "primary";
  onPress?: () => void;
};

export default function Button({ label, theme, onPress }: Props) {
  return (
    <Pressable onPress={onPress}>
      <Text>{label}</Text>
    </Pressable>
  );
}
```

调用方传事件和传数据的方式一样：

```tsx
<Button label="Choose a photo" theme="primary" onPress={pickImageAsync} />
```

Vue 3 的对应关系：
| Vue | React |
|---|---|
| `defineProps<{ label: string }>()` | 函数参数解构 |
| `emit("press")` | 调用 `onPress` 回调 prop |
| `@press="handler"` | `onPress={handler}` |

没有 `.sync` / `v-model` 语法糖。如果子组件要改父组件的状态，父组件传 `onXxx` 回调下来，子组件里调用它。这就是"单向数据流"的全部实现。

## Slots：`children` 就是默认插槽

本项目 `EmojiPicker.tsx` 里用了 `PropsWithChildren`，效果等于 Vue 的 `<slot/>`：

```tsx
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  isVisible: boolean;
  onClose: () => void;
}>;

export default function EmojiPicker({ isVisible, children, onClose }: Props) {
  return (
    <Modal visible={isVisible}>
      <Text>Choose a sticker</Text>
      {children} {/* Vue 的 <slot/> 位置 */}
    </Modal>
  );
}
```

使用：

```tsx
<EmojiPicker isVisible={true} onClose={close}>
  <EmojiList onSelect={...} onCloseModal={...} />   {/* 这个就是 children/slot 内容 */}
</EmojiPicker>
```

RN 没有 named slot 概念。如果需要多个插槽，就把 JSX 当 prop 传：`<Comp header={<Text/>} footer={<Text/>} />`。

## 状态：useState vs ref()

```tsx
const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
```

对比 Vue：

```ts
const selectedImage = ref<string | undefined>(undefined);
```

区别：

1. `useState` 返回 `[值, setter]` 数组，不叫 `.value`
2. setter 是**替换整个值**，没有 `ref.value.x = y` 这种深层响应式
3. 每次 setState 都会触发**整个组件函数重新执行**（重新渲染），不是精准更新
4. 数组/对象状态更新时必须返回新引用（不可变性），`arr.push()` 不会触发更新

本项目的状态流示例（`index.tsx`）：

```tsx
const [pickedEmoji, setPickedEmoji] = useState<ImageSourcePropType | undefined>(undefined);
// ...
{
  pickedEmoji && <EmojiSticker imageSize={40} stickerSource={pickedEmoji} />;
}
```

`pickedEmoji` 从 undefined 变成有值 → 整个 Index 函数重新执行 → 条件渲染结果变化 → EmojiSticker 出现。这和 Vue 的响应式更新是同一目的，但实现机制完全不同（虚拟 DOM diff vs 依赖追踪）。

## 样式：StyleSheet vs scoped CSS

RN 没有 CSS 类选择器，没有级联，没有继承。样式是 JS 对象：

```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#25292e",
    alignItems: "center",
  },
});
```

对比 Vue 的 `<style scoped>`：没有 `class` 名字符串，没有全局样式泄漏问题，但也没有伪类选择器、媒体查询、CSS 变量。

几个最容易踩的 flex 差异（**RN 默认 flexDirection 是 column，不是 row**）：

| 属性            | Web 默认   | RN 默认      | 本项目示例                                       |
| --------------- | ---------- | ------------ | ------------------------------------------------ |
| flexDirection   | row        | **column**   | `optionsRow` 显式写了 `row`                      |
| justify-content | flex-start | flex-start   | 相同                                             |
| align-items     | stretch    | stretch      | `container` 里 `alignItems: "center"` 居中子元素 |
| position        | static     | **relative** | `EmojiSticker` 的 `top: -40` 生效                |

`position` 的坑：RN 没有 `static` 和 `fixed`。默认就是 `relative`，所以直接写 `top: -40` 是合法偏移（不脱离文档流），不是像 Web 里那样被忽略。需要悬浮元素时用 `position: "absolute"`（见 `optionsContainer` 和 `modalContent`）。

样式合并用数组语法（后者覆盖前者），类似 Vue 里绑定多个 class：

```tsx
<View style={[styles.buttonContainer, { borderWidth: 4, borderColor: "#ffd33d" }]} />
```

条件样式可以直接写三元：

```tsx
<Text style={{ color: focused ? "#ffd33d" : "#fff" }} />
```

## 条件渲染 & 列表渲染

`index.tsx` 里的条件渲染，直接对比：

```tsx
{
  showAppOptions ? <View style={styles.optionsContainer}>...</View> : <View style={styles.footerContainer}>...</View>;
}
```

等价于 Vue：

```html
<View v-if="showAppOptions">...</View> <View v-else>...</View>
```

列表渲染（`EmojiList.tsx` 用的是 `<FlatList>`，不是 `.map`，因为需要虚拟滚动）：

```tsx
<FlatList
  horizontal
  data={emoji}
  renderItem={({ item, index }) => (
    <Pressable
      onPress={() => {
        onSelect(item);
        onCloseModal();
      }}>
      <Image source={item} key={index} style={styles.image} />
    </Pressable>
  )}
/>
```

`renderItem` 相当于 Vue 的 `<template v-slot:item>`，`data` 是数据源。普通少量列表可以直接 `list.map(item => <View key={item.id}/>)`，和 Vue 的 `v-for` 一样需要 key。

## 交互组件：Pressable vs <button>

RN 没有 `<button>`、`<a>`。可点击的东西用 `<Pressable>`（或 `TouchableOpacity`）：

```tsx
<Pressable style={styles.iconButton} onPress={onPress}>
  <MaterialIcons name={icon} size={24} color="#fff" />
  <Text style={styles.iconButtonLabel}>{label}</Text>
</Pressable>
```

`Pressable` 就是 Vue 里 `<div @click>` 的正式版，支持 pressed 状态回调、hover（web 端）等。`TouchableOpacity` 是旧版，按下时变透明，效果类似 Vue 里手写 `:active` 样式。

## Modal：内置组件，不需要 Teleport

`EmojiPicker` 用的 `<Modal>` 是 RN 内置组件，不需要 Vue 的 `<Teleport to="body">`——RN 会自动把 Modal 渲染到原生宿主的浮层里（不受父容器 overflow 裁剪影响）：

```tsx
<Modal animationType="slide" transparent={true} visible={isVisible}>
  ...
</Modal>
```

`visible` 是受控 prop（类似 Vue 里的 `:model-value`），关闭靠调用 `onClose` 回调让父组件把状态改回 false。这就是为什么 `index.tsx` 里有：

```tsx
const [isModalVisible, setIsModalVisible] = useState(false);
const onModalClose = () => {
  setIsModalVisible(false);
};
```

## 图片：expo-image vs <img>

本项目用 `expo-image` 而不是 RN 内置 `<Image>`，API 更现代（支持缓存、优先级等）：

```tsx
import { Image } from "expo-image";
<Image source={imageSource} style={{ width: 320, height: 440 }} />;
```

和 `<img>` 的区别：

1. 必须给固定宽高（RN 没有浏览器那种"图片自带尺寸"的行为）
2. 本地图片用 `require()`（webpack 会处理为资源 URL），远程图片用 `{ uri: "https://..." }`
3. `source` 不是 `src`，且可以直接传 `require()` 的返回值

`ImageViewer.tsx` 里的模式值得记住：

```tsx
const imageSource = selectedImage ? { uri: selectedImage } : imgSource;
```

本地占位图和用户选择的本地 URI 走同一个 prop，只是 source 格式不同。

## 项目约定（StickerSmash 特有）

- 路径别名 `@/` → `src/`，`@/assets/` → `assets/`，所有跨目录导入用别名
- 组件默认导出，Props 类型定义在文件顶部，样式 `StyleSheet.create` 放文件底部
- 图标用 `@expo/vector-icons`（MaterialIcons / Ionicons / FontAwesome），按需引入
- 深色主题：背景 `#25292e`，强调色 `#ffd33d`
- 注释用中文

## 推荐学习路径

1. 先看 `src/app/(tabs)/index.tsx`（条件渲染 + 状态流 + 子组件组装）
2. 再看 `src/components/EmojiPicker.tsx`（children/slot + Modal + 受控组件）
3. 最后看 `src/components/EmojiSticker.tsx`（相对定位偏移）
4. 布局心智模型重点理解：RN 默认 `flexDirection: column`、默认 `position: relative`，这两点跟 Web 差异最大
