import type { RefObject } from "react";
import { Alert, Linking, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { Asset, requestPermissionsAsync } from "expo-media-library";

/**
 * 原生端（iOS / Android）：把 ref 指向的视图截图后写入系统相册。
 *
 * 注意：这个文件不能出现任何 web 才能用的 API，它的 web 对应实现是 save-image.web.ts，
 * Metro 在打包 web 时会自动优先选择 .web.ts，从而完全绕开 expo-media-library。
 */
export async function saveImageToLibrary(target: RefObject<View | null>) {
  try {
    // writeOnly = true：只申请「写入相册」权限，不读取用户已有相册
    const permission = await requestPermissionsAsync(true);

    if (!permission.granted) {
      Alert.alert("保存需要相册权限", "请在系统设置中开启「照片」权限后重试。", [
        { text: "取消", style: "cancel" },
        { text: "去设置", onPress: () => void Linking.openSettings() },
      ]);
      return;
    }

    const localUri = await captureRef(target, {
      height: 440,
      quality: 1,
    });

    await Asset.create(localUri);
    Alert.alert("已保存到相册");
  } catch (e) {
    console.error("保存图片失败:", e);
    Alert.alert("保存失败", e instanceof Error ? e.message : String(e));
  }
}
