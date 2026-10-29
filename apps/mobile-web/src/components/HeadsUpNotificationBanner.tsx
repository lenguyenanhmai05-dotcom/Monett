import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface HeadsUpToastData {
  id: string;
  title: string;
  message: string;
  type?: string;
  iconName?: any;
  iconColor?: string;
  iconBg?: string;
  onPress?: () => void;
  onAction?: () => void;
  actionText?: string;
}

interface HeadsUpNotificationBannerProps {
  toast: HeadsUpToastData | null;
  onDismiss: () => void;
}

export const HeadsUpNotificationBanner: React.FC<HeadsUpNotificationBannerProps> = ({
  toast,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (toast) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Đặt vị trí ban đầu ẩn trên đỉnh
      translateY.setValue(-160);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: Platform.OS !== 'web',
          bounciness: 7,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      // Tự động thu lại sau 7 giây
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, 7000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast]);

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -160,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!toast) return null;

  const topOffset = insets.top > 0 ? insets.top + 6 : (Platform.OS === 'web' ? 10 : 32);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: topOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.92}
        onPress={() => {
          if (toast.onPress) {
            toast.onPress();
          }
          handleDismiss();
        }}
      >
        {/* 1. Header kiểu Push Notification điện thoại */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.appIconWrap}>
              <Text style={{ fontSize: 13 }}>🐸</Text>
            </View>
            <Text style={styles.appName}>MONETT</Text>
            <Text style={styles.appDot}>•</Text>
            <Text style={styles.appTime}>Vừa xong</Text>
          </View>

          {/* Nút đóng góc phải */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={(e) => {
              if (Platform.OS === 'web') {
                e?.stopPropagation?.();
              }
              handleDismiss();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* 2. Nội dung lời nhắc / thông báo */}
        <View style={styles.contentRow}>
          <View style={[styles.iconCircle, { backgroundColor: toast.iconBg || '#FEF3C7' }]}>
            <Ionicons
              name={toast.iconName || 'alarm-outline'}
              size={19}
              color={toast.iconColor || '#D97706'}
            />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {toast.title}
            </Text>
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
        </View>

        {/* 3. Nút hành động nhanh (Quick Action Pill) */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={(e) => {
              if (Platform.OS === 'web') {
                e?.stopPropagation?.();
              }
              if (toast.onAction) {
                toast.onAction();
              } else if (toast.onPress) {
                toast.onPress();
              }
              handleDismiss();
            }}
            activeOpacity={0.8}
          >
            <View style={{ marginRight: 5 }}>
              <Ionicons name="checkmark-circle" size={15} color="#047857" />
            </View>
            <Text style={styles.actionBtnText}>{toast.actionText || 'Xem chi tiết'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any,
    left: 10,
    right: 10,
    zIndex: 999999999,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 20,
    pointerEvents: 'auto' as any,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
  },
  appName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.7,
  },
  appDot: {
    fontSize: 11,
    color: '#94A3B8',
    marginHorizontal: 6,
  },
  appTime: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14.8,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  message: {
    fontSize: 12.8,
    color: '#475569',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
});
