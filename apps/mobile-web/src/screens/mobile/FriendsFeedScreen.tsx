import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput,
  Animated,
  Dimensions,
  Share,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-qr-code';
import {
  getMomentsFeedApi,
  reactMomentApi,
  createMomentApi,
  updateMomentApi,
  deleteMomentApi,
  uploadMomentPhotoApi,
  getFriendsApi,
  sendFriendRequestApi,
  getFriendRequestsApi,
  respondFriendRequestApi,
  normalizeAvatarUrl,
} from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EMOJIS = ['❤️', '🔥', '👏', '😂', '💸'];

export type MomentItem = {
  id: string;
  user: { name: string; avatar: string | null; id: string };
  photo: string;
  caption: string;
  amount: number;
  category: string;
  time: string;
  reactions: Record<string, number>;
  myReaction: string | null;
};

// ─── Avatar Component ────────────────────────────────────────────────────────
const Avatar = ({ uri, name, size = 40 }: { uri?: string | null; name: string; size?: number }) => {
  const [err, setErr] = useState(false);
  const initial = (name || '?').charAt(0).toUpperCase();
  const colors = ['#059669', '#8B5CF6', '#F59E0B', '#EF4444', '#0EA5E9'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bg = colors[Math.abs(hash) % colors.length];

  const normalizedUri = normalizeAvatarUrl(uri);

  if (normalizedUri && !err) {
    return (
      <Image
        source={{ uri: normalizedUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.4 }}>{initial}</Text>
    </View>
  );
};

// ─── Moment Card with Edit/Delete ─────────────────────────────────────────────
const MomentCard = ({
  item,
  currentUserId,
  onReact,
  onEdit,
  onDelete,
}: {
  item: MomentItem;
  currentUserId: string;
  onReact: (id: string, emoji: string) => void;
  onEdit: (item: MomentItem) => void;
  onDelete: (id: string) => void;
}) => {
  const [showEmojis, setShowEmojis] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const emojiAnim = useRef(new Animated.Value(0)).current;

  const isOwner = item.user?.id === currentUserId;

  const toggleEmojis = () => {
    if (showEmojis) {
      Animated.timing(emojiAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setShowEmojis(false));
    } else {
      setShowEmojis(true);
      Animated.spring(emojiAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }).start();
    }
  };

  const totalReactions = Object.values(item.reactions || {}).reduce((a, b) => a + b, 0);

  return (
    <View style={cardStyles.card}>
      {/* Header */}
      <View style={cardStyles.header}>
        <Avatar uri={item.user?.avatar} name={item.user?.name || 'Bạn'} size={40} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={cardStyles.userName}>{item.user?.name || 'Bạn bè'}</Text>
          <Text style={cardStyles.meta}>{item.category || 'Chi tiêu'} · {item.time}</Text>
        </View>
        {item.amount !== 0 && (
          <Text style={[cardStyles.amount, { color: item.amount < 0 ? '#EF4444' : '#059669' }]}>
            {item.amount < 0 ? '-' : '+'}{Math.abs(item.amount).toLocaleString('vi-VN')}đ
          </Text>
        )}
        {/* 3-dot menu for own posts */}
        {isOwner && (
          <TouchableOpacity onPress={() => setShowMenu(true)} style={cardStyles.menuBtn}>
            <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Photo */}
      <TouchableOpacity onPress={toggleEmojis} activeOpacity={0.95}>
        <Image source={{ uri: normalizeAvatarUrl(item.photo) || item.photo }} style={cardStyles.photo} resizeMode="cover" />
        {item.caption ? (
          <View style={cardStyles.captionOverlay}>
            <Text style={cardStyles.caption}>{item.caption}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Reaction Bar */}
      <View style={cardStyles.reactionBar}>
        {/* Summary */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {Object.entries(item.reactions || {})
            .filter(([, count]) => count > 0)
            .map(([emoji, count]) => (
              <View key={emoji} style={cardStyles.emojiBadge}>
                <Text style={{ fontSize: 14 }}>{emoji}</Text>
                <Text style={cardStyles.emojiBadgeCount}>{count}</Text>
              </View>
            ))}
          {totalReactions === 0 && (
            <Text style={cardStyles.noReactionText}>Chạm để thả cảm xúc ✨</Text>
          )}
        </View>

        {/* React Button */}
        <TouchableOpacity style={[cardStyles.reactBtn, item.myReaction && cardStyles.reactBtnActive]} onPress={toggleEmojis}>
          <Text style={{ fontSize: 16 }}>{item.myReaction || '😊'}</Text>
          <Text style={[cardStyles.reactBtnText, item.myReaction && cardStyles.reactBtnTextActive]}>
            {item.myReaction ? 'Đã thả' : 'Thả cảm xúc'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Emoji Picker */}
      {showEmojis && (
        <Animated.View
          style={[
            cardStyles.emojiPicker,
            {
              opacity: emojiAnim,
              transform: [{ scale: emojiAnim }],
            },
          ]}
        >
          {EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[
                cardStyles.emojiBtn,
                item.myReaction === emoji && cardStyles.emojiBtnActive,
              ]}
              onPress={() => {
                onReact(item.id, emoji);
                toggleEmojis();
              }}
            >
              <Text style={{ fontSize: 26 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* Edit/Delete Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={cardStyles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={cardStyles.menuSheet}>
            <Text style={cardStyles.menuSheetTitle}>Tùy chọn bài đăng</Text>
            <TouchableOpacity
              style={cardStyles.menuSheetItem}
              onPress={() => { setShowMenu(false); onEdit(item); }}
            >
              <Ionicons name="pencil-outline" size={20} color="#059669" />
              <Text style={[cardStyles.menuSheetItemText, { color: '#059669' }]}>Chỉnh sửa bài đăng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={cardStyles.menuSheetItem}
              onPress={() => {
                setShowMenu(false);
                Alert.alert('Xóa bài đăng', 'Bạn chắc chắn muốn xóa khoảnh khắc này?', [
                  { text: 'Hủy', style: 'cancel' },
                  { text: 'Xóa', style: 'destructive', onPress: () => onDelete(item.id) },
                ]);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={[cardStyles.menuSheetItemText, { color: '#EF4444' }]}>Xóa bài đăng</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  meta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    marginRight: 4,
  },
  menuBtn: {
    padding: 6,
  },
  photo: {
    width: '100%',
    height: SCREEN_WIDTH - 32,
    backgroundColor: '#F1F5F9',
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  noReactionText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  emojiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    gap: 2,
  },
  emojiBadgeCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  reactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reactBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  reactBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  reactBtnTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  emojiPicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 6,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emojiBtnActive: {
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#059669',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuSheet: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: SCREEN_WIDTH - 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  menuSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  menuSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  menuSheetItemText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  '🍜 Ăn uống', '☕ Cà phê', '🚗 Di chuyển', '🛒 Mua sắm',
  '🎮 Giải trí', '💪 Thể thao', '📚 Học tập', '💊 Sức khỏe', '🏠 Nhà ở',
];

// ─── Modal Tạo / Chỉnh Sửa Khoảnh Khắc ──────────────────────────────────────
const MomentFormModal = ({
  visible,
  onClose,
  onDone,
  editingItem,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: (updatedOrNew: any) => void;
  editingItem?: MomentItem | null;
}) => {
  const isEdit = !!editingItem;
  const [caption, setCaption] = useState(editingItem?.caption || '');
  const [amount, setAmount] = useState(editingItem?.amount ? Math.abs(editingItem.amount).toString() : '');
  const [category, setCategory] = useState(editingItem?.category || CATEGORIES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(editingItem?.photo || '');

  // Reset when opening
  useEffect(() => {
    if (visible) {
      setCaption(editingItem?.caption || '');
      setAmount(editingItem?.amount ? Math.abs(editingItem.amount).toString() : '');
      setCategory(editingItem?.category || CATEGORIES[0]);
      setSelectedPhoto(editingItem?.photo || samplePhotos[0]);
    }
  }, [visible, editingItem]);

  // Mẫu ảnh Unsplash đẹp
  const samplePhotos = [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=600&auto=format&fit=crop',
  ];

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingPhoto(true);
        const asset = result.assets[0];
        const uri = asset.uri;
        const filename = asset.fileName || uri.split('/').pop() || 'moment.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = match ? `image/${match[1]}` : 'image/jpeg';
        const uploadedUrl = await uploadMomentPhotoApi(uri, mimeType, filename);
        setSelectedPhoto(uploadedUrl);
        Alert.alert('✅ Thành công', 'Ảnh đã được tải lên!');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tải ảnh lên');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting || uploadingPhoto) return;
    try {
      setSubmitting(true);
      const parsedAmount = amount ? -Math.abs(parseInt(amount.replace(/\D/g, '') || '0', 10)) : -50000;
      const photo = selectedPhoto || samplePhotos[0];

      if (isEdit && editingItem) {
        const res = await updateMomentApi(editingItem.id, {
          photo,
          caption: caption.trim() || 'Khoảnh khắc chi tiêu hôm nay ✨',
          amount: parsedAmount,
          category,
        });
        onDone(res);
        Alert.alert('✅ Thành công', 'Đã cập nhật bài đăng!');
      } else {
        const res = await createMomentApi({
          photo,
          caption: caption.trim() || 'Khoảnh khắc chi tiêu hôm nay ✨',
          amount: parsedAmount,
          category,
        });
        onDone(res);
      }
      onClose();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu khoảnh khắc');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={createStyles.overlay}>
        <View style={createStyles.sheet}>
          <View style={createStyles.header}>
            <Text style={createStyles.title}>
              {isEdit ? '✏️ Chỉnh sửa bài đăng' : '📸 Chia sẻ khoảnh khắc'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Preview ảnh */}
            {selectedPhoto ? (
              <View style={{ position: 'relative' }}>
                <Image source={{ uri: normalizeAvatarUrl(selectedPhoto) || selectedPhoto }} style={createStyles.previewImg} />
                {uploadingPhoto && (
                  <View style={createStyles.uploadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={{ color: '#fff', marginTop: 8, fontWeight: '700' }}>Đang tải ảnh lên...</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={[createStyles.previewImg, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="image-outline" size={48} color="#CBD5E1" />
              </View>
            )}

            {/* Nút Upload ảnh thật */}
            <TouchableOpacity style={createStyles.uploadBtn} onPress={handlePickPhoto} disabled={uploadingPhoto}>
              <Ionicons name="cloud-upload-outline" size={18} color="#059669" />
              <Text style={createStyles.uploadBtnText}>
                {uploadingPhoto ? 'Đang tải lên...' : '📷 Tải ảnh từ điện thoại'}
              </Text>
            </TouchableOpacity>

            {/* Chọn nhanh ảnh mẫu */}
            <Text style={createStyles.label}>Hoặc chọn ảnh mẫu:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={createStyles.photosRow}>
                {samplePhotos.map((p, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedPhoto(p)}
                    style={[createStyles.photoThumbBox, selectedPhoto === p && createStyles.photoThumbBoxActive]}
                  >
                    <Image source={{ uri: p }} style={createStyles.photoThumb} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Chọn danh mục */}
            <Text style={createStyles.label}>Danh mục:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[createStyles.catChip, category === cat && createStyles.catChipActive]}
                  >
                    <Text style={[createStyles.catChipText, category === cat && createStyles.catChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Nhập chú thích */}
            <Text style={createStyles.label}>Lời nhắn / Chú thích:</Text>
            <TextInput
              style={createStyles.input}
              placeholder="VD: Cà phê sáng cùng bạn thân ☕..."
              value={caption}
              onChangeText={setCaption}
              placeholderTextColor="#94A3B8"
              multiline
            />

            {/* Nhập số tiền */}
            <Text style={createStyles.label}>Số tiền chi tiêu (VNĐ):</Text>
            <TextInput
              style={createStyles.input}
              placeholder="VD: 45000"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor="#94A3B8"
            />

            {/* Nút Đăng */}
            <TouchableOpacity
              style={[createStyles.submitBtn, (submitting || uploadingPhoto) && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting || uploadingPhoto}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={createStyles.submitBtnText}>
                  {isEdit ? 'Lưu thay đổi ✅' : 'Đăng lên Bảng tin 🚀'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  previewImg: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 12,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  uploadBtnText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 4,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  photoThumbBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  photoThumbBoxActive: {
    borderColor: '#059669',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  catChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  catChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#059669',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  catChipTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#0F172A',
    marginBottom: 4,
  },
  submitBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 28,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

// ─── Invite Modal ─────────────────────────────────────────────────────────────
const InviteModal = ({
  visible,
  onClose,
  userId,
  onSuccess,
  isVi,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: () => void;
  isVi: boolean;
}) => {
  const [friendIdInput, setFriendIdInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!visible) return null;
  const link = `https://monett.app/add-friend?id=${userId}`;

  const handleCopyMyId = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(userId);
      } catch (e) {}
    }
    Alert.alert('✅', isVi ? `Đã sao chép ID của bạn: ${userId}` : `Copied your ID: ${userId}`);
  };

  const handleSendFriendRequest = async () => {
    let cleanId = friendIdInput.trim();
    if (cleanId.startsWith('#')) cleanId = cleanId.slice(1);
    if (!cleanId) {
      Alert.alert(isVi ? 'Thông báo' : 'Notice', isVi ? 'Vui lòng nhập ID bạn bè' : 'Please enter friend ID');
      return;
    }
    if (cleanId === userId) {
      Alert.alert(isVi ? 'Thông báo' : 'Notice', isVi ? 'Bạn không thể kết bạn với chính mình' : 'You cannot add yourself');
      return;
    }
    try {
      setIsSending(true);
      await sendFriendRequestApi(cleanId);
      Alert.alert('✅ ' + (isVi ? 'Thành công' : 'Success'), isVi ? 'Đã gửi lời mời kết bạn!' : 'Friend request sent!');
      setFriendIdInput('');
      if (onSuccess) onSuccess();
    } catch (e: any) {
      Alert.alert('❌ ' + (isVi ? 'Lỗi' : 'Error'), e.message || (isVi ? 'Không thể gửi lời mời' : 'Failed to send request'));
    } finally {
      setIsSending(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${isVi ? 'Kết bạn với mình trên Monett để cùng theo dõi chi tiêu nhé! 🐸' : 'Connect with me on Monett! 🐸'}\n${link}`,
        title: isVi ? 'Mời kết bạn Monett' : 'Invite Monett Friend',
      });
    } catch (e) {}
  };

  return (
    <View style={inviteStyles.overlay}>
      <View style={inviteStyles.sheet}>
        <View style={inviteStyles.handle} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 }}>
          <Text style={inviteStyles.title}>{isVi ? '🤝 Kết bạn Monett' : '🤝 Connect Friends'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* SECTION 1: NHẬP ID BẠN BÈ ĐỂ KẾT BẠN */}
          <View style={inviteStyles.addBox}>
            <Text style={inviteStyles.sectionLabel}>
              {isVi ? 'Thêm bạn mới bằng ID:' : 'Add friend by ID:'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                style={inviteStyles.input}
                placeholder={isVi ? 'Dán hoặc nhập ID bạn bè...' : 'Paste or enter friend ID...'}
                placeholderTextColor="#94A3B8"
                value={friendIdInput}
                onChangeText={setFriendIdInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[inviteStyles.btnSend, isSending && { opacity: 0.6 }]}
                onPress={handleSendFriendRequest}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={inviteStyles.btnSendText}>{isVi ? 'Kết bạn' : 'Add'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* DIVIDER */}
          <View style={inviteStyles.divider}>
            <View style={inviteStyles.dividerLine} />
            <Text style={inviteStyles.dividerText}>{isVi ? 'HOẶC QUÉT MÃ QR' : 'OR SCAN QR CODE'}</Text>
            <View style={inviteStyles.dividerLine} />
          </View>

          {/* SECTION 2: MÃ QR & ID CỦA BẠN */}
          <View style={{ alignItems: 'center', width: '100%' }}>
            <View style={inviteStyles.qrBox}>
              <QRCode value={userId || link} size={150} fgColor="#047857" />
            </View>

            <Text style={inviteStyles.idLabel}>{isVi ? 'ID của bạn:' : 'Your ID:'}</Text>
            <Text style={inviteStyles.idValue} numberOfLines={1}>{userId || 'loading...'}</Text>

            <TouchableOpacity style={inviteStyles.copyBtn} onPress={handleCopyMyId}>
              <Ionicons name="copy-outline" size={16} color="#059669" />
              <Text style={inviteStyles.copyBtnText}>{isVi ? '📋 Sao chép ID của bạn' : '📋 Copy Your ID'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={inviteStyles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color="#fff" />
              <Text style={inviteStyles.shareBtnText}>{isVi ? 'Chia sẻ link mời bạn bè' : 'Share Invite Link'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={inviteStyles.closeBtn} onPress={onClose}>
              <Text style={inviteStyles.closeBtnText}>{isVi ? 'Đóng' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const inviteStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  addBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnSend: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSendText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  qrBox: {
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  idLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  idValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 10,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
  },
  copyBtnText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 13,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 10,
  },
  shareBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  closeBtn: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const FriendsFeedScreen: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [moments, setMoments] = useState<MomentItem[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingMoment, setEditingMoment] = useState<MomentItem | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'friends'>('feed');

  const myId = (user as any)?._id || (user as any)?.id || '';

  // Tải dữ liệu từ Backend API
  const loadData = useCallback(async () => {
    try {
      const [feedData, friendsData, requestsData] = await Promise.all([
        getMomentsFeedApi().catch(() => []),
        getFriendsApi().catch(() => []),
        getFriendRequestsApi().catch(() => []),
      ]);
      setMoments((feedData as any) || []);

      // Normalize friends data - hỗ trợ cả mảng User trực tiếp lẫn Friendship object
      const normalizedFriends = ((friendsData as any) || []).map((f: any) => {
        const friend = (f.requester || f.recipient)
          ? ((f.requester?._id === myId || f.requester?.id === myId) ? f.recipient : f.requester)
          : f;
        return {
          _id: friend?._id || friend?.id,
          fullName: friend?.fullName || (isVi ? 'Bạn bè' : 'Friend'),
          avatarUrl: normalizeAvatarUrl(friend?.avatarUrl),
          streak: friend?.streak || 1,
        };
      }).filter((f: any) => f._id && f._id !== myId);

      setFriends(normalizedFriends);
      setPendingRequests((requestsData as any) || []);
    } catch (err) {
      console.error('Error loading friends/feed data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [myId, isVi]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Đồng ý hoặc từ chối kết bạn
  const handleRespondRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await respondFriendRequestApi(requestId, status);
      Alert.alert('✅', status === 'accepted' ? (isVi ? 'Đã đồng ý kết bạn!' : 'Friend request accepted!') : (isVi ? 'Đã từ chối' : 'Declined'));
      loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || (isVi ? 'Lỗi xử lý yêu cầu' : 'Error handling request'));
    }
  };

  // Xử lý Thả / Đổi / Bỏ Reaction với API
  const handleReact = async (momentId: string, emoji: string) => {
    // 1. Optimistic UI update
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        const wasMyReaction = m.myReaction === emoji;
        const newReactions: Record<string, number> = { ...(m.reactions || {}) };
        if (m.myReaction) newReactions[m.myReaction] = Math.max(0, (newReactions[m.myReaction] ?? 0) - 1);
        if (!wasMyReaction) newReactions[emoji] = (newReactions[emoji] ?? 0) + 1;
        return { ...m, reactions: newReactions, myReaction: wasMyReaction ? null : emoji };
      })
    );

    // 2. Gửi request lên Backend
    try {
      const result: any = await reactMomentApi(momentId, emoji);
      if (result && result.reactions) {
        setMoments((prev) =>
          prev.map((m) =>
            m.id === momentId ? { ...m, reactions: result.reactions, myReaction: result.myReaction } : m
          )
        );
      }
    } catch (e) {
      console.warn('Lỗi khi thả reaction:', e);
    }
  };

  const handleEdit = (item: MomentItem) => {
    setEditingMoment(item);
    setShowCreate(true);
  };

  const handleDelete = async (momentId: string) => {
    try {
      await deleteMomentApi(momentId);
      setMoments((prev) => prev.filter((m) => m.id !== momentId));
      Alert.alert('✅ ' + (isVi ? 'Thành công' : 'Success'), isVi ? 'Đã xóa bài đăng!' : 'Moment deleted!');
    } catch (e: any) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', e.message || (isVi ? 'Không thể xóa bài đăng' : 'Cannot delete moment'));
    }
  };

  const handleFormDone = () => {
    loadData();
    setEditingMoment(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{isVi ? 'Bảng tin Locket 📸' : 'Locket Feed 📸'}</Text>
          <Text style={styles.headerSub}>{isVi ? 'Khoảnh khắc chi tiêu của bạn bè' : 'Friends expense moments'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.createBtn} onPress={() => { setEditingMoment(null); setShowCreate(true); }}>
            <Ionicons name="camera" size={16} color="#fff" />
            <Text style={styles.createBtnText}>{isVi ? 'Chia sẻ' : 'Share'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowInvite(true)}>
            <Ionicons name="person-add-outline" size={16} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feed' && styles.tabActive]}
          onPress={() => setActiveTab('feed')}
        >
          <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>
            📸 {isVi ? 'Bảng tin' : 'Feed'} ({moments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            👥 {isVi ? 'Bạn bè' : 'Friends'} ({friends.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>{isVi ? 'Đang tải khoảnh khắc bạn bè...' : 'Loading friends feed...'}</Text>
        </View>
      ) : activeTab === 'feed' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
        >
          {moments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 52, marginBottom: 16 }}>🐸</Text>
              <Text style={styles.emptyTitle}>{isVi ? 'Chưa có khoảnh khắc nào' : 'No moments yet'}</Text>
              <Text style={styles.emptySub}>
                {isVi
                  ? 'Hãy là người đầu tiên chia sẻ ảnh chi tiêu hoặc mời thêm bạn bè nhé!'
                  : 'Be the first to share your expense moment or invite your friends!'}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => { setEditingMoment(null); setShowCreate(true); }}>
                <Text style={styles.emptyBtnText}>{isVi ? '+ Đăng khoảnh khắc đầu tiên' : '+ Post First Moment'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            moments.map((item) => (
              <MomentCard
                key={item.id}
                item={item}
                currentUserId={myId}
                onReact={handleReact}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
        >
          {/* LỜI MỜI KẾT BẠN ĐANG CHỜ (PENDING REQUESTS) */}
          {pendingRequests.length > 0 && (
            <View style={styles.requestsBox}>
              <Text style={styles.requestsTitle}>
                {isVi ? `📩 Lời mời kết bạn (${pendingRequests.length})` : `📩 Friend Requests (${pendingRequests.length})`}
              </Text>
              {pendingRequests.map((req) => (
                <View key={req._id} style={styles.requestRow}>
                  <Avatar uri={req.requester?.avatarUrl} name={req.requester?.fullName || 'Bạn'} size={44} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.friendName}>{req.requester?.fullName || (isVi ? 'Người dùng' : 'User')}</Text>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>{req.requester?.email || ''}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.btnAccept}
                      onPress={() => handleRespondRequest(req._id, 'accepted')}
                    >
                      <Text style={styles.btnAcceptText}>{isVi ? 'Đồng ý' : 'Accept'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnDecline}
                      onPress={() => handleRespondRequest(req._id, 'rejected')}
                    >
                      <Text style={styles.btnDeclineText}>{isVi ? 'Từ chối' : 'Decline'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {friends.length === 0 && pendingRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 52, marginBottom: 16 }}>👥</Text>
              <Text style={styles.emptyTitle}>{isVi ? 'Chưa có bạn bè nào' : 'No friends yet'}</Text>
              <Text style={styles.emptySub}>
                {isVi
                  ? 'Kết bạn để cùng chia sẻ khoảnh khắc chi tiêu và thi đua chuỗi Streak!'
                  : 'Connect with friends to share expense moments and compete in streaks!'}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowInvite(true)}>
                <Text style={styles.emptyBtnText}>{isVi ? 'Mời bạn bè ngay' : 'Add Friends Now'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            friends.map((friend, i) => (
              <View key={friend._id || i} style={styles.friendRow}>
                <Avatar uri={friend.avatarUrl} name={friend.fullName || 'Bạn bè'} size={48} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.friendName}>{friend.fullName || 'Người dùng'}</Text>
                  <Text style={styles.friendStreak}>🔥 {isVi ? `Chuỗi ${friend.streak || 1} ngày` : `${friend.streak || 1}-day streak`}</Text>
                </View>
                <View style={styles.friendBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                </View>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.addFriendBtn} onPress={() => setShowInvite(true)}>
            <Ionicons name="person-add-outline" size={20} color="#059669" />
            <Text style={styles.addFriendBtnText}>{isVi ? '➕ Thêm / Mời bạn bè' : '➕ Add / Invite Friends'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Modal Mời & Kết bạn */}
      <InviteModal
        visible={showInvite}
        onClose={() => setShowInvite(false)}
        userId={myId}
        onSuccess={loadData}
        isVi={isVi}
      />

      {/* Modal Tạo / Chỉnh Sửa khoảnh khắc */}
      <MomentFormModal
        visible={showCreate}
        onClose={() => { setShowCreate(false); setEditingMoment(null); }}
        onDone={handleFormDone}
        editingItem={editingMoment}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  inviteBtn: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#059669',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  friendStreak: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 2,
  },
  friendBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  addFriendBtnText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 15,
  },
  requestsBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  requestsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 12,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  btnAccept: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  btnAcceptText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  btnDecline: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnDeclineText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
  },
});
