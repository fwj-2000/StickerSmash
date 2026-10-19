import type { RefObject } from "react";
import domtoimage from "dom-to-image";

/**
 * Web 端：把 ref 指向的 DOM 节点转成 JPEG，再触发浏览器下载。
 * expo-media-library 没有 web 实现，所以这里不允许 import 它。
 */
export async function saveImageToLibrary(target: RefObject<any>) {
  const node = target.current;

  if (!node) {
    console.warn("保存失败：目标节点尚未挂载");
    return;
  }

  try {
    const dataUrl = await domtoimage.toJpeg(node, {
      quality: 0.95,
      width: 320,
      height: 440,
    });

    const link = document.createElement("a");
    link.download = "sticker-smash.jpeg";
    link.href = dataUrl;
    link.click();
  } catch (e) {
    console.error("保存图片失败:", e);
  }
}
