import { Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';

let isAudioModeConfigured = false;

const configureAudioMode = async () => {
  if (isAudioModeConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    isAudioModeConfigured = true;
  } catch {
    // Không làm gián đoạn luồng nếu chưa thiết lập được
  }
};

const playNativeSound = async (type: 'ting' | 'pop') => {
  try {
    await configureAudioMode();
    const soundSource =
      type === 'ting'
        ? require('../../assets/sounds/ting.wav')
        : require('../../assets/sounds/pop.wav');

    const { sound } = await Audio.Sound.createAsync(
      soundSource,
      { shouldPlay: true, volume: 1.0 }
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch (error) {
    console.debug('playNativeSound error:', error);
  }
};

let audioContext: any = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioCtx();
    }
    return audioContext;
  } catch {
    return null;
  }
};

/**
 * Phát âm thanh thông báo chuông "ting ting" trong trẻo, an toàn
 * Hỗ trợ toàn diện: Web, Mobile Web (iOS/Android) và Native Expo App
 */
export const playNotificationSound = async () => {
  try {
    // 1. Nếu trên Native Mobile (iOS/Android qua Expo)
    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate([0, 40, 60, 40]);
      } catch {}
      await playNativeSound('ting');
      return;
    }

    // 2. Trên Web / Mobile Browser: Web Audio API tổng hợp âm thanh tức thì
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // Tiếng "Ting" thứ 1 (C6 ~ 1046.5 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, now);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.35, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Tiếng "Ting" thứ 2 (E6 ~ 1318.5 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.5, now + 0.12);
      gain2.gain.setValueAtTime(0.001, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.38, now + 0.135);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.5);
    } else {
      // Fallback cho trình duyệt nếu Web Audio API bị chặn
      try {
        const audio = new (window as any).Audio('/sounds/ting.wav');
        audio.play().catch(() => {});
      } catch {}
    }
  } catch (error) {
    console.debug('playNotificationSound error:', error);
  }
};

/**
 * Phát âm thanh nhẹ nhàng "pop" khi bạn bấm gửi tin nhắn đi
 */
export const playMessageSentSound = async () => {
  try {
    if (Platform.OS !== 'web') {
      await playNativeSound('pop');
      return;
    }

    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.08);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } else {
      try {
        const audio = new (window as any).Audio('/sounds/pop.wav');
        audio.play().catch(() => {});
      } catch {}
    }
  } catch (error) {
    console.debug('playMessageSentSound error:', error);
  }
};
