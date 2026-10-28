import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Animated, Modal, Dimensions, Platform, TextInput, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Line, Rect } from 'react-native-svg';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useSocket } from '../../contexts/SocketContext';
import { getMomentsFeedApi, reactMomentApi, getMomentReactionsApi, deleteMomentApi, normalizeAvatarUrl, getFriendsApi, getFriendRequestsApi, respondFriendRequestApi, removeFriendApi, sendFriendRequestApi, getStreakApi, checkInStreakApi } from '../../services/api';
import { MomentFormModal, MomentChatModal, MomentItem, MomentCommentItem } from '../mobile/FriendsFeedScreen';
import { GroupIconSvg, GROUP_ICONS_LIST } from '../../components/GroupIconSvg';
import { useChat } from '../../contexts/ChatContext';
import { formatMessengerActiveTime } from '../../utils/dateUtils';

const TouchableAny = TouchableOpacity as any;

const WebTouchable: React.FC<{
  style?: any;
  onPress?: (e?: any) => void;
  onContextMenu?: (e: any) => void;
  children: React.ReactNode;
  activeOpacity?: number;
}> = ({ style, onPress, onContextMenu, children, activeOpacity = 0.75 }) => {
  const isWeb = Platform.OS === 'web';
  return (
    <TouchableAny
      style={[
        isWeb ? ({ cursor: 'pointer', userSelect: 'none' } as any) : undefined,
        style,
      ]}
      activeOpacity={activeOpacity}
      delayLongPress={60000}
      onPress={onPress}
      onContextMenu={onContextMenu}
      {...(isWeb ? { onClick: onPress } : {})}
    >
      {children}
    </TouchableAny>
  );
};

const EMOJIS = ['❤️', '🔥', '👏', '😂', '💸'];

