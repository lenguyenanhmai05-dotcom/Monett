import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Animated, Modal, Dimensions, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getMomentsFeedApi, reactMomentApi, getMomentReactionsApi, deleteMomentApi, normalizeAvatarUrl, getFriendsApi, getFriendRequestsApi, respondFriendRequestApi, removeFriendApi, sendFriendRequestApi } from '../../services/api';
import { MomentFormModal, MomentChatModal, MomentItem, MomentCommentItem } from '../mobile/FriendsFeedScreen';
import { ChatModal } from '../../components/ChatModal';

const EMOJIS = ['❤️', '🔥', '👏', '😂', '💸'];

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
          <Text style={cardStyles.caption}>{item.caption}</Text>
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
          <TouchableOpacity style={[cardStyles.reactBtn, item.myReaction && cardStyles.reactBtnActive]} onPress={toggleEmojis}>
            <Text style={{ fontSize: 16 }}>{item.myReaction || '😊'}</Text>
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
    borderRadius: 8, // Sharp web corners
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E4E6EB', // subtle gray
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#050505',
  },
  meta: {
    fontSize: 12,
    color: '#65676B',
    marginTop: 2,
  },
  menuBtn: {
    padding: 8,
  },
  photo: {
    width: '100%',
    height: 350,
    backgroundColor: '#000', // Black background for contain
  },
  captionOverlay: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
  },
  caption: {
    color: '#050505',
    fontSize: 15,
  },
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E4E6EB',
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


