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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import * as ImagePicker from 'expo-image-picker';
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
  getMomentCommentsApi,
  sendMessageApi,
} from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';

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
  useEffect(() => {
    setErr(false);
  }, [uri]);

  const initial = (name || '?').charAt(0).toUpperCase();
  const colors = ['#059669', '#8B5CF6', '#F59E0B', '#EF4444', '#0EA5E9', '#EC4899', '#6366F1'];
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
// ─── Locket-style Moment Card ────────────────────────────────────────────────
const LOCKET_EMOJIS = ['❤️', '🔥', '😂', '😍', '✨'];

export const MomentCard = ({
  item,
  currentUserId,
  onReact,
  onEdit,
  onDelete,
  onOpenChat,
  onViewReactions,
  onCommentAdded,
}: {
  item: MomentItem;
  currentUserId: string;
  onReact: (id: string, emoji: string) => void;
  onEdit: (item: MomentItem) => void;
  onDelete: (id: string) => void;
  onOpenChat: (item: MomentItem) => void;
  onViewReactions?: (id: string) => void;
  onCommentAdded?: (momentId: string, comment: MomentCommentItem) => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    setImgErr(false);
  }, [item.photo]);
  const isOwner = item.user?.id === currentUserId;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToastMessage(null));
  };

  const handleSendInlineReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed || isSendingReply) return;

    try {
      setIsSendingReply(true);
      // 1. Thêm bình luận vào khoảnh khắc
      const res: any = await addMomentCommentApi(item.id, trimmed);
      if (res?.comment && onCommentAdded) {
        onCommentAdded(item.id, res.comment);
      }

      // 2. Gửi thẳng vào tin nhắn riêng cho bạn bè (đúng chuẩn Locket!)
      if (item.user?.id && item.user.id !== currentUserId) {
        const msgPrefix = item.caption ? `📸 [${item.caption}]: ` : '📸 [Khoảnh khắc]: ';
        await sendMessageApi(item.user.id, `${msgPrefix}${trimmed}`, item.photo).catch((err) => {
          console.warn('Lỗi gửi tin nhắn trực tiếp:', err);
        });
      }

      setReplyText('');
      showToast(`Đã gửi qua tin nhắn cho ${item.user?.name || 'bạn'}! 💬`);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể gửi phản hồi');
    } finally {
      setIsSendingReply(false);
    }
  };

  const totalReactions = Object.values(item.reactions || {}).reduce((a, b) => a + b, 0);

  return (
    <View style={cardStyles.locketCard}>
      {/* 1. Header Row (Outside of photo): Avatar, Friend Name, Category, Time, Menu */}
      <View style={cardStyles.headerRow}>
        <Avatar uri={item.user?.avatar} name={item.user?.name || 'Bạn'} size={38} />
        <View style={cardStyles.authorInfo}>
          <Text style={cardStyles.authorName} numberOfLines={1}>
            {item.user?.name || 'Bạn bè'}
          </Text>
          <Text style={cardStyles.metaText}>
            {item.category ? `${item.category} · ` : ''}{item.time || 'Vừa xong'}
          </Text>
        </View>

        {/* 3-dot Menu for Owner */}
        {isOwner && (
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={cardStyles.menuBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Caption Text (Outside & above photo - clean, clear typography, not overlaying photo!) */}
      {item.caption ? (
        <View style={cardStyles.captionBox}>
          <Text style={cardStyles.captionText}>{item.caption}</Text>
        </View>
      ) : null}

      {/* 3. Photo Container: Clean, unobstructed */}
      <View style={cardStyles.locketPhotoContainer}>
        <Image
          source={{
            uri: imgErr
              ? 'https://res.cloudinary.com/dcrypf8zn/image/upload/v1793213012/monett_moments/wfjlbipnumdvxngc1map.jpg'
              : (normalizeAvatarUrl(item.photo) || item.photo),
          }}
          onError={() => setImgErr(true)}
          style={cardStyles.locketPhoto}
          resizeMode="cover"
        />

        {/* Floating Toast Notification when replied */}
        {toastMessage && (
          <Animated.View
            style={[
              cardStyles.locketToast,
              {
                opacity: toastAnim,
                transform: [
                  {
                    translateY: toastAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [15, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="chatbubble-ellipses" size={15} color="#10B981" />
            <Text style={cardStyles.locketToastText}>{toastMessage}</Text>
          </Animated.View>
        )}
      </View>

      {/* 2. Reaction Bar: Quick Emojis like Locket (❤️ 🔥 😂 😍 ✨) */}
      <View style={cardStyles.locketReactionSection}>
        <View style={cardStyles.locketEmojisRow}>
          {LOCKET_EMOJIS.map((emoji) => {
            const isSelected = item.myReaction === emoji;
            return (
              <TouchableOpacity
                key={emoji}
                style={[cardStyles.locketEmojiBtn, isSelected && cardStyles.locketEmojiBtnActive]}
                onPress={() => onReact(item.id, emoji)}
                activeOpacity={0.65}
              >
                <Text style={cardStyles.locketEmojiChar}>{emoji}</Text>
                {isSelected && <View style={cardStyles.locketActiveDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reactions Summary Badges */}
        {totalReactions > 0 && (
          <TouchableOpacity
            style={cardStyles.locketSummaryRow}
            activeOpacity={0.7}
            onPress={() => onViewReactions && onViewReactions(item.id)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {Object.entries(item.reactions || {})
                .filter(([, count]) => count > 0)
                .map(([emoji, count]) => (
                  <View key={emoji} style={cardStyles.locketBadge}>
                    <Text style={{ fontSize: 13 }}>{emoji}</Text>
                    <Text style={cardStyles.locketBadgeCount}>{count}</Text>
                  </View>
                ))}
            </View>
            <Text style={cardStyles.locketViewReactionsText}>Xem người thả ›</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Inline Message Input: Type and send as direct message! */}
      <View style={cardStyles.locketReplyBar}>
        <TextInput
          style={cardStyles.locketReplyInput}
          placeholder={`Nhắn tin cho ${item.user?.name || 'bạn bè'}...`}
          placeholderTextColor="#94A3B8"
          value={replyText}
          onChangeText={setReplyText}
          onSubmitEditing={handleSendInlineReply}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[cardStyles.locketSendBtn, (!replyText.trim() || isSendingReply) && cardStyles.locketSendBtnDisabled]}
          onPress={handleSendInlineReply}
          disabled={!replyText.trim() || isSendingReply}
          activeOpacity={0.8}
        >
          {isSendingReply ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* 4. Previous comments preview / Open chat modal button */}
      {item.comments && item.comments.length > 0 && (
        <TouchableOpacity
          style={cardStyles.locketCommentPreview}
          onPress={() => onOpenChat(item)}
          activeOpacity={0.8}
        >
          <View style={cardStyles.locketCommentRow}>
            <Ionicons name="chatbubble-outline" size={13} color="#059669" />
            <Text style={cardStyles.locketCommentUser}>
              {item.comments[item.comments.length - 1].userName}:
            </Text>
            <Text style={cardStyles.locketCommentText} numberOfLines={1}>
              {item.comments[item.comments.length - 1].text}
            </Text>
          </View>
          <Text style={cardStyles.locketViewThreadText}>
            Xem cuộc trò chuyện ({item.comments.length}) ›
          </Text>
        </TouchableOpacity>
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
  locketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  captionBox: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  captionText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
  },
  locketPhotoContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locketPhoto: {
    width: '100%',
    height: '100%',
  },
  locketToast: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    zIndex: 5,
  },
  locketToastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  locketReactionSection: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  locketEmojisRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
  },
  locketEmojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  locketEmojiBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    transform: [{ scale: 1.08 }],
  },
  locketEmojiChar: {
    fontSize: 22,
  },
  locketActiveDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#059669',
  },
  locketSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 2,
  },
  locketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  locketBadgeCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  locketViewReactionsText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  locketReplyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: 4,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  locketReplyInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 6,
  },
  locketSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locketSendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  locketCommentPreview: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  locketCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locketCommentUser: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  locketCommentText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  locketViewThreadText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'right',
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
    'Hướng tới du lịch biển xanh, khám phá vẻ đẹp biển đảo quê hương 🌊🏝️',
    'Check-in Vịnh Vĩnh Hy - Ninh Thuận non nước hữu tình 🚤🪸⛰️',
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
  initialCategory,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: (updatedOrNew: any) => void;
  editingItem?: MomentItem | null;
  initialAction?: 'photo' | 'tag' | 'text';
  initialCategory?: string;
}) => {
  const isEdit = !!editingItem;
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const inputRef = useRef<TextInput>(null);
  const [caption, setCaption] = useState(editingItem?.caption || '');
  const [category, setCategory] = useState(editingItem?.category || initialCategory || CATEGORIES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(editingItem?.photo || '');

  // Mẫu ảnh gợi ý chất lượng cao theo các chủ đề phổ biến (100% link Unsplash ổn định)
  const samplePhotos = [
    { label: 'Cà phê chill', uri: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80', cat: '☕ Cà phê chill' },
    { label: 'Ăn uống ngon', uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80', cat: '🍜 Ăn ngon cùng bạn' },
    { label: 'Du lịch biển', uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80', cat: '🏖️ Du lịch & Phượt' },
    { label: 'Trà sữa chill', uri: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80', cat: '🥳 Tụ tập & Tiệc tùng' },
    { label: 'Check-in phố', uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80', cat: '📸 Check-in sống ảo' },
    { label: 'Mua sắm', uri: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=80', cat: '✨ Đời thường vui vẻ' },
    { label: 'Góc làm việc', uri: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&auto=format&fit=crop&q=80', cat: '✨ Đời thường vui vẻ' },
    { label: 'Tập gym', uri: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80', cat: '💪 Thể thao & Gym' },
    { label: 'Mèo cưng', uri: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&auto=format&fit=crop&q=80', cat: '🐶 Thú cưng đáng yêu' },
  ];

  // Reset when opening
  useEffect(() => {
    if (visible) {
      setCaption(editingItem?.caption || '');
      const currentCat = editingItem?.category || initialCategory || CATEGORIES[0];
      setCategory(currentCat);

      const matchedSample = samplePhotos.find(p => p.cat === currentCat);
      setSelectedPhoto(editingItem?.photo || (matchedSample ? matchedSample.uri : samplePhotos[0].uri));
      
      if (!editingItem && initialAction === 'photo') {
        setTimeout(() => {
          handlePickPhoto();
        }, 300);
      }
    }
  }, [visible, editingItem, initialAction, initialCategory]);

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
      const photo = selectedPhoto || samplePhotos[0].uri;

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
        addNotification({
          type: 'moment',
          title: 'Đã đăng thành công khoảnh khắc chi tiêu! 📸',
          message: `Khoảnh khắc "${caption.trim() || 'Khoảnh khắc hôm nay'}" đã được đăng tải thành công lên bảng tin bạn bè.`,
          iconBg: '#ECFDF5',
          iconColor: '#059669',
          metadata: { targetTab: 'feed' },
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
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={createStyles.overlay}>
        {/* Backdrop Tap to close */}
        <TouchableOpacity style={createStyles.backdropTap} activeOpacity={1} onPress={onClose} />

        <View style={[createStyles.sheet, isWide && createStyles.sheetWide]}>
          {/* Header Modal Sang Trọng */}
          <View style={createStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={createStyles.headerIconBadge}>
                <Ionicons name="sparkles" size={20} color="#059669" />
              </View>
              <View>
                <Text style={createStyles.title}>
                  {isEdit ? 'Chỉnh sửa khoảnh khắc' : 'Chia sẻ khoảnh khắc với bạn bè'}
                </Text>
                <View style={createStyles.authorRow}>
                  <Text style={createStyles.authorName}>
                    {(user as any)?.fullName || 'Ánh Mai'}
                  </Text>
                  <View style={createStyles.privacyPill}>
                    <Ionicons name="people" size={12} color="#047857" style={{ marginRight: 3 }} />
                    <Text style={createStyles.privacyPillText}>Bạn bè Monett</Text>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={createStyles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {isWide ? (
            /* ================= GIAO DIỆN MỞ RỘNG NGANG (2 CỘT HIỆN ĐẠI CHO DESKTOP) ================= */
            <View style={createStyles.wideLayout}>
              {/* CỘT TRÁI: HÌNH ẢNH TO RÕ & KHO ẢNH MẪU */}
              <View style={createStyles.wideLeftCol}>
                <View style={createStyles.previewContainer}>
                  {selectedPhoto ? (
                    <View style={[createStyles.previewBox, createStyles.previewBoxWide]}>
                      <Image source={{ uri: normalizeAvatarUrl(selectedPhoto) || selectedPhoto }} style={[createStyles.previewImg, createStyles.previewImgWide]} />
                      
                      {/* Floating category badge ở góc trên bên trái */}
                      <View style={createStyles.floatingCategoryBadge}>
                        <Text style={createStyles.floatingCategoryBadgeText}>{category}</Text>
                      </View>

                      {/* Floating Nút đổi ảnh / tải ảnh ở góc trên bên phải */}
                      <TouchableOpacity
                        style={createStyles.floatingChangeBtn}
                        onPress={handlePickPhoto}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="cloud-upload" size={14} color="#059669" style={{ marginRight: 5 }} />
                        <Text style={createStyles.floatingChangeBtnText}>
                          {uploadingPhoto ? 'Đang tải...' : 'Tải ảnh từ máy'}
                        </Text>
                      </TouchableOpacity>

                      {uploadingPhoto && (
                        <View style={createStyles.uploadingOverlay}>
                          <ActivityIndicator size="large" color="#fff" />
                          <Text style={{ color: '#fff', marginTop: 8, fontWeight: '700' }}>Đang tải ảnh lên...</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[createStyles.previewImg, createStyles.previewImgWide, createStyles.emptyPreviewBox]}
                      onPress={handlePickPhoto}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="image-outline" size={48} color="#94A3B8" />
                      <Text style={{ color: '#64748B', fontWeight: '700', marginTop: 10, fontSize: 14 }}>Chạm để chọn ảnh khoảnh khắc</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Kho ảnh mẫu */}
                <View style={{ marginTop: 6, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="images" size={15} color="#059669" />
                    <Text style={[createStyles.sectionLabel, { marginBottom: 0 }]}>Kho ảnh mẫu ({samplePhotos.length})</Text>
                  </View>
                  <Text style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: '500' }}>Bấm để chọn nhanh</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={{ alignItems: 'flex-start', paddingVertical: 2, paddingHorizontal: 2 }}
                >
                  <View style={createStyles.photosRow}>
                    {samplePhotos.map((item, idx) => {
                      const isSelected = selectedPhoto === item.uri;
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            setSelectedPhoto(item.uri);
                            if (!editingItem) setCategory(item.cat);
                          }}
                          style={[createStyles.photoThumbCard, isSelected && createStyles.photoThumbCardActive]}
                          activeOpacity={0.75}
                        >
                          <Image source={{ uri: item.uri }} style={createStyles.photoThumbImg} />
                          <View style={[createStyles.photoThumbLabelWrap, isSelected && createStyles.photoThumbLabelWrapActive]}>
                            <Text style={[createStyles.photoThumbLabel, isSelected && createStyles.photoThumbLabelActive]} numberOfLines={1}>
                              {item.label}
                            </Text>
                          </View>
                          {isSelected && (
                            <View style={createStyles.photoThumbCheckCircle}>
                              <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* CỘT PHẢI: LỜI NHẮN, GỢI Ý CAPTION, CHỦ ĐỀ & FOOTER NÚT BẤM */}
              <View style={createStyles.wideRightCol}>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* Ô nhập lời nhắn / caption */}
                  <View style={{ marginBottom: 6 }}>
                    <Text style={createStyles.sectionLabel}>Nội dung khoảnh khắc</Text>
                  </View>
                  <View style={createStyles.inputSection}>
                    <TextInput
                      ref={inputRef}
                      style={[createStyles.input, { minHeight: 88 }]}
                      placeholder={`${(user as any)?.fullName || 'Ánh Mai'} ơi, bạn có khoảnh khắc gì thú vị muốn chia sẻ hôm nay? ✨`}
                      value={caption}
                      onChangeText={setCaption}
                      placeholderTextColor="#94A3B8"
                      multiline
                    />
                  </View>

                  {/* Gợi ý caption */}
                  <View style={{ marginBottom: 6, marginTop: 4 }}>
                    <Text style={createStyles.sectionLabel}>Gợi ý caption theo chủ đề</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
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

                  {/* Chọn chủ đề */}
                  <View style={{ marginTop: 2, marginBottom: 6 }}>
                    <Text style={createStyles.sectionLabel}>Chọn chủ đề bài viết</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
                    {CATEGORIES.map((cat) => {
                      const isActive = category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setCategory(cat)}
                          style={[createStyles.catChip, isActive && createStyles.catChipActive]}
                          activeOpacity={0.7}
                        >
                          <Text style={[createStyles.catChipText, isActive && createStyles.catChipTextActive]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Footer Buttons ở đáy Cột Phải */}
                <View style={createStyles.footerActionRow}>
                  <TouchableOpacity
                    style={createStyles.cancelActionBtn}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={createStyles.cancelActionText}>Hủy bỏ</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[createStyles.submitBtn, (submitting || uploadingPhoto) && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={submitting || uploadingPhoto}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name={isEdit ? "checkmark-circle" : "paper-plane"} size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={createStyles.submitBtnText}>
                          {isEdit ? 'Lưu thay đổi' : 'Đăng lên Bảng tin'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            /* ================= GIAO DIỆN MOBILE / MÀN HÌNH NHỎ (CUỘN DỌC) ================= */
            <>
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {/* 1. Ô nhập lời nhắn / chú thích ngay trên đầu */}
                <View style={createStyles.inputSection}>
                  <TextInput
                    ref={inputRef}
                    style={createStyles.input}
                    placeholder={`${(user as any)?.fullName || 'Ánh Mai'} ơi, bạn có khoảnh khắc gì thú vị muốn chia sẻ hôm nay? ✨`}
                    value={caption}
                    onChangeText={setCaption}
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={2}
                  />
                </View>

                {/* Gợi ý caption */}
                <View style={{ marginBottom: 6, marginTop: 4 }}>
                  <Text style={createStyles.sectionLabel}>Gợi ý caption</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
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

                {/* 2. Preview ảnh 16:9 sắc nét, gọn gàng */}
                <View style={createStyles.previewContainer}>
                  {selectedPhoto ? (
                    <View style={createStyles.previewBox}>
                      <Image source={{ uri: normalizeAvatarUrl(selectedPhoto) || selectedPhoto }} style={createStyles.previewImg} />
                      
                      {/* Floating category badge ở góc trên bên trái */}
                      <View style={createStyles.floatingCategoryBadge}>
                        <Text style={createStyles.floatingCategoryBadgeText}>{category}</Text>
                      </View>

                      {/* Floating Nút đổi ảnh / tải ảnh ở góc trên bên phải */}
                      <TouchableOpacity
                        style={createStyles.floatingChangeBtn}
                        onPress={handlePickPhoto}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="cloud-upload" size={14} color="#059669" style={{ marginRight: 5 }} />
                        <Text style={createStyles.floatingChangeBtnText}>
                          {uploadingPhoto ? 'Đang tải...' : 'Tải ảnh từ máy'}
                        </Text>
                      </TouchableOpacity>

                      {uploadingPhoto && (
                        <View style={createStyles.uploadingOverlay}>
                          <ActivityIndicator size="large" color="#fff" />
                          <Text style={{ color: '#fff', marginTop: 8, fontWeight: '700' }}>Đang tải ảnh lên...</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[createStyles.previewImg, createStyles.emptyPreviewBox]}
                      onPress={handlePickPhoto}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="image-outline" size={42} color="#94A3B8" />
                      <Text style={{ color: '#64748B', fontWeight: '700', marginTop: 8 }}>Chạm để chọn ảnh khoảnh khắc</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Thư viện ảnh mẫu */}
                <View style={{ marginTop: 4, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="images" size={15} color="#059669" />
                    <Text style={[createStyles.sectionLabel, { marginBottom: 0 }]}>Kho ảnh mẫu ({samplePhotos.length})</Text>
                  </View>
                  <Text style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: '500' }}>Bấm để chọn nhanh</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 14, flexGrow: 0 }}
                  contentContainerStyle={{ alignItems: 'flex-start', paddingVertical: 2, paddingHorizontal: 2 }}
                >
                  <View style={createStyles.photosRow}>
                    {samplePhotos.map((item, idx) => {
                      const isSelected = selectedPhoto === item.uri;
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            setSelectedPhoto(item.uri);
                            if (!editingItem) setCategory(item.cat);
                          }}
                          style={[createStyles.photoThumbCard, isSelected && createStyles.photoThumbCardActive]}
                          activeOpacity={0.75}
                        >
                          <Image source={{ uri: item.uri }} style={createStyles.photoThumbImg} />
                          <View style={[createStyles.photoThumbLabelWrap, isSelected && createStyles.photoThumbLabelWrapActive]}>
                            <Text style={[createStyles.photoThumbLabel, isSelected && createStyles.photoThumbLabelActive]}>
                              {item.label}
                            </Text>
                          </View>
                          {isSelected && (
                            <View style={createStyles.photoThumbCheckCircle}>
                              <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Chọn chủ đề */}
                <View style={{ marginTop: 2, marginBottom: 6 }}>
                  <Text style={createStyles.sectionLabel}>Chủ đề</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
                    {CATEGORIES.map((cat) => {
                      const isActive = category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setCategory(cat)}
                          style={[createStyles.catChip, isActive && createStyles.catChipActive]}
                          activeOpacity={0.7}
                        >
                          <Text style={[createStyles.catChipText, isActive && createStyles.catChipTextActive]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </ScrollView>

              {/* Footer PINNED Cố Định ở Đáy Modal */}
              <View style={createStyles.footerActionRow}>
                <TouchableOpacity
                  style={createStyles.cancelActionBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={createStyles.cancelActionText}>Hủy bỏ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[createStyles.submitBtn, (submitting || uploadingPhoto) && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={submitting || uploadingPhoto}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name={isEdit ? "checkmark-circle" : "paper-plane"} size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={createStyles.submitBtnText}>
                        {isEdit ? 'Lưu thay đổi' : 'Đăng lên Bảng tin'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(8px)',
    } : {}),
  },
  backdropTap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 16,
    overflow: 'hidden',
  },
  sheetWide: {
    maxWidth: 960,
    width: '92%',
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 22,
    maxHeight: '90%',
  },
  wideLayout: {
    flexDirection: 'row',
    gap: 26,
    flex: 1,
    minHeight: 450,
  },
  wideLeftCol: {
    flex: 1.15,
    justifyContent: 'flex-start',
  },
  wideRightCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  previewBoxWide: {
    height: 310,
  },
  previewImgWide: {
    height: 310,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  authorName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  privacyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    marginBottom: 12,
  },
  previewBox: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  previewImg: {
    width: '100%',
    height: 200,
    borderRadius: 18,
    resizeMode: 'cover',
    backgroundColor: '#0F172A',
  },
  emptyPreviewBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCategoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(6px)' } : {}),
  },
  floatingCategoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  floatingChangeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingChangeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  uploadCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  uploadCardSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  uploadCardPill: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  uploadCardPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  sectionHint: {
    display: 'none',
  },
  photosRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  photoThumbCard: {
    width: 90,
    height: 94,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.18s ease' } : {}),
  },
  photoThumbCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
    ...(Platform.OS === 'web' ? { transform: 'translateY(-2px)' } : {}),
  },
  photoThumbImg: {
    width: '100%',
    height: 64,
    resizeMode: 'cover',
  },
  photoThumbLabelWrap: {
    width: '100%',
    height: 26,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  photoThumbLabelWrapActive: {
    backgroundColor: '#ECFDF5',
  },
  photoThumbLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  photoThumbLabelActive: {
    color: '#047857',
    fontWeight: '800',
  },
  photoThumbCheckCircle: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  catChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  catChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  catChipTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  sampleCaptionChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  sampleCaptionChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  sampleCaptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sampleCaptionTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  inputSection: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    color: '#0F172A',
    marginBottom: 6,
    minHeight: 74,
    textAlignVertical: 'top',
  },
  footerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelActionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  submitBtn: {
    flex: 2,
    height: 46,
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 640;
  const [isMinimized, setIsMinimized] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { socket } = useSocket();

  // Quản lý danh sách bình luận động realtime
  const [commentsList, setCommentsList] = useState<MomentCommentItem[]>(() => moment?.comments || []);

  useEffect(() => {
    if (moment?.comments) {
      setCommentsList(moment.comments);
    }
  }, [moment?.id, moment?.comments]);

  // 1. Tự động đồng bộ tin nhắn/bình luận mới nhất từ Backend mỗi 3 giây khi modal đang mở
  useEffect(() => {
    if (!visible || !moment?.id) return;

    let isMounted = true;
    const fetchLatestComments = async () => {
      try {
        const res: any = await getMomentCommentsApi(moment.id);
        const data = res?.comments || res;
        if (isMounted && Array.isArray(data)) {
          setCommentsList((prev) => {
            if (data.length !== prev.length || (data.length > 0 && data[data.length - 1]?.id !== prev[prev.length - 1]?.id)) {
              return data;
            }
            return prev;
          });
        }
      } catch (_) {}
    };

    fetchLatestComments();
    const timer = setInterval(fetchLatestComments, 3000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [visible, moment?.id]);

  // 2. Lắng nghe sự kiện socket realtime từ đối phương gửi tới
  useEffect(() => {
    if (!socket || !visible || !moment?.id) return;

    const handleSocketComment = (data: { momentId: string; comment: MomentCommentItem }) => {
      if (data?.momentId === moment.id && data?.comment) {
        setCommentsList((prev) => {
          if (prev.some((c) => c.id === data.comment.id)) return prev;
          return [...prev, data.comment];
        });
        onCommentAdded(moment.id, data.comment);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    socket.on('moment_comment', handleSocketComment);
    return () => {
      socket.off('moment_comment', handleSocketComment);
    };
  }, [socket, visible, moment?.id, onCommentAdded]);

  if (!visible || !moment) return null;

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      const res: any = await addMomentCommentApi(moment.id, trimmed);
      const newComment: MomentCommentItem = res?.comment || {
        id: 'c_' + Date.now(),
        userId: currentUserId,
        userName: 'Bạn',
        text: trimmed,
        createdAt: new Date().toISOString(),
        time: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
      };

      setCommentsList((prev) => {
        if (prev.some((c) => c.id === newComment.id)) return prev;
        return [...prev, newComment];
      });
      onCommentAdded(moment.id, newComment);

      // Gửi thẳng vào tin nhắn riêng cho bạn bè (như Locket!)
      if (moment.user?.id && moment.user.id !== currentUserId) {
        const msgPrefix = moment.caption ? `📸 [${moment.caption}]: ` : '📸 [Khoảnh khắc]: ';
        await sendMessageApi(moment.user.id, `${msgPrefix}${trimmed}`, moment.photo).catch((err) => {
          console.warn('Lỗi gửi tin nhắn trực tiếp từ chat modal:', err);
        });
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

  const chatContent = (
    <View
      style={[
        chatStyles.messengerBox,
        isDesktop ? chatStyles.desktopDockBox : chatStyles.sheet,
        isMinimized && chatStyles.desktopDockMinimized,
      ]}
    >
      {/* Header chuẩn Messenger góc dưới bên phải */}
      <TouchableOpacity
        style={chatStyles.dockHeader}
        activeOpacity={0.9}
        onPress={() => isMinimized && setIsMinimized(false)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Avatar uri={moment.user?.avatar} name={moment.user?.name || 'Bạn'} size={32} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
              {moment.user?.name || 'Bạn bè'}
            </Text>
            <Text style={{ fontSize: 10.5, color: '#059669', fontWeight: '600' }} numberOfLines={1}>
              📸 {moment.caption || moment.category || 'Khoảnh khắc'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {isDesktop && (
            <TouchableOpacity onPress={() => setIsMinimized(!isMinimized)} style={chatStyles.dockActionBtn}>
              <Ionicons name={isMinimized ? "chevron-up" : "remove"} size={16} color="#64748B" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={chatStyles.dockActionBtn}>
            <Ionicons name="close" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {!isMinimized && (
        <>
          {/* Mini photo preview bar */}
          <View style={chatStyles.postPreviewBar}>
            <Image
              source={{ uri: normalizeAvatarUrl(moment.photo) || moment.photo }}
              style={chatStyles.postThumb}
            />
            <View style={{ flex: 1 }}>
              <Text style={chatStyles.postPreviewCaption} numberOfLines={1}>
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
            {commentsList.length === 0 ? (
              <View style={chatStyles.emptyChat}>
                <Text style={{ fontSize: 32, marginBottom: 6 }}>💬</Text>
                <Text style={chatStyles.emptyChatTitle}>Chưa có tin nhắn nào</Text>
                <Text style={chatStyles.emptyChatSub}>Hãy là người đầu tiên nhắn tin chia sẻ cùng bạn bè!</Text>
              </View>
            ) : (
              commentsList.map((c) => {
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={chatStyles.quickChipsScroll}>
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
            </ScrollView>
          </View>

          {/* Chat input footer */}
          <View style={chatStyles.inputBar}>
            <TextInput
              style={chatStyles.chatInput}
              placeholder="Nhắn tin về bài viết này..."
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
        </>
      )}
    </View>
  );

  // Trên desktop: Render trực tiếp dock ở góc dưới bên phải (không backdrop che màn hình)
  if (isDesktop) {
    return chatContent;
  }

  // Trên mobile: Render modal bottom sheet
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={chatStyles.overlay}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        {chatContent}
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
  messengerBox: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  desktopDockBox: {
    position: 'fixed' as any,
    bottom: 0,
    right: 28,
    width: 360,
    height: 500,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 999999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 24,
  },
  desktopDockMinimized: {
    height: 48,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  dockHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  dockActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginLeft: 4,
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
  const { addNotification } = useNotifications();
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
      const res: any = await sendFriendRequestApi(cleanId);
      const msg = res?.message || (isVi ? 'Đã gửi lời mời kết bạn!' : 'Friend request sent!');
      addNotification({
        type: 'friend',
        title: 'Kết bạn 🤝',
        message: msg,
        metadata: { targetTab: 'feed' },
      });
      Alert.alert(isVi ? 'Thông báo' : 'Notice', msg);
      setFriendIdInput('');
      if (onSuccess) onSuccess();
    } catch (e: any) {
      Alert.alert(isVi ? 'Thông báo' : 'Notice', e.message || (isVi ? 'Không thể gửi lời mời' : 'Failed to send request'));
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

          {/* SECTION 2: ID KẾT BẠN CỦA BẠN */}
          <View style={{ alignItems: 'center', width: '100%', marginTop: 12 }}>
            <Text style={inviteStyles.idLabel}>{isVi ? 'ID kết bạn của bạn:' : 'Your Friend ID:'}</Text>
            <Text style={[inviteStyles.idValue, { fontSize: 24, letterSpacing: 3, fontWeight: '900' }]} numberOfLines={1}>{userId || 'loading...'}</Text>

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
export const FriendsFeedScreen: React.FC<{ onBack?: () => void; onNavigateToMessages?: () => void }> = ({ onBack, onNavigateToMessages }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const { addNotification } = useNotifications();
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
      if (status === 'accepted') {
        addNotification({
          type: 'friend',
          title: 'Kết bạn thành công! 🎉',
          message: 'Bạn đã đồng ý lời mời kết bạn thành công! Giờ hai bạn có thể chia sẻ chi tiêu cùng nhau.',
          iconBg: '#EDE9FE',
          iconColor: '#8B5CF6',
          metadata: { targetTab: 'feed' },
        });
      }
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
      {/* Locket-style Top Drag Handle (vuốt hoặc nhấn để trượt xuống camera) */}
      {onBack && (
        <TouchableOpacity style={styles.dragHandleTouch} onPress={onBack} activeOpacity={0.7}>
          <View style={styles.dragHandle} />
        </TouchableOpacity>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.backDownBtn}>
              <Ionicons name="chevron-down" size={26} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>{isVi ? 'Bảng tin bạn bè 📸' : 'Friends Feed 📸'}</Text>
            <Text style={styles.headerSub}>{isVi ? 'Khoảnh khắc Locket của bạn bè' : 'Friends Locket Moments'}</Text>
          </View>
        </View>

        {onNavigateToMessages && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: '#ECFDF5',
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#A7F3D0',
            }}
            onPress={onNavigateToMessages}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses" size={15} color="#047857" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>
              {isVi ? 'Nhắn tin 💬' : 'Chat 💬'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>{isVi ? 'Đang tải bảng tin...' : 'Loading feed...'}</Text>
        </View>
      ) : (
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
                  ? 'Bảng tin chỉ hiển thị bài đăng khi hai bạn đã kết bạn với nhau. Hãy kết nối bạn bè để cùng chia sẻ khoảnh khắc nhé! ✨'
                  : 'Feed only shows moments when you and your friends are connected. Connect with friends to share moments! ✨'}
              </Text>
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
                onCommentAdded={handleCommentAdded}
              />
            ))
          )}
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
        userId={user?.shortId || myId}
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
  dragHandleTouch: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: colors.header,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: isDark ? '#475569' : '#CBD5E1',
  },
  backDownBtn: {
    padding: 2,
    marginRight: 4,
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