// ─── 5 SVG Reaction Icons (Thay cho icon emoji thường) ────────────────────────
const ReactionHeartSvg = ({ size = 26 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Path
      d="M16 28s-11-7.2-11-15a6.5 6.5 0 0 1 11-4.6A6.5 6.5 0 0 1 27 13c0 7.8-11 15-11 15z"
      fill="#EF4444"
    />
    <Path
      d="M16 26.5s-9.5-6.2-9.5-13.5a5.5 5.5 0 0 1 9.5-3.8 5.5 5.5 0 0 1 9.5 3.8c0 7.3-9.5 13.5-9.5 13.5z"
      fill="#F43F5E"
    />
    <Path
      d="M8.5 11c0-2 1.5-3.5 3.5-3.8"
      stroke="#FFFFFF"
      strokeWidth="1.8"
      strokeLinecap="round"
      opacity={0.8}
    />
  </Svg>
);

const ReactionFireSvg = ({ size = 26 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Path
      d="M16 3c1 5 6 7 6 12 0 6.6-4.5 14-10 14s-9-4-9-9c0-6 4-10 6-12 1 3 3 4 4 4 1-3 2-6 3-9z"
      fill="#F97316"
    />
    <Path
      d="M16 9c1.5 3 4 4.5 4 8 0 4.4-2.7 9.5-6 9.5s-6-2.5-6-6c0-4 3-7 4-8.5.5 2 1.5 2.5 2 2.5.5-2 1.2-3.8 2-5.5z"
      fill="#FBBF24"
    />
    <Path
      d="M15.5 17c.5 1.5 2 2.5 2 4.5 0 2.5-1.5 5-3.5 5s-3.5-1.5-3.5-3.5c0-2 1.5-4 2-4.5.5 1 1 1.2 1.5 1.2.5-1 1-1.8 1.5-2.7z"
      fill="#FEF08A"
    />
  </Svg>
);

const ReactionClapSvg = ({ size = 26 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Path
      d="M9.5 18.5l3.5-3.5a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8l-4 4a2 2 0 0 1-2.8 0l-.5-.5a2 2 0 0 1 0-2.8z"
      fill="#F59E0B"
    />
    <Path
      d="M12.5 15.5l4-4a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8l-5 5"
      fill="#FBBF24"
    />
    <Path
      d="M15.5 12.5l3.5-3.5a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8l-5 5"
      fill="#FCD34D"
    />
    <Path
      d="M8 22l3-3 6 6-3 3a3 3 0 0 1-4.2 0L8 26.2a3 3 0 0 1 0-4.2z"
      fill="#D97706"
    />
    <Path d="M7 11l-2-2M10 7V4M15 8l2-2" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const ReactionLaughSvg = ({ size = 26 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Circle cx="16" cy="16" r="14" fill="#FBBF24" />
    <Path d="M8 12.5c1-2 4-2 5 0" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
    <Path d="M19 12.5c1-2 4-2 5 0" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
    <Path d="M9 16c1.5 7 12.5 7 14 0z" fill="#78350F" />
    <Path d="M11 16c1.2 5 8.8 5 10 0z" fill="#EF4444" />
    <Path d="M13.5 19.5c.8 1.5 4.2 1.5 5 0" fill="#F472B6" />
    <Path d="M5.5 16.5c-.8 0-1.5-.7-1.5-1.5 0-1 1.5-2.5 1.5-2.5s1.5 1.5 1.5 2.5c0 .8-.7 1.5-1.5 1.5z" fill="#38BDF8" />
    <Path d="M26.5 16.5c-.8 0-1.5-.7-1.5-1.5 0-1 1.5-2.5 1.5-2.5s1.5 1.5 1.5 2.5c0 .8-.7 1.5-1.5 1.5z" fill="#38BDF8" />
  </Svg>
);

const ReactionMoneySvg = ({ size = 26 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Rect x="4" y="10" width="24" height="13" rx="3" fill="#10B981" stroke="#047857" strokeWidth="1.5" />
    <Circle cx="16" cy="16.5" r="3.5" fill="#34D399" stroke="#047857" strokeWidth="1" />
    <Path d="M16 14.5v4M15 15.5h2a1 1 0 0 1 0 2h-2" stroke="#047857" strokeWidth="1.2" strokeLinecap="round" />
    <Circle cx="7.5" cy="13.5" r="1.2" fill="#047857" />
    <Circle cx="24.5" cy="19.5" r="1.2" fill="#047857" />
    <Path d="M4 12c-2-2-4-2-4 0 0 3 3 5 4 4" fill="#93C5FD" stroke="#3B82F6" strokeWidth="1" />
    <Path d="M28 12c2-2 4-2 4 0 0 3-3 5-4 4" fill="#93C5FD" stroke="#3B82F6" strokeWidth="1" />
  </Svg>
);

const REACTION_SVGS: Record<string, (props: { size?: number }) => React.ReactElement> = {
  '❤️': ReactionHeartSvg,
  '🔥': ReactionFireSvg,
  '👏': ReactionClapSvg,
  '😂': ReactionLaughSvg,
  '💸': ReactionMoneySvg,
};

// ─── 5 SVG Mood Check-in Icons ────────────────────────────────────────────────
const MoodAwfulSvg = ({ size = 32, color = '#EF4444' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 36 36">
    <Circle cx="18" cy="18" r="15" fill="#FEF2F2" stroke={color} strokeWidth="2.2" />
    <Line x1="11" y1="12" x2="15" y2="16" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Line x1="15" y1="12" x2="11" y2="16" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Line x1="21" y1="12" x2="25" y2="16" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Line x1="25" y1="12" x2="21" y2="16" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Path d="M12 24c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4 0" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M26 8c0 1.2-1 2.2-2.2 2.2S21.6 9.2 22.8 7c.4-.7 1.4-1.2 1.4-1.2s1.8 1 1.8 2.2z" fill="#EF4444" opacity={0.6} />
  </Svg>
);

const MoodSadSvg = ({ size = 32, color = '#3B82F6' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 36 36">
    <Circle cx="18" cy="18" r="15" fill="#EFF6FF" stroke={color} strokeWidth="2.2" />
    <Path d="M11 15c.8-1.5 3-1.5 3.8 0" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Path d="M21.2 15c.8-1.5 3-1.5 3.8 0" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Path d="M13 18c0 1.2-.8 2-1.8 2s-1.8-.8-1.8-2c0-1.2 1.8-3.2 1.8-3.2s1.8 2 1.8 3.2z" fill="#60A5FA" />
    <Path d="M12 25c2-2.5 8-2.5 12 0" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

const MoodNeutralSvg = ({ size = 32, color = '#F59E0B' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 36 36">
    <Circle cx="18" cy="18" r="15" fill="#FFFBEB" stroke={color} strokeWidth="2.2" />
    <Circle cx="13" cy="15" r="2.2" fill={color} />
    <Circle cx="23" cy="15" r="2.2" fill={color} />
    <Line x1="12" y1="23" x2="24" y2="23" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
  </Svg>
);

const MoodHappySvg = ({ size = 32, color = '#10B981' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 36 36">
    <Circle cx="18" cy="18" r="15" fill="#ECFDF5" stroke={color} strokeWidth="2.2" />
    <Path d="M11 15c.8-2 3.2-2 4 0" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    <Path d="M21 15c.8-2 3.2-2 4 0" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    <Circle cx="9.5" cy="18.5" r="2" fill="#FCA5A5" opacity={0.6} />
    <Circle cx="26.5" cy="18.5" r="2" fill="#FCA5A5" opacity={0.6} />
    <Path d="M11.5 21.5c1.8 3.5 9.2 3.5 13 0" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
  </Svg>
);

const MoodExcitedSvg = ({ size = 32, color = '#8B5CF6' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 36 36">
    <Circle cx="18" cy="18" r="15" fill="#F5F3FF" stroke={color} strokeWidth="2.2" />
    <Path d="M13 11.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" fill={color} />
    <Path d="M23 11.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" fill={color} />
    <Path d="M11 20.5c1.5 4.5 12.5 4.5 14 0z" fill={color} />
    <Path d="M15 23.5c1 1.2 5 1.2 6 0" fill="#F472B6" />
    <Line x1="18" y1="1" x2="18" y2="3" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    <Line x1="31" y1="7" x2="33" y2="5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    <Line x1="5" y1="7" x2="3" y2="5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const MOOD_CHECKIN_OPTIONS = [
  {
    id: 'awful',
    label: 'Tệ',
    color: '#EF4444',
    bg: '#FEF2F2',
    border: '#FCA5A5',
    quote: 'Hôm nay có chút vất vả rồi, hãy cho bản thân nghỉ ngơi thật tốt, ngày mai sẽ tươi sáng hơn nhé! 🌿',
    Icon: MoodAwfulSvg,
  },
  {
    id: 'sad',
    label: 'Buồn',
    color: '#3B82F6',
    bg: '#EFF6FF',
    border: '#93C5FD',
    quote: 'Gửi bạn một chút bình yên dịu dàng, tự thưởng cho mình một món ngon yêu thích hôm nay nha! 🧋',
    Icon: MoodSadSvg,
  },
  {
    id: 'neutral',
    label: 'Bình thường',
    color: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FDE68A',
    quote: 'Một ngày trôi qua an yên, thảnh thơi và trọn vẹn từng khoảnh khắc giản đơn ☕',
    Icon: MoodNeutralSvg,
  },
  {
    id: 'happy',
    label: 'Vui',
    color: '#10B981',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    quote: 'Nụ cười rạng rỡ! Hãy giữ trọn nguồn năng lượng tích cực, ấm áp này suốt cả ngày bạn nhé! ☀️',
    Icon: MoodHappySvg,
  },
  {
    id: 'excited',
    label: 'Hào hứng',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    quote: 'Tuyệt vời! Chúc bạn có một ngày tràn ngập niềm vui và hoàn thành xuất sắc mọi dự định! 🚀✨',
    Icon: MoodExcitedSvg,
  },
];


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

// ─── Web Moment Card ─────────────────────────────────────────────────────────
const WebMomentCard = ({
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
      <View style={cardStyles.header}>
        <Avatar uri={item.user?.avatar} name={item.user?.name || 'Bạn'} size={36} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={cardStyles.userName}>{item.user?.name || 'Bạn bè'}</Text>
          <Text style={cardStyles.meta}>{item.category || 'Khoảnh khắc'} · {item.time}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={() => setShowMenu(true)} style={cardStyles.menuBtn}>
            <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {item.caption ? (
        <View style={cardStyles.captionOverlay}>
          <Text style={cardStyles.caption}>
            {item.caption.split(/(#[a-zA-Z0-9_À-ỹ]+)/g).map((part, pIdx) => {
              if (part.startsWith('#')) {
                return (
                  <Text key={pIdx} style={{ color: '#059669', fontWeight: '700' }}>
                    {part}
                  </Text>
                );
              }
              return part;
            })}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity onPress={toggleEmojis} activeOpacity={0.95}>
        <Image
          source={{ uri: normalizeAvatarUrl(item.photo) || item.photo }}
          style={cardStyles.photo}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={cardStyles.reactionBar}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          activeOpacity={0.7}
          onPress={() => totalReactions > 0 && onViewReactions && onViewReactions(item.id)}
        >
          {Object.entries(item.reactions || {})
            .filter(([, count]) => count > 0)
            .map(([emoji, count]) => {
              const SvgComp = REACTION_SVGS[emoji];
              return (
                <View key={emoji} style={cardStyles.emojiBadge}>
                  {SvgComp ? <SvgComp size={16} /> : <Text style={{ fontSize: 14 }}>{emoji}</Text>}
                  <Text style={cardStyles.emojiBadgeCount}>{count}</Text>
                </View>
              );
            })}
          {totalReactions === 0 && (
            <Text style={cardStyles.noReactionText}>Chạm để thả cảm xúc ✨</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity style={[cardStyles.reactBtn, item.myReaction && cardStyles.reactBtnActive]} onPress={toggleEmojis}>
            {item.myReaction && REACTION_SVGS[item.myReaction] ? (
              React.createElement(REACTION_SVGS[item.myReaction], { size: 18 })
            ) : (
              <Text style={{ fontSize: 16 }}>{item.myReaction || '😊'}</Text>
            )}
            <Text style={[cardStyles.reactBtnText, item.myReaction && cardStyles.reactBtnTextActive]}>
              {item.myReaction ? 'Đã thả' : 'Thả cảm xúc'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={cardStyles.chatBtn} onPress={() => onOpenChat(item)} activeOpacity={0.75}>
            <Ionicons name="chatbubble-ellipses" size={16} color="#059669" />
            <Text style={cardStyles.chatBtnText}>
              {item.comments && item.comments.length > 0 ? `Chat (${item.comments.length})` : 'Chat'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
          {EMOJIS.map((emoji) => {
            const SvgComp = REACTION_SVGS[emoji];
            return (
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
                {SvgComp ? <SvgComp size={26} /> : <Text style={{ fontSize: 26 }}>{emoji}</Text>}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}

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
                  if (window.confirm('Bạn chắc chắn muốn xóa khoảnh khắc này?')) {
                    onDelete(item.id);
                  }
                }, 100);
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
    borderRadius: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  userName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  meta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  menuBtn: {
    padding: 8,
  },
  photo: {
    width: '100%',
    height: 460,
    backgroundColor: '#F1F5F9',
  },
  captionOverlay: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFF',
  },
  caption: {
    color: '#0F172A',
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: '500',
  },
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  noReactionText: {
    fontSize: 13,
    color: '#65676B',
  },
  emojiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  emojiBadgeCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#65676B',
    marginLeft: 4,
  },
  reactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  reactBtnActive: {
    backgroundColor: 'transparent',
  },
  reactBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#65676B',
  },
  reactBtnTextActive: {
    color: '#059669',
    fontWeight: 'bold',
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  chatBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#65676B',
  },
  commentsPreviewBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E4E6EB',
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
    width: 400,
    maxWidth: '90%',
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


const STANDEE_SLIDES = [
  {
    id: 'tra_sua',
    badge: 'Mood ngọt ngào 🧋',
    badgeBg: '#FFE4E6',
    badgeColor: '#E11D48',
    title: 'Hôm nay bạn đã ún trà sữa chưa? 😋',
    subtitle: 'Một ly full topping nạp lại 100% năng lượng ngọt ngào, tự thưởng một chút rồi ghi chi tiêu cùng Monett nha!',
    emoji: '🧋',
    secondaryEmoji: '😋',
    btnText: 'Khoe ly trà sữa 🧋',
    btnBg: '#F43F5E',
    category: '🥤 Trà sữa & Ăn vặt',
    bgLight: '#FFF1F2',
    bgDark: '#4C0519',
    borderLight: '#FECDD3',
    borderDark: '#9F1239',
  },
  {
    id: 'tich_luy',
    badge: 'Heo đất thông minh 🐷',
    badgeBg: '#DCFCE7',
    badgeColor: '#15803D',
    title: 'Hôm nay bạn đã tích lũy chưa? 🪙',
    subtitle: 'Bỏ ống heo một khoản nhỏ hôm nay, ngày mai có cả gia tài rực rỡ và vững vàng từng bước!',
    emoji: '🐷',
    secondaryEmoji: '🪙',
    btnText: 'Bỏ heo tích lũy ngay 💰',
    btnBg: '#059669',
    category: '💰 Tích lũy & Tiết kiệm',
    bgLight: '#F0FDF4',
    bgDark: '#064E3B',
    borderLight: '#BBF7D0',
    borderDark: '#047857',
  },
  {
    id: 'dong_tien',
    badge: 'Tài chính tự do 🪙',
    badgeBg: '#FEF3C7',
    badgeColor: '#B45309',
    title: 'Đồng tiền thông minh, ví mỉm cười! ✨',
    subtitle: 'Mỗi đồng tiền tiết kiệm thông minh hôm nay là nấc thang tự do tài chính cho ngày mai!',
    emoji: '🪙',
    secondaryEmoji: '✨',
    btnText: 'Ghi chép chi tiêu 📝',
    btnBg: '#D97706',
    category: '✨ Quản lý tài chính',
    bgLight: '#FFFBEB',
    bgDark: '#78350F',
    borderLight: '#FDE68A',
    borderDark: '#92400E',
  },
  {
    id: 'lau_nuong',
    badge: 'Bung xõa hết mình 🍖',
    badgeBg: '#FFEDD5',
    badgeColor: '#C2410C',
    title: 'Hôm nay làm nồi lẩu nướng chứ? 🍲🔥',
    subtitle: 'Khói nghi ngút, bạn bè rôm rả chia tiền vừa vui vừa nhẹ ví, mở tiệc nạp năng lượng thôi!',
    emoji: '🍲',
    secondaryEmoji: '🔥',
    btnText: 'Rủ hội đi ăn lẩu 🍲',
    btnBg: '#EA580C',
    category: '🍲 Ăn uống & Tiệc tùng',
    bgLight: '#FFF7ED',
    bgDark: '#7C2D12',
    borderLight: '#FED7AA',
    borderDark: '#9A3412',
  },
  {
    id: 'tien_ve_vi',
    badge: 'Ví luôn rủng rỉnh 💵',
    badgeBg: '#EFF6FF',
    badgeColor: '#1D4ED8',
    title: 'Tiền ơi về ví ta! 💸✨',
    subtitle: 'Biết thu biết chi, tài chính chủ động thảnh thơi. Cuối tháng ví tiền vẫn cười toe toét!',
    emoji: '💸',
    secondaryEmoji: '🥳',
    btnText: 'Khoe số dư ví 💵',
    btnBg: '#2563EB',
    category: '💵 Thu nhập & Lương',
    bgLight: '#EFF6FF',
    bgDark: '#1E3A8A',
    borderLight: '#BFDBFE',
    borderDark: '#1D4ED8',
  },
  {
    id: 'du_lich',
    badge: 'Kèo vi vu thanh xuân 🎒',
    badgeBg: '#CCFBF1',
    badgeColor: '#0F766E',
    title: 'Bạn đã lên kèo du lịch chưa? 🏖️✈️',
    subtitle: 'Một chuyến đi chữa lành tâm hồn, tích lũy từng ngày để xách balo lên và khám phá muôn nơi!',
    emoji: '🏝️',
    secondaryEmoji: '✈️',
    btnText: 'Lên kế hoạch du lịch ✈️',
    btnBg: '#0D9488',
    category: '🏖️ Du lịch & Khám phá',
    bgLight: '#F0FDFA',
    bgDark: '#134E4A',
    borderLight: '#99F6E4',
    borderDark: '#115E59',
  },
  {
    id: 'ca_phe',
    badge: 'Khởi đầu ngày mới ☀️',
    badgeBg: '#F5F3FF',
    badgeColor: '#6D28D9',
    title: 'Hít hà mùi cà phê sáng nhé? ☕',
    subtitle: 'Tỉnh táo với ly bạc xỉu hay americano yêu thích, ghi lại khoảnh khắc chill chill cùng bạn bè nào!',
    emoji: '☕',
    secondaryEmoji: '🌿',
    btnText: 'Check-in cà phê ☕',
    btnBg: '#7C3AED',
    category: '☕ Cà phê chill',
    bgLight: '#F5F3FF',
    bgDark: '#4C1D95',
    borderLight: '#DDD6FE',
    borderDark: '#6D28D9',
  },
  {
    id: 'xem_phim',
    badge: 'Giải trí xả stress 🎟️',
    badgeBg: '#FCE7F3',
    badgeColor: '#BE185D',
    title: 'Đi xem phim xả stress không? 🍿🎬',
    subtitle: 'Một bắp một nước cùng bộ phim bom tấn cuối tuần, tự thưởng cho những ngày làm việc chăm chỉ!',
    emoji: '🍿',
    secondaryEmoji: '🎬',
    btnText: 'Khoe vé xem phim 🎬',
    btnBg: '#DB2777',
    category: '🍿 Giải trí & Phim ảnh',
    bgLight: '#FDF2F8',
    bgDark: '#701A75',
    borderLight: '#FBCFE8',
    borderDark: '#86198F',
  },
  {
    id: 'san_sale',
    badge: 'Chi tiêu thông thái 💳',
    badgeBg: '#E0E7FF',
    badgeColor: '#3730A3',
    title: 'Săn sale thông minh, ví bình an! 🛍️✨',
    subtitle: 'Chỉ rước món đồ mình thật sự cần và yêu thích, tài chính vững vàng mà tinh thần thì phơi phới!',
    emoji: '🛍️',
    secondaryEmoji: '🎁',
    btnText: 'Khoe chiến tích săn sale 🛍️',
    btnBg: '#4F46E5',
    category: '🛍️ Mua sắm & Tự thưởng',
    bgLight: '#EEF2FF',
    bgDark: '#312E81',
    borderLight: '#C7D2FE',
    borderDark: '#4338CA',
  },
];

interface FinancialTip {
  id: string;
  category: string;
  badgeColor: string;
  badgeBg: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  content: string;
  actionHint?: string;
}

const FINANCIAL_TIPS: FinancialTip[] = [
  {
    id: 'tip_1',
    category: 'Quy tắc vàng',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    icon: 'pie-chart',
    title: 'Quy tắc 50 / 30 / 20',
    content: '50% cho nhu cầu thiết yếu, 30% cho sở thích linh hoạt và 20% gửi thẳng vào quỹ tiết kiệm ngay khi nhận lương.',
    actionHint: 'Chia lương thông minh ngay hôm nay ✨',
  },
  {
    id: 'tip_2',
    category: 'Thói quen chi tiêu',
    badgeColor: '#D97706',
    badgeBg: '#FFFBEB',
    icon: 'time',
    title: 'Quy tắc trì hoãn 72 giờ',
    content: 'Khi muốn mua một món đồ không cấp bách, hãy chờ 72 giờ. Hơn 80% trường hợp bạn sẽ nhận ra mình không thực sự cần nó.',
    actionHint: 'Tránh mua sắm bốc đồng ⏳',
  },
  {
    id: 'tip_3',
    category: 'Chi tiêu hằng ngày',
    badgeColor: '#8B5CF6',
    badgeBg: '#F5F3FF',
    icon: 'cafe',
    title: 'Hiệu ứng ly cà phê / trà sữa',
    content: 'Tự pha đồ uống 3 ngày/tuần thay vì mua ngoài giúp bạn giữ lại từ 500.000đ đến 1.200.000đ mỗi tháng.',
    actionHint: 'Tiết kiệm từ điều nhỏ nhất ☕',
  },
  {
    id: 'tip_4',
    category: 'Tâm lý mua sắm',
    badgeColor: '#EF4444',
    badgeBg: '#FEF2F2',
    icon: 'pricetag',
    title: 'Đừng mắc bẫy giảm giá',
    content: 'Một món đồ giảm giá 50% vẫn khiến bạn mất 100% số tiền nếu như ban đầu bạn vốn không có kế hoạch mua nó.',
    actionHint: 'Mua vì cần, đừng mua vì rẻ 🏷️',
  },
  {
    id: 'tip_5',
    category: 'An toàn tài chính',
    badgeColor: '#0284C7',
    badgeBg: '#F0F9FF',
    icon: 'shield-checkmark',
    title: 'Quỹ khẩn cấp 3 - 6 tháng',
    content: 'Hãy luôn có một khoản tiền dự phòng tương đương 3-6 tháng sinh hoạt phí trước khi nghĩ đến đầu tư mạo hiểm.',
    actionHint: 'Tấm khiên an tâm tài chính 🛡️',
  },
  {
    id: 'tip_6',
    category: 'Chánh niệm tài chính',
    badgeColor: '#EC4899',
    badgeBg: '#FDF2F8',
    icon: 'heart-circle',
    title: 'Ghi chép chi tiêu liền tay',
    content: 'Ghi lại chi tiêu ngay khi vừa thanh toán giúp não bộ nhận thức rõ giá trị đồng tiền và giảm ngay 25% chi tiêu vô thức.',
    actionHint: 'Thói quen nhỏ, tự do lớn 📝',
  },
];

interface SavingChallenge {
  id: string;
  title: string;
  targetDays: number;
  emoji: string;
  tagline: string;
  description: string;
}

const SAVING_CHALLENGES: SavingChallenge[] = [
  {
    id: 'challenge_nosip',
    title: '3 Ngày Tự Pha Nước / Không Mua Ngoài',
    targetDays: 3,
    emoji: '🥤',
    tagline: 'Tiết kiệm ~150.000đ tuần này',
    description: 'Tự mang bình nước hoặc uống nước lọc trong 3 ngày tuần này.',
  },
  {
    id: 'challenge_homecook',
    title: 'Nấu Ăn Tại Nhà 5 Bữa',
    targetDays: 5,
    emoji: '🍳',
    tagline: 'Vừa khỏe mạnh vừa tiết kiệm',
    description: 'Tự chuẩn bị cơm nhà thay vì đặt đồ ăn giao tận nơi.',
  },
  {
    id: 'challenge_nospend',
    title: 'Ngày Chủ Nhật Không Rút Ví (No-Spend Day)',
    targetDays: 1,
    emoji: '🌿',
    tagline: 'Thanh lọc thói quen chi tiêu',
    description: 'Một ngày trọn vẹn tận hưởng niềm vui giản dị mà không tốn tiền.',
  },
];

export interface WebFeedScreenProps {
  initialTab?: 'feed' | 'chat' | 'friends';
}

export const WebFeedScreen: React.FC<WebFeedScreenProps> = ({ initialTab = 'feed' }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const { user, refreshUser } = useAuth();
  const { isDark, colors } = useTheme();
  const { addNotification } = useNotifications();
  const { isUserOnline, refreshOnlineUsers, socket } = useSocket();
  const styles = getStyles(isDark, colors);

  const {
    openChat,
    openMessenger,
    closeMessenger,
    toggleMessenger,
    isMessengerOpen,
    chatGroups,
    saveChatGroups,
    createGroup,
    pinnedChatIds,
    togglePinChat,
    hiddenChatIds,
    deleteConversation,
  } = useChat();

  // ─── MẸO TÀI CHÍNH & THỬ THÁCH TIẾT KIỆM HÀNG TUẦN ───
  const [tipIndex, setTipIndex] = useState(0);
  const [challengeProgress, setChallengeProgress] = useState<number[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('monett_saving_challenge_days');
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    return [0, 1]; // Mặc định tích lũy sẵn 2 ngày đầu tuần
  });
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);

  const handleToggleChallengeDay = (dayIdx: number) => {
    setChallengeProgress((prev) => {
      const next = prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx];
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('monett_saving_challenge_days', JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  };

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % FINANCIAL_TIPS.length);
  };

  // ─── STANDEE CAROUSEL NHẢY QUA NHẢY LẠI (VUI VẺ & ĐỘNG LỰC) ───
  const [standeeIndex, setStandeeIndex] = useState(0);
  const standeeBounceAnim = useRef(new Animated.Value(1)).current;
  const standeeOpacityAnim = useRef(new Animated.Value(1)).current;

  const triggerStandeeBounce = useCallback(() => {
    standeeBounceAnim.setValue(0.76);
    standeeOpacityAnim.setValue(0.2);
    Animated.parallel([
      Animated.timing(standeeOpacityAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.spring(standeeBounceAnim, {
        toValue: 1,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [standeeBounceAnim, standeeOpacityAnim]);

  useEffect(() => {
    const timer = setInterval(() => {
      setStandeeIndex((prev) => (prev + 1) % STANDEE_SLIDES.length);
    }, 4200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    triggerStandeeBounce();
  }, [standeeIndex, triggerStandeeBounce]);

  const handleNextStandee = () => {
    setStandeeIndex((prev) => (prev + 1) % STANDEE_SLIDES.length);
  };

  const handlePrevStandee = () => {
    setStandeeIndex((prev) => (prev - 1 + STANDEE_SLIDES.length) % STANDEE_SLIDES.length);
  };

  useEffect(() => {
    if (initialTab === 'chat') {
      openMessenger();
    }
  }, [initialTab, openMessenger]);

  // Trạng thái menu Messenger Popover (Facebook Style)
  const [showMessengerDropdown, setShowMessengerDropdown] = useState(false);
  const [messengerSearchQuery, setMessengerSearchQuery] = useState('');
  const [messengerFilter, setMessengerFilter] = useState<'all' | 'unread' | 'group' | 'direct'>('all');

  // Kiểm tra online chính xác cho mọi đối tượng bạn bè
  const isFriendOnline = useCallback(
    (f: any) => {
      if (!f) return false;
      const candidateIds = [
        f._id,
        f.id,
        f.friendId,
        f.userId,
        f.user?._id,
        f.user?.id,
        f.recipient?._id,
        f.recipient?.id,
        f.requester?._id,
        f.requester?.id,
      ].filter(Boolean).map(String);
      return (
        candidateIds.some((cid) => isUserOnline(cid)) ||
        f.isOnline === true ||
        f.status === 'online' ||
        f.online === true
      );
    },
    [isUserOnline]
  );

  const [moments, setMoments] = useState<MomentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingMoment, setEditingMoment] = useState<MomentItem | null>(null);
  const [chatMoment, setChatMoment] = useState<MomentItem | null>(null);
  const [activeMomentReply, setActiveMomentReply] = useState<{
    id: string;
    photo: string;
    caption?: string;
    userName?: string;
  } | null>(null);
  const [initialAction, setInitialAction] = useState<'photo' | 'tag' | 'text' | undefined>(undefined);
  const [initialCategory, setInitialCategory] = useState<string | undefined>(undefined);

  const handleOpenCreate = (action?: 'photo' | 'tag' | 'text', cat?: string) => {
    setEditingMoment(null);
    setInitialAction(action || 'text');
    setInitialCategory(cat);
    setShowCreate(true);
  };

  const [friendIdInput, setFriendIdInput] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const getTodayKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  };

  const getYesterdayKey = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  const [selectedMood, setSelectedMood] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('monett_mood_' + getTodayKey());
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [moodStreak, setMoodStreak] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const s = parseInt(window.localStorage.getItem('monett_mood_streak') || '0', 10);
        if (!isNaN(s) && s > 0) return Math.max(s, (user as any)?.streak || 0, 2);
      }
    } catch {
      // ignore
    }
    return Math.max((user as any)?.streak || 0, 2);
  });

  // Tự động đồng bộ chuỗi ngày điểm danh từ thông tin tài khoản và Server
  useEffect(() => {
    const backendStreak = (user as any)?.streak || 2;
    setMoodStreak((prev) => {
      const best = Math.max(prev, backendStreak, 2);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('monett_mood_streak', String(best));
        }
      } catch {}
      return best;
    });

    getStreakApi()
      .then((res: any) => {
        const data = res?.data || res;
        if (data && typeof data.streak === 'number' && data.streak > 0) {
          const finalStreak = Math.max(data.streak, 2);
          setMoodStreak(finalStreak);
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem('monett_mood_streak', String(finalStreak));
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, [user]);

  const handleSelectMood = async (id: string) => {
    const todayKey = getTodayKey();
    const yesterdayKey = getYesterdayKey();
    let nextStreak = moodStreak;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const lastDate = window.localStorage.getItem('monett_mood_last_date');
        const storedStreak = parseInt(window.localStorage.getItem('monett_mood_streak') || '0', 10);
        const base = Math.max(storedStreak, moodStreak, (user as any)?.streak || 0, 2);

        if (lastDate === todayKey) {
          // Điểm danh lại trong cùng ngày -> giữ nguyên streak
          nextStreak = base;
        } else if (lastDate === yesterdayKey) {
          // Ngày hôm sau liên tiếp -> cộng thêm 1 ngày!
          nextStreak = base + 1;
        } else {
          // Giữ chuỗi liên tiếp tối thiểu đã đạt
          nextStreak = Math.max(base, 2);
        }

        window.localStorage.setItem('monett_mood_' + todayKey, id);
        window.localStorage.setItem('monett_mood_last_date', todayKey);
        window.localStorage.setItem('monett_mood_streak', String(nextStreak));
      }
    } catch (e) {
      console.warn(e);
    }

    setSelectedMood(id);
    setMoodStreak(nextStreak);

    // Gửi check-in lên server để đồng bộ toàn hệ thống
    try {
      const res: any = await checkInStreakApi();
      const data = res?.data || res;
      if (data && data.streak) {
        const finalS = Math.max(data.streak, nextStreak);
        setMoodStreak(finalS);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('monett_mood_streak', String(finalS));
        }
      }
      if (refreshUser) {
        await refreshUser();
      }
    } catch (e) {
      console.warn('Check in streak api error:', e);
    }
  };

  const momentsWithComments = moments.filter(
    (m) => m.comments && m.comments.length > 0
  );

  // Tab: Bảng tin • Bạn bè
  const [activeTab, setActiveTab] = useState<'feed' | 'friends'>(initialTab === 'friends' ? 'friends' : 'feed');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab === 'friends' ? 'friends' : 'feed');
    }
  }, [initialTab]);

  // Friends state
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [reactedUsers, setReactedUsers] = useState<any[]>([]);
  const [isLoadingReactions, setIsLoadingReactions] = useState(false);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [activeFriendSubTab, setActiveFriendSubTab] = useState<'friends' | 'requests'>('friends');

  const myId = (user as any)?._id || (user as any)?.id || '';

  const handleOpenMomentChat = (m: MomentItem) => {
    let targetFriend: any = null;
    const authorId = m.user?.id || (m as any).userId;
    const isMyPost = authorId === myId;

    if (!isMyPost && m.user) {
      targetFriend = {
        id: m.user.id || (m as any).userId,
        _id: m.user.id || (m as any).userId,
        name: m.user.name,
        fullName: m.user.name,
        avatarUrl: m.user.avatar,
        avatar: m.user.avatar,
      };
    } else if (isMyPost && m.comments && m.comments.length > 0) {
      const lastC = m.comments[m.comments.length - 1];
      const foundFriend = friendsList.find(
        (f: any) => String(f._id || f.id) === String(lastC.userId)
      );
      targetFriend = foundFriend || {
        id: lastC.userId,
        _id: lastC.userId,
        name: lastC.userName,
        fullName: lastC.userName,
      };
    } else if (friendsList.length > 0) {
      targetFriend = friendsList[0];
    }

    if (!targetFriend) {
      targetFriend = {
        id: m.user?.id || (m as any).userId || 'friend_default',
        _id: m.user?.id || (m as any).userId || 'friend_default',
        name: m.user?.name || 'Bạn bè',
        fullName: m.user?.name || 'Bạn bè',
        avatarUrl: m.user?.avatar,
      };
    }

    setChatMoment(null);
    openChat(targetFriend, {
      id: m.id,
      photo: m.photo,
      caption: m.caption,
      userName: m.user?.name,
    });
  };

  // ─── NHÓM TRÒ CHUYỆN (GROUPS) ───
  const [chatFilter, setChatFilter] = useState<'all' | 'direct' | 'group'>('all');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupIcon, setNewGroupIcon] = useState('users');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  // ─── CONTEXT MENU ───
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    target: {
      id: string;
      type: 'group' | 'friend' | 'moment';
      name: string;
      data: any;
    } | null;
  }>({ visible: false, x: 0, y: 0, target: null });

  const handleOpenContextMenu = (
    e: any,
    target: { id: string; type: 'group' | 'friend' | 'moment'; name: string; data: any }
  ) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    const pageX = e?.pageX ?? e?.clientX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 - 110 : 200);
    const pageY = e?.pageY ?? e?.clientY ?? 250;
    setContextMenu({
      visible: true,
      x: pageX,
      y: pageY,
      target,
    });
  };

  const handleTogglePinChat = (chatId: string) => {
    togglePinChat(chatId);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleDeleteConversation = (target: {
    id: string;
    type: 'group' | 'friend' | 'moment';
    name: string;
    data: any;
  }) => {
    deleteConversation(target);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      alert('Vui lòng nhập tên nhóm!');
      return;
    }
    if (selectedFriendIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 bạn bè để tạo nhóm!');
      return;
    }

    const newGroup = createGroup(newGroupName, newGroupIcon, selectedFriendIds);
    setShowCreateGroupModal(false);
    setNewGroupName('');
    setNewGroupIcon('users');
    setSelectedFriendIds([]);
    setChatFilter('group');
    if (newGroup) {
      openChat(newGroup);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [feedData, f, r] = await Promise.all([
        getMomentsFeedApi().catch(() => []),
        getFriendsApi().catch(() => []),
        getFriendRequestsApi().catch(() => []),
      ]);
      setMoments((feedData as any) || []);
      setFriendsList(f || []);
      setFriendRequests(r || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
      setIsFriendsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── LẮNG NGHE BÌNH LUẬN & TIN NHẮN REALTIME TỪ SOCKET.IO ───
  useEffect(() => {
    if (!socket) return;

    const handleMomentComment = (data: { momentId: string; comment: MomentCommentItem }) => {
      if (!data?.momentId || !data?.comment) return;
      handleCommentAdded(data.momentId, data.comment);
    };

    const handleMomentNotification = (data: {
      momentId: string;
      commenterName: string;
      text: string;
      caption?: string;
    }) => {
      if (!data?.commenterName) return;
      addNotification({
        type: 'moment',
        title: `Bình luận mới từ ${data.commenterName} 💬`,
        message: `${data.commenterName}: "${data.text}"`,
        iconBg: '#ECFDF5',
        iconColor: '#059669',
        metadata: {
          momentId: data.momentId,
          targetTab: 'feed',
        },
      });
    };

    socket.on('moment_comment', handleMomentComment);
    socket.on('moment_notification', handleMomentNotification);

    return () => {
      socket.off('moment_comment', handleMomentComment);
      socket.off('moment_notification', handleMomentNotification);
    };
  }, [socket, addNotification]);

  // Tự động làm mới bảng tin và các cuộc thảo luận mỗi 6 giây (chạy ngầm, không giật UI)
  useEffect(() => {
    const timer = setInterval(() => {
      getMomentsFeedApi()
        .then((feedData: any) => {
          if (Array.isArray(feedData) && feedData.length > 0) {
            setMoments((prev) => {
              // So sánh nhanh để chỉ cập nhật khi có thay đổi
              if (JSON.stringify(feedData) !== JSON.stringify(prev)) {
                return feedData;
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }, 6000);

    return () => clearInterval(timer);
  }, []);

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

  const handleReact = async (momentId: string, emoji: string) => {
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
    try {
      const result: any = await reactMomentApi(momentId, emoji);
      if (result && result.reactions) {
        setMoments((prev) => prev.map((m) => m.id === momentId ? { ...m, reactions: result.reactions, myReaction: result.myReaction } : m));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDelete = async (momentId: string) => {
    try {
      await deleteMomentApi(momentId);
      setMoments((prev) => prev.filter((m) => m.id !== momentId));
      Alert.alert('Thành công', 'Đã xóa bài đăng!');
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể xóa bài đăng');
    }
  };

  const handleEdit = (item: MomentItem) => {
    setEditingMoment(item);
    setShowCreate(true);
  };

  const handleCommentAdded = (momentId: string, newComment: MomentCommentItem) => {
    setMoments((prev) => prev.map((m) => {
      if (m.id !== momentId) return m;
      return { ...m, comments: [...(m.comments || []), newComment] };
    }));
    setChatMoment((prev) => {
      if (!prev || prev.id !== momentId) return prev;
      return { ...prev, comments: [...(prev.comments || []), newComment] };
    });
  };

  const handleRespondFriendRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await respondFriendRequestApi(requestId, status);
      if (status === 'accepted') {
        addNotification({
          type: 'friend',
          title: 'Kết bạn thành công! 🤝🎉',
          message: 'Bạn và đối phương đã trở thành bạn bè trên Monett! Giờ hai bạn có thể xem các khoảnh khắc chi tiêu của nhau.',
          iconBg: '#EDE9FE',
          iconColor: '#8B5CF6',
          metadata: { targetTab: 'feed' },
        });
      }
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRemoveFriend = async (item: any, name: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa ${name} khỏi danh sách bạn bè?`)) {
      removeFriendApi(item._id || item.id).then(() => {
        setFriendsList(prev => prev.filter(f => (f._id || f.id) !== (item._id || item.id)));
      }).catch(e => alert('Error: ' + e.message));
    }
  };

  const handleSendFriendRequest = async () => {
    const cleanedId = friendIdInput.trim().replace(/^#/, '');
    if (!cleanedId) {
      alert('Vui lòng nhập ID bạn bè');
      return;
    }
    setIsSendingRequest(true);
    try {
      const res: any = await sendFriendRequestApi(cleanedId);
      const msg = res?.message || 'Đã gửi lời mời kết bạn thành công!';
      addNotification({
        type: 'friend',
        title: 'Kết bạn 🤝',
        message: msg,
        iconBg: '#EDE9FE',
        iconColor: '#8B5CF6',
        metadata: { targetTab: 'friends' },
      });
      alert(msg);
      setFriendIdInput('');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Không thể gửi lời mời');
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Sorted & Filtered conversations (Pinned on top, hidden filtered out)
  const sortedChatGroups = [...chatGroups].sort((a, b) => {
    const aPin = pinnedChatIds.includes(a.id) ? 1 : 0;
    const bPin = pinnedChatIds.includes(b.id) ? 1 : 0;
    return bPin - aPin;
  });

  const visibleMoments = momentsWithComments.filter((m) => !hiddenChatIds.includes('moment_' + m.id));
  const sortedMoments = [...visibleMoments].sort((a, b) => {
    const aPin = pinnedChatIds.includes('moment_' + a.id) ? 1 : 0;
    const bPin = pinnedChatIds.includes('moment_' + b.id) ? 1 : 0;
    return bPin - aPin;
  });

  const visibleFriends = friendsList.filter((f: any) => !hiddenChatIds.includes(String(f._id || f.id || '')));
  const sortedFriends = [...visibleFriends].sort((a: any, b: any) => {
    const aId = String(a._id || a.id || '');
    const bId = String(b._id || b.id || '');
    const aPin = pinnedChatIds.includes(aId) ? 1 : 0;
    const bPin = pinnedChatIds.includes(bId) ? 1 : 0;
    return bPin - aPin;
  });

  // ─── DANH SÁCH CUỘC TRÒ CHUYỆN CHO MESSENGER DROPDOWN (FACEBOOK STYLE) ───
  const unifiedConversations = useMemo(() => {
    const list: any[] = [];

    // 1. Nhóm trò chuyện
    chatGroups.forEach((grp) => {
      const isPinned = pinnedChatIds.includes(grp.id);
      list.push({
        id: grp.id,
        type: 'group',
        name: grp.name,
        avatar: null,
        icon: grp.icon || 'users',
        isOnline: false,
        lastMessage: grp.lastMessage || 'Bắt đầu cuộc trò chuyện nhóm 👥',
        time: 'Nhóm',
        isPinned,
        unread: false,
        data: grp,
      });
    });

    // 2. Bình luận bài viết
    momentsWithComments.forEach((m) => {
      const mId = 'moment_' + m.id;
      const isPinned = pinnedChatIds.includes(mId);
      const lastComment = m.comments && m.comments.length > 0 ? m.comments[m.comments.length - 1] : null;
      list.push({
        id: mId,
        type: 'moment',
        name: m.user?.name || 'Khoảnh khắc',
        avatar: m.user?.avatar,
        icon: null,
        isOnline: false,
        lastMessage: lastComment ? `${lastComment.userName}: ${lastComment.text}` : (m.caption || 'Thảo luận khoảnh khắc'),
        time: lastComment?.time || 'Bài đăng',
        isPinned,
        unread: false,
        data: m,
      });
    });

    // 3. Bạn bè
    friendsList.forEach((f: any) => {
      const fId = String(f._id || f.id || '');
      const isPinned = pinnedChatIds.includes(fId);
      const fName = f.fullName || f.name || f.email || 'Bạn';
      const isOnline = isFriendOnline(f);
      list.push({
        id: fId || ('friend_' + Math.random()),
        type: 'friend',
        name: fName,
        avatar: f.avatarUrl || f.avatar,
        icon: null,
        isOnline,
        lastMessage: isOnline ? '🟢 Đang hoạt động' : formatMessengerActiveTime(f, isOnline),
        time: isOnline ? 'Online' : 'Gần đây',
        isPinned,
        unread: false,
        data: f,
      });
    });

    return list.sort((a, b) => {
      const aPin = a.isPinned ? 1 : 0;
      const bPin = b.isPinned ? 1 : 0;
      return bPin - aPin;
    });
  }, [chatGroups, momentsWithComments, friendsList, pinnedChatIds, isFriendOnline]);

  const filteredConversations = useMemo(() => {
    return unifiedConversations.filter((item) => {
      if (hiddenChatIds.includes(item.id)) return false;
      if (messengerFilter === 'group' && item.type !== 'group') return false;
      if (messengerFilter === 'direct' && item.type !== 'friend') return false;
      if (messengerFilter === 'unread' && !item.unread) return false;

      if (messengerSearchQuery.trim()) {
        const q = messengerSearchQuery.toLowerCase();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchMsg = (item.lastMessage || '').toLowerCase().includes(q);
        return matchName || matchMsg;
      }
      return true;
    });
  }, [unifiedConversations, hiddenChatIds, messengerFilter, messengerSearchQuery]);

  const handleSelectConversation = (item: any) => {
    setShowMessengerDropdown(false);
    if (item.type === 'moment') {
      handleOpenMomentChat(item.data);
    } else {
      setChatMoment(null);
      setActiveMomentReply(null);
      openChat(item.data);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#18191A' : '#F5F0E8', position: 'relative' }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.layout}>
          {/* LEFT COLUMN - Navigation & Quick Menu */}
          <View style={styles.leftColumn}>
            <View style={styles.card}>
              <View style={styles.userProfileHeader}>
                <Avatar uri={(user as any)?.avatarUrl || (user as any)?.avatar} name={(user as any)?.fullName || 'User'} size={44} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {(user as any)?.fullName || 'Người dùng'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#059669', fontWeight: '700', marginTop: 2 }}>
                    🔥 Chuỗi {moodStreak || (user as any)?.streak || 2} ngày
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity style={[styles.menuItem, activeTab === 'feed' && styles.menuItemActive]} onPress={() => setActiveTab('feed')}>
                <Ionicons name="newspaper" size={20} color={activeTab === 'feed' ? "#059669" : "#64748B"} />
                <Text style={[styles.menuText, activeTab === 'feed' && styles.menuTextActive]}>Bảng tin</Text>
              </TouchableOpacity>

              {/* ĐOẠN CHAT (MESSENGER POPUP BUTTON) */}
              <TouchableOpacity
                style={[styles.menuItem, isMessengerOpen && styles.menuItemActive]}
                onPress={toggleMessenger}
                activeOpacity={0.75}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color={isMessengerOpen ? "#059669" : "#64748B"} />
                <Text style={[styles.menuText, isMessengerOpen && styles.menuTextActive]}>Đoạn chat</Text>
              </TouchableOpacity>

              {/* BẠN BÈ */}
              <TouchableOpacity style={[styles.menuItem, activeTab === 'friends' && styles.menuItemActive]} onPress={() => setActiveTab('friends')}>
                <Ionicons name="people" size={20} color={activeTab === 'friends' ? "#059669" : "#64748B"} />
                <Text style={[styles.menuText, activeTab === 'friends' && styles.menuTextActive]}>Bạn bè</Text>
              </TouchableOpacity>

              {/* TẠO NHÓM */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setNewGroupName('');
                  setNewGroupIcon('👥');
                  setSelectedFriendIds([]);
                  setShowCreateGroupModal(true);
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="person-add" size={20} color="#64748B" />
                <Text style={styles.menuText}>Tạo nhóm</Text>
              </TouchableOpacity>
            </View>

            {/* ĐIỂM DANH CẢM XÚC HÔM NAY (SVG ICONS & CHUỖI ĐIỂM DANH) */}
            <View style={[styles.card, styles.moodCheckinCard]}>
              <View style={styles.moodHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>✨</Text>
                  <Text style={styles.moodHeaderTitle}>Điểm danh ngay nào</Text>
                </View>
                <View style={[styles.moodStatusBadge, selectedMood && styles.moodStatusBadgeDone]}>
                  <Text style={[styles.moodStatusBadgeText, selectedMood && styles.moodStatusBadgeTextDone]}>
                    {selectedMood ? '✓ Đã điểm danh' : 'Điểm danh'}
                  </Text>
                </View>
              </View>

              {/* KHI ĐÃ ĐIỂM DANH HÔM NAY: Ẩn các icon, hiển thị trạng thái và chuỗi ngày */}
              {selectedMood ? (
                <View style={styles.checkedInBox}>
                  {/* Streak Banner */}
                  <View style={styles.streakBadgeContainer}>
                    <Text style={{ fontSize: 22 }}>🔥</Text>
                    <Text style={styles.streakBadgeText}>
                      Đã điểm danh {moodStreak} ngày liên tiếp
                    </Text>
                  </View>

                  {/* Hiển thị cảm xúc đã chọn */}
                  {(() => {
                    const curr = MOOD_CHECKIN_OPTIONS.find(m => m.id === selectedMood);
                    if (!curr) return null;
                    const MoodIcon = curr.Icon;
                    return (
                      <View style={[styles.chosenMoodRow, { backgroundColor: curr.bg, borderColor: curr.border }]}>
                        <View style={styles.chosenMoodIconBox}>
                          <MoodIcon size={36} color={curr.color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.chosenMoodLabel, { color: curr.color }]}>
                            Cảm xúc hôm nay: {curr.label}
                          </Text>
                          <Text style={styles.chosenMoodQuote}>
                            "{curr.quote}"
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  <View style={styles.checkedInFooter}>
                    <Text style={styles.checkedInNextDayHint}>
                      ⏰ Ngày mai bạn quay lại để tiếp tục điểm danh ngày thứ {moodStreak + 1} nhé!
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSelectedMood(null)}
                      style={styles.changeMoodBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.changeMoodBtnText}>Đổi lại</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* KHI CHƯA ĐIỂM DANH: Hiện 5 icon để chọn */
                <>
                  <Text style={styles.moodSubtitle}>
                    Chạm vào cảm xúc hôm nay để hoàn thành điểm danh ngày mới nha! ✨
                  </Text>

                  {/* 5 Nút Cảm xúc SVG */}
                  <View style={styles.moodButtonsRow}>
                    {MOOD_CHECKIN_OPTIONS.map((mood) => {
                      const MoodIcon = mood.Icon;
                      return (
                        <TouchableOpacity
                          key={mood.id}
                          style={styles.moodItemBtn}
                          onPress={() => handleSelectMood(mood.id)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.moodIconWrap}>
                            <MoodIcon size={32} color={mood.color} />
                          </View>
                          <Text style={styles.moodItemLabel} numberOfLines={1}>
                            {mood.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </View>

            {/* MẸO TÀI CHÍNH HÔM NAY (CARD TINH TẾ THAY THẾ DOCK CHAT RƯỜM RÀ) */}
            <View style={[styles.card, { marginTop: 4, backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderColor: isDark ? '#334155' : '#FDE68A' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Text style={{ fontSize: 16 }}>💡</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#F8FAFC' : '#92400E' }}>Mẹo hay hôm nay</Text>
              </View>
              <Text style={{ fontSize: 12, lineHeight: 18, color: isDark ? '#CBD5E1' : '#78350F' }}>
                Chia sẻ khoảnh khắc chi tiêu & chia bill minh bạch giúp bạn gắn kết cùng bạn bè và hình thành thói quen tài chính tích cực! ✨
              </Text>
            </View>
          </View>

        {/* MIDDLE COLUMN - Main Content */}
        <View style={styles.middleColumn}>
          {activeTab === 'friends' ? (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: isDark ? '#333' : '#F1F5F9', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, color: isDark ? '#FFF' : '#000' }}
                  placeholder="Nhập ID kết bạn..."
                  placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
                  value={friendIdInput}
                  onChangeText={setFriendIdInput}
                />
                <TouchableOpacity
                  style={{ backgroundColor: '#059669', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: isSendingRequest ? 0.7 : 1 }}
                  onPress={handleSendFriendRequest}
                  disabled={isSendingRequest}
                >
                  {isSendingRequest ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="person-add" size={18} color="#FFF" />}
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Thêm bạn</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#F1F5F9', marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: activeFriendSubTab === 'friends' ? 2 : 0, borderBottomColor: '#059669' }}
                  onPress={() => setActiveFriendSubTab('friends')}
                >
                  <Text style={{ fontWeight: '600', color: activeFriendSubTab === 'friends' ? '#059669' : (isDark ? '#CBD5E1' : '#64748B') }}>Danh sách</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: activeFriendSubTab === 'requests' ? 2 : 0, borderBottomColor: '#059669' }}
                  onPress={() => setActiveFriendSubTab('requests')}
                >
                  <Text style={{ fontWeight: '600', color: activeFriendSubTab === 'requests' ? '#059669' : (isDark ? '#CBD5E1' : '#64748B') }}>
                    Lời mời {friendRequests.length > 0 && `(${friendRequests.length})`}
                  </Text>
                </TouchableOpacity>
              </View>

              {isFriendsLoading ? (
                <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 32 }} />
              ) : activeFriendSubTab === 'friends' ? (
                friendsList.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 32 }}>Chưa có bạn bè nào</Text>
                ) : (
                  friendsList.map((item, index) => {
                    const name = item.fullName || item.email || 'N';
                    const isOnline = isFriendOnline(item);
                    const activeText = formatMessengerActiveTime(item, isOnline);
                    return (
                      <View key={item._id || item.id || index} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: isDark ? '#333' : '#F8FAFC', borderRadius: 12, marginBottom: 8 }}>
                        <Avatar uri={item.avatarUrl || item.avatar} name={name} size={48} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontWeight: '700', fontSize: 16, color: isDark ? '#F1F5F9' : '#1E293B' }}>{name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <View
                              style={{
                                width: 7.5,
                                height: 7.5,
                                borderRadius: 4,
                                backgroundColor: isOnline ? '#10B981' : '#94A3B8',
                              }}
                            />
                            <Text style={{ color: isOnline ? '#10B981' : (isDark ? '#94A3B8' : '#64748B'), fontSize: 13, fontWeight: isOnline ? '700' : '500' }}>
                              {activeText}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#475569' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}
                            onPress={() => openChat(item)}
                          >
                            <Ionicons name="chatbubble-ellipses" size={20} color={isDark ? '#CBD5E1' : '#475569'} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', justifyContent: 'center', alignItems: 'center' }}
                            onPress={() => handleRemoveFriend(item, name)}
                          >
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )
              ) : (
                friendRequests.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: '#94A3B8', marginVertical: 32 }}>Không có lời mời nào</Text>
                ) : (
                  friendRequests.map((item, index) => {
                    const requester = item.requester || {};
                    const name = requester.fullName || requester.email || 'Người dùng';
                    return (
                      <View key={item._id || item.id || index} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: isDark ? '#333' : '#F8FAFC', borderRadius: 12, marginBottom: 8 }}>
                        <Avatar uri={requester.avatarUrl || requester.avatar} name={name} size={48} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontWeight: '700', fontSize: 16, color: isDark ? '#F1F5F9' : '#1E293B' }}>{name}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#059669' }}
                            onPress={() => handleRespondFriendRequest(item._id || item.id, 'accepted')}
                          >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Duyệt</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: isDark ? '#475569' : '#E2E8F0' }}
                            onPress={() => handleRespondFriendRequest(item._id || item.id, 'rejected')}
                          >
                            <Text style={{ color: isDark ? '#F1F5F9' : '#475569', fontWeight: '600' }}>Xóa</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )
              )}
            </View>
          ) : (
            <>
              {/* Interactive Composer Card */}
              <View style={styles.composerCard}>
                <View style={styles.composerHeader}>
                  <Avatar uri={(user as any)?.avatarUrl || (user as any)?.avatar} name={(user as any)?.fullName || 'User'} size={40} />
                  <TouchableOpacity
                    style={styles.composerInputBox}
                    onPress={() => handleOpenCreate('text')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.composerPlaceholder} numberOfLines={1}>
                      {(user as any)?.fullName || 'Bạn'} ơi, hôm nay có khoảnh khắc chi tiêu gì thú vị không? ✨
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.composerSendBtn}
                    onPress={() => handleOpenCreate('text')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="sparkles" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text style={styles.composerSendBtnText}>Đăng bài</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.composerDivider} />

                {/* Quick Action Chips */}
                <View style={styles.composerQuickRow}>
                  <TouchableOpacity
                    style={styles.composerQuickChip}
                    onPress={() => handleOpenCreate('photo')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="images" size={16} color="#059669" />
                    <Text style={styles.composerQuickChipText}>Thêm ảnh</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.composerQuickChip}
                    onPress={() => handleOpenCreate('text', '☕ Cà phê chill')}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14 }}>☕</Text>
                    <Text style={styles.composerQuickChipText}>Cà phê chill</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.composerQuickChip}
                    onPress={() => handleOpenCreate('text', '🍜 Ăn ngon cùng bạn')}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14 }}>🍜</Text>
                    <Text style={styles.composerQuickChipText}>Ăn ngon</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.composerQuickChip}
                    onPress={() => handleOpenCreate('text', '✨ Đời thường vui vẻ')}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14 }}>💰</Text>
                    <Text style={styles.composerQuickChipText}>Tiết kiệm</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.composerQuickChip}
                    onPress={() => handleOpenCreate('text', '🏖️ Du lịch & Phượt')}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14 }}>🏖️</Text>
                    <Text style={styles.composerQuickChipText}>Du lịch</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Feed List or Rich Community Empty State */}
              {loading ? (
                <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />
              ) : moments.length === 0 ? (
                <View style={styles.emptyHeroCard}>
                  <View style={styles.emptyHeroBadge}>
                    <Ionicons name="earth" size={32} color="#059669" />
                  </View>
                  <Text style={styles.emptyHeroTitle}>
                    Bảng tin Bạn bè đang chờ khoảnh khắc từ bạn! ✨
                  </Text>
                  <Text style={styles.emptyHeroSubtitle}>
                    Chia sẻ một ly cà phê sáng, bữa cơm nhà ấm cúng tiết kiệm, hay khoảnh khắc mua sắm để bạn bè cùng thả tim và cổ vũ chuỗi ngày của bạn nhé!
                  </Text>

                  <View style={styles.emptyHeroActionRow}>
                    <TouchableOpacity
                      style={styles.emptyHeroPrimaryBtn}
                      onPress={() => handleOpenCreate('photo')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="camera" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.emptyHeroPrimaryBtnText}>Đăng khoảnh khắc đầu tiên</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.emptyHeroSecondaryBtn}
                      onPress={() => setActiveTab('friends')}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="people" size={16} color="#059669" style={{ marginRight: 6 }} />
                      <Text style={styles.emptyHeroSecondaryBtnText}>Danh sách bạn bè</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Gợi ý cảm hứng bài đăng mẫu */}
                  <View style={styles.emptyDemoSection}>
                    <View style={styles.emptyDemoHeader}>
                      <Ionicons name="bulb-outline" size={15} color="#D97706" />
                      <Text style={styles.emptyDemoHeaderText}>Gợi ý cảm hứng bài đăng mẫu:</Text>
                    </View>
                    <View style={styles.emptyDemoCardsRow}>
                      <TouchableOpacity
                        style={styles.emptyDemoCard}
                        onPress={() => handleOpenCreate('text', '☕ Cà phê chill')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.emptyDemoCardEmoji}>☕</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.emptyDemoCardTitle}>Cà phê chill sáng sớm</Text>
                          <Text style={styles.emptyDemoCardDesc} numberOfLines={2}>
                            "Góc quán quen, ngắm phố phường thảnh thơi nạp năng lượng 🌿"
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.emptyDemoCard}
                        onPress={() => handleOpenCreate('text', '🍜 Ăn ngon cùng bạn')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.emptyDemoCardEmoji}>🍱</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.emptyDemoCardTitle}>Nấu ăn tại nhà tiết kiệm</Text>
                          <Text style={styles.emptyDemoCardDesc} numberOfLines={2}>
                            "Tự nấu cơm hộp mang đi làm, vừa ngon lành vừa tiết kiệm 60k ✨"
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                moments.map(post => (
                  <WebMomentCard
                    key={post.id}
                    item={post}
                    currentUserId={myId}
                    onReact={handleReact}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onOpenChat={(item) => handleOpenMomentChat(item)}
                    onViewReactions={handleViewReactions}
                  />
                ))
              )}
            </>
          )}
        </View>

        {/* RIGHT COLUMN - Standees & Gợi ý kết bạn */}
        {activeTab === 'feed' && width >= 1150 && (
          <View style={styles.rightColumn}>
            {/* 1. STANDEE NHẢY QUA NHẢY LẠI (HÔM NAY BẠN ĐÃ ÚN TRÀ SỮA / TÍCH LŨY CHƯA?) */}
            {(() => {
              const currentSlide = STANDEE_SLIDES[standeeIndex];
              return (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: isDark ? currentSlide.bgDark : currentSlide.bgLight,
                      borderColor: isDark ? currentSlide.borderDark : currentSlide.borderLight,
                      borderWidth: 1.5,
                      overflow: 'hidden',
                      position: 'relative',
                    },
                  ]}
                >
                  {/* Vòng sáng trang trí nền */}
                  <View
                    style={{
                      position: 'absolute',
                      right: -30,
                      top: -30,
                      width: 130,
                      height: 130,
                      borderRadius: 65,
                      backgroundColor: currentSlide.btnBg,
                      opacity: isDark ? 0.22 : 0.09,
                    }}
                  />

                  {/* Header: Standee Badge & Điều hướng (< >) */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : currentSlide.badgeBg,
                        paddingHorizontal: 10,
                        paddingVertical: 4.5,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: isDark ? currentSlide.borderDark : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '800',
                          color: isDark ? '#FFFFFF' : currentSlide.badgeColor,
                        }}
                      >
                        {currentSlide.badge}
                      </Text>
                    </View>

                    {/* Điều khiển chuyển Standee */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <TouchableOpacity
                        onPress={handlePrevStandee}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#000',
                          shadowOpacity: 0.05,
                          shadowRadius: 3,
                          elevation: 1,
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chevron-back" size={15} color={isDark ? '#E2E8F0' : '#475569'} />
                      </TouchableOpacity>

                      <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#94A3B8' : '#64748B', paddingHorizontal: 2 }}>
                        {standeeIndex + 1}/{STANDEE_SLIDES.length}
                      </Text>

                      <TouchableOpacity
                        onPress={handleNextStandee}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#000',
                          shadowOpacity: 0.05,
                          shadowRadius: 3,
                          elevation: 1,
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chevron-forward" size={15} color={isDark ? '#E2E8F0' : '#475569'} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Mascot Standee nhảy nhót với hiệu ứng Bounce lò xo */}
                  <Animated.View
                    style={{
                      opacity: standeeOpacityAnim,
                      transform: [{ scale: standeeBounceAnim }],
                      alignItems: 'center',
                      marginVertical: 4,
                    }}
                  >
                    <TouchableOpacity
                      onPress={triggerStandeeBounce}
                      activeOpacity={0.8}
                      style={{
                        position: 'relative',
                        width: 86,
                        height: 86,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {/* Vòng hào quang sáng nền */}
                      <View
                        style={{
                          position: 'absolute',
                          width: 76,
                          height: 76,
                          borderRadius: 38,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                          shadowColor: '#000',
                          shadowOpacity: 0.08,
                          shadowRadius: 8,
                          elevation: 2,
                        }}
                      />
                      {/* Mascot Emoji chính */}
                      <Text style={{ fontSize: 46 }}>{currentSlide.emoji}</Text>

                      {/* Mascot Emoji phụ gắn kèm */}
                      {currentSlide.secondaryEmoji && (
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 2,
                            right: 2,
                            backgroundColor: '#FFFFFF',
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#000',
                            shadowOpacity: 0.15,
                            shadowRadius: 4,
                            elevation: 2,
                          }}
                        >
                          <Text style={{ fontSize: 16 }}>{currentSlide.secondaryEmoji}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>

                  {/* Tiêu đề & Thông điệp vui vẻ */}
                  <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 14 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '800',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                        textAlign: 'center',
                        lineHeight: 22,
                      }}
                    >
                      {currentSlide.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12.5,
                        color: isDark ? '#CBD5E1' : '#475569',
                        textAlign: 'center',
                        marginTop: 6,
                        lineHeight: 18,
                        paddingHorizontal: 4,
                      }}
                    >
                      {currentSlide.subtitle}
                    </Text>
                  </View>

                  {/* Nút hành động chính */}
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      backgroundColor: currentSlide.btnBg,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      shadowColor: currentSlide.btnBg,
                      shadowOpacity: 0.25,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                    onPress={() => {
                      handleOpenCreate('text', currentSlide.category);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
                      {currentSlide.btnText}
                    </Text>
                  </TouchableOpacity>

                  {/* Dãy chấm chỉ số slide (Dots indicator) */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      marginTop: 14,
                    }}
                  >
                    {STANDEE_SLIDES.map((_, idx) => {
                      const isActive = idx === standeeIndex;
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setStandeeIndex(idx)}
                          style={{
                            width: isActive ? 22 : 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: isActive
                              ? currentSlide.btnBg
                              : isDark
                              ? 'rgba(255,255,255,0.2)'
                              : '#CBD5E1',
                          }}
                          activeOpacity={0.8}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })()}

            {/* 2. MẸO TÀI CHÍNH & THỬ THÁCH TIẾT KIỆM THỰC TẾ */}
            <View style={styles.card}>
              {/* Header: Tiêu đề & Nút Đổi mẹo */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="bulb" size={16} color="#059669" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                    Mẹo tài chính mỗi ngày
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleNextTip}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 9,
                    paddingVertical: 4.5,
                    borderRadius: 12,
                    backgroundColor: isDark ? '#334155' : '#F1F5F9',
                  }}
                  accessibilityLabel="Đổi mẹo tài chính ngẫu nhiên"
                >
                  <Ionicons name="dice-outline" size={14} color="#059669" />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#059669' }}>
                    Đổi mẹo
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Thẻ Mẹo chi tiết */}
              {(() => {
                const currentTip = FINANCIAL_TIPS[tipIndex];
                return (
                  <View
                    style={{
                      borderRadius: 14,
                      padding: 12,
                      backgroundColor: isDark ? '#1E293B' : currentTip.badgeBg,
                      borderWidth: 1,
                      borderColor: isDark ? '#334155' : 'rgba(5, 150, 105, 0.15)',
                      marginBottom: 16,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 6 }}>
                        <Ionicons name={currentTip.icon} size={15} color={currentTip.badgeColor} />
                        <Text
                          style={{ fontSize: 13.5, fontWeight: '800', color: isDark ? '#F8FAFC' : '#0F172A' }}
                          numberOfLines={1}
                        >
                          {currentTip.title}
                        </Text>
                      </View>
                      <View
                        style={{
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: currentTip.badgeColor }}>
                          {currentTip.category}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 12, lineHeight: 18, color: isDark ? '#CBD5E1' : '#334155' }}>
                      {currentTip.content}
                    </Text>

                    {currentTip.actionHint && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                        <Ionicons name="sparkles" size={12} color="#059669" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                          {currentTip.actionHint}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Đường phân cách */}
              <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9', marginBottom: 14 }} />

              {/* Phần 2: Thử thách tiết kiệm tuần này */}
              {(() => {
                const challenge = SAVING_CHALLENGES[currentChallengeIndex];
                const daysCompleted = challengeProgress.length;
                const isCompleted = daysCompleted >= challenge.targetDays;
                const progressPercent = Math.min(100, Math.round((daysCompleted / challenge.targetDays) * 100));
                const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

                return (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 18 }}>{challenge.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: isDark ? '#F8FAFC' : '#0F172A' }} numberOfLines={1}>
                            Thử thách tuần này
                          </Text>
                          <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B' }} numberOfLines={1}>
                            {challenge.title}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={{
                          paddingHorizontal: 7,
                          paddingVertical: 3,
                          borderRadius: 8,
                          backgroundColor: isCompleted ? '#DCFCE7' : (isDark ? '#334155' : '#F1F5F9'),
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: '800',
                            color: isCompleted ? '#059669' : (isDark ? '#94A3B8' : '#64748B'),
                          }}
                        >
                          {isCompleted ? '✓ Hoàn thành' : `${daysCompleted}/${challenge.targetDays} ngày`}
                        </Text>
                      </View>
                    </View>

                    {/* Thanh tiến độ */}
                    <View style={{ width: '100%', height: 6, borderRadius: 3, backgroundColor: isDark ? '#334155' : '#F1F5F9', overflow: 'hidden', marginVertical: 8 }}>
                      <View
                        style={{
                          width: `${progressPercent}%`,
                          height: '100%',
                          backgroundColor: isCompleted ? '#10B981' : '#059669',
                          borderRadius: 3,
                        }}
                      />
                    </View>

                    {/* Dãy nút check-in các ngày trong tuần (T2 - CN) */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      {DAYS_OF_WEEK.map((day, idx) => {
                        const isChecked = challengeProgress.includes(idx);
                        return (
                          <TouchableOpacity
                            key={day}
                            onPress={() => handleToggleChallengeDay(idx)}
                            activeOpacity={0.7}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: isChecked
                                ? '#059669'
                                : isDark
                                ? '#1E293B'
                                : '#F8FAFC',
                              borderWidth: 1,
                              borderColor: isChecked
                                ? '#059669'
                                : isDark
                                ? '#334155'
                                : '#E2E8F0',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '800',
                                color: isChecked ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B',
                                marginBottom: isChecked ? 4 : 0,
                              }}
                            >
                              {day}
                            </Text>
                            {isChecked && (
                              <View style={{ position: 'absolute', bottom: 2 }}>
                                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={{ fontSize: 10.5, color: isDark ? '#64748B' : '#94A3B8', textAlign: 'center', marginTop: 9 }}>
                      Chạm vào các ngày để check-in hoàn thành thử thách ✨
                    </Text>
                  </View>
                );
              })()}
            </View>
          </View>
        )}
      </View>

      {/* Modals from FriendsFeedScreen */}
      <MomentFormModal
        visible={showCreate}
        onClose={() => { setShowCreate(false); setEditingMoment(null); setInitialAction(undefined); setInitialCategory(undefined); }}
        onDone={() => {
          loadData();
          setShowCreate(false);
          setEditingMoment(null);
          setInitialAction(undefined);
          setInitialCategory(undefined);
          addNotification({
            type: 'moment',
            title: 'Đã đăng thành công khoảnh khắc chi tiêu! 📸✨',
            message: 'Khoảnh khắc chi tiêu mới của bạn đã được đăng tải thành công lên bảng tin bạn bè.',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            metadata: { targetTab: 'feed' },
          });
        }}
        editingItem={editingMoment}
        initialAction={initialAction}
        initialCategory={initialCategory}
      />

      {/* Modal Danh sách thả cảm xúc */}
      <Modal visible={showReactionsModal} transparent animationType="fade" onRequestClose={() => setShowReactionsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.reactionsModalContent}>
            <View style={styles.reactionsModalHeader}>
              <Text style={styles.reactionsModalTitle}>Người đã bày tỏ cảm xúc</Text>
              <TouchableOpacity onPress={() => setShowReactionsModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {isLoadingReactions ? (
                <Text style={{ textAlign: 'center', marginVertical: 20, color: '#94A3B8' }}>Đang tải...</Text>
              ) : reactedUsers.length === 0 ? (
                <Text style={{ textAlign: 'center', marginVertical: 20, color: '#94A3B8' }}>Chưa có ai bày tỏ cảm xúc</Text>
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

      </ScrollView>

      {/* MODAL TẠO NHÓM TRÒ CHUYỆN */}
      <Modal
        visible={showCreateGroupModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop tap to close */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowCreateGroupModal(false)}
          />

          <View
            style={[
              styles.createGroupDialog,
              { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', zIndex: 10 },
            ]}
          >
            {/* Header */}
            <View style={styles.dialogHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.dialogIconBadge}>
                  <Ionicons name="people" size={18} color="#059669" />
                </View>
                <Text style={[styles.dialogTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                  Tạo nhóm trò chuyện mới
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateGroupModal(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Tên nhóm */}
            <Text style={styles.dialogFieldLabel}>Tên nhóm:</Text>
            <TextInput
              style={[
                styles.dialogInput,
                {
                  color: isDark ? '#FFFFFF' : '#0F172A',
                  borderColor: isDark ? '#334155' : '#CBD5E1',
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                },
              ]}
              placeholder="Đặt tên nhóm (vd: Hội Cà phê ☕, Chia tiền trọ 🏠...)"
              placeholderTextColor="#94A3B8"
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoCapitalize="words"
            />

            {/* Chọn biểu tượng nhóm */}
            <Text style={styles.dialogFieldLabel}>Chọn biểu tượng nhóm (Vector SVG):</Text>
            <View style={styles.groupIconPickerRow}>
              {GROUP_ICONS_LIST.map((item) => {
                const isSelected = newGroupIcon === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.groupIconChoiceBtn,
                      isSelected && styles.groupIconChoiceBtnActive,
                    ]}
                    onPress={() => setNewGroupIcon(item.id)}
                    activeOpacity={0.75}
                  >
                    <GroupIconSvg name={item.id} size={22} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Chọn thành viên từ bạn bè */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 6 }}>
              <Text style={styles.dialogFieldLabel}>Chọn bạn bè vào nhóm:</Text>
              <Text style={{ fontSize: 11.5, color: '#059669', fontWeight: '700' }}>
                Đã chọn ({selectedFriendIds.length})
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 180, marginBottom: 10 }} showsVerticalScrollIndicator={false}>
              {friendsList.length === 0 ? (
                <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginVertical: 16 }}>
                  Bạn chưa có bạn bè để thêm vào nhóm
                </Text>
              ) : (
                friendsList.map((f: any) => {
                  const fId = String(f._id || f.id || '');
                  const fName = f.fullName || f.email || 'Bạn bè';
                  const isChecked = selectedFriendIds.includes(fId);

                  return (
                    <TouchableOpacity
                      key={fId}
                      style={[
                        styles.groupFriendSelectRow,
                        isChecked && { backgroundColor: isDark ? '#334155' : '#ECFDF5' },
                      ]}
                      onPress={() => {
                        setSelectedFriendIds((prev) =>
                          isChecked ? prev.filter((id) => id !== fId) : [...prev, fId]
                        );
                      }}
                      activeOpacity={0.75}
                    >
                      <Avatar uri={f.avatarUrl || f.avatar} name={fName} size={34} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: isDark ? '#FFFFFF' : '#0F172A' }}>
                          {fName}
                        </Text>
                        <Text style={{ fontSize: 11, color: isFriendOnline(f) ? '#10B981' : '#64748B', fontWeight: isFriendOnline(f) ? '700' : '500' }}>
                          {formatMessengerActiveTime(f, isFriendOnline(f))}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.checkboxCircle,
                          isChecked && { backgroundColor: '#059669', borderColor: '#059669' },
                        ]}
                      >
                        {isChecked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Nút Tạo nhóm */}
            <View style={styles.dialogButtonRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setShowCreateGroupModal(false)}
              >
                <Text style={{ color: '#64748B', fontWeight: '700', fontSize: 13 }}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dialogSaveBtn,
                  { backgroundColor: '#059669' },
                ]}
                onPress={handleCreateGroup}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                  Tạo nhóm ngay
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Messenger-style Mini Chat Popups (Góc dưới bên phải) */}
      <MomentChatModal
        visible={!!chatMoment}
        onClose={() => setChatMoment(null)}
        moment={chatMoment}
        currentUserId={myId}
        onCommentAdded={handleCommentAdded}
        onRefresh={loadData}
      />


    </View>
  );
};

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#18191A' : '#F5F0E8',
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
    backgroundColor: isDark ? '#1E293B' : '#F5F0E8',
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
  contentContainer: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  layout: {
    flexDirection: 'row',
    width: '100%',
    gap: 24,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftColumn: {
    width: 320,
    minWidth: 260,
    position: 'sticky',
    top: 20,
    maxHeight: 'calc(100vh - 100px)',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    scrollbarWidth: 'none',
  } as any,
  middleColumn: {
    flex: 1,
    minWidth: 0,
  },
  rightColumn: {
    width: 340,
    minWidth: 280,
    position: 'sticky',
    top: 20,
    maxHeight: 'calc(100vh - 100px)',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    scrollbarWidth: 'none',
  } as any,
  card: {
    backgroundColor: isDark ? '#242526' : '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: isDark ? '#3E4042' : '#E8E0D5',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: isDark ? '#E4E6EB' : '#050505',
  },
  userBadge: {
    fontSize: 13,
    color: isDark ? '#B0B3B8' : '#65676B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: isDark ? '#3E4042' : '#E4E6EB',
    marginVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#E6F4EA',
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#E4E6EB' : '#050505',
    marginLeft: 12,
  },
  menuTextActive: {
    color: '#059669',
  },
  // ─── Composer Card Styles ──────────────────────────────────────────
  composerCard: {
    backgroundColor: isDark ? '#242526' : '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: isDark ? '#3E4042' : '#E8E0D5',
    marginBottom: 16,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  composerInputBox: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: isDark ? '#3A3B3C' : '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: isDark ? '#4E4F50' : '#E2E8F0',
  },
  composerPlaceholder: {
    color: isDark ? '#94A3B8' : '#64748B',
    fontSize: 13.5,
  },
  composerSendBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    marginLeft: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  composerSendBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  composerDivider: {
    height: 1,
    backgroundColor: isDark ? '#3E4042' : '#F1F5F9',
    marginTop: 14,
    marginBottom: 10,
  },
  composerQuickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  composerQuickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: isDark ? '#3A3B3C' : '#F1F5F9',
  },
  composerQuickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#CBD5E1' : '#475569',
  },
  // ─── Empty Hero Card Styles ─────────────────────────────────────────
  emptyHeroCard: {
    backgroundColor: isDark ? '#242526' : '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? '#3E4042' : '#E8E0D5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  emptyHeroBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: isDark ? '#F1F5F9' : '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHeroSubtitle: {
    fontSize: 13.5,
    color: isDark ? '#94A3B8' : '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 480,
    marginBottom: 20,
  },
  emptyHeroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  emptyHeroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  emptyHeroPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  emptyHeroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#334155' : '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  emptyHeroSecondaryBtnText: {
    color: '#059669',
    fontSize: 13.5,
    fontWeight: '700',
  },
  emptyDemoSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: isDark ? '#3E4042' : '#F1F5F9',
    paddingTop: 16,
  },
  emptyDemoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  emptyDemoHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  emptyDemoCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyDemoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#E2E8F0',
  },
  emptyDemoCardEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  emptyDemoCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: isDark ? '#F1F5F9' : '#0F172A',
  },
  emptyDemoCardDesc: {
    fontSize: 11,
    color: isDark ? '#94A3B8' : '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  // ─── Right Column Widget Styles ─────────────────────────────────────
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  widgetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: isDark ? '#E4E6EB' : '#0F172A',
  },
  widgetBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  widgetBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#047857',
  },
  myStreakBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#1E293B' : '#FFFBEB',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  myStreakIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myStreakTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#92400E',
  },
  myStreakSub: {
    fontSize: 10.5,
    color: '#B45309',
  },
  myStreakCountPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  myStreakCountText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#334155' : '#F1F5F9',
  },
  leaderboardRank: {
    fontSize: 13,
    width: 24,
    textAlign: 'center',
  },
  leaderboardName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: isDark ? '#F1F5F9' : '#0F172A',
  },
  leaderboardSub: {
    fontSize: 11,
    color: '#D97706',
    marginTop: 1,
    fontWeight: '600',
  },
  cheerBtn: {
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cheerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#CBD5E1' : '#475569',
  },
  trendingList: {
    gap: 6,
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
  },
  trendingIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: isDark ? '#334155' : '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingTag: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
  },
  trendingCount: {
    fontSize: 11,
    color: isDark ? '#94A3B8' : '#64748B',
  },
  // ─── Mood Check-in Widget Styles ─────────────────────────────────
  moodCheckinCard: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderColor: isDark ? '#334155' : '#E2E8F0',
    padding: 14,
  },
  moodHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  moodHeaderTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: isDark ? '#F1F5F9' : '#0F172A',
  },
  moodStatusBadge: {
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#E2E8F0',
  },
  moodStatusBadgeDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  moodStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#CBD5E1' : '#64748B',
  },
  moodStatusBadgeTextDone: {
    color: '#047857',
    fontWeight: '800',
  },
  moodSubtitle: {
    fontSize: 11,
    color: isDark ? '#94A3B8' : '#64748B',
    marginBottom: 12,
    lineHeight: 15,
  },
  moodButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 10,
  },
  moodItemBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
    borderWidth: 1.5,
    borderColor: isDark ? '#334155' : '#E2E8F0',
    position: 'relative',
  },
  moodIconWrap: {
    marginBottom: 4,
  },
  moodItemLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: isDark ? '#94A3B8' : '#64748B',
    textAlign: 'center',
  },
  moodActiveDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  checkedInBox: {
    paddingTop: 4,
  },
  streakBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: isDark ? '#334155' : '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  streakBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EA580C',
  },
  chosenMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  chosenMoodIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chosenMoodLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  chosenMoodQuote: {
    fontSize: 11.5,
    color: isDark ? '#CBD5E1' : '#475569',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  checkedInFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  checkedInNextDayHint: {
    fontSize: 11,
    color: isDark ? '#94A3B8' : '#64748B',
    flex: 1,
    marginRight: 8,
  },
  changeMoodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
  },
  changeMoodBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#CBD5E1' : '#475569',
  },
  // ─── Chat Badges & Headers ────────────────────────────────────────
  chatTotalBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  chatTotalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  chatSectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  postChatMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  commentCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  commentCountPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  tipCard: {
    backgroundColor: isDark ? '#2D2310' : '#FEFCE8',
    borderColor: '#FEF08A',
  },
  tipCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  tipCardBody: {
    fontSize: 11.5,
    color: isDark ? '#FDE68A' : '#78350F',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  topTabBar: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#242526' : '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDark ? '#3E4042' : '#E8E0D5',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  topTabBtnActive: {
    backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  topTabBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: isDark ? '#CBD5E1' : '#64748B',
  },
  topTabBtnTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  tabBadgeFrog: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabBadgeRed: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chatFrameCard: {
    height: Platform.OS === 'web' ? ('calc(100vh - 120px)' as any) : 750,
    backgroundColor: isDark ? '#242526' : '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDark ? '#3E4042' : '#E8E0D5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  quickChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    marginTop: 4,
  },
  frogAvatarBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  quickChatName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: isDark ? '#F1F5F9' : '#0F172A',
  },
  quickChatSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  chatPillBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  chatPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  chatFilterRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
    backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
    padding: 3,
    borderRadius: 10,
  },
  chatFilterChip: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatFilterChipActive: {
    backgroundColor: isDark ? '#334155' : '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chatFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#64748B',
  },
  chatFilterChipTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  chatHeaderAddGroupBtn: {
    padding: 2,
  },
  createGroupMiniBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGroupPrompt: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  emptyGroupPromptText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#047857',
    marginTop: 4,
    textAlign: 'center',
  },
  createGroupDialog: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  dialogIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogFieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 6,
  },
  dialogInput: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    fontSize: 13.5,
    marginBottom: 6,
  },
  groupIconPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  groupIconChoiceBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  groupIconChoiceBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  groupFriendSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  dialogCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatItemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatPinBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  chatMoreBtn: {
    padding: 3,
    borderRadius: 6,
  },
  contextMenuCard: {
    position: 'absolute',
    width: 220,
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 12,
    borderWidth: 1,
    zIndex: 9999,
  },
  contextMenuHeader: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  contextMenuTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  contextMenuSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  contextMenuItemText: {
    fontSize: 12.5,
    fontWeight: '600',
  },

  // ─── STYLES CHO FEED TOP BAR & MESSENGER DROPDOWN (FACEBOOK STYLE) ───
  feedTopBar: {
    width: '100%',
    maxWidth: 1360,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  feedTopBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedTopBarTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: isDark ? '#F8FAFC' : '#0F172A',
    letterSpacing: -0.3,
  },
  feedTopBarSub: {
    fontSize: 12,
    fontWeight: '500',
    color: isDark ? '#94A3B8' : '#64748B',
  },
  feedTopBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  messengerHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#242526' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? '#3E4042' : '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  messengerHeaderBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  messengerHeaderBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: isDark ? '#F1F5F9' : '#0F172A',
  },
  messengerHeaderBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messengerHeaderBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  createPostQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  createPostQuickBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  dropdownBackdrop: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
    backgroundColor: 'transparent',
  },
  messengerDropdownCard: {
    position: 'fixed' as any,
    top: 68,
    right: 24,
    width: 380,
    maxHeight: 560,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 12,
    borderWidth: 1,
    borderColor: isDark ? '#3E4042' : '#E4E6EB',
    zIndex: 9999,
    overflow: 'hidden',
  },
  messengerDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  messengerDropdownTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  dropdownHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: isDark ? '#3A3B3C' : '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messengerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#3A3B3C' : '#F0F2F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  messengerSearchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
    outlineWidth: 0 as any,
  },
  messengerFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  messengerFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: isDark ? '#3A3B3C' : '#F0F2F5',
  },
  messengerFilterChipActive: {
    backgroundColor: '#059669',
  },
  messengerFilterText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#64748B',
  },
  messengerFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  messengerConversationsScroll: {
    maxHeight: 380,
    paddingHorizontal: 8,
  },
  messengerChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  messengerGroupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDark ? '#3A3B3C' : '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messengerChatName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  messengerChatTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  messengerChatSnippet: {
    fontSize: 12.5,
    flex: 1,
  },
  messengerUnreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#059669',
    marginLeft: 6,
  },
  messengerDropdownFooter: {
    borderTopWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  contactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '700',
  },
  messengerNavBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messengerNavBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
