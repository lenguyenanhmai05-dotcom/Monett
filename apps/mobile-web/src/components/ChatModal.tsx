import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMessagesApi, sendMessageApi, normalizeAvatarUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import { playNotificationSound } from '../utils/soundUtils';

interface Message {
  _id: string;
  sender: string;
  receiver: string;
  text: string;
  createdAt: string;
}

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  friend: any;
}

export const ChatModal: React.FC<ChatModalProps> = ({ visible, onClose, friend }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 640;
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { isUserOnline } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const currentUserId = user?.id || (user as any)?._id;
  const friendId = friend?._id || friend?.id || '';
  const isOnline = friendId ? isUserOnline(friendId) : false;
  const friendName = friend?.fullName || friend?.name || friend?.email || 'Bạn bè';
  const friendAvatar = normalizeAvatarUrl(friend?.avatarUrl || friend?.avatar);

  const loadMessages = async () => {
    if (!friendId) return;
    try {
      const data = await getMessagesApi(friendId);
      setMessages(data || []);
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  };

  const prevMsgCount = useRef(0);

  useEffect(() => {
    if (visible && friendId) {
      setIsMinimized(false);
      setLoading(true);
      loadMessages().finally(() => setLoading(false));

      const interval = setInterval(() => {
        loadMessages();
      }, 3000);
      return () => clearInterval(interval);
    } else {
      prevMsgCount.current = 0;
    }
  }, [visible, friendId]);

  useEffect(() => {
    if (visible && messages.length > prevMsgCount.current && prevMsgCount.current > 0) {
      playNotificationSound();
    }
    prevMsgCount.current = messages.length;
  }, [messages.length, visible]);

  const handleSend = async () => {
    if (!text.trim() || !friendId) return;
    try {
      const currentText = text.trim();
      setText(''); // Optimistic clear
      const newMsg = await sendMessageApi(friendId, currentText);
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const quickReplies = [
    'Chào bạn! 👋',
    'Dạo này sao rồi?',
    'Đang làm gì thế?',
    'Lát nữa đi cafe không? ☕',
    'Nhớ giữ chuỗi nhé! 🔥',
  ];

  if (!visible || !friend) return null;

  // ─── NỘI DUNG CHAT MESSENGER BOX ──────────────────────────────────────────
  const chatContent = (
    <View
      style={[
        styles.messengerBox,
        isDesktop ? styles.desktopMessengerBox : styles.mobileMessengerSheet,
        isMinimized && styles.minimizedMessengerBox,
        { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
      ]}
    >
      {/* ── HEADER CHUẨN FACEBOOK MESSENGER ── */}
      <TouchableOpacity
        style={[
          styles.header,
          { borderBottomColor: isDark ? '#334155' : '#F1F5F9' },
          isMinimized && { borderBottomWidth: 0 },
        ]}
        activeOpacity={0.9}
        onPress={() => isMinimized && setIsMinimized(false)}
      >
        {/* Left: Avatar & Tên & Chấm online */}
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrap}>
            {friendAvatar ? (
              <Image source={{ uri: friendAvatar }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(friendName.charAt(0) || 'U').toUpperCase()}
                </Text>
              </View>
            )}
            {/* Chấm tròn xanh lá online */}
            <View style={[styles.onlineDot, !isOnline && styles.offlineDot]} />
          </View>

          <View style={styles.headerInfo}>
            <Text
              style={[
                styles.headerName,
                { color: isDark ? '#F8FAFC' : '#0F172A' },
              ]}
              numberOfLines={1}
            >
              {friendName}
            </Text>
            <Text style={styles.headerStatus} numberOfLines={1}>
              {isOnline ? '🟢 Đang hoạt động' : 'Vừa truy cập'}
            </Text>
          </View>
        </View>

        {/* Right: Nút Thu nhỏ `_` và Nút Đóng `✕` */}
        <View style={styles.headerRightActions}>
          {isDesktop && (
            <TouchableOpacity
              onPress={() => setIsMinimized(!isMinimized)}
              style={styles.iconActionBtn}
              activeOpacity={0.7}
              accessibilityLabel="Thu nhỏ"
            >
              <Ionicons
                name={isMinimized ? 'chevron-up' : 'remove'}
                size={18}
                color={isDark ? '#CBD5E1' : '#64748B'}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onClose}
            style={styles.iconActionBtn}
            activeOpacity={0.7}
            accessibilityLabel="Đóng"
          >
            <Ionicons
              name="close"
              size={19}
              color={isDark ? '#CBD5E1' : '#64748B'}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* ── PHẦN NỘI DUNG TIN NHẮN (ẨN KHI THU NHỎ) ── */}
      {!isMinimized && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={{ marginTop: 8, fontSize: 12, color: '#94A3B8' }}>
                Đang tải tin nhắn...
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => item._id || String(index)}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => {
                const isMe = item.sender === currentUserId;
                const timeStr = item.createdAt
                  ? new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';

                return (
                  <View
                    style={[
                      styles.messageBubble,
                      isMe
                        ? styles.myMessage
                        : [
                            styles.theirMessage,
                            { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
                          ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isMe
                          ? styles.myMessageText
                          : { color: isDark ? '#F8FAFC' : '#0F172A' },
                      ]}
                    >
                      {item.text}
                    </Text>
                    {timeStr ? (
                      <Text
                        style={[
                          styles.timeText,
                          isMe
                            ? { color: 'rgba(255,255,255,0.75)' }
                            : { color: isDark ? '#94A3B8' : '#64748B' },
                        ]}
                      >
                        {timeStr}
                      </Text>
                    ) : null}
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={{ fontSize: 32 }}>👋</Text>
                  <Text
                    style={[
                      styles.emptyText,
                      { color: isDark ? '#64748B' : '#94A3B8' },
                    ]}
                  >
                    Chưa có tin nhắn nào.{'\n'}Hãy gửi lời chào đầu tiên!
                  </Text>
                </View>
              }
            />
          )}

          {/* ── THANH GỢI Ý CÂU TRẢ LỜI NHANH ── */}
          <View
            style={[
              styles.quickRepliesBar,
              { backgroundColor: isDark ? '#0F172A' : '#FAFAFA' },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRepliesScroll}
            >
              {quickReplies.map((reply, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.quickReplyChip,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                  onPress={() => setText(reply)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.quickReplyText,
                      { color: isDark ? '#94A3B8' : '#475569' },
                    ]}
                  >
                    {reply}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── KHUNG NHẬP TIN NHẮN ── */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderTopColor: isDark ? '#334155' : '#F1F5F9',
              },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  color: isDark ? '#F1F5F9' : '#0F172A',
                  backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                },
              ]}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={text}
              onChangeText={setText}
              onSubmitEditing={handleSend}
              maxLength={500}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !text.trim() && { opacity: 0.5, backgroundColor: '#94A3B8' },
              ]}
              onPress={handleSend}
              disabled={!text.trim()}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );

  // TRÊN DESKTOP: RENDER TRỰC TIẾP DOCK Ở GÓC DƯỚI BÊN PHẢI (KHÔNG CÓ BACKDROP CHE MÀN HÌNH)
  if (isDesktop) {
    return chatContent;
  }

  // TRÊN MOBILE: RENDER TRONG MODAL BOTTOM SHEET
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.mobileModalBackdrop}>
        <TouchableOpacity
          style={styles.mobileBackdropDismiss}
          onPress={onClose}
          activeOpacity={1}
        />
        {chatContent}
      </View>
    </Modal>
  );
};

// ─── STYLESHEET CHUẨN FACEBOOK MESSENGER WEB ────────────────────────────────
const styles = StyleSheet.create({
  // Desktop Floating Messenger Box (Góc dưới bên phải)
  messengerBox: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  desktopMessengerBox: {
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
  minimizedMessengerBox: {
    height: 48,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },

  // Mobile Bottom Sheet
  mobileModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  mobileBackdropDismiss: {
    flex: 1,
  },
  mobileMessengerSheet: {
    width: '100%',
    height: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  // Header
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarWrap: {
    width: 32,
    height: 32,
    position: 'relative',
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  offlineDot: {
    backgroundColor: '#94A3B8',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerStatus: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginTop: 0.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },

  // Message Area
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 4,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  myMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 9.5,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    paddingTop: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Quick Replies
  quickRepliesBar: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickRepliesScroll: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  quickReplyChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickReplyText: {
    fontSize: 11.5,
    fontWeight: '600',
  },

  // Input Area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