export const WebFeedScreen = () => {
  const { user } = useAuth();
  const { isDark, colors } = useTheme();
  const styles = getStyles(isDark, colors);

  const [moments, setMoments] = useState<MomentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingMoment, setEditingMoment] = useState<MomentItem | null>(null);
  const [chatMoment, setChatMoment] = useState<MomentItem | null>(null);
  const [activeChatFriend, setActiveChatFriend] = useState<any>(null);
  const [initialAction, setInitialAction] = useState<'photo' | 'tag' | 'text' | undefined>(undefined);

  const [friendIdInput, setFriendIdInput] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // New tab state
  const [activeTab, setActiveTab] = useState<'feed' | 'friends'>('feed');

  // Friends state
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [reactedUsers, setReactedUsers] = useState<any[]>([]);
  const [isLoadingReactions, setIsLoadingReactions] = useState(false);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [activeFriendSubTab, setActiveFriendSubTab] = useState<'friends' | 'requests'>('friends');

  const myId = (user as any)?._id || (user as any)?.id || '';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'feed') {
        const feedData = await getMomentsFeedApi().catch(() => []);
        setMoments((feedData as any) || []);
      } else if (activeTab === 'friends') {
        setIsFriendsLoading(true);
        const [f, r] = await Promise.all([
          getFriendsApi().catch(() => []),
          getFriendRequestsApi().catch(() => [])
        ]);
        setFriendsList(f || []);
        setFriendRequests(r || []);
        setIsFriendsLoading(false);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    const cleanedId = friendIdInput.trim();
    if (!cleanedId) {
      alert('Vui lòng nhập ID bạn bè');
      return;
    }
    setIsSendingRequest(true);
    try {
      await sendFriendRequestApi(cleanedId);
      alert('Đã gửi lời mời kết bạn thành công!');
      setFriendIdInput('');
    } catch (e: any) {
      alert('Lỗi: ' + (e.message || 'Không thể gửi lời mời'));
    } finally {
      setIsSendingRequest(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.layout}>
        {/* LEFT COLUMN - Navigation */}
        <View style={styles.leftColumn}>
          <View style={styles.card}>
            <View style={styles.userProfileHeader}>
              <Avatar uri={(user as any)?.avatarUrl || (user as any)?.avatar} name={(user as any)?.fullName || 'User'} size={44} />
              <View style={styles.userInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.userName} numberOfLines={1}>{(user as any)?.fullName || 'Người dùng'}</Text>
                  {((user as any)?.isPro || (user as any)?.package === 'pro') && (
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#059669',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      marginLeft: 8,
                      shadowColor: '#059669',
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2
                    }}>
                      <Ionicons name="star" size={10} color="#FDE047" style={{ marginRight: 3 }} />
                      <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>PRO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.userBadge}>@{((user as any)?.email || '').split('@')[0] || 'user'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={[styles.menuItem, activeTab === 'feed' && styles.menuItemActive]} onPress={() => setActiveTab('feed')}>
              <Ionicons name="home" size={20} color={activeTab === 'feed' ? "#059669" : "#64748B"} />
              <Text style={[styles.menuText, activeTab === 'feed' && styles.menuTextActive]}>Bảng tin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, activeTab === 'friends' && styles.menuItemActive]} onPress={() => setActiveTab('friends')}>
              <Ionicons name="people" size={20} color={activeTab === 'friends' ? "#059669" : "#64748B"} />
              <Text style={[styles.menuText, activeTab === 'friends' && styles.menuTextActive]}>Bạn bè ({friendsList.length})</Text>
            </TouchableOpacity>
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
                    return (
                      <View key={item._id || item.id || index} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: isDark ? '#333' : '#F8FAFC', borderRadius: 12, marginBottom: 8 }}>
                        <Avatar uri={item.avatarUrl || item.avatar} name={name} size={48} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontWeight: '700', fontSize: 16, color: isDark ? '#F1F5F9' : '#1E293B' }}>{name}</Text>
                          <Text style={{ color: '#D97706', fontSize: 13, marginTop: 4, fontWeight: '600' }}>
                            🔥 Chuỗi {item.streak || 1} ngày
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#475569' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}
                            onPress={() => setActiveChatFriend(item)}
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
              {/* Simple Composer */}
              <View style={styles.card}>
                <View style={[styles.composerHeader, { marginBottom: 0 }]}>
                  <Avatar uri={(user as any)?.avatarUrl || (user as any)?.avatar} name={(user as any)?.fullName || 'User'} size={36} />
                  <TouchableOpacity
                    style={styles.composerInputBox}
                    onPress={() => { setEditingMoment(null); setInitialAction('text'); setShowCreate(true); }}
                  >
                    <Text style={styles.composerPlaceholder}>Bạn đang nghĩ gì về tài chính hôm nay?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sendBtn, { marginLeft: 12, borderRadius: 20, paddingVertical: 10 }]}
                    onPress={() => { setEditingMoment(null); setInitialAction('text'); setShowCreate(true); }}
                  >
                    <Text style={styles.sendBtnText}>Đăng bài</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Feed List */}
              {loading ? (
                <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />
              ) : moments.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 40, color: '#64748B' }}>Chưa có bài đăng nào.</Text>
              ) : (
                moments.map(post => (
                  <WebMomentCard
                    key={post.id}
                    item={post}
                    currentUserId={myId}
                    onReact={handleReact}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onOpenChat={(item) => setChatMoment(item)}
                    onViewReactions={handleViewReactions}
                  />
                ))
              )}
            </>
          )}
        </View>
      </View>

      {/* Modals from FriendsFeedScreen */}
      <MomentFormModal
        visible={showCreate}
        onClose={() => { setShowCreate(false); setEditingMoment(null); setInitialAction(undefined); }}
        onDone={() => { loadData(); setEditingMoment(null); setInitialAction(undefined); }}
        editingItem={editingMoment}
        initialAction={initialAction}
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

      <MomentChatModal
        visible={!!chatMoment}
        onClose={() => setChatMoment(null)}
        moment={chatMoment}
        currentUserId={myId}
        onCommentAdded={handleCommentAdded}
        onRefresh={loadData}
      />

      <ChatModal
        visible={!!activeChatFriend}
        friend={activeChatFriend}
        onClose={() => setActiveChatFriend(null)}
      />
    </ScrollView>
  );
};

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#18191A' : '#F0F2F5', // Web-like background
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
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  layout: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 1400, // Expanded to fill more space
    paddingHorizontal: 24,
    gap: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  leftColumn: {
    width: 300, // Slightly wider sidebar
    position: 'sticky' as any,
    top: 20,
  },
  middleColumn: {
    flex: 1,
    maxWidth: 1000, // Expanded feed to fill space
  },
  card: {
    backgroundColor: isDark ? '#242526' : '#FFFFFF',
    borderRadius: 8, // Web-like sharp corners
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: isDark ? '#3E4042' : '#E4E6EB',
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
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  composerInputBox: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: isDark ? '#3A3B3C' : '#F0F2F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  composerPlaceholder: {
    color: isDark ? '#B0B3B8' : '#65676B',
    fontSize: 15,
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: isDark ? '#3E4042' : '#E4E6EB',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#B0B3B8' : '#65676B',
  },
  sendBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  sendBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDark ? '#E4E6EB' : '#050505',
    marginBottom: 12,
  },
  widgetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  widgetItemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  widgetItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: isDark ? '#E4E6EB' : '#050505',
  },
  widgetItemSub: {
    fontSize: 12,
    color: isDark ? '#B0B3B8' : '#65676B',
  },
  widgetFollowBtn: {
    backgroundColor: isDark ? '#3A3B3C' : '#E4E6EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  widgetFollowBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: isDark ? '#E4E6EB' : '#050505',
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#3A3B3C' : '#F0F2F5',
    padding: 10,
    borderRadius: 8,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: isDark ? '#E4E6EB' : '#050505',
  },
  challengeSub: {
    fontSize: 12,
    color: isDark ? '#B0B3B8' : '#65676B',
    marginTop: 2,
  },
});
