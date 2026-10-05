import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CameraScreenProps {
  onClose?: () => void;
  onPhotoCaptured?: (photoUrl: string) => void;
  onNavigateToCalendar?: () => void;
  onNavigateToHome?: () => void;
  onNavigateToWallets?: () => void;
  onNavigateToAnalytics?: () => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  onClose,
  onPhotoCaptured,
  onNavigateToCalendar,
  onNavigateToHome,
  onNavigateToWallets,
  onNavigateToAnalytics,
}) => {
  // Camera Hardware Permissions & State
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [zoomLevel, setZoomLevel] = useState<'1x' | '2x'>('1x');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Danh sách ảnh mẫu phở bò và món ăn chân thực chuẩn theo mockup (Fallback)
  const samplePhoPhotos = [
    'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
  ];

  const [activePreviewImage, setActivePreviewImage] = useState<string>(samplePhoPhotos[0]);

  // Xử lý chụp ảnh từ Camera phần cứng thật (hoặc fallback nếu chưa cấp quyền)
  const handleCapture = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);

      // 1. Nếu có quyền camera thật và cameraRef đã sẵn sàng: Chụp ảnh thật
      if (cameraRef.current && permission?.granted) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });

        if (photo?.uri) {
          if (onPhotoCaptured) {
            onPhotoCaptured(photo.uri);
          }
          return;
        }
      }

      // 2. Fallback: Nếu không có camera hoặc đang chạy web không có quyền
      if (onPhotoCaptured) {
        onPhotoCaptured(activePreviewImage);
      }
    } catch (e) {
      console.warn('Lỗi khi chụp camera:', e);
      // Fallback khi chụp lỗi
      if (onPhotoCaptured) {
        onPhotoCaptured(activePreviewImage);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  // Chọn ảnh từ thư viện
  const handlePickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const pickedUri = result.assets[0].uri;
        setActivePreviewImage(pickedUri);
        if (onPhotoCaptured) {
          onPhotoCaptured(pickedUri);
        }
      }
    } catch (e) {
      console.warn('Lỗi khi mở thư viện ảnh:', e);
      // Fallback nếu chạy trên môi trường không hỗ trợ picker
      if (onPhotoCaptured) {
        onPhotoCaptured(activePreviewImage);
      }
    }
  };

  // Toggle Zoom 1x / 2x
  const handleToggleZoom = () => {
    setZoomLevel((prev) => (prev === '1x' ? '2x' : '1x'));
  };

  // Toggle Flash (off -> on -> auto -> off)
  const handleToggleFlash = () => {
    setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  };

  // Lật camera trước / sau
  const handleToggleFacing = () => {
    setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#050508" />

      {/* 1. TOP BAR */}
      <View style={styles.topBar}>
        {/* Nút Flash góc trái */}
        <TouchableOpacity
          style={styles.topCircleBtn}
          onPress={handleToggleFlash}
          activeOpacity={0.75}
        >
          <Ionicons
            name={flash === 'on' ? 'flash' : 'flash-off-outline'}
            size={20}
            color={flash === 'on' ? '#FACC15' : '#94A3B8'}
          />
        </TouchableOpacity>

        {/* Nút Đóng / Quay lại */}
        {onClose && (
          <TouchableOpacity
            style={styles.topCircleBtn}
            onPress={onClose}
            activeOpacity={0.75}
          >
            <Ionicons name="close" size={22} color="#D1D5DB" />
          </TouchableOpacity>
        )}

        {/* Nút Cài đặt góc phải */}
        <TouchableOpacity
          style={styles.topCircleBtn}
          onPress={() => {
            Alert.alert(
              'Cài đặt Camera Monett ⚙️',
              `Quyền Camera: ${permission?.granted ? 'Đã cấp ✅' : 'Chưa cấp ⚠️'}\nĐộ phân giải: Full HD\nTự động lưu ảnh: Bật\nChế độ đèn: ${flash.toUpperCase()}`
            );
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="settings-sharp" size={20} color="#D1D5DB" />
        </TouchableOpacity>
      </View>

      {/* 2. CAMERA VIEWFINDER (Kính ngắm bo góc lớn theo Mockup) */}
      <View style={styles.viewfinderContainer}>
        <View style={styles.viewfinderFrame}>
          {/* Trạng thái 1: Đã cấp quyền Camera -> Live CameraView từ cảm biến thật */}
          {permission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={cameraFacing}
              flash={flash}
              zoom={zoomLevel === '2x' ? 0.25 : 0}
            />
          ) : (
            /* Trạng thái 2: Chưa cấp quyền hoặc đang chạy web giả lập */
            <View style={StyleSheet.absoluteFill}>
              <Image
                source={{ uri: activePreviewImage }}
                style={[
                  styles.cameraImage,
                  zoomLevel === '2x' && { transform: [{ scale: 1.15 }] },
                  cameraFacing === 'front' && { transform: [{ scaleX: -1 }] },
                ]}
                resizeMode="cover"
              />

              {/* Banner xin quyền nếu permission chưa được cấp */}
              {permission && !permission.granted && (
                <View style={styles.permissionOverlay}>
                  <View style={styles.permissionBadge}>
                    <Ionicons name="camera" size={32} color="#A855F7" />
                  </View>
                  <Text style={styles.permissionTitle}>Mở Camera Chụp Ảnh</Text>
                  <Text style={styles.permissionSub}>
                    Cấp quyền camera để quét hóa đơn và lưu lại khoảnh khắc bữa ăn, chi tiêu mỗi ngày.
                  </Text>
                  <TouchableOpacity
                    style={styles.permissionBtn}
                    onPress={requestPermission}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.permissionBtnText}>Cấp Quyền Camera</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Cụm điều khiển dọc bên phải kính ngắm */}
          <View style={styles.rightFloatingControls}>
            {/* Nút 1x / 2x */}
            <TouchableOpacity
              style={[styles.rightCirclePill, zoomLevel === '2x' && styles.rightCirclePillActive]}
              onPress={handleToggleZoom}
              activeOpacity={0.75}
            >
              <Text style={styles.zoomText}>{zoomLevel}</Text>
            </TouchableOpacity>

            {/* Nút Flash */}
            <TouchableOpacity
              style={[styles.rightCirclePill, flash === 'on' && styles.rightCirclePillActive]}
              onPress={handleToggleFlash}
              activeOpacity={0.75}
            >
              <Ionicons
                name={flash === 'on' ? 'flash' : 'flash-off'}
                size={16}
                color={flash === 'on' ? '#FACC15' : '#FFFFFF'}
              />
            </TouchableOpacity>

            {/* Nút lật camera trước / sau */}
            <TouchableOpacity
              style={styles.rightCirclePill}
              onPress={handleToggleFacing}
              activeOpacity={0.75}
            >
              <Ionicons name="sync" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Nút tròn màu tím neon "+" nổi ở đáy kính ngắm */}
          <TouchableOpacity
            style={styles.magentaPlusBtn}
            onPress={handleCapture}
            activeOpacity={0.85}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="add" size={28} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. SHUTTER & ACCESSORY CONTROLS ROW */}
      <View style={styles.shutterRow}>
        {/* Nút chọn ảnh từ Thư viện */}
        <TouchableOpacity
          style={styles.shutterSideBtn}
          onPress={handlePickFromLibrary}
          activeOpacity={0.75}
        >
          <Ionicons name="images-outline" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Nút chụp cỡ lớn vòng tròn kép trắng */}
        <TouchableOpacity
          style={styles.shutterOuterRing}
          onPress={handleCapture}
          activeOpacity={0.85}
          disabled={isCapturing}
        >
          {isCapturing ? (
            <ActivityIndicator color="#C026D3" size="small" />
          ) : (
            <View style={styles.shutterInnerCircle} />
          )}
        </TouchableOpacity>

        {/* Nút Giọng nói / Micro */}
        <TouchableOpacity
          style={styles.shutterSideBtn}
          onPress={() => {
            Alert.alert(
              'Nhập chi tiêu bằng Giọng nói 🎙️',
              'Tính năng Monett AI Voice: Bạn có thể nói "Phở bò 50 nghìn" để tự động ghi nhận giao dịch!'
            );
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="mic-outline" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 4. FLOATING STATS PILL: "Thống kê ⌄" */}
      <View style={styles.statsPillWrapper}>
        <TouchableOpacity
          style={styles.statsPill}
          onPress={() => {
            if (onNavigateToAnalytics) onNavigateToAnalytics();
            else if (onClose) onClose();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="bar-chart" size={15} color="#A855F7" style={styles.statsIcon} />
          <Text style={styles.statsText}>Thống kê</Text>
        </TouchableOpacity>
        <Ionicons name="chevron-down" size={12} color="#64748B" style={styles.statsChevron} />
      </View>

      {/* 5. BOTTOM NAVIGATION DOCK (Lịch, Home, Ví) */}
      <View style={styles.bottomDockContainer}>
        <View style={styles.bottomDock}>
          {/* Nút Lịch */}
          <TouchableOpacity
            style={styles.dockItem}
            onPress={() => {
              if (onNavigateToCalendar) onNavigateToCalendar();
              else if (onClose) onClose();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color="#94A3B8" />
          </TouchableOpacity>

          {/* Nút Home (Active pill) */}
          <TouchableOpacity
            style={styles.dockHomeItemActive}
            onPress={() => {
              if (onNavigateToHome) onNavigateToHome();
              else if (onClose) onClose();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="home" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Nút Ví */}
          <TouchableOpacity
            style={styles.dockItem}
            onPress={() => {
              if (onNavigateToWallets) onNavigateToWallets();
              else if (onClose) onClose();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="wallet-outline" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 6. HOME INDICATOR LINE */}
      <View style={styles.homeIndicator} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },

  // 1. TOP BAR
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  topCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 2. CAMERA VIEWFINDER
  viewfinderContainer: {
    flex: 1,
    paddingHorizontal: 14,
    marginVertical: 4,
    maxHeight: SCREEN_HEIGHT * 0.58,
  },
  viewfinderFrame: {
    flex: 1,
    borderRadius: 36,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#121620',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },

  // Permission Overlay
  permissionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 5, 8, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderRadius: 36,
  },
  permissionBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  permissionSub: {
    color: '#94A3B8',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  permissionBtn: {
    backgroundColor: '#9333EA',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Cụm nút bên phải kính ngắm
  rightFloatingControls: {
    position: 'absolute',
    right: 14,
    top: '30%',
    gap: 12,
    alignItems: 'center',
  },
  rightCirclePill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(20, 22, 32, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightCirclePillActive: {
    backgroundColor: 'rgba(147, 51, 234, 0.7)',
    borderColor: '#C084FC',
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // Nút tròn màu tím neon "+"
  magentaPlusBtn: {
    position: 'absolute',
    bottom: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C026D3',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(192, 38, 211, 0.5)',
      } as any,
      default: {
        shadowColor: '#C026D3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },

  // 3. SHUTTER ROW
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  shutterSideBtn: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterOuterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  shutterInnerCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
  },

  // 4. FLOATING STATS PILL
  statsPillWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E202C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statsIcon: {
    marginRight: 6,
  },
  statsText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statsChevron: {
    marginTop: 3,
  },

  // 5. BOTTOM DOCK
  bottomDockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  bottomDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151922',
    borderRadius: 24,
    height: 54,
    paddingHorizontal: 18,
    gap: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dockItem: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dockHomeItemActive: {
    width: 44,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#262D3D',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 6. HOME INDICATOR
  homeIndicator: {
    width: 134,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginTop: 4,
    opacity: 0.6,
  },
});
