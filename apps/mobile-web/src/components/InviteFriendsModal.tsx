import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { EventMember } from '../services/eventsStorage';
import { getFriendsApi, normalizeAvatarUrl } from '../services/api';

const SafeInviteAvatar: React.FC<{ uri?: string; name: string; isDark: boolean; textPrimary: string }> = ({
  uri,
  name,
  isDark,
  textPrimary,
}) => {
  const [err, setErr] = useState(false);
  const normalized = normalizeAvatarUrl(uri);
  const colors = ['#059669', '#8B5CF6', '#F59E0B', '#EF4444', '#0EA5E9', '#EC4899', '#6366F1'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bg = colors[Math.abs(hash) % colors.length];

  useEffect(() => {
    setErr(false);
  }, [uri]);

  if (normalized && !err) {
    return (
      <Image
        source={{ uri: normalized }}
        style={styles.avatarImg}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <View style={[styles.avatarPlaceholder, { backgroundColor: bg }]}>
      <Text style={[styles.avatarLetter, { color: '#FFFFFF' }]}>
        {(name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

interface InviteFriendsModalProps {
  visible: boolean;
  onClose: () => void;
  eventTitle: string;
  currentMembers: EventMember[];
  onInviteFriend: (friend: {
    id: string;
    name: string;
    avatarUrl?: string;
    email?: string;
  }) => void;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  visible,
  onClose,
  eventTitle,
  currentMembers,
  onInviteFriend,
}) => {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Array<{ id: string; name: string; email?: string; avatarUrl?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setCopySuccess(false);
      setIsLoading(true);

      // Load friends from real API
      getFriendsApi()
        .then((res: any[]) => {
          if (Array.isArray(res)) {
            const formatted = res.map((f, idx) => ({
              id: f.id || f._id || `f-${idx}`,
              name: f.name || f.fullName || f.requester?.fullName || f.recipient?.fullName || 'Bạn bè',
              email: f.email || '',
              avatarUrl: f.avatarUrl || f.requester?.avatarUrl || f.recipient?.avatarUrl,
            }));
            setFriends(formatted);
          } else {
            setFriends([]);
          }
        })
        .catch(() => {
          setFriends([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [visible]);

  if (!visible) return null;

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const inputBg = isDark ? '#0F172A' : '#F4EFE6';
  const dividerColor = isDark ? '#334155' : '#E8E2D9';
  const textPrimary = isDark ? '#F8FAFC' : '#111827';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';

  const filteredFriends = friends.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      (f.email && f.email.toLowerCase().includes(q))
    );
  });

  const getMemberStatus = (friendId: string, friendName: string): 'none' | 'pending' | 'accepted' => {
    const member = currentMembers.find(
      (m) =>
        m.id === friendId ||
        m.name.trim().toLowerCase() === friendName.trim().toLowerCase()
    );
    if (!member) return 'none';
    if (member.status === 'pending') return 'pending';
    return 'accepted';
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`https://monett.vn/events/join?event=${encodeURIComponent(eventTitle)}`);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
              {/* Header */}
              <View style={[styles.modalHeader, { borderBottomColor: dividerColor }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: textPrimary }]}>
                    {isVi ? 'Mời bạn bè vào sự kiện' : 'Invite Friends to Event'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                    {eventTitle}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeCircleBtn, { backgroundColor: isDark ? '#334155' : '#F8FAFC' }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color={isDark ? '#CBD5E1' : '#475569'} />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={styles.modalBody}>
                {/* Search Bar */}
                <View
                  style={[
                    styles.searchBar,
                    {
                      backgroundColor: isSearchFocused ? (isDark ? '#1E293B' : '#FFFFFF') : inputBg,
                      borderColor: isSearchFocused ? '#2E9E5B' : 'transparent',
                    },
                  ]}
                >
                  <Ionicons name="search" size={17} color={textSecondary} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder={isVi ? 'Tìm kiếm theo tên hoặc email...' : 'Search by name or email...'}
                    placeholderTextColor={textSecondary}
                    style={[styles.searchInput, { color: textPrimary }]}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                      <Ionicons name="close-circle" size={16} color={textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick Share Link Box */}
                <TouchableOpacity
                  style={[styles.shareLinkBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: dividerColor }]}
                  onPress={handleCopyLink}
                  activeOpacity={0.8}
                >
                  <View style={styles.shareLinkLeft}>
                    <View style={styles.shareLinkIcon}>
                      <Ionicons name="link" size={16} color="#059669" />
                    </View>
                    <View>
                      <Text style={[styles.shareLinkTitle, { color: textPrimary }]}>
                        {isVi ? 'Sao chép liên kết mời' : 'Copy invite link'}
                      </Text>
                      <Text style={[styles.shareLinkSub, { color: textSecondary }]}>
                        {copySuccess
                          ? (isVi ? '✓ Đã sao chép vào bộ nhớ tạm!' : '✓ Copied to clipboard!')
                          : (isVi ? 'Gửi liên kết để bạn bè tự tham gia' : 'Send link for friends to join')}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={copySuccess ? 'checkmark-circle' : 'copy-outline'}
                    size={18}
                    color={copySuccess ? '#059669' : textSecondary}
                  />
                </TouchableOpacity>

                {/* Friends List Title */}
                <View style={styles.listSectionHeader}>
                  <Text style={[styles.listSectionTitle, { color: textSecondary }]}>
                    {isVi ? `Danh sách bạn bè (${filteredFriends.length})` : `Friends List (${filteredFriends.length})`}
                  </Text>
                </View>

                {/* Friends Scroll List */}
                <ScrollView
                  style={styles.friendsScroll}
                  contentContainerStyle={styles.friendsScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {isLoading ? (
                    <View style={styles.emptySearchWrap}>
                      <Ionicons name="refresh" size={28} color="#059669" />
                      <Text style={[styles.emptySearchText, { color: textSecondary, marginTop: 8 }]}>
                        {isVi ? 'Đang tải danh sách...' : 'Loading friends...'}
                      </Text>
                    </View>
                  ) : filteredFriends.length === 0 ? (
                    <View style={styles.emptySearchWrap}>
                      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: isDark ? '#1E293B' : '#E6F4EA', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                        <Ionicons name="people-outline" size={26} color="#059669" />
                      </View>
                      <Text style={[styles.emptySearchText, { color: textPrimary, fontWeight: '700', fontSize: 14.5, marginBottom: 4 }]}>
                        {searchQuery.trim()
                          ? (isVi ? 'Không tìm thấy bạn bè phù hợp' : 'No matching friends found')
                          : (isVi ? 'Chưa có bạn bè trong danh sách' : 'No friends yet')}
                      </Text>
                      {!searchQuery.trim() && (
                        <Text style={[styles.emptySearchText, { color: textSecondary, textAlign: 'center', fontSize: 12.5, maxWidth: 300 }]}>
                          {isVi
                            ? 'Hãy bấm sao chép liên kết mời bên trên để gửi cho bạn bè cùng tham gia sự kiện nhé!'
                            : 'Copy and share the invite link above so your friends can join this event!'}
                        </Text>
                      )}
                    </View>
                  ) : (
                    filteredFriends.map((friend) => {
                      const memberStatus = getMemberStatus(friend.id, friend.name);

                      return (
                        <View
                          key={friend.id}
                          style={[
                            styles.friendRow,
                            { borderBottomColor: dividerColor },
                          ]}
                        >
                          {/* Avatar + Info */}
                          <View style={styles.friendInfoLeft}>
                            <SafeInviteAvatar
                              uri={friend.avatarUrl}
                              name={friend.name}
                              isDark={isDark}
                              textPrimary={textPrimary}
                            />

                            <View style={styles.friendTextWrap}>
                              <Text style={[styles.friendName, { color: textPrimary }]}>
                                {friend.name}
                              </Text>
                              {friend.email ? (
                                <Text style={[styles.friendEmail, { color: textSecondary }]}>
                                  {friend.email}
                                </Text>
                              ) : null}
                            </View>
                          </View>

                          {/* Action: Already in event vs Pending Invite vs Invite Button */}
                          {memberStatus === 'accepted' ? (
                            <View style={styles.joinedBadge}>
                              <Ionicons name="checkmark" size={14} color="#059669" />
                              <Text style={styles.joinedBadgeText}>
                                {isVi ? 'Đã tham gia' : 'Joined'}
                              </Text>
                            </View>
                          ) : memberStatus === 'pending' ? (
                            <View style={[styles.joinedBadge, { backgroundColor: isDark ? '#451A03' : '#FEF3C7' }]}>
                              <Ionicons name="time-outline" size={14} color="#D97706" />
                              <Text style={[styles.joinedBadgeText, { color: '#D97706' }]}>
                                {isVi ? 'Chờ chấp nhận' : 'Pending'}
                              </Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.inviteActionBtn}
                              onPress={() => onInviteFriend(friend)}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="person-add" size={14} color="#064E3B" />
                              <Text style={styles.inviteActionBtnText}>
                                {isVi ? 'Mời' : 'Invite'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>

              {/* Footer */}
              <View style={[styles.modalFooter, { borderTopColor: dividerColor }]}>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={onClose}
                  activeOpacity={0.85}
                >
                  <Text style={styles.doneBtnText}>
                    {isVi ? 'Hoàn tất' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  closeCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    outlineStyle: 'none' as any,
  },
  shareLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  shareLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareLinkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareLinkTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  shareLinkSub: {
    fontSize: 12,
    marginTop: 1,
  },
  listSectionHeader: {
    marginBottom: 8,
  },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  friendsScroll: {
    maxHeight: 280,
  },
  friendsScrollContent: {
    paddingBottom: 8,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  friendInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 15,
    fontWeight: '800',
  },
  friendTextWrap: {
    flex: 1,
  },
  friendName: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  friendEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  joinedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  inviteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#98E4B0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 1,
  },
  inviteActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064E3B',
  },
  emptySearchWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptySearchText: {
    fontSize: 13,
    textAlign: 'center',
  },
  modalFooter: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  doneBtn: {
    backgroundColor: '#98E4B0',
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
});
