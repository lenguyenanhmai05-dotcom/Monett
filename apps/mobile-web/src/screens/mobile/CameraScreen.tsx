import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../../contexts/LanguageContext';
import { FriendsFeedScreen } from './FriendsFeedScreen';

interface CameraScreenProps {
  onClose?: () => void;
  onPhotoCaptured?: (photoUrl: string, mode: 'bill' | 'food' | 'auto') => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  onClose,
  onPhotoCaptured,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const { height: screenHeight } = Dimensions.get('window');
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [displayZoom, setDisplayZoom] = useState<number>(1);
  const [mode, setMode] = useState<'bill' | 'food' | 'auto'>('food');
  const cameraRef = React.useRef<any>(null);

  // Swipe-up Friends Feed state & animation
  const [showFeed, setShowFeed] = useState(false);
  const feedSlideY = useRef(new Animated.Value(screenHeight || 800)).current;
  const bounceY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounceAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceY, {
          toValue: -5,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(bounceY, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnim.start();
    return () => bounceAnim.stop();
  }, []);

  const openFeed = () => {
    setShowFeed(true);
    Animated.spring(feedSlideY, {
      toValue: 0,
      damping: 24,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
  };

  const closeFeed = () => {
    Animated.timing(feedSlideY, {
      toValue: screenHeight || 800,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowFeed(false);
    });
  };

  // PanResponder phát hiện cử chỉ lướt lên (swipe up)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy < -20 && Math.abs(gestureState.dx) < 60;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -30) {
          openFeed();
        }
      },
    })
  ).current;

  const initialPinchDistance = React.useRef<number | null>(null);
  const initialZoomOnPinch = React.useRef<number>(1);

  const calculateDistance = (event: any) => {
    const touches = event.nativeEvent.touches;
    if (touches.length >= 2) {
      const dx = touches[0].pageX - touches[1].pageX;
      const dy = touches[0].pageY - touches[1].pageY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    return null;
  };

  const handleTouchMove = (event: any) => {
    if (event.nativeEvent.touches.length === 2) {
      if (!initialPinchDistance.current) {
        initialPinchDistance.current = calculateDistance(event);
        initialZoomOnPinch.current = displayZoom;
      } else {
        const currentDistance = calculateDistance(event);
        if (currentDistance) {
          const scale = currentDistance / initialPinchDistance.current;
          let newZoom = initialZoomOnPinch.current * scale;
          newZoom = Math.max(0.5, Math.min(newZoom, 6));
          setDisplayZoom(newZoom);
        }
      }
    } else {
      initialPinchDistance.current = null;
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistance.current = null;
  };

  const getExpoZoom = () => {
    const clamped = Math.max(0.5, Math.min(displayZoom, 6));
    if (clamped < 1) {
      // 0.5x -> 1.0x mapped to 0.0 -> 0.1
      return ((clamped - 0.5) / 0.5) * 0.1;
    } else {
      // 1.0x -> 6.0x mapped to 0.1 -> 0.35
      return 0.1 + ((clamped - 1) / 5.0) * 0.25;
    }
  };


  const handleToggleFacing = () => {
    setFacing((cur) => (cur === 'back' ? 'front' : 'back'));
    setDisplayZoom(1);
  };

  const handlePickFromGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        if (onPhotoCaptured) onPhotoCaptured(res.assets[0].uri, mode);
      }
    } catch (err) {
      console.warn('Gallery error:', err);
    }
  };

  const handleCapture = async () => {
    try {
      if (cameraRef.current && permission?.granted) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
        });
        if (photo?.uri && onPhotoCaptured) {
          onPhotoCaptured(photo.uri, mode);
          return;
        }
      }
      await handlePickFromGallery();
    } catch (err) {
      console.warn('Capture error, fallback to gallery:', err);
      await handlePickFromGallery();
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <TouchableOpacity
          style={{ position: 'absolute', top: 40, left: 20, zIndex: 10, padding: 8 }}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <Ionicons name="camera-outline" size={60} color="#34D399" style={{ marginBottom: 16 }} />

        <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
          {isVi ? 'Monett cần quyền Camera' : 'Camera Permission Needed'}
        </Text>
        <Text style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', marginBottom: 28, maxWidth: 300, lineHeight: 20 }}>
          {isVi
            ? 'Vui lòng cấp quyền camera để chụp trực tiếp, hoặc chọn ảnh hóa đơn / món ăn từ thư viện máy của bạn.'
            : 'Please grant camera access, or choose a photo from your library.'}
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: '#059669',
            paddingVertical: 14,
            paddingHorizontal: 28,
            borderRadius: 24,
            marginBottom: 12,
            width: '100%',
            maxWidth: 280,
            alignItems: 'center',
          }}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>
            {isVi ? 'Cấp quyền Camera' : 'Grant Camera Permission'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            paddingVertical: 14,
            paddingHorizontal: 28,
            borderRadius: 24,
            width: '100%',
            maxWidth: 280,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
          onPress={handlePickFromGallery}
          activeOpacity={0.8}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
            {isVi ? '🖼️ Chọn ảnh từ thư viện' : '🖼️ Pick from Gallery'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} {...panResponder.panHandlers}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* 1. Header Bar trên kính ngắm */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Chuyển đổi chế độ: Món ăn / Hóa đơn / Tự động */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'food' && styles.modeTabActive]}
            onPress={() => setMode('food')}
          >
            <Ionicons name="restaurant-outline" size={13} color={mode === 'food' ? '#FFFFFF' : '#D1D5DB'} style={{ marginRight: 4 }} />
            <Text style={[styles.modeText, mode === 'food' && styles.modeTextActive]}>{isVi ? 'Món ăn' : 'Food'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'bill' && styles.modeTabActive]}
            onPress={() => setMode('bill')}
          >
            <Ionicons name="receipt-outline" size={13} color={mode === 'bill' ? '#FFFFFF' : '#D1D5DB'} style={{ marginRight: 4 }} />
            <Text style={[styles.modeText, mode === 'bill' && styles.modeTextActive]}>{isVi ? 'Hóa đơn' : 'Bill'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'auto' && styles.modeTabActive]}
            onPress={() => setMode('auto')}
          >
            <Ionicons name="sparkles-outline" size={13} color={mode === 'auto' ? '#FFFFFF' : '#D1D5DB'} style={{ marginRight: 4 }} />
            <Text style={[styles.modeText, mode === 'auto' && styles.modeTextActive]}>{isVi ? 'Tự động' : 'Auto'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* 2. Viewfinder / Kính ngắm Camera */}
      <View style={{ flex: 1, justifyContent: 'flex-start', paddingTop: 20 }}>
        <View
          style={styles.viewfinderContainer}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
        >
          <CameraView
            ref={cameraRef}
            style={styles.cameraPreview}
            facing={facing}
            flash={flash}
            zoom={getExpoZoom()}
          />

          {/* Flash Button at Top-Left */}
          <TouchableOpacity
            style={styles.flashBtnInside}
            onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={flash === 'off' ? 'flash-off-outline' : 'flash'}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Zoom Toggle at Top-Right */}
          <TouchableOpacity
            style={styles.zoomPillInside}
            onPress={() => setDisplayZoom(z => (z === 1 ? 0.5 : 1))}
            activeOpacity={0.7}
          >
            <Text style={styles.zoomPillText}>
              {facing === 'front'
                ? (displayZoom === 1 ? '1x' : '↘ ↙')
                : (displayZoom === 1 ? '1x' : '.5x')
              }
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Nút chọn ảnh từ thư viện */}
          <TouchableOpacity
            style={styles.subBtn}
            onPress={handlePickFromGallery}
            activeOpacity={0.8}
          >
            <View style={styles.galleryPreview}>
              <Ionicons name="images-outline" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.subBtnLabel}>{isVi ? 'Thư viện' : 'Gallery'}</Text>
          </TouchableOpacity>

          {/* Nút chụp to tròn chính giữa */}
          <TouchableOpacity
            style={styles.shutterOuter}
            onPress={handleCapture}
            activeOpacity={0.8}
          >
            <View style={styles.shutterInner}>
              <View style={styles.frogEarLeft} />
              <View style={styles.frogEarRight} />
            </View>
          </TouchableOpacity>

          {/* Nút lật camera trước/sau */}
          <TouchableOpacity style={styles.subBtn} onPress={handleToggleFacing} activeOpacity={0.8}>
            <View style={styles.flipBtn}>
              <Ionicons name="camera-reverse-outline" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.subBtnLabel}>{isVi ? 'Đổi chiều' : 'Flip'}</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Lướt lên xem Bảng tin bạn bè */}
        <TouchableOpacity
          style={styles.swipeUpContainer}
          onPress={openFeed}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ translateY: bounceY }] }}>
            <Ionicons name="chevron-up" size={18} color="#FFFFFF" />
          </Animated.View>
          <View style={styles.swipeUpPill}>
            <Ionicons name="people" size={13} color="#34D399" style={{ marginRight: 6 }} />
            <Text style={styles.swipeUpText}>
              {isVi ? 'Lướt lên xem Bảng tin bạn bè' : 'Swipe up for Friends Feed'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 5. Màn hình Bảng tin bạn bè trượt lên khi lướt lên */}
      {showFeed && (
        <Animated.View style={[styles.feedOverlay, { transform: [{ translateY: feedSlideY }] }]}>
          <FriendsFeedScreen onBack={closeFeed} />
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    zIndex: 10,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modeTabActive: {
    backgroundColor: '#047857',
  },
  modeText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  viewfinderContainer: {
    width: '100%',
    aspectRatio: 1,
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 40,
  },
  cameraPreview: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  flashBtnInside: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomPillInside: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomControls: {
    marginTop: 65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  subBtn: {
    alignItems: 'center',
    width: 72,
  },
  galleryPreview: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryThumb: {
    width: '100%',
    height: '100%',
  },
  flipBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subBtnLabel: {
    color: '#D1D5DB',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  shutterOuter: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  shutterInner: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: '#10B981',
    position: 'relative',
  },
  frogEarLeft: {
    position: 'absolute',
    top: -5,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
  },
  frogEarRight: {
    position: 'absolute',
    top: -5,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
  },
  swipeUpContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingBottom: 6,
  },
  swipeUpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginTop: 2,
  },
  swipeUpText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  feedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
  },
});
