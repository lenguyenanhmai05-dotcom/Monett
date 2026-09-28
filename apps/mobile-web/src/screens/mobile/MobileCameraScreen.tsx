import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface MobileCameraScreenProps {
  onNavigateTab: (tab: 'home' | 'camera' | 'journal') => void;
  onOpenProfile: () => void;
  onSaveMoment?: (moment: {
    photoUri: string;
    title: string;
    amount: number;
    category: string;
    note?: string;
  }) => void;
}

export const MobileCameraScreen: React.FC<MobileCameraScreenProps> = ({
  onNavigateTab,
  onOpenProfile,
  onSaveMoment,
}) => {
  // Camera state
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [zoomLevel, setZoomLevel] = useState<'1x' | '2x'>('1x');
  const [cameraMode, setCameraMode] = useState<'video' | 'photo' | 'voice'>('photo');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Form chi tiêu cho bức ảnh vừa chụp
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Ẩm thực');
  const [expenseNote, setExpenseNote] = useState('');

  // 1. Chụp ảnh từ Camera trực tiếp
  const handleTakePicture = async () => {
    if (isCapturing) return;
    try {
      setIsCapturing(true);
      if (cameraRef.current && permission?.granted) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });
        if (photo?.uri) {
          setCapturedPhoto(photo.uri);
          return;
        }
      }

      // Fallback: nếu camera chưa sẵn sàng, mở thư viện ảnh
      await handlePickFromGallery();
    } catch (err: any) {
      console.warn('Take picture notice:', err);
      // Mở thư viện nếu chụp camera gặp vấn đề
      await handlePickFromGallery();
    } finally {
      setIsCapturing(false);
    }
  };

  // 2. Chọn ảnh từ Album thư viện
  const handlePickFromGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setCapturedPhoto(res.assets[0].uri);
      }
    } catch (err) {
      console.warn('Pick from gallery error:', err);
    }
  };

  // 3. Đổi camera trước / sau
  const handleToggleFacing = () => {
    setFacing((cur) => (cur === 'back' ? 'front' : 'back'));
  };

  // 4. Đổi Flash
  const handleToggleFlash = () => {
    setFlash((cur) => (cur === 'off' ? 'on' : cur === 'on' ? 'auto' : 'off'));
  };

  // 5. Lưu khoảnh khắc chi tiêu
  const handleSaveExpense = () => {
    const parsedAmount = parseInt(expenseAmount.replace(/[^0-9]/g, ''), 10);
    if (!expenseTitle.trim()) {
      Alert.alert('Thiếu tên món', 'Vui lòng nhập tên món chi tiêu (Ví dụ: Cà phê sáng, Bữa trưa...).');
      return;
    }
    if (!parsedAmount || isNaN(parsedAmount)) {
      Alert.alert('Thiếu số tiền', 'Vui lòng nhập số tiền chi tiêu hợp lệ.');
      return;
    }

    if (capturedPhoto) {
      onSaveMoment?.({
        photoUri: capturedPhoto,
        title: expenseTitle.trim(),
        amount: parsedAmount,
        category: expenseCategory,
        note: expenseNote.trim() || undefined,
      });
    }

    const savedTitle = expenseTitle.trim();
    // Reset form
    setCapturedPhoto(null);
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseNote('');

    Alert.alert(
      'Đã lưu thành công! 🎉',
      `Khoảnh khắc "${savedTitle}" đã được ghi vào nhật ký chi tiêu Monett của bạn.`,
      [
        {
          text: 'Xem Nhật Ký',
          onPress: () => onNavigateTab('journal'),
        },
        {
          text: 'Chụp Tiếp',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={styles.container}>
        {/* ============================================================ */}
        {/* 1. TOP BAR: MASCOT AVATAR & INVITE "MỜI" PILL                */}
        {/* ============================================================ */}
        <View style={styles.topBar}>
          {/* Avatar góc trái - chạm để mở Profile */}
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={onOpenProfile}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Image
              source={require('../../../assets/adaptive-icon.png')}
              style={styles.avatarImg}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Pill "Mời" góc phải */}
          <TouchableOpacity
            style={styles.invitePill}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert(
                'Mời bạn bè tham gia Monett 💌',
                'Chia sẻ liên kết Monett để bạn bè và người thương cùng theo dõi khoảnh khắc chi tiêu thông thái!'
              )
            }
          >
            {/* Biểu tượng 2 người màu hồng cam */}
            <View style={styles.inviteIconWrap}>
              <Text style={styles.inviteIcon}>👥</Text>
            </View>
            <Text style={styles.inviteText}>Mời</Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* 2. CAMERA VIEWFINDER (ROUNDED RECTANGLE 3:4)                 */}
        {/* ============================================================ */}
        <View style={styles.viewfinderWrapper}>
          <View style={styles.viewfinderCard}>
            {/* Nếu chưa có quyền camera */}
            {!permission ? (
              <View style={styles.permissionPlaceholder}>
                <ActivityIndicator color="#10B981" size="large" />
                <Text style={styles.permissionDesc}>Đang kiểm tra quyền camera...</Text>
              </View>
            ) : !permission.granted ? (
              <View style={styles.permissionPlaceholder}>
                <Text style={styles.permissionEmoji}>📷</Text>
                <Text style={styles.permissionTitle}>Mở Camera Chụp Ảnh</Text>
                <Text style={styles.permissionDesc}>
                  Monett cần quyền Camera để bạn chụp lại hóa đơn và lưu khoảnh khắc chi tiêu thực tế.
                </Text>
                <TouchableOpacity
                  style={styles.permissionBtn}
                  onPress={requestPermission}
                  activeOpacity={0.85}
                >
                  <Text style={styles.permissionBtnText}>Cho Phép Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.permissionSecondaryBtn}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.8}
                >
                  <Text style={styles.permissionSecondaryText}>Hoặc chọn ảnh từ Thư viện</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Màn hình camera trực tiếp từ CameraView */
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing={facing}
                flash={flash}
                zoom={zoomLevel === '2x' ? 0.15 : 0}
              >
                {/* Controls overlay ở đáy kính ngắm (Flash, 1x, 3:4) */}
                <View style={styles.viewfinderBottomOverlay}>
                  {/* Flash toggle */}
                  <TouchableOpacity
                    style={[
                      styles.viewfinderRoundBtn,
                      flash !== 'off' && styles.viewfinderRoundBtnActive,
                    ]}
                    onPress={handleToggleFlash}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.flashIconText,
                        flash !== 'off' && { color: '#FDE047' },
                      ]}
                    >
                      ⚡
                    </Text>
                  </TouchableOpacity>

                  {/* Zoom toggle (1x / 2x) */}
                  <TouchableOpacity
                    style={styles.viewfinderPillBtn}
                    onPress={() => setZoomLevel((z) => (z === '1x' ? '2x' : '1x'))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewfinderPillText}>{zoomLevel}</Text>
                  </TouchableOpacity>

                  {/* Aspect ratio badge (3:4) */}
                  <View style={styles.viewfinderPillBtn}>
                    <Text style={styles.viewfinderPillText}>3:4</Text>
                  </View>
                </View>
              </CameraView>
            )}
          </View>
        </View>

        {/* ============================================================ */}
        {/* 3. MODE SELECTOR: VIDEO | ẢNH | GIỌNG NÓI                    */}
        {/* ============================================================ */}
        <View style={styles.modeTabsRow}>
          <TouchableOpacity
            onPress={() => {
              setCameraMode('video');
              Alert.alert('Chế độ Video', 'Chế độ quay video ngắn ghi nhận khoảnh khắc sắp ra mắt!');
            }}
            activeOpacity={0.7}
            style={styles.modeTabItem}
          >
            <Text
              style={[styles.modeTabText, cameraMode === 'video' && styles.modeTabTextActive]}
            >
              Video
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCameraMode('photo')}
            activeOpacity={0.7}
            style={styles.modeTabItem}
          >
            <Text
              style={[styles.modeTabText, cameraMode === 'photo' && styles.modeTabTextActive]}
            >
              Ảnh
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setCameraMode('voice');
              Alert.alert('Chế độ Giọng nói', 'Chế độ ghi nhận chi tiêu bằng giọng nói thông minh Monett AI đang được chuẩn bị!');
            }}
            activeOpacity={0.7}
            style={styles.modeTabItem}
          >
            <Text
              style={[styles.modeTabText, cameraMode === 'voice' && styles.modeTabTextActive]}
            >
              Giọng nói
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* 4. SHUTTER CONTROLS ROW                                      */}
        {/* ============================================================ */}
        <View style={styles.shutterRow}>
          {/* Gallery button (bên trái) */}
          <TouchableOpacity
            style={styles.gallerySquareBtn}
            onPress={handlePickFromGallery}
            activeOpacity={0.75}
          >
            <View style={styles.galleryIconInner}>
              <Text style={styles.galleryIconEmoji}>🖼️</Text>
            </View>
          </TouchableOpacity>

          {/* Big Pink/White Shutter Button (ở giữa) */}
          <TouchableOpacity
            style={styles.shutterOuterRing}
            onPress={handleTakePicture}
            disabled={isCapturing}
            activeOpacity={0.75}
          >
            <View style={styles.shutterInnerCircle}>
              {isCapturing && <ActivityIndicator color="#FB7185" size="small" />}
            </View>
          </TouchableOpacity>

          {/* Flip Camera Button (bên phải) */}
          <TouchableOpacity
            style={styles.flipCameraBtn}
            onPress={handleToggleFacing}
            activeOpacity={0.75}
          >
            <Text style={styles.flipCameraIcon}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* 5. BOTTOM DOCK SWITCHER (HOME | CAMERA | JOURNAL)            */}
        {/* ============================================================ */}
        <View style={styles.bottomDockWrapper}>
          <View style={styles.bottomDockPill}>
            {/* 1. Home / Dashboard */}
            <TouchableOpacity
              style={styles.dockItemBtn}
              onPress={() => onNavigateTab('home')}
              activeOpacity={0.7}
            >
              <Text style={styles.dockItemEmoji}>🏠</Text>
            </TouchableOpacity>

            {/* 2. Camera (Active Coral-Pink Circle) */}
            <View style={[styles.dockItemBtn, styles.dockItemBtnActive]}>
              <Text style={styles.dockItemCameraEmoji}>📷</Text>
            </View>

            {/* 3. Receipt / Moments Journal */}
            <TouchableOpacity
              style={styles.dockItemBtn}
              onPress={() => onNavigateTab('journal')}
              activeOpacity={0.7}
            >
              <Text style={styles.dockItemEmoji}>🧾</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. iOS Home Indicator bar */}
        <View style={styles.homeIndicator} />
      </View>

      {/* ============================================================ */}
      {/* 7. MODAL GHI NHẬN CHI TIÊU SAU KHI CHỤP ẢNH                  */}
      {/* ============================================================ */}
      <Modal visible={!!capturedPhoto} transparent animationType="slide">
        <View style={styles.photoModalBackdrop}>
          <View style={styles.photoModalSheet}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Khoảnh Khắc Chi Tiêu 📸</Text>
              <TouchableOpacity
                onPress={() => setCapturedPhoto(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.photoModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Ảnh xem trước vừa chụp */}
            {capturedPhoto ? (
              <View style={styles.photoPreviewWrapper}>
                <Image source={{ uri: capturedPhoto }} style={styles.photoPreviewImg} />
              </View>
            ) : null}

            {/* Form nhập thông tin */}
            <View style={styles.photoInputGroup}>
              <Text style={styles.photoInputLabel}>Tên món chi tiêu *</Text>
              <TextInput
                style={styles.photoTextInput}
                placeholder="Ví dụ: Cà phê sáng, Bữa trưa, Đi chợ..."
                placeholderTextColor="#94A3B8"
                value={expenseTitle}
                onChangeText={setExpenseTitle}
              />
            </View>

            <View style={styles.photoInputGroup}>
              <Text style={styles.photoInputLabel}>Số tiền (VNĐ) *</Text>
              <TextInput
                style={styles.photoTextInput}
                placeholder="Ví dụ: 45000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={expenseAmount}
                onChangeText={setExpenseAmount}
              />
            </View>

            <View style={styles.photoInputGroup}>
              <Text style={styles.photoInputLabel}>Danh mục</Text>
              <View style={styles.photoCategoryRow}>
                {['Ẩm thực', 'Đồ uống', 'Mua sắm', 'Di chuyển', 'Giải trí', 'Khác'].map(
                  (cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.photoCategoryChip,
                        expenseCategory === cat && styles.photoCategoryChipActive,
                      ]}
                      onPress={() => setExpenseCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.photoCategoryChipText,
                          expenseCategory === cat && styles.photoCategoryChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <View style={styles.photoInputGroup}>
              <Text style={styles.photoInputLabel}>Ghi chú (Tùy chọn)</Text>
              <TextInput
                style={styles.photoTextInput}
                placeholder="Cảm xúc hoặc người cùng đi..."
                placeholderTextColor="#94A3B8"
                value={expenseNote}
                onChangeText={setExpenseNote}
              />
            </View>

            <TouchableOpacity
              style={styles.saveMomentBtn}
              onPress={handleSaveExpense}
              activeOpacity={0.85}
            >
              <Text style={styles.saveMomentBtnText}>Lưu Khoảnh Khắc Chi Tiêu 🌱</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 6 : 4,
  },

  // 1. TOP BAR
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 6 : 14,
    paddingBottom: 8,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  invitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  inviteIconWrap: {
    marginRight: 6,
  },
  inviteIcon: {
    fontSize: 14,
  },
  inviteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 2. VIEWFINDER
  viewfinderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.58,
  },
  viewfinderCard: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  permissionPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  permissionEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  permissionDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  permissionBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 12,
  },
  permissionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  permissionSecondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  permissionSecondaryText: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '600',
  },

  viewfinderBottomOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewfinderRoundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  viewfinderRoundBtnActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderColor: '#FDE047',
  },
  flashIconText: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  viewfinderPillBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  viewfinderPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 3. MODE TABS
  modeTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 10,
  },
  modeTabItem: {
    paddingVertical: 4,
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717A',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  // 4. SHUTTER ROW
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 36,
    paddingVertical: 8,
  },
  gallerySquareBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  galleryIconInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryIconEmoji: {
    fontSize: 22,
  },

  shutterOuterRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3.5,
    borderColor: '#FB7185',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  shutterInnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  flipCameraBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  flipCameraIcon: {
    fontSize: 22,
    color: '#FFFFFF',
  },

  // 5. BOTTOM DOCK
  bottomDockWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: Platform.OS === 'ios' ? 4 : 2,
  },
  bottomDockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#201F25',
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  dockItemBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockItemBtnActive: {
    backgroundColor: '#FB7185',
  },
  dockItemEmoji: {
    fontSize: 20,
  },
  dockItemCameraEmoji: {
    fontSize: 20,
    color: '#FFFFFF',
  },

  // 6. HOME INDICATOR
  homeIndicator: {
    width: 134,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    marginTop: 8,
    opacity: 0.8,
  },

  // 7. PHOTO EXPENSE SHEET MODAL
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  photoModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  photoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  photoModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  photoModalClose: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    padding: 4,
  },
  photoPreviewWrapper: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#000000',
  },
  photoPreviewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoInputGroup: {
    marginBottom: 12,
  },
  photoInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  photoTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  photoCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  photoCategoryChipActive: {
    backgroundColor: '#047857',
  },
  photoCategoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  photoCategoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveMomentBtn: {
    backgroundColor: '#047857',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveMomentBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
