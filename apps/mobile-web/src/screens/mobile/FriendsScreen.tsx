import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-qr-code';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  getFriendsApi,
  getFriendRequestsApi,
  sendFriendRequestApi,
  respondFriendRequestApi,
  removeFriendApi,
  normalizeAvatarUrl,
} from '../../services/api';

export interface FriendItem {
  _id: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
  streak?: number;
}

interface FriendsScreenProps {
  onBack?: () => void;
  onNavigateToMessages?: () => void;
}

export const FriendsScreen: React.FC<FriendsScreenProps> = ({
  onBack,
  onNavigateToMessages,
}) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const { addNotification } = useNotifications();
  const isVi = language === 'vi';

  const myId = (user as any)?._id || (user as any)?.id || '';

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Tải danh sách bạn bè và lời mời kết bạn từ Server
  const loadData = useCallback(async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriendsApi().catch(() => []),
        getFriendRequestsApi().catch(() => []),
      ]);

      // Normalize dữ liệu bạn bè
      const normalizedFriends: FriendItem[] = ((friendsData as any) || [])
        .map((f: any) => {
          const friendObj =
            f.requester || f.recipient
              ? f.requester?._id === myId || f.requester?.id === myId
                ? f.recipient
                : f.requester
              : f;
          return {
            _id: friendObj?._id || friendObj?.id || '',
            fullName: friendObj?.fullName || (isVi ? 'Bạn bè' : 'Friend'),
            email: friendObj?.email || '',
            avatarUrl: normalizeAvatarUrl(friendObj?.avatarUrl),
            streak: friendObj?.streak || 1,
          };
        })
        .filter((f: FriendItem) => f._id && f._id !== myId);

      setFriends(normalizedFriends);
      setPendingRequests((requestsData as any) || []);
    } catch (err) {
      console.error('Error loading friends data:', err);
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

  // Tìm kiếm bạn bè theo tên hoặc email
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase().trim();
    return friends.filter(
      (f) =>
        f.fullName.toLowerCase().includes(q) ||
        (f.email && f.email.toLowerCase().includes(q))
    );
  }, [friends, searchQuery]);

  // Phản hồi lời mời kết bạn (Duyệt / Từ chối)
  const handleRespondRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await respondFriendRequestApi(requestId, status);
      addNotification({
        type: 'system',
        title: status === 'accepted' ? (isVi ? 'Đã kết bạn mới! 🎉' : 'New Friend! 🎉') : (isVi ? 'Đã từ chối lời mời' : 'Declined Request'),
        message: status === 'accepted' ? (isVi ? 'Hai bạn đã trở thành bạn bè trên Monett.' : 'You are now friends on Monett.') : (isVi ? 'Đã xóa lời mời kết bạn.' : 'Friend request removed.'),
        iconBg: status === 'accepted' ? '#DCFCE7' : '#F1F5F9',
        iconColor: status === 'accepted' ? '#059669' : '#64748B',
      });
      loadData();
    } catch (e: any) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', e?.message || (isVi ? 'Thao tác không thành công' : 'Operation failed'));
    }
  };

  // Xóa bạn bè
  const handleRemoveFriend = (friend: FriendItem) => {
    Alert.alert(
      isVi ? 'Hủy kết bạn' : 'Unfriend',
      isVi ? `Bạn có chắc muốn hủy kết bạn với ${friend.fullName} không?` : `Are you sure you want to unfriend ${friend.fullName}?`,
      [
        { text: isVi ? 'Hủy' : 'Cancel', style: 'cancel' },
        {
          text: isVi ? 'Xác nhận xóa' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriendApi(friend._id);
              setFriends((prev) => prev.filter((f) => f._id !== friend._id));
              Alert.alert('✅ ' + (isVi ? 'Thành công' : 'Success'), isVi ? 'Đã hủy kết bạn.' : 'Friend removed.');
            } catch (err: any) {
              Alert.alert(isVi ? 'Lỗi' : 'Error', err?.message || (isVi ? 'Không thể xóa bạn bè' : 'Could not remove friend'));
            }
          },
        },
      ]
    );
  };

  // Gửi lời mời kết bạn qua ID
  const handleSendFriendRequest = async () => {
    const targetId = friendIdInput.trim();
    if (!targetId) {
      Alert.alert(isVi ? 'Thông báo' : 'Notice', isVi ? 'Vui lòng nhập ID người dùng' : 'Please enter User ID');
      return;
    }
    if (targetId === myId) {
      Alert.alert(isVi ? 'Thông báo' : 'Notice', isVi ? 'Bạn không thể tự kết bạn với chính mình' : 'You cannot add yourself');
      return;
    }
    try {
      setIsSendingRequest(true);
      await sendFriendRequestApi(targetId);
      Alert.alert('✅ ' + (isVi ? 'Thành công' : 'Success'), isVi ? 'Đã gửi lời mời kết bạn!' : 'Friend request sent!');
      setFriendIdInput('');
      setShowInviteModal(false);
      loadData();
    } catch (e: any) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', e?.message || (isVi ? 'Không thể gửi lời mời kết bạn' : 'Failed to send request'));
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Copy ID
  const handleCopyMyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(myId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } else {
      Alert.alert(isVi ? 'ID của bạn' : 'Your ID', myId);
    }
  };

  // Chia sẻ liên kết mời
  const handleShare = async () => {
    try {
      await Share.share({
        message: isVi
          ? `Hãy kết bạn cùng tôi trên Monett để quản lý chi tiêu và thi đua chuỗi streak nhé! ID: ${myId}`
          : `Connect with me on Monett to track expenses and compete on streaks! ID: ${myId}`,
      });
    } catch (e) {
      // Ignored
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ================= 1. HEADER ROW ================= */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>

          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>{isVi ? 'Bạn bè' : 'Friends'}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{friends.length}</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              {isVi ? 'Danh sách bạn bè đã kết nối trên Monett' : 'Connected friends on Monett'}
            </Text>
          </View>
        </View>

        {/* Nút + Thêm bạn & Nút đóng X */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            style={styles.addFriendBtn}
            onPress={() => setShowInviteModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={16} color="#064E3B" style={{ marginRight: 6 }} />
            <Text style={styles.addFriendBtnText}>{isVi ? 'Thêm bạn' : 'Add'}</Text>
          </TouchableOpacity>

          {onBack && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#221D18" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ================= 2. THANH TÌM KIẾM ================= */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={isVi ? 'Tìm kiếm bạn bè theo tên hoặc email...' : 'Search friends by name or email...'}
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
        }
      >
        {/* ================= 3. LỜI MỜI KẾT BẠN ĐANG CHỜ (NẾU CÓ) ================= */}
        {pendingRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <View style={styles.requestsSectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="mail-unread" size={18} color="#D97706" />
                <Text style={styles.requestsSectionTitle}>
                  {isVi ? `Lời mời kết bạn (${pendingRequests.length})` : `Friend Requests (${pendingRequests.length})`}
                </Text>
              </View>
            </View>

            {pendingRequests.map((req, idx) => {
              const requester = req.requester || {};
              const reqName = requester.fullName || requester.email || (isVi ? 'Người dùng' : 'User');
              const reqAvatar = normalizeAvatarUrl(requester.avatarUrl);
              const reqId = req._id || req.id;

              return (
                <View key={reqId || idx} style={styles.requestCard}>
                  {reqAvatar ? (
                    <Image source={{ uri: reqAvatar }} style={styles.friendAvatar} />
                  ) : (
                    <View style={[styles.friendAvatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>{reqName.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}

                  <View style={styles.requestInfo}>
                    <Text style={styles.friendName} numberOfLines={1}>{reqName}</Text>
                    <Text style={styles.friendSub} numberOfLines={1}>{requester.email || (isVi ? 'Muốn kết nối cùng bạn' : 'Wants to connect')}</Text>
                  </View>

                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleRespondRequest(reqId, 'accepted')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                      <Text style={styles.acceptBtnText}>{isVi ? 'Duyệt' : 'Accept'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => handleRespondRequest(reqId, 'rejected')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={15} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ================= 4. DANH SÁCH BẠN BÈ ================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>
            {isVi ? 'DANH SÁCH BẠN BÈ' : 'ALL FRIENDS'}
          </Text>
          <Text style={styles.sectionCountText}>
            {filteredFriends.length} {isVi ? 'người' : 'friends'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>{isVi ? 'Đang tải danh sách bạn bè...' : 'Loading friends...'}</Text>
          </View>
        ) : filteredFriends.length === 0 ? (
          /* Empty State khi chưa có bạn bè */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="people-outline" size={40} color="#059669" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? (isVi ? 'Không tìm thấy bạn bè nào' : 'No matching friends') : (isVi ? 'Chưa có bạn bè nào' : 'No friends yet')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? (isVi ? 'Hãy thử tìm kiếm với từ khóa khác hoặc email khác.' : 'Try searching with a different name or email.')
                : (isVi
                  ? 'Kết nối bạn bè trên Monett để cùng chia sẻ chi tiêu, chia hóa đơn và thi đua chuỗi streak tiết kiệm! ✨'
                  : 'Connect with friends on Monett to share moments, split bills, and build streak together! ✨')}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setShowInviteModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="person-add" size={16} color="#064E3B" style={{ marginRight: 6 }} />
                <Text style={styles.emptyAddBtnText}>{isVi ? 'Thêm bạn bè ngay' : 'Add Friends Now'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredFriends.map((friend) => (
            <View key={friend._id} style={styles.friendCard}>
              {friend.avatarUrl ? (
                <Image source={{ uri: friend.avatarUrl }} style={styles.friendAvatar} />
              ) : (
                <View style={[styles.friendAvatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{friend.fullName.charAt(0).toUpperCase()}</Text>
                </View>
              )}

              <View style={styles.friendInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.friendName} numberOfLines={1}>{friend.fullName}</Text>
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakBadgeText}>🔥 {friend.streak || 1}</Text>
                  </View>
                </View>
                <Text style={styles.friendSub} numberOfLines={1}>
                  {friend.email || (isVi ? 'Bạn bè Monett' : 'Monett Friend')}
                </Text>
              </View>

              <View style={styles.friendActions}>
                {/* Nút Nhắn tin */}
                {onNavigateToMessages && (
                  <TouchableOpacity
                    style={styles.chatActionBtn}
                    onPress={onNavigateToMessages}
                    activeOpacity={0.8}
                    accessibilityLabel={isVi ? 'Nhắn tin' : 'Chat'}
                  >
                    <Ionicons name="chatbubbles" size={16} color="#047857" />
                    <Text style={styles.chatActionBtnText}>{isVi ? 'Nhắn tin' : 'Chat'}</Text>
                  </TouchableOpacity>
                )}

                {/* Nút Xóa bạn */}
                <TouchableOpacity
                  style={styles.deleteActionBtn}
                  onPress={() => handleRemoveFriend(friend)}
                  activeOpacity={0.7}
                  accessibilityLabel={isVi ? 'Hủy kết bạn' : 'Remove friend'}
                >
                  <Ionicons name="trash-outline" size={17} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ================= 5. MODAL MỜI & THÊM BẠN BÈ ================= */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalHeaderIcon}>
                  <Ionicons name="person-add" size={18} color="#047857" />
                </View>
                <Text style={styles.modalTitle}>{isVi ? 'Kết bạn mới' : 'Add New Friend'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowInviteModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Thêm qua User ID */}
              <View style={styles.addIdCard}>
                <Text style={styles.addIdLabel}>{isVi ? 'Nhập ID người dùng của bạn bè:' : 'Enter Friend User ID:'}</Text>
                <View style={styles.addIdInputRow}>
                  <TextInput
                    style={styles.addIdInput}
                    placeholder={isVi ? 'Dán mã ID (VD: 660f...)' : 'Paste User ID...'}
                    placeholderTextColor="#94A3B8"
                    value={friendIdInput}
                    onChangeText={setFriendIdInput}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.addIdSubmitBtn, isSendingRequest && { opacity: 0.7 }]}
                    onPress={handleSendFriendRequest}
                    disabled={isSendingRequest}
                    activeOpacity={0.8}
                  >
                    {isSendingRequest ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.addIdSubmitBtnText}>{isVi ? 'Kết bạn' : 'Add'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Ngăn cách hoặc quét QR */}
              <View style={styles.modalDivider}>
                <View style={styles.modalDividerLine} />
                <Text style={styles.modalDividerText}>{isVi ? 'HOẶC QUÉT MÃ QR CỦA BẠN' : 'OR SCAN YOUR QR'}</Text>
                <View style={styles.modalDividerLine} />
              </View>

              {/* QR Code cá nhân */}
              <View style={styles.qrContainer}>
                <View style={styles.qrBox}>
                  <QRCode value={myId || 'monett-user'} size={150} fgColor="#047857" />
                </View>

                <Text style={styles.myIdLabel}>{isVi ? 'Mã ID của bạn:' : 'Your User ID:'}</Text>
                <Text style={styles.myIdValue} numberOfLines={1}>{myId || 'loading...'}</Text>

                <TouchableOpacity style={styles.copyIdBtn} onPress={handleCopyMyId} activeOpacity={0.75}>
                  <Ionicons name={copySuccess ? 'checkmark' : 'copy-outline'} size={16} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.copyIdBtnText}>
                    {copySuccess ? (isVi ? 'Đã sao chép! ✅' : 'Copied! ✅') : (isVi ? 'Sao chép ID của bạn' : 'Copy ID')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
                  <Ionicons name="share-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.shareBtnText}>{isVi ? 'Chia sẻ liên kết kết bạn' : 'Share Invite Link'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  addFriendBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#064E3B',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#221D18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  requestsSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  requestsSectionHeader: {
    marginBottom: 10,
  },
  requestsSectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400E',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  requestInfo: {
    flex: 1,
    marginLeft: 10,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  declineBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0369A1',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  friendSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  streakBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  chatActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#047857',
  },
  deleteActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A7F3D0',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  modalSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  addIdCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  addIdLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  addIdInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addIdInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: '#0F172A',
  },
  addIdSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addIdSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  modalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  modalDividerText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  qrBox: {
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  myIdLabel: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 2,
  },
  myIdValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 12,
  },
  copyIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  copyIdBtnText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 13,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    width: '100%',
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14.5,
  },
});
