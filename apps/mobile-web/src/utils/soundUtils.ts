import { Platform, NativeModules } from 'react-native';

/**
 * Phát âm thanh thông báo an toàn không bao giờ làm crash ứng dụng
 * Tương thích mượt mà cả Web, Expo Go và Native builds
 */
export const playNotificationSound = async () => {
  try {
    // 1. Nếu chạy trên Web: Dùng trực tiếp HTML5 Audio chuẩn của trình duyệt
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
      const audio = new (window as any).Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
      return;
    }

    // 2. Nếu chạy trên Native (Expo Go / iOS / Android):
    // Chỉ gọi expo-av khi thiết bị thực sự có cài đặt native module ExponentAV.
    // Nếu dùng Expo Go không có ExponentAV thì sẽ bỏ qua an toàn tuyệt đối, không crash ứng dụng.
    if (NativeModules && (NativeModules.ExponentAV || (NativeModules as any).ExpoAV)) {
      const ExpoAv = require('expo-av');
      if (ExpoAv?.Audio?.Sound) {
        await ExpoAv.Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        }).catch(() => {});

        const { sound } = await ExpoAv.Audio.Sound.createAsync(
          { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
          { shouldPlay: true, volume: 1.0 }
        );
        if (sound) {
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status?.didJustFinish) {
              sound.unloadAsync().catch(() => {});
            }
          });
        }
      }
    }
  } catch (err) {
    // Graceful fallback
  }
};
