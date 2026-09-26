import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';

interface CameraScreenProps {
  onClose?: () => void;
  onPhotoCaptured?: (photoUrl: string) => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  onClose,
  onPhotoCaptured,
}) => {
  const [flash, setFlash] = useState(false);
  const [mode, setMode] = useState<'bill' | 'food' | 'auto'>('food');

  // Danh sách ảnh mẫu để giả lập chụp ngay trên máy ảo
  const samplePhotos = [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
  ];

  const handleCapture = () => {
    // Chọn ngẫu nhiên hoặc ảnh đầu tiên để chuyển qua màn hình Thêm giao dịch
    const chosenPhoto = samplePhotos[Math.floor(Math.random() * samplePhotos.length)];
    if (onPhotoCaptured) {
      onPhotoCaptured(chosenPhoto);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* 1. Header Bar trên kính ngắm */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.topBtnIcon}>✕</Text>
        </TouchableOpacity>

        {/* Chuyển đổi chế độ: Món ăn / Hóa đơn / Tự động */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'food' && styles.modeTabActive]}
            onPress={() => setMode('food')}
          >
            <Text style={[styles.modeText, mode === 'food' && styles.modeTextActive]}>🍜 Món ăn</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'bill' && styles.modeTabActive]}
            onPress={() => setMode('bill')}
          >
            <Text style={[styles.modeText, mode === 'bill' && styles.modeTextActive]}>🧾 Hóa đơn</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'auto' && styles.modeTabActive]}
            onPress={() => setMode('auto')}
          >
            <Text style={[styles.modeText, mode === 'auto' && styles.modeTextActive]}>✨ Tự động</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => setFlash(!flash)}
          activeOpacity={0.7}
        >
          <Text style={[styles.topBtnIcon, flash && { color: '#FBBF24' }]}>⚡</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Viewfinder / Kính ngắm Camera */}
      <View style={styles.viewfinderContainer}>
        {/* Ảnh nền xem trước camera */}
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
          }}
          style={styles.cameraPreview}
          blurRadius={0.5}
        />

        {/* Lớp phủ mờ xung quanh */}
        <View style={styles.overlayMask} />

        {/* Khung ngắm căn chỉnh màu xanh lá cây */}
        <View style={styles.targetBox}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          <View style={styles.hintBadge}>
            <Text style={styles.hintText}>
              {mode === 'bill'
                ? 'Căn chỉnh hóa đơn trong khung hình'
                : 'Hướng camera vào món ăn hoặc đồ uống'}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Nút chọn ảnh từ thư viện */}
        <TouchableOpacity
          style={styles.subBtn}
          onPress={handleCapture}
          activeOpacity={0.8}
        >
          <View style={styles.galleryPreview}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=100&auto=format&fit=crop&q=80',
              }}
              style={styles.galleryThumb}
            />
          </View>
          <Text style={styles.subBtnLabel}>Thư viện</Text>
        </TouchableOpacity>

        {/* Nút chụp to tròn chính giữa */}
        <TouchableOpacity
          style={styles.shutterOuter}
          onPress={handleCapture}
          activeOpacity={0.8}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        {/* Nút lật camera trước/sau */}
        <TouchableOpacity style={styles.subBtn} activeOpacity={0.8}>
          <View style={styles.flipBtn}>
            <Text style={styles.flipIcon}>🔄</Text>
          </View>
          <Text style={styles.subBtnLabel}>Đổi chiều</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 12,
    zIndex: 10,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBtnIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
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
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 28,
    marginHorizontal: 8,
  },
  cameraPreview: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlayMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  targetBox: {
    width: '84%',
    height: '65%',
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#10B981',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 12,
  },
  hintBadge: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  hintText: {
    color: '#ECFDF5',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomControls: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    backgroundColor: '#000000',
  },
  subBtn: {
    alignItems: 'center',
    width: 64,
  },
  galleryPreview: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  galleryThumb: {
    width: '100%',
    height: '100%',
  },
  flipBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipIcon: {
    fontSize: 20,
  },
  subBtnLabel: {
    color: '#D1D5DB',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  shutterInner: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    backgroundColor: '#10B981',
  },
});
