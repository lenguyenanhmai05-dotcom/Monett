import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useChat, ChatGroup } from '../contexts/ChatContext';
import { GroupIconSvg, GROUP_ICONS_LIST } from './GroupIconSvg';
import { normalizeAvatarUrl } from '../services/api';
import { formatMessengerActiveTime } from '../utils/dateUtils';

const Avatar: React.FC<{ uri?: string; name: string; size?: number }> = ({
  uri,
  name,
  size = 44,
}) => {
  const [err, setErr] = useState(false);
  useEffect(() => {
    setErr(false);
  }, [uri]);

  const normalized = normalizeAvatarUrl(uri);
  const initial = (name || 'U').charAt(0).toUpperCase();

  const colors = ['#059669', '#8B5CF6', '#F59E0B', '#EF4444', '#0EA5E9', '#EC4899', '#6366F1'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const bg = colors[Math.abs(hash) % colors.length];

  if (normalized && !err) {
    return (
      <Image
        source={{ uri: normalized }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.4 }}>
        {initial}
      </Text>
    </View>
  );
};

export const MessengerPopover: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const { isDark } = useTheme();
  const { user } = useAuth();
  const {
    isMessengerOpen,
    closeMessenger,
    openChat,
    friendsList,
    chatGroups,
    createGroup,
    pinnedChatIds,
    togglePinChat,
    hiddenChatIds,
    deleteConversation,
    isFriendOnline,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'group' | 'direct'>('all');

  // Modal tạo nhóm mới
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupIcon, setNewGroupIcon] = useState('users');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  // Menu tùy chọn cuộc trò chuyện (3 chấm)
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    target: {
      id: string;
      type: 'group' | 'friend';
      name: string;
      data: any;
    } | null;
  }>({ visible: false, x: 0, y: 0, target: null });

  // Danh sách hội thoại thống nhất
  const unifiedConversations = useMemo(() => {
    const list: any[] = [];

    // 1. Nhóm trò chuyện
    chatGroups.forEach((grp) => {
      const isPinned = pinnedChatIds.includes(grp.id);
      list.push({
        id: grp.id,
        type: 'group' as const,
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

    // 2. Bạn bè trực tiếp
    friendsList.forEach((f: any) => {
      const fId = String(f._id || f.id || '');
      const isPinned = pinnedChatIds.includes(fId);
      const fName = f.fullName || f.name || f.email || 'Bạn bè';
      const isOnline = isFriendOnline(f);
      list.push({
        id: fId || 'friend_' + Math.random(),
        type: 'friend' as const,
        name: fName,
        avatar:
          f.avatarUrl ||
          f.avatar ||
          f.user?.avatarUrl ||
          f.user?.avatar ||
          f.recipient?.avatarUrl ||
          f.recipient?.avatar ||
          f.requester?.avatarUrl ||
          f.requester?.avatar,
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
  }, [chatGroups, friendsList, pinnedChatIds, isFriendOnline]);

  const filteredConversations = useMemo(() => {
    return unifiedConversations.filter((item) => {
      if (hiddenChatIds.includes(item.id)) return false;
      if (filter === 'group' && item.type !== 'group') return false;
      if (filter === 'direct' && item.type !== 'friend') return false;
      if (filter === 'unread' && !item.unread) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchMsg = (item.lastMessage || '').toLowerCase().includes(q);
        return matchName || matchMsg;
      }
      return true;
    });
  }, [unifiedConversations, hiddenChatIds, filter, searchQuery]);

  const handleSelectConversation = (item: any) => {
    openChat(item.data);
  };

  const handleOpenContextMenu = (
    e: any,
    target: { id: string; type: 'group' | 'friend'; name: string; data: any }
  ) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    const pageX =
      e?.pageX ??
      e?.clientX ??
      (typeof window !== 'undefined' ? window.innerWidth - 260 : 300);
    const pageY = e?.pageY ?? e?.clientY ?? 200;
    setContextMenu({
      visible: true,
      x: pageX,
      y: pageY,
      target,
    });
  };

  const handleCreateGroupSubmit = () => {
    if (!newGroupName.trim()) {
      alert('Vui lòng nhập tên nhóm!');
      return;
    }
    if (selectedFriendIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 bạn bè để tạo nhóm!');
      return;
    }
    const created = createGroup(newGroupName, newGroupIcon, selectedFriendIds);
    setShowCreateGroupModal(false);
    setNewGroupName('');
    setNewGroupIcon('users');
    setSelectedFriendIds([]);
    if (created) {
      openChat(created);
    }
  };

  if (!isMessengerOpen) return null;

  return (
    <>
      {/* Nền trong suốt để đóng popover khi bấm ra ngoài */}
      <TouchableOpacity
        style={styles.dropdownBackdrop}
        activeOpacity={1}
        onPress={closeMessenger}
      />

      {/* Khung Popover Messenger Facebook Style */}
      <View
        style={[
          styles.messengerDropdownCard,
          {
            backgroundColor: isDark ? '#242526' : '#FFFFFF',
            borderColor: isDark ? '#3E4042' : '#E2E8F0',
            top: isDesktop ? 60 : undefined,
            bottom: isDesktop ? undefined : 0,
            right: isDesktop ? 48 : 0,
            left: isDesktop ? undefined : 0,
            width: isDesktop ? 390 : '100%',
            maxHeight: isDesktop ? 580 : '85%',
            borderRadius: isDesktop ? 20 : 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          },
        ]}
      >
        {/* Handle bar trên mobile */}
        {!isDesktop && (
          <View style={styles.handleBarWrap}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: isDark ? '#4B5563' : '#CBD5E1' },
              ]}
            />
          </View>
        )}

        {/* Header: Đoạn chat */}
        <View
          style={[
            styles.messengerDropdownHeader,
            { borderBottomColor: isDark ? '#334155' : '#F1F5F9' },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="chatbubbles" size={20} color="#059669" />
            <Text
              style={[
                styles.messengerDropdownTitle,
                { color: isDark ? '#F8FAFC' : '#0F172A' },
              ]}
            >
              Đoạn chat
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              style={[
                styles.dropdownHeaderBtn,
                { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
              ]}
              onPress={() => {
                setNewGroupName('');
                setNewGroupIcon('users');
                setSelectedFriendIds([]);
                setShowCreateGroupModal(true);
              }}
              accessibilityLabel="Tạo nhóm trò chuyện mới"
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={isDark ? '#E2E8F0' : '#475569'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dropdownHeaderBtn,
                { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
              ]}
              onPress={closeMessenger}
              accessibilityLabel="Đóng"
            >
              <Ionicons
                name="close"
                size={18}
                color={isDark ? '#E2E8F0' : '#475569'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Thanh tìm kiếm */}
        <View style={styles.messengerSearchContainer}>
          <View
            style={[
              styles.searchInner,
              {
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            <Ionicons
              name="search"
              size={16}
              color="#94A3B8"
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={[
                styles.messengerSearchInput,
                { color: isDark ? '#F1F5F9' : '#0F172A' },
              ]}
              placeholder="Tìm kiếm trên Messenger..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Chips */}
        <View style={styles.messengerFilterRow}>
          <TouchableOpacity
            style={[
              styles.messengerFilterChip,
              filter === 'all' && styles.messengerFilterChipActive,
              { backgroundColor: filter === 'all' ? '#059669' : (isDark ? '#334155' : '#F1F5F9') },
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.messengerFilterText,
                filter === 'all'
                  ? { color: '#FFFFFF' }
                  : { color: isDark ? '#CBD5E1' : '#64748B' },
              ]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.messengerFilterChip,
              filter === 'unread' && styles.messengerFilterChipActive,
              { backgroundColor: filter === 'unread' ? '#059669' : (isDark ? '#334155' : '#F1F5F9') },
            ]}
            onPress={() => setFilter('unread')}
          >
            <Text
              style={[
                styles.messengerFilterText,
                filter === 'unread'
                  ? { color: '#FFFFFF' }
                  : { color: isDark ? '#CBD5E1' : '#64748B' },
              ]}
            >
              Chưa đọc
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.messengerFilterChip,
              filter === 'group' && styles.messengerFilterChipActive,
              { backgroundColor: filter === 'group' ? '#059669' : (isDark ? '#334155' : '#F1F5F9') },
            ]}
            onPress={() => setFilter('group')}
          >
            <Text
              style={[
                styles.messengerFilterText,
                filter === 'group'
                  ? { color: '#FFFFFF' }
                  : { color: isDark ? '#CBD5E1' : '#64748B' },
              ]}
            >
              Nhóm {chatGroups.length > 0 && `(${chatGroups.length})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.messengerFilterChip,
              filter === 'direct' && styles.messengerFilterChipActive,
              { backgroundColor: filter === 'direct' ? '#059669' : (isDark ? '#334155' : '#F1F5F9') },
            ]}
            onPress={() => setFilter('direct')}
          >
            <Text
              style={[
                styles.messengerFilterText,
                filter === 'direct'
                  ? { color: '#FFFFFF' }
                  : { color: isDark ? '#CBD5E1' : '#64748B' },
              ]}
            >
              Bạn bè ({friendsList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Danh sách cuộc trò chuyện cuộn mượt mà */}
        <ScrollView
          style={styles.messengerConversationsScroll}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={true}
        >
          {filteredConversations.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Ionicons name="chatbubbles-outline" size={38} color="#94A3B8" />
              <Text style={{ marginTop: 10, color: '#94A3B8', fontSize: 13.5 }}>
                Không tìm thấy cuộc trò chuyện nào
              </Text>
            </View>
          ) : (
            filteredConversations.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.messengerChatItem,
                  item.isPinned && {
                    backgroundColor: isDark ? '#1E293B' : '#F0FDF4',
                  },
                ]}
                onPress={() => handleSelectConversation(item)}
                activeOpacity={0.7}
              >
                {/* Avatar / Biểu tượng nhóm & Chấm xanh online */}
                <View style={{ position: 'relative' }}>
                  {item.type === 'group' ? (
                    <View
                      style={[
                        styles.messengerGroupAvatar,
                        {
                          backgroundColor: isDark ? '#334155' : '#DCFCE7',
                        },
                      ]}
                    >
                      <GroupIconSvg name={item.icon || 'users'} size={24} />
                    </View>
                  ) : (
                    <Avatar uri={item.avatar} name={item.name} size={46} />
                  )}

                  {/* Chấm xanh đang hoạt động realtime */}
                  {item.type !== 'group' && (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: item.isOnline ? '#10B981' : '#94A3B8',
                        borderWidth: 2,
                        borderColor: isDark ? '#242526' : '#FFFFFF',
                      }}
                    />
                  )}
                </View>

                {/* Tên & Nội dung tin nhắn cuối */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text
                      style={[
                        styles.messengerChatName,
                        { color: isDark ? '#F8FAFC' : '#0F172A' },
                        item.isPinned && { color: '#059669', fontWeight: '800' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.isPinned && (
                      <Ionicons
                        name="pin"
                        size={13}
                        color="#059669"
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.messengerChatLastMsg,
                      { color: isDark ? '#94A3B8' : '#64748B' },
                      item.isOnline && { color: '#059669', fontWeight: '600' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                </View>

                {/* Nút 3 chấm mở menu tùy chọn */}
                <TouchableOpacity
                  style={styles.chatItemMoreBtn}
                  onPress={(e) => handleOpenContextMenu(e, item)}
                  activeOpacity={0.65}
                  accessibilityLabel="Tùy chọn cuộc trò chuyện"
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={16}
                    color={isDark ? '#94A3B8' : '#64748B'}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* MODAL TẠO NHÓM TRÒ CHUYỆN */}
      <Modal
        visible={showCreateGroupModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
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
                <Text
                  style={[
                    styles.dialogTitle,
                    { color: isDark ? '#F1F5F9' : '#0F172A' },
                  ]}
                >
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
            <Text style={styles.dialogFieldLabel}>
              Chọn biểu tượng nhóm (Vector SVG):
            </Text>
            <View style={styles.groupIconPickerRow}>
              {GROUP_ICONS_LIST.map((item) => {
                const isSelected = newGroupIcon === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.groupIconChoiceBtn,
                      isSelected && styles.groupIconChoiceBtnActive,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? '#064E3B' : '#DCFCE7')
                          : (isDark ? '#0F172A' : '#F1F5F9'),
                        borderColor: isSelected ? '#059669' : (isDark ? '#334155' : '#E2E8F0'),
                      },
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
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 10,
                marginBottom: 6,
              }}
            >
              <Text style={styles.dialogFieldLabel}>Chọn bạn bè vào nhóm:</Text>
              <Text
                style={{ fontSize: 11.5, color: '#059669', fontWeight: '700' }}
              >
                Đã chọn ({selectedFriendIds.length})
              </Text>
            </View>

            <ScrollView
              style={{ maxHeight: 180, marginBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {friendsList.length === 0 ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: '#94A3B8',
                    textAlign: 'center',
                    marginVertical: 16,
                  }}
                >
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
                        isChecked && {
                          backgroundColor: isDark ? '#334155' : '#ECFDF5',
                        },
                      ]}
                      onPress={() => {
                        setSelectedFriendIds((prev) =>
                          isChecked
                            ? prev.filter((id) => id !== fId)
                            : [...prev, fId]
                        );
                      }}
                      activeOpacity={0.75}
                    >
                      <Avatar
                        uri={
                          f.avatarUrl ||
                          f.avatar ||
                          f.user?.avatarUrl ||
                          f.recipient?.avatarUrl ||
                          f.requester?.avatarUrl
                        }
                        name={fName}
                        size={34}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text
                          style={{
                            fontSize: 13.5,
                            fontWeight: '700',
                            color: isDark ? '#FFFFFF' : '#0F172A',
                          }}
                        >
                          {fName}
                        </Text>
                        <Text style={{ fontSize: 11, color: isFriendOnline(f) ? '#10B981' : '#64748B', fontWeight: isFriendOnline(f) ? '700' : '500' }}>
                          {formatMessengerActiveTime(f, isFriendOnline(f))}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.checkboxCircle,
                          isChecked && {
                            backgroundColor: '#059669',
                            borderColor: '#059669',
                          },
                        ]}
                      >
                        {isChecked && (
                          <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                        )}
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
                <Text
                  style={{ color: '#64748B', fontWeight: '700', fontSize: 13 }}
                >
                  Hủy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dialogSaveBtn,
                  { backgroundColor: '#059669' },
                ]}
                onPress={handleCreateGroupSubmit}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: 13.5,
                  }}
                >
                  Tạo nhóm ngay
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CONTEXT MENU (3 CHẤM / CHUỘT PHẢI) */}
      {contextMenu.visible && contextMenu.target && (
        <Modal
          transparent
          visible={contextMenu.visible}
          animationType="fade"
          onRequestClose={() =>
            setContextMenu((prev) => ({ ...prev, visible: false }))
          }
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() =>
              setContextMenu((prev) => ({ ...prev, visible: false }))
            }
          />
          <View
            style={[
              styles.contextMenuCard,
              {
                top: Math.max(
                  10,
                  Math.min(
                    contextMenu.y,
                    (typeof window !== 'undefined' ? window.innerHeight : 800) -
                      220
                  )
                ),
                left: Math.max(
                  10,
                  Math.min(
                    contextMenu.x,
                    (typeof window !== 'undefined' ? window.innerWidth : 1200) -
                      240
                  )
                ),
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            <View
              style={[
                styles.contextMenuHeader,
                { borderBottomColor: isDark ? '#334155' : '#F1F5F9' },
              ]}
            >
              <Text
                style={[
                  styles.contextMenuTitle,
                  { color: isDark ? '#F8FAFC' : '#0F172A' },
                ]}
                numberOfLines={1}
              >
                {contextMenu.target.name}
              </Text>
              <Text style={styles.contextMenuSub}>
                {contextMenu.target.type === 'group'
                  ? 'Nhóm trò chuyện'
                  : 'Trò chuyện trực tiếp'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => {
                const t = contextMenu.target!;
                setContextMenu((prev) => ({ ...prev, visible: false }));
                openChat(t.data);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubbles-outline" size={17} color="#059669" />
              <Text
                style={[
                  styles.contextMenuItemText,
                  { color: isDark ? '#F1F5F9' : '#1E293B' },
                ]}
              >
                Mở cuộc trò chuyện
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => {
                const targetId = contextMenu.target!.id;
                togglePinChat(targetId);
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  pinnedChatIds.includes(contextMenu.target.id)
                    ? 'pin'
                    : 'pin-outline'
                }
                size={17}
                color="#059669"
              />
              <Text
                style={[
                  styles.contextMenuItemText,
                  { color: isDark ? '#F1F5F9' : '#1E293B' },
                ]}
              >
                {pinnedChatIds.includes(contextMenu.target.id)
                  ? 'Bỏ ghim cuộc trò chuyện'
                  : 'Ghim cuộc trò chuyện'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={() => {
                const target = contextMenu.target!;
                setContextMenu((prev) => ({ ...prev, visible: false }));
                deleteConversation(target);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={17} color="#EF4444" />
              <Text
                style={[
                  styles.contextMenuItemText,
                  { color: '#EF4444', fontWeight: '700' },
                ]}
              >
                {contextMenu.target.type === 'group'
                  ? 'Xóa nhóm trò chuyện'
                  : 'Xóa cuộc trò chuyện'}
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 12,
    borderWidth: 1,
    zIndex: 9999,
    overflow: 'hidden',
  },
  handleBarWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  messengerDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  messengerDropdownTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  dropdownHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messengerSearchContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  messengerSearchInput: {
    flex: 1,
    fontSize: 13.5,
    padding: 0,
  },
  messengerFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 6,
    flexWrap: 'wrap',
  },
  messengerFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  messengerFilterChipActive: {
    backgroundColor: '#059669',
  },
  messengerFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messengerConversationsScroll: {
    flex: 1,
  },
  messengerChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  messengerGroupAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messengerChatName: {
    fontSize: 14,
    fontWeight: '700',
  },
  messengerChatLastMsg: {
    fontSize: 12,
    marginTop: 2,
  },
  chatItemMoreBtn: {
    padding: 6,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  createGroupDialog: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  dialogFieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  dialogInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13.5,
    marginBottom: 12,
  },
  groupIconPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  groupIconChoiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  groupIconChoiceBtnActive: {
    borderWidth: 2,
    borderColor: '#059669',
  },
  groupFriendSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  dialogCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  dialogSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  contextMenuCard: {
    position: 'absolute',
    width: 220,
    borderRadius: 14,
    borderWidth: 1,
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 99999,
  },
  contextMenuHeader: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  contextMenuTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  contextMenuSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contextMenuItemText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
