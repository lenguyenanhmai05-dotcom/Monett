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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  const [flash, setFlash] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<'1x' | '2x'>('2x');
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');

  // Danh sách ảnh mẫu phở bò và món ăn chân thực chuẩn theo mockup
  const samplePhoPhotos = [
    'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
  ];

  const [activePreviewImage, setActivePreviewImage] = useState<string>(samplePhoPhotos[0]);

  // Xử lý chụp ảnh
  const handleCapture = () => {
    if (onPhotoCaptured) {
      onPhotoCaptured(activePreviewImage);
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
        setActivePreviewImage(result.assets[0].uri);
        if (onPhotoCaptured) {
          onPhotoCaptured(result.assets[0].uri);
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

  // Toggle Flash
  const handleToggleFlash = () => {
    setFlash((prev) => !prev);
  };

  // Lật camera
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
            name={flash ? 'flash' : 'flash-off-outline'}
            size={20}
            color={flash ? '#FACC15' : '#94A3B8'}
          />
        </TouchableOpacity>

        {/* Nút Cài đặt góc phải */}
        <TouchableOpacity
          style={styles.topCircleBtn}
          onPress={() => {
            Alert.alert(
              'Cài đặt Camera Monett ⚙️',
              'Độ phân giải: HD 1080p\nTự động nhận diện hóa đơn: Bật\nLưu bản sao vào thư viện: Bật'
            );
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="settings-sharp" size={20} color="#D1D5DB" />
        </TouchableOpacity>
      </View>

      {/* 2. CAMERA VIEWFINDER (Kính ngắm bo góc lớn theo Mockup 1) */}
      <View style={styles.viewfinderContainer}>
        <View style={styles.viewfinderFrame}>
          {/* Ảnh nền xem trước phở bò */}
          <Image
            source={{ uri: activePreviewImage }}
            style={[
              styles.cameraImage,
              zoomLevel === '2x' && { transform: [{ scale: 1.15 }] },
              cameraFacing === 'front' && { transform: [{ scaleX: -1 }] },
            ]}
            resizeMode="cover"
          />

          {/* Cụm điều khiển dọc bên phải kính ngắm */}
          <View style={styles.rightFloatingControls}>
            {/* Nút 2x */}
            <TouchableOpacity
              style={styles.rightCirclePill}
              onPress={handleToggleZoom}
              activeOpacity={0.75}
            >
              <Text style={styles.zoomText}>{zoomLevel}</Text>
            </TouchableOpacity>

            {/* Nút Flash */}
            <TouchableOpacity
              style={styles.rightCirclePill}
              onPress={handleToggleFlash}
              activeOpacity={0.75}
            >
              <Ionicons
                name={flash ? 'flash' : 'flash-off'}
                size={16}
                color={flash ? '#FACC15' : '#FFFFFF'}
              />
            </TouchableOpacity>

            {/* Nút lật camera */}
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
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
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
        >
          <View style={styles.shutterInnerCircle} />
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
    paddingTop: Platform.OS === 'ios' ? 4 : 10,
    paddingBottom: 8,
  },
  topCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#161922',
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

  // Cụm nút bên phải kính ngắm
  rightFloatingControls: {
    position: 'absolute',
    right: 14,
    top: '32%',
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
    shadowColor: '#C026D3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
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
