import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Animated,
  Dimensions,
  Share,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-qr-code';
import { playNotificationSound } from '../../utils/soundUtils';
import {
  getMomentsFeedApi,
  reactMomentApi,
  getMomentReactionsApi,
  createMomentApi,
  updateMomentApi,
  deleteMomentApi,
  uploadMomentPhotoApi,
  getFriendsApi,
  sendFriendRequestApi,
  getFriendRequestsApi,
  respondFriendRequestApi,
  normalizeAvatarUrl,
  addMomentCommentApi,
} from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EMOJIS = ['❤️', '🔥', '👏', '😂', '💸'];

export type MomentCommentItem = {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  text: string;
  time: string;
  createdAt?: string;
};

export type MomentItem = {
  id: string;
  user: { name: string; avatar: string | null; id: string };
  photo: string;
  caption: string;
  amount?: number;
  category: string;
  time: string;
  reactions: Record<string, number>;
  myReaction: string | null;
  comments?: MomentCommentItem[];
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
export const MomentCard = ({
  item,
  currentUserId,
  onReact,
  onEdit,
  onDelete,
  onOpenChat,
  onViewReactions,
}: {
  item: MomentItem;
  currentUserId: string;
  onReact: (id: string, emoji: string) => void;
  onEdit: (item: MomentItem) => void;
  onDelete: (id: string) => void;
  onOpenChat: (item: MomentItem) => void;
  onViewReactions?: (id: string) => void;
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
      {/* Header - Không hiển thị giá tiền, chỉ hiển thị thông tin bạn bè */}
      <View style={cardStyles.header}>
        <Avatar uri={item.user?.avatar} name={item.user?.name || 'Bạn'} size={40} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={cardStyles.userName}>{item.user?.name || 'Bạn bè'}</Text>
          <Text style={cardStyles.meta}>{item.category || 'Khoảnh khắc'} · {item.time}</Text>
        </View>
        {/* 3-dot menu for own posts */}
        {isOwner && (
          <TouchableOpacity onPress={() => setShowMenu(true)} style={cardStyles.menuBtn}>
            <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Photo */}
      <TouchableOpacity onPress={toggleEmojis} activeOpacity={0.95}>
        <Image source={{ uri: normalizeAvatarUrl(item.photo) || item.photo }} style={[cardStyles.photo]} resizeMode="cover" />
        {item.caption ? (
          <View style={cardStyles.captionOverlay}>
            <Text style={cardStyles.caption}>{item.caption}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Reaction & Chat Bar */}
      <View style={cardStyles.reactionBar}>
        {/* Summary */}
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          activeOpacity={0.7}
          onPress={() => totalReactions > 0 && onViewReactions && onViewReactions(item.id)}
        >
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
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* React Button */}
          <TouchableOpacity style={[cardStyles.reactBtn, item.myReaction && cardStyles.reactBtnActive]} onPress={toggleEmojis}>
            <Text style={{ fontSize: 16 }}>{item.myReaction || '😊'}</Text>
            <Text style={[cardStyles.reactBtnText, item.myReaction && cardStyles.reactBtnTextActive]}>
              {item.myReaction ? 'Đã thả' : 'Thả cảm xúc'}
            </Text>
          </TouchableOpacity>

          {/* Chat Button */}
          <TouchableOpacity style={cardStyles.chatBtn} onPress={() => onOpenChat(item)} activeOpacity={0.75}>
            <Ionicons name="chatbubble-ellipses" size={16} color="#059669" />
            <Text style={cardStyles.chatBtnText}>
              {item.comments && item.comments.length > 0 ? `Chat (${item.comments.length})` : 'Chat'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Comment Preview */}
      {item.comments && item.comments.length > 0 && (
        <TouchableOpacity
          style={cardStyles.commentsPreviewBox}
          onPress={() => onOpenChat(item)}
          activeOpacity={0.8}
        >
          <View style={cardStyles.recentCommentRow}>
            <Text style={cardStyles.recentCommentUser}>
              {item.comments[item.comments.length - 1].userName}:
            </Text>
            <Text style={cardStyles.recentCommentText} numberOfLines={1}>
              {item.comments[item.comments.length - 1].text}
            </Text>
          </View>
          {item.comments.length > 1 && (
            <Text style={cardStyles.viewAllCommentsText}>
              Xem tất cả {item.comments.length} tin nhắn trò chuyện...
            </Text>
          )}
        </TouchableOpacity>
      )}

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
                setTimeout(() => {
                  if (Platform.OS === 'web') {
                    if (window.confirm('Bạn chắc chắn muốn xóa khoảnh khắc này?')) {
                      onDelete(item.id);
                    }
                  } else {
                    Alert.alert('Xóa bài đăng', 'Bạn chắc chắn muốn xóa khoảnh khắc này?', [
                      { text: 'Hủy', style: 'cancel' },
                      { text: 'Xóa', style: 'destructive', onPress: () => onDelete(item.id) },
                    ]);
                  }
                }, 300);
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
    aspectRatio: 4 / 3,
    backgroundColor: '#000',
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
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  chatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  commentsPreviewBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  recentCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentCommentUser: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  recentCommentText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  viewAllCommentsText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
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

// ─── DANH MỤC KHOẢNH KHẮC VUI VẺ CHO BẠN BÈ ─────────────────────────────────
const CATEGORIES = [
  '☕ Cà phê chill',
  '🍜 Ăn ngon cùng bạn',
  '🏖️ Du lịch & Phượt',
  '🥳 Tụ tập & Tiệc tùng',
  '📸 Check-in sống ảo',
  '🎮 Giải trí & Game',
  '💪 Thể thao & Gym',
  '🐶 Thú cưng đáng yêu',
  '✨ Đời thường vui vẻ',
];

// ─── ĐOẠN VĂN MẪU GỢI Ý ĐĂNG TIN VUI CHO BẠN BÈ ─────────────────────────────
const SAMPLE_CAPTIONS: Record<string, string[]> = {
  '☕ Cà phê chill': [
    'Hẹn hò cà phê chill cuối tuần nè mọi người ơi ☕🌿',
    'Trà sữa full topping nạp năng lượng ngày mới 🧋✨',
    'Góc quán quen, ngắm phố phường thảnh thơi ☕🌤️',
    'Ai làm kèo trà chiều đàm đạo không nào 🍵🍪',
  ],
  '🍜 Ăn ngon cùng bạn': [
    'Lẩu nướng tụ tập cùng bạn bè cuối tuần 🍲🥩',
    'Tự thưởng bữa tối thơm ngon ngập tràn đồ ăn 🍕🤤',
    'Ăn vặt xế chiều cùng hội anh chị em 🥐🧋',
    'Quán ngon mới khám phá, chấm 10/10 nha mọi người 🍜😋',
  ],
  '🏖️ Du lịch & Phượt': [
    'Chuyến đi chữa lành cuối tuần cùng đồng bọn 🏖️🌊',
    'Vi vu khám phá vùng đất mới, cảnh đẹp mê ly 🌄🚗',
    'Check-in view biển ngắm hoàng hôn siêu đỉnh 🌅🌴',
    'Lên đồ đi trốn deadline cùng hội bạn thân ✈️🏕️',
  ],
  '🥳 Tụ tập & Tiệc tùng': [
    'Cuối tuần tụ tập quẩy hết mình cùng hội bạn 🥳🍻',
    'Họp mặt sau bao ngày xa cách, vui nổ trời 🎉🥂',
    'Sinh nhật đáng nhớ bên những người tuyệt vời 🎂🎁',
    'Lên đồ tụ họp xả stress cuối tuần thôi nào 💃🕺',
  ],
  '📸 Check-in sống ảo': [
    'Góc sống ảo mới phát hiện siêu đẹp 📸🌿',
    'Bắt trọn khoảnh khắc hoàng hôn rực rỡ 🌅✨',
    'Một ngày ngập tràn ánh nắng và nụ cười 🌻☀️',
    'Outfit hôm nay của mình thế nào cả nhà ơi 👗🕶️',
  ],
  '🎮 Giải trí & Game': [
    'Cuối tuần xem phim bom tấn rạp cùng bạn thân 🎬🍿',
    'Ai rảnh vào game leo rank cùng anh em nè 🎮👾',
    'Cà phê board game cuối tuần cười thả ga 🎲🧩',
    'Quẩy concert âm nhạc bùng cháy hết mình 🎵🎤',
  ],
  '💪 Thể thao & Gym': [
    'Tập gym nâng cao sức khỏe, giữ dáng đẹp 💪🏋️',
    'Kèo cầu lông mướt mồ hôi cùng hội bạn 🏸⚡',
    'Chạy bộ sáng sớm hít thở không khí trong lành 🏃‍♂️🌳',
    'Bơi lội giải nhiệt ngày hè cực đã 🏊🌊',
  ],
  '🐶 Thú cưng đáng yêu': [
    'Boss nhà tôi hôm nay ngoan đột xuất nè mọi người 🐶❤️',
    'Một chiếc mèo lười phơi nắng sáng sớm 🐱☀️',
    'Dắt boss đi dạo công viên cuối tuần 🐕🦮',
    'Nhìn chiếc mặt đáng yêu này có ai tan chảy không 🐾🥰',
  ],
  '✨ Đời thường vui vẻ': [
    'Hôm nay trời đẹp, tâm trạng vui vẻ lạ thường ✨🌻',
    'Một ngày làm việc hiệu quả và tràn đầy năng lượng 💼🔥',
    'Những khoảnh khắc giản dị mà bình yên vô cùng ☕🏡',
    'Chúc mọi người một ngày thật nhiều niềm vui nhé 🌈😊',
  ],
};

const DEFAULT_SAMPLE_CAPTIONS = [
  'Hẹn hò cà phê chill cuối tuần nè mọi người ơi ☕🌿',
  'Ai làm kèo lẩu nướng tối nay không cả nhà ơi 🍲🥩',
  'Cuối tuần tụ tập quẩy hết mình cùng hội bạn 🥳🎉',
  'Góc sống ảo mới phát hiện siêu đẹp 📸✨',
  'Một ngày thật nhiều niềm vui và năng lượng 🌈🌻',
  'Ai rảnh vào game leo rank cùng anh em nè 🎮👾',
];

// ─── Modal Tạo / Chỉnh Sửa Khoảnh Khắc ──────────────────────────────────────
export const MomentFormModal = ({
  visible,
  onClose,
  onDone,
  editingItem,
  initialAction,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: (updatedOrNew: any) => void;
  editingItem?: MomentItem | null;
  initialAction?: 'photo' | 'tag' | 'text';
}) => {
  const isEdit = !!editingItem;
  const inputRef = useRef<TextInput>(null);
  const [caption, setCaption] = useState(editingItem?.caption || '');
  const [category, setCategory] = useState(editingItem?.category || CATEGORIES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(editingItem?.photo || '');

  // Reset when opening
  useEffect(() => {
    if (visible) {
      setCaption(editingItem?.caption || '');
      setCategory(editingItem?.category || CATEGORIES[0]);
      setSelectedPhoto(editingItem?.photo || samplePhotos[0]);
      
      if (!editingItem) {
        if (initialAction === 'photo') {
          setTimeout(() => {
            handlePickPhoto();
          }, 400);
        } else if (initialAction === 'text') {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 400);
        }
      }
    }
  }, [visible, editingItem, initialAction]);

  // Mẫu ảnh Unsplash đẹp
  const samplePhotos = [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=600&auto=format&fit=crop',
  ];

  // Danh sách đoạn văn mẫu gợi ý theo danh mục đang chọn
  const suggestedCaptions = SAMPLE_CAPTIONS[category] || DEFAULT_SAMPLE_CAPTIONS;

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
      const photo = selectedPhoto || samplePhotos[0];

      if (isEdit && editingItem) {
        const res = await updateMomentApi(editingItem.id, {
          photo,
          caption: caption.trim() || 'Khoảnh khắc vui vẻ hôm nay ✨',
          amount: 0,
          category,
        });
        onDone(res);
        Alert.alert('✅ Thành công', 'Đã cập nhật bài đăng!');
      } else {
        const res = await createMomentApi({
          photo,
          caption: caption.trim() || 'Khoảnh khắc vui vẻ hôm nay ✨',
          amount: 0,
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
              {isEdit ? '✏️ Chỉnh sửa bài đăng' : '📸 Chia sẻ khoảnh khắc vui'}
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

            {/* Chọn chủ đề */}
            <Text style={createStyles.label}>Chủ đề:</Text>
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

            {/* Nhập chú thích / Đoạn văn mẫu */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 6 }}>
              <Text style={createStyles.labelNoMargin}>Lời nhắn / Chú thích:</Text>
              <Text style={createStyles.labelHint}>Chọn mẫu bên dưới hoặc tự ghi ✍️</Text>
            </View>

            {/* Danh sách đoạn văn mẫu chọn nhanh */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
                {suggestedCaptions.map((text, idx) => {
                  const isSelected = caption === text;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setCaption(isSelected ? '' : text)}
                      style={[
                        createStyles.sampleCaptionChip,
                        isSelected && createStyles.sampleCaptionChipActive,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          createStyles.sampleCaptionText,
                          isSelected && createStyles.sampleCaptionTextActive,
                        ]}
                      >
                        {text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TextInput
              ref={inputRef}
              style={createStyles.input}
              placeholder="VD: Cà phê sáng cùng bạn thân ☕... (hoặc tự nhập nội dung)"
              value={caption}
              onChangeText={setCaption}
              placeholderTextColor="#94A3B8"
              multiline
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
  labelNoMargin: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  labelHint: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  sampleCaptionChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  sampleCaptionChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#059669',
  },
  sampleCaptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sampleCaptionTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
});

// ─── Modal Trò chuyện / Chat về Khoảnh khắc ──────────────────────────────────
export const MomentChatModal = ({
  visible,
  onClose,
  moment,
  currentUserId,
  onCommentAdded,
  onRefresh,
}: {
  visible: boolean;
  onClose: () => void;
  moment: MomentItem | null;
  currentUserId: string;
  onCommentAdded: (momentId: string, comment: MomentCommentItem) => void;
  onRefresh?: () => void;
}) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const previousCommentsLength = useRef(0);

  const comments = moment?.comments || [];

  useEffect(() => {
    if (visible && comments.length > previousCommentsLength.current && previousCommentsLength.current > 0) {
      playNotificationSound();
    }
    previousCommentsLength.current = comments.length;
  }, [comments.length, visible]);

  if (!moment) return null;

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      const res: any = await addMomentCommentApi(moment.id, trimmed);
      if (res?.comment) {
        onCommentAdded(moment.id, res.comment);
      }
      setText('');
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={chatStyles.overlay}
      >
        <View style={chatStyles.sheet}>
          {/* Header */}
          <View style={chatStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Avatar uri={moment.user?.avatar} name={moment.user?.name || 'Bạn'} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={chatStyles.headerTitle} numberOfLines={1}>
                  Trò chuyện với {moment.user?.name || 'bạn bè'}
                </Text>
                <Text style={chatStyles.headerSub} numberOfLines={1}>
                  {moment.caption || moment.category || 'Khoảnh khắc vui vẻ 📸'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {onRefresh && (
                <TouchableOpacity onPress={onRefresh} style={chatStyles.closeBtn}>
                  <Ionicons name="reload-outline" size={18} color="#059669" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={chatStyles.closeBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Mini photo preview bar */}
          <View style={chatStyles.postPreviewBar}>
            <Image
              source={{ uri: normalizeAvatarUrl(moment.photo) || moment.photo }}
              style={chatStyles.postThumb}
            />
            <View style={{ flex: 1 }}>
              <Text style={chatStyles.postPreviewCaption} numberOfLines={2}>
                "{moment.caption || 'Khoảnh khắc vui vẻ cùng bạn bè'}"
              </Text>
              <Text style={chatStyles.postPreviewMeta}>
                {moment.category} · {moment.time}
              </Text>
            </View>
          </View>

          {/* Messages list */}
          <ScrollView
            ref={scrollViewRef}
            style={chatStyles.messagesList}
            contentContainerStyle={chatStyles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {comments.length === 0 ? (
              <View style={chatStyles.emptyChat}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>💬</Text>
                <Text style={chatStyles.emptyChatTitle}>Chưa có tin nhắn nào</Text>
                <Text style={chatStyles.emptyChatSub}>Hãy là người đầu tiên nhắn tin chia sẻ cùng bạn bè!</Text>
              </View>
            ) : (
              comments.map((c) => {
                const isMe = c.userId === currentUserId;
                return (
                  <View
                    key={c.id}
                    style={[chatStyles.msgRow, isMe ? chatStyles.msgRowMe : chatStyles.msgRowOther]}
                  >
                    {!isMe && (
                      <Avatar uri={c.userAvatar} name={c.userName} size={28} />
                    )}
                    <View style={[chatStyles.bubble, isMe ? chatStyles.bubbleMe : chatStyles.bubbleOther]}>
                      {!isMe && (
                        <Text style={chatStyles.bubbleSender}>{c.userName}</Text>
                      )}
                      <Text style={[chatStyles.bubbleText, isMe && chatStyles.bubbleTextMe]}>
                        {c.text}
                      </Text>
                      <Text style={[chatStyles.bubbleTime, isMe && chatStyles.bubbleTimeMe]}>
                        {c.createdAt ? (() => {
                          const d = new Date(c.createdAt);
                          const dd = d.getDate().toString().padStart(2, '0');
                          const mm = (d.getMonth() + 1).toString().padStart(2, '0');
                          return `${dd}/${mm} · ${c.time}`;
                        })() : c.time}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Quick reply / Sample Comments */}
          <View style={chatStyles.quickChipsContainer}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4 }}>
              {[
                'Haha 😂', 
                'Tuyệt vời quá! ❤️',
                'Đẹp xuất sắc luôn ✨', 
                'Nhìn ngon quá 🤤', 
                'Đi đâu chơi vui thế? 👀', 
                'Bữa nào làm kèo cà phê nha ☕', 
                'Cho đi ké với nha 🛵',
                'Quá đã 🥳'
              ].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={chatStyles.quickChip}
                  onPress={() => setText((prev) => (prev ? `${prev} ${chip}` : chip))}
                  activeOpacity={0.7}
                >
                  <Text style={chatStyles.quickChipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Chat input footer */}
          <View style={chatStyles.inputBar}>
            <TextInput
              style={chatStyles.chatInput}
              placeholder="Nhắn tin cho bạn bè về khoảnh khắc này..."
              placeholderTextColor="#94A3B8"
              value={text}
              onChangeText={setText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[chatStyles.sendBtn, (!text.trim() || sending) && chatStyles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const chatStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '80%',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  quickChipsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  quickChipsScroll: {
    gap: 6,
    paddingHorizontal: 2,
  },
  quickChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
  },
  closeBtn: {
    padding: 6,
  },
  postPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  postThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  postPreviewCaption: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
  },
  postPreviewMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyChatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  emptyChatSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 6,
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  bubbleSender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 19,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
  },
  bubbleTime: {
    fontSize: 10,
    color: '#94A3B8',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  bubbleTimeMe: {
    color: '#A7F3D0',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
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
        message: `${isVi ? 'Kết bạn với mình trên Monett để cùng chia sẻ khoảnh khắc vui vẻ & trò chuyện nhé! 📸💬' : 'Connect with me on Monett to share fun moments & chat! 📸💬'}\n${link}`,
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
export const FriendsFeedScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const isVi = language === 'vi';
  const styles = getStyles(isDark, colors);

  const [moments, setMoments] = useState<MomentItem[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingMoment, setEditingMoment] = useState<MomentItem | null>(null);
  const [chatMoment, setChatMoment] = useState<MomentItem | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'friends'>('feed');

  // Reaction Details State
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [reactedUsers, setReactedUsers] = useState<any[]>([]);
  const [isLoadingReactions, setIsLoadingReactions] = useState(false);

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

  // Cập nhật bình luận / chat trong bảng tin
  const handleCommentAdded = (momentId: string, newComment: MomentCommentItem) => {
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        const currentComments = m.comments || [];
        return { ...m, comments: [...currentComments, newComment] };
      })
    );
    setChatMoment((prev) => {
      if (!prev || prev.id !== momentId) return prev;
      const currentComments = prev.comments || [];
      return { ...prev, comments: [...currentComments, newComment] };
    });
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

  // Xem danh sách người thả cảm xúc
  const handleViewReactions = async (momentId: string) => {
    setShowReactionsModal(true);
    setIsLoadingReactions(true);
    setReactedUsers([]);
    try {
      const res = await getMomentReactionsApi(momentId);
      const data = (res as any)?.data || res;
      setReactedUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Lỗi tải danh sách reaction:', e);
    } finally {
      setIsLoadingReactions(false);
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>{isVi ? 'Bảng tin Monett' : 'Monett Feed'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.createBtn, { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 }]} onPress={() => { setEditingMoment(null); setShowCreate(true); }}>
            <Ionicons name="camera" size={16} color="#fff" />
            <Text style={styles.createBtnText}>{isVi ? 'Đăng tin' : 'Post'}</Text>
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
              <View style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: '#ECFDF5',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#A7F3D0',
                marginBottom: 16,
                shadowColor: '#047857',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}>
                <Ionicons name="images-outline" size={34} color="#059669" />
              </View>
              <Text style={styles.emptyTitle}>{isVi ? 'Chưa có khoảnh khắc nào' : 'No moments yet'}</Text>
              <Text style={styles.emptySub}>
                {isVi
                  ? 'Hãy là người đầu tiên đăng tin vui để cùng bạn bè trò chuyện nhé!'
                  : 'Be the first to share a fun moment and chat with your friends!'}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => { setEditingMoment(null); setShowCreate(true); }}>
                <Text style={styles.emptyBtnText}>{isVi ? '+ Đăng tin vui đầu tiên' : '+ Post First Moment'}</Text>
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
                onOpenChat={(item) => setChatMoment(item)}
                onViewReactions={handleViewReactions}
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
                  ? 'Kết bạn để cùng chia sẻ khoảnh khắc vui vẻ và trò chuyện mỗi ngày!'
                  : 'Connect with friends to share fun moments and chat everyday!'}
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

          <TouchableOpacity style={styles.addFriendBtn} onPress={() => setShowInvite(true)} activeOpacity={0.85}>
            <View style={styles.addFriendIconWrap}>
              <Ionicons name="person-add" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.addFriendBtnText}>{isVi ? 'Thêm / Mời bạn bè' : 'Add / Invite Friends'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Modal Danh sách thả cảm xúc */}
      <Modal visible={showReactionsModal} transparent animationType="slide" onRequestClose={() => setShowReactionsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.reactionsModalContent}>
            <View style={styles.reactionsModalHeader}>
              <Text style={styles.reactionsModalTitle}>{isVi ? 'Người đã bày tỏ cảm xúc' : 'Reactions'}</Text>
              <TouchableOpacity onPress={() => setShowReactionsModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {isLoadingReactions ? (
                <Text style={{ textAlign: 'center', marginVertical: 20, color: '#94A3B8' }}>{isVi ? 'Đang tải...' : 'Loading...'}</Text>
              ) : reactedUsers.length === 0 ? (
                <Text style={{ textAlign: 'center', marginVertical: 20, color: '#94A3B8' }}>{isVi ? 'Chưa có ai bày tỏ cảm xúc' : 'No reactions yet'}</Text>
              ) : (
                reactedUsers.map((u, i) => (
                  <View key={i} style={styles.reactionUserRow}>
                    <Avatar uri={u.avatarUrl} name={u.fullName} size={40} />
                    <Text style={styles.reactionUserName} numberOfLines={1}>{u.fullName}</Text>
                    <View style={styles.reactionUserEmoji}>
                      <Text style={{ fontSize: 16 }}>{u.emoji}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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

      {/* Modal Trò chuyện / Chat về Khoảnh khắc */}
      <MomentChatModal
        visible={!!chatMoment}
        onClose={() => setChatMoment(null)}
        moment={chatMoment}
        currentUserId={myId}
        onCommentAdded={handleCommentAdded}
        onRefresh={async () => {
          await loadData();
          if (chatMoment) {
            const feedData: any = await getMomentsFeedApi().catch(() => []);
            const updated = (feedData || []).find((m: any) => m.id === chatMoment.id);
            if (updated) setChatMoment(updated);
          }
        }}
      />
    </SafeAreaView>
  );
};

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionsModalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '60%',
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  reactionsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#334155' : '#F1F5F9',
    paddingBottom: 12,
  },
  reactionsModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  reactionUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#334155' : '#F8FAFC',
  },
  reactionUserName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  reactionUserEmoji: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: colors.header,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textMuted,
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
    backgroundColor: isDark ? '#064E3B' : '#F0FDF4',
    borderWidth: 1.5,
    borderColor: isDark ? '#065F46' : '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.header,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    color: colors.textMuted,
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
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textMuted,
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
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
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
    backgroundColor: isDark ? '#064E3B' : '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 32,
    alignSelf: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addFriendIconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFriendBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  requestsBox: {
    backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#BFDBFE',
  },
  requestsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: isDark ? '#93C5FD' : '#1E40AF',
    marginBottom: 12,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#DBEAFE',
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
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#CBD5E1',
  },
  btnDeclineText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },
});
