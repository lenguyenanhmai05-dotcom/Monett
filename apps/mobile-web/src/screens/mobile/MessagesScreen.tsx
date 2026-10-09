import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-qr-code';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSocket } from '../../contexts/SocketContext';
import {
  getFriendsApi,
  getFriendRequestsApi,
  sendFriendRequestApi,
  respondFriendRequestApi,
  getMessagesApi,
  sendMessageApi,
  normalizeAvatarUrl,
} from '../../services/api';

// Mascot ảnh ếch Monett
const FROG_MASCOT_URI = 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80';
const FROG_AI_AVATAR = 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=200&auto=format&fit=crop&q=80';

// ─── Interfaces ─────────────────────────────────────────────────────────────
export interface ChatMessage {
  _id: string;
  sender: string;
  receiver?: string;
  text: string;
  createdAt: string;
  type?: 'text' | 'bill_split' | 'payment_confirm';
  billData?: {
    title: string;
    amount: number;
    splitCount?: number;
    perPerson?: number;
    isSettled?: boolean;
  };
}

export interface ConversationItem {
  id: string;
  friendId?: string;
  name: string;
  avatarUrl?: string;
  isAi?: boolean;
  isOnline?: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  badge?: string;
  streak?: number;
}

interface MessagesScreenProps {
  refreshTrigger?: number;
  onNavigateToHome?: () => void;
  onNavigateToCamera?: (dateStr?: string) => void;
  onNavigateToDetail?: (id: string) => void;
}

// ─── Khởi tạo Dữ liệu Cuộc trò chuyện Mẫu Sinh động ─────────────────────────
const INITIAL_CONVERSATIONS: ConversationItem[] = [
  {
    id: 'ai-monett-assistant',
    isAi: true,
    name: 'Trợ lý Ếch Monett AI 🌟',
    avatarUrl: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=200&auto=format&fit=crop&q=80',
    isOnline: true,
    lastMessage: 'Hôm nay bạn đã chi tiêu hợp lý chưa nè? Cần mình giúp chia bill hay mẹo tiết kiệm không? 🐸',
    lastMessageTime: 'Vừa xong',
    unreadCount: 1,
    badge: 'AI Tài chính',
  },
  {
    id: 'user-minhanh',
    name: 'Minh Anh',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    isOnline: true,
    lastMessage: 'Trưa nay đi ăn bún bò Huế không bồ? Mình đặt bàn trước rồi á 🍲',
    lastMessageTime: '10:45',
    unreadCount: 2,
    badge: 'Bạn thân',
    streak: 12,
  },
  {
    id: 'user-baotram',
    name: 'Bảo Trâm',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    isOnline: false,
    lastMessage: 'Đã nhận được 45k tiền cà phê sáng nay rồi nhé! Cảm ơn nhiều 🥰',
    lastMessageTime: '08:30',
    unreadCount: 0,
    streak: 5,
  },
  {
    id: 'user-quanghuy',
    name: 'Quang Huy (Nhóm Du Lịch)',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    isOnline: true,
    lastMessage: '🧾 Đã chia bill homestay cuối tuần: 320.000đ/người nha anh em!',
    lastMessageTime: 'Hôm qua',
    unreadCount: 1,
    badge: 'Nhóm',
  },
  {
    id: 'user-hoangnam',
    name: 'Hoàng Nam',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    isOnline: false,
    lastMessage: 'Tháng này ông tiết kiệm được 2 triệu tiền quỹ chưa ông ơi? 🔥',
    lastMessageTime: 'Hôm qua',
    unreadCount: 0,
    streak: 18,
  },
  {
    id: 'user-lanchi',
    name: 'Lan Chi',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    isOnline: true,
    lastMessage: 'Giao diện chú ếch Monett ôm lịch nhìn cưng xỉu luôn haha 🐸💚',
    lastMessageTime: '2 ngày trước',
    unreadCount: 0,
  },
];

// Tin nhắn mặc định của AI Bot
const AI_INITIAL_MESSAGES: ChatMessage[] = [
  {
    _id: 'ai-m1',
    sender: 'ai',
    text: 'Chào bạn! Mình là Trợ lý Ếch Monett 🐸✨\n\nMình có thể hỗ trợ bạn:\n• 💡 Gợi ý mẹo tiết kiệm thông minh\n• 🧾 Chia sẻ hóa đơn & tính bill nhóm nhanh\n• 📊 Phân tích chi tiêu hợp lý theo quy tắc 50/30/20\n• 🎯 Nhắc nhở giữ chuỗi tài chính mỗi ngày!\n\nHôm nay bạn muốn tâm sự hay tính toán gì nè?',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    type: 'text',
  },
];

// Tin nhắn mẫu cho các bạn bè
const SAMPLE_MESSAGES_MAP: Record<string, ChatMessage[]> = {
  'user-minhanh': [
    {
      _id: 'ma-1',
      sender: 'other',
      text: 'Sáng nay ghi chép chi tiêu cà phê chưa bạn yêu? ☕',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      _id: 'ma-2',
      sender: 'me',
      text: 'Ghi rồi nè, vừa chụp ảnh hóa đơn xong app tự phân loại luôn tiện ghê! ✨',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      _id: 'ma-3',
      sender: 'other',
      text: 'Trưa nay đi ăn bún bò Huế không bồ? Mình đặt bàn trước rồi á 🍲',
      createdAt: new Date(Date.now() - 900000).toISOString(),
    },
  ],
  'user-baotram': [
    {
      _id: 'bt-1',
      sender: 'me',
      text: 'Mình vừa chuyển 45k tiền cà phê sáng nay qua ví nha!',
      createdAt: new Date(Date.now() - 14400000).toISOString(),
    },
    {
      _id: 'bt-2',
      sender: 'other',
      text: 'Đã nhận được 45k tiền cà phê sáng nay rồi nhé! Cảm ơn nhiều 🥰',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
  'user-quanghuy': [
    {
      _id: 'qh-1',
      sender: 'other',
      text: 'Tổng chi tiền thuê villa cuối tuần là 1.280.000đ cho 4 người nha.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      _id: 'qh-2',
      sender: 'other',
      text: '🧾 Đã chia bill homestay cuối tuần: 320.000đ/người nha anh em!',
      createdAt: new Date(Date.now() - 86000000).toISOString(),
      type: 'bill_split',
      billData: {
        title: 'Villa Đà Lạt 2N1Đ',
        amount: 1280000,
        splitCount: 4,
        perPerson: 320000,
        isSettled: false,
      },
    },
  ],
};

// ── Hiệu ứng 3 dấu chấm nhấp nháy mượt mà khi đối phương đang gõ ──
const TypingDots: React.FC = () => {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createPulse = (val: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: -4,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.delay(560 - delay),
        ])
      );
    };

    const a1 = createPulse(anim1, 0);
    const a2 = createPulse(anim2, 160);
    const a3 = createPulse(anim3, 320);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [anim1, anim2, anim3]);

  return (
    <View style={styles.typingDotsContainer}>
      <Animated.View style={[styles.typingDot, { transform: [{ translateY: anim1 }] }]} />
      <Animated.View style={[styles.typingDot, { transform: [{ translateY: anim2 }] }]} />
      <Animated.View style={[styles.typingDot, { transform: [{ translateY: anim3 }] }]} />
    </View>
  );
};

export const MessagesScreen: React.FC<MessagesScreenProps> = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const currentUserId = user?.id || (user as any)?._id || 'me';

  // ── Socket.io Context ──
  const {
    isConnected,
    isUserOnline,
    isUserTyping,
    sendTyping,
    sendMessage: sendSocketMessage,
    lastMessage,
  } = useSocket();

  // ── State Danh sách ──
  const [conversations, setConversations] = useState<ConversationItem[]>(INITIAL_CONVERSATIONS);
  const [activeTab, setActiveTab] = useState<'all' | 'friends' | 'ai' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // ── State Chat Room ──
  const [activeChat, setActiveChat] = useState<ConversationItem | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isSampleTyping, setIsSampleTyping] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // ── State Modals ──
  const [isNewChatModalVisible, setIsNewChatModalVisible] = useState(false);
  const [isSplitBillModalVisible, setIsSplitBillModalVisible] = useState(false);
  const [splitTitle, setSplitTitle] = useState('');
  const [splitAmount, setSplitAmount] = useState('');
  const [splitCount, setSplitCount] = useState('2');

  // ── State Bạn Bè & QR Code Hub ──
  const [isFriendsModalVisible, setIsFriendsModalVisible] = useState(false);
  const [friendsModalTab, setFriendsModalTab] = useState<'qr' | 'requests' | 'list'>('qr');
  const [friendIdInput, setFriendIdInput] = useState('');
  const [isSendingFriendReq, setIsSendingFriendReq] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [dbFriendsList, setDbFriendsList] = useState<any[]>([]);
  const [isLoadingFriendsList, setIsLoadingFriendsList] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // ── Hàm tải danh sách yêu cầu kết bạn ──
  const loadPendingRequests = async () => {
    try {
      const reqs = await getFriendRequestsApi();
      setPendingRequests(Array.isArray(reqs) ? reqs : []);
    } catch (e) {
      console.warn('Error loading friend requests:', e);
    }
  };

  // ── Hàm tải danh sách bạn bè ──
  const loadFriendsData = async () => {
    try {
      setIsLoadingFriendsList(true);
      const [friends, requests] = await Promise.all([
        getFriendsApi().catch(() => []),
        getFriendRequestsApi().catch(() => []),
      ]);
      const myId = user?.id || (user as any)?._id || '';
      const normalized = ((friends as any[]) || []).map((f: any) => {
        const friend = (f.requester || f.recipient)
          ? ((f.requester?._id === myId || f.requester?.id === myId) ? f.recipient : f.requester)
          : f;
        return {
          _id: friend?._id || friend?.id || f._id,
          fullName: friend?.fullName || f.fullName || 'Bạn bè',
          email: friend?.email || f.email || '',
          avatarUrl: normalizeAvatarUrl(friend?.avatarUrl || f.avatarUrl),
          lastActiveDate: friend?.lastActiveDate || f.lastActiveDate || '',
          updatedAt: friend?.updatedAt || f.updatedAt || '',
        };
      }).filter((f: any) => f._id && f._id !== myId);
      setDbFriendsList(normalized);
      setPendingRequests(Array.isArray(requests) ? requests : []);
    } catch (e) {
      console.warn('Error loading friends data:', e);
    } finally {
      setIsLoadingFriendsList(false);
    }
  };

  // ── Phản hồi lời mời kết bạn ──
  const handleRespondRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await respondFriendRequestApi(requestId, status);
      Alert.alert(
        isVi ? '✅ Thông báo' : '✅ Notice',
        status === 'accepted'
          ? (isVi ? 'Đã đồng ý kết bạn thành công!' : 'Friend request accepted!')
          : (isVi ? 'Đã từ chối lời mời' : 'Friend request declined')
      );
      loadPendingRequests();
      loadFriendsData();
    } catch (e: any) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', e.message || (isVi ? 'Lỗi xử lý yêu cầu kết bạn' : 'Failed to handle friend request'));
    }
  };

  // ── Gửi lời mời kết bạn bằng ID ──
  const handleAddFriend = async () => {
    let cleanId = friendIdInput.trim();
    if (cleanId.startsWith('#')) cleanId = cleanId.slice(1);
    if (!cleanId) {
      Alert.alert(isVi ? 'Thông báo' : 'Notice', isVi ? 'Vui lòng nhập ID hoặc mã người dùng' : 'Please enter user ID or code');
      return;
    }
    try {
      setIsSendingFriendReq(true);
      await sendFriendRequestApi(cleanId);
      Alert.alert(isVi ? '✅ Thành công' : '✅ Success', isVi ? 'Đã gửi lời mời kết bạn thành công!' : 'Friend request sent successfully!');
      setFriendIdInput('');
      loadPendingRequests();
    } catch (e: any) {
      Alert.alert(isVi ? '❌ Lỗi' : '❌ Error', e.message || (isVi ? 'Không thể gửi lời mời kết bạn (ID không tồn tại hoặc đã gửi)' : 'Cannot send friend request (ID does not exist or already sent)'));
    } finally {
      setIsSendingFriendReq(false);
    }
  };

  // ── Sao chép ID cá nhân ──
  const handleCopyId = async () => {
    const myId = user?.id || (user as any)?._id || '';
    if (myId) {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(myId);
        } catch (e) {}
      }
      Alert.alert(isVi ? '✅ Đã sao chép' : '✅ Copied', isVi ? `ID của bạn: ${myId}` : `Your ID: ${myId}`);
    }
  };

  // ── Bắt đầu chat với bạn bè từ danh sách ──
  const handleStartChatWithFriend = (friend: any) => {
    setIsFriendsModalVisible(false);
    const existing = conversations.find(
      (c) => c.friendId === (friend._id || friend.id) || c.id === `real-${friend._id || friend.id}`
    );
    if (existing) {
      setActiveChat(existing);
    } else {
      const newConv: ConversationItem = {
        id: `real-${friend._id || friend.id}`,
        friendId: friend._id || friend.id,
        name: friend.fullName || friend.email || (isVi ? 'Bạn bè' : 'Friend'),
        avatarUrl: friend.avatarUrl || FROG_MASCOT_URI,
        isOnline: true,
        lastMessage: isVi ? 'Bắt đầu cuộc trò chuyện!' : 'Started conversation!',
        lastMessageTime: isVi ? 'Vừa xong' : 'Just now',
        unreadCount: 0,
      };
      setConversations((prev) => [prev[0], newConv, ...prev.slice(1)]);
      setActiveChat(newConv);
    }
  };

  // ── Tải danh sách bạn bè thật từ Backend ──
  useEffect(() => {
    let isMounted = true;
    const fetchFriends = async () => {
      try {
        const realFriends = await getFriendsApi();
        if (isMounted && Array.isArray(realFriends) && realFriends.length > 0) {
          setConversations((prev) => {
            const aiItem = prev.find((c) => c.isAi) || INITIAL_CONVERSATIONS[0];
            const realConvItems: ConversationItem[] = realFriends.map((f: any) => ({
              id: `real-${f._id || f.id}`,
              friendId: f._id || f.id,
              name: f.fullName || f.email || 'Bạn bè',
              avatarUrl: normalizeAvatarUrl(f.avatarUrl) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
              isOnline: true,
              lastMessage: 'Hãy bắt đầu trò chuyện cùng nhau!',
              lastMessageTime: 'Mới',
              unreadCount: 0,
              streak: f.streak || 1,
            }));

            // Ghép bạn bè thật lên đầu (sau AI Bot)
            const sampleFiltered = prev.filter((c) => !c.isAi && !c.id.startsWith('real-'));
            return [aiItem, ...realConvItems, ...sampleFiltered];
          });
        }
      } catch (err) {
        console.log('[MessagesScreen] fetchFriends error (using local list):', err);
      }
    };

    fetchFriends();
    loadPendingRequests();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Tải tin nhắn khi mở cuộc trò chuyện ──
  useEffect(() => {
    if (!activeChat) return;

    if (activeChat.isAi) {
      setChatMessages(AI_INITIAL_MESSAGES);
      return;
    }

    // Nếu là bạn bè thực tế có friendId trong DB
    if (activeChat.friendId) {
      setIsLoadingMessages(true);
      // Xóa badge chưa đọc khi đã mở cuộc trò chuyện
      setConversations((prev) =>
        prev.map((c) =>
          c.friendId === activeChat.friendId || c.id === activeChat.id
            ? { ...c, unreadCount: 0 }
            : c
        )
      );

      getMessagesApi(activeChat.friendId)
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setChatMessages(
              data.map((m: any) => ({
                _id: m._id || String(Math.random()),
                sender: String(m.sender) === String(currentUserId) ? 'me' : 'other',
                receiver: m.receiver,
                text: m.text,
                createdAt: m.createdAt || new Date().toISOString(),
                type: m.type || 'text',
                billData: m.billData,
              }))
            );
          } else {
            // Chưa có tin nhắn DB -> load tin nhắn mẫu
            setChatMessages(SAMPLE_MESSAGES_MAP[activeChat.id] || []);
          }
        })
        .catch((err) => {
          console.log('[MessagesScreen] getMessagesApi error:', err);
          setChatMessages(SAMPLE_MESSAGES_MAP[activeChat.id] || []);
        })
        .finally(() => {
          setIsLoadingMessages(false);
        });
    } else {
      // Tin nhắn mẫu offline
      setChatMessages(SAMPLE_MESSAGES_MAP[activeChat.id] || []);
    }
  }, [activeChat, currentUserId]);

  // ── Lắng nghe tin nhắn mới Realtime qua Socket.io ──
  useEffect(() => {
    if (!lastMessage) return;

    const senderStr = String(lastMessage.sender);
    const receiverStr = String(lastMessage.receiver);
    const activeFriendIdStr = activeChat?.friendId ? String(activeChat.friendId) : '';

    // 1. Nếu đang mở đúng phòng chat với người gửi hoặc người nhận
    if (activeFriendIdStr && (senderStr === activeFriendIdStr || receiverStr === activeFriendIdStr)) {
      setChatMessages((prev) => {
        if (prev.some((m) => m._id === lastMessage._id)) return prev;
        return [
          ...prev,
          {
            _id: lastMessage._id,
            sender: senderStr === String(currentUserId) ? 'me' : 'other',
            receiver: lastMessage.receiver,
            text: lastMessage.text,
            createdAt: lastMessage.createdAt || new Date().toISOString(),
            type: lastMessage.type || 'text',
            billData: lastMessage.billData,
          },
        ];
      });
    }

    // 2. Cập nhật preview tin nhắn mới nhất ngoài danh sách cuộc trò chuyện
    setConversations((prev) =>
      prev.map((c) => {
        const isMatch =
          c.friendId === senderStr ||
          c.friendId === receiverStr ||
          c.id === `real-${senderStr}` ||
          c.id === `real-${receiverStr}`;

        if (isMatch) {
          const isFromMe = senderStr === String(currentUserId);
          const isCurrentActive = activeFriendIdStr === senderStr;
          return {
            ...c,
            lastMessage: isFromMe ? (isVi ? `Bạn: ${lastMessage.text}` : `You: ${lastMessage.text}`) : lastMessage.text,
            lastMessageTime: isVi ? 'Vừa xong' : 'Just now',
            unreadCount: isCurrentActive || isFromMe ? 0 : (c.unreadCount || 0) + 1,
          };
        }
        return c;
      })
    );
  }, [lastMessage, activeChat?.friendId, currentUserId, isVi]);

  // Kiểm tra đối phương trong phòng chat hiện tại có đang gõ không (qua Socket.io hoặc khi test 1 mình)
  const isFriendTyping = activeChat?.friendId ? isUserTyping(activeChat.friendId) : isSampleTyping;

  // Cuộn xuống cuối khi có tin nhắn mới hoặc đang gõ
  useEffect(() => {
    if (chatMessages.length > 0 || isFriendTyping || isAiTyping) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages, isAiTyping, isFriendTyping]);

  // ── Xử lý gửi tin nhắn ──
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeChat) return;

    if (!textToSend) setInputText('');

    const newMsg: ChatMessage = {
      _id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      sender: 'me',
      text,
      createdAt: new Date().toISOString(),
      type: 'text',
    };

    setChatMessages((prev) => [...prev, newMsg]);

    // Cập nhật lại dòng lastMessage ngoài danh sách
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, lastMessage: `Bạn: ${text}`, lastMessageTime: 'Vừa xong' }
          : c
      )
    );

    // 1. Nếu là Chat với Trợ lý AI Monett
    if (activeChat.isAi) {
      setIsAiTyping(true);
      setTimeout(() => {
        generateAiResponse(text);
        setIsAiTyping(false);
      }, 950);
      return;
    }

    // 2. Nếu là Bạn bè thật có friendId
    if (activeChat.friendId) {
      sendTyping(activeChat.friendId, false);
      try {
        if (isConnected) {
          await sendSocketMessage(activeChat.friendId, text);
        } else {
          await sendMessageApi(activeChat.friendId, text);
        }
      } catch (err) {
        console.log('[MessagesScreen] sendMessage error:', err);
      }
    } else {
      // Phản hồi mẫu tự động có cả hiệu ứng typing sinh động khi test 1 mình
      setIsSampleTyping(true);
      setTimeout(() => {
        setIsSampleTyping(false);
        const replyText = getRandomReply(text);
        const autoReply: ChatMessage = {
          _id: `reply-${Date.now()}`,
          sender: 'other',
          text: replyText,
          createdAt: new Date().toISOString(),
          type: 'text',
        };
        setChatMessages((prev) => [...prev, autoReply]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeChat.id
              ? { ...c, lastMessage: replyText, lastMessageTime: isVi ? 'Vừa xong' : 'Just now' }
              : c
          )
        );
      }, 1500);
    }
  };

  // ── Trí tuệ AI Monett phản hồi tài chính thông minh ──
  const generateAiResponse = (userPrompt: string) => {
    const lower = userPrompt.toLowerCase();
    let reply = '';

    if (lower.includes('tiết kiệm') || lower.includes('tiet kiem') || lower.includes('mẹo')) {
      reply =
        '💡 Mẹo tiết kiệm tuần này từ Ếch Monett:\n\n' +
        '1. Quy tắc 24h: Trước khi mua món đồ không thiết yếu, hãy đợi 24 giờ để tránh mua sắm bốc đồng!\n' +
        '2. Tự nấu ăn hoặc mang cơm trưa: Tiết kiệm tới 40-50% chi phí ăn uống so với ăn ngoài.\n' +
        '3. Ghi chép ngay sau khi chi: Dùng tính năng chụp ảnh món ăn của Monett để app tự tổng hợp nhé! 🐸✨';
    } else if (lower.includes('50/30/20') || lower.includes('quy tắc') || lower.includes('ngân sách')) {
      reply =
        '📊 Quy tắc ngân sách vàng 50/30/20:\n\n' +
        '• 50% Nhu cầu thiết yếu: Tiền nhà, điện nước, ăn uống cơ bản, đi lại.\n' +
        '• 30% Sở thích cá nhân: Cà phê, xem phim, mua sắm giải trí.\n' +
        '• 20% Tiết kiệm & Đầu tư: Quỹ khẩn cấp, tích lũy tương lai.\n\n' +
        'Bạn có thể vào tab "Trang chủ" để chỉnh hạn mức ngân sách ngay nhé!';
    } else if (lower.includes('chia bill') || lower.includes('chia tiền') || lower.includes('tính tiền')) {
      reply =
        '🧾 Bạn muốn chia bill nhóm hả?\n\n' +
        'Hãy bấm vào biểu tượng 💸 chiếc ví hoặc "Chia bill" ở thanh bên dưới, nhập số tiền và số người để mình tạo ngay thẻ chia tiền gửi vào nhóm nhé! 🐸';
    } else if (lower.includes('cafe') || lower.includes('cà phê') || lower.includes('ăn trưa') || lower.includes('bún')) {
      reply =
        '☕ Ăn uống nạp năng lượng là điều tuyệt vời! Chỉ cần bạn nhớ bấm "Chụp ảnh món" để Monett giúp bạn lưu lại khoảnh khắc ẩm thực và số tiền nha 🍜';
    } else {
      reply =
        'Ếch Monett đã nhận thông tin! 🐸💚 Mình luôn ở đây 24/7 để đồng hành cùng bạn trên hành trình quản lý tài chính thông minh. Cần kiểm tra ngân sách hay phân tích chi tiêu cứ nhắn mình nhé!';
    }

    const aiMsg: ChatMessage = {
      _id: `ai-${Date.now()}`,
      sender: 'ai',
      text: reply,
      createdAt: new Date().toISOString(),
      type: 'text',
    };
    setChatMessages((prev) => [...prev, aiMsg]);
  };

  // Trả lời mẫu ngẫu nhiên cho bạn bè demo
  const getRandomReply = (prompt: string) => {
    const replies = [
      'Ok bạn nhé! Mình vừa xem xong nè 👍',
      'Đồng ý nha, lát tầm 12h mình gặp ở quán cũ nhé! 🍜',
      'Tuyệt vời luôn! Cảm ơn bạn nhiều nha 🥰',
      'Đã nhận được thông tin rồi nè! 🌿',
      'Để mình kiểm tra lại rồi nhắn bạn liền nha!',
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  };

  // ── Xử lý gửi thẻ Chia tiền / Hóa đơn ──
  const handleSendSplitBill = () => {
    const amt = parseFloat(splitAmount.replace(/\D/g, ''));
    const count = parseInt(splitCount, 10) || 2;
    if (!amt || !splitTitle.trim()) return;

    const perPerson = Math.round(amt / count);

    const billMsg: ChatMessage = {
      _id: `split-${Date.now()}`,
      sender: 'me',
      text: `🧾 Yêu cầu chia tiền: ${splitTitle.trim()}`,
      createdAt: new Date().toISOString(),
      type: 'bill_split',
      billData: {
        title: splitTitle.trim(),
        amount: amt,
        splitCount: count,
        perPerson,
        isSettled: false,
      },
    };

    setChatMessages((prev) => [...prev, billMsg]);
    setIsSplitBillModalVisible(false);
    setSplitTitle('');
    setSplitAmount('');
  };

  // ── Lọc danh sách trò chuyện ──
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Tìm kiếm theo từ khóa
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchMsg = c.lastMessage.toLowerCase().includes(q);
        if (!matchName && !matchMsg) return false;
      }

      // Lọc theo tab
      if (activeTab === 'friends') return !c.isAi;
      if (activeTab === 'ai') return c.isAi;
      if (activeTab === 'unread') return c.unreadCount > 0;
      return true;
    });
  }, [conversations, searchQuery, activeTab]);

  // Format tiền tệ VNĐ
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + 'đ';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // GIAO DIỆN 1: MÀN HÌNH KHUNG CHAT CHI TIẾT (KHI ĐANG TRÒ CHUYỆN)
  // ─────────────────────────────────────────────────────────────────────────
  if (activeChat) {
    const isFriendOnline = activeChat.isAi
      ? true
      : activeChat.friendId
      ? isUserOnline(activeChat.friendId)
      : !!activeChat.isOnline;
    const isFriendTyping = activeChat.friendId ? isUserTyping(activeChat.friendId) : false;

    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Chat Room Header */}
        <View style={styles.chatRoomHeader}>
          <TouchableOpacity
            style={styles.chatBackBtn}
            onPress={() => {
              if (activeChat.friendId) {
                sendTyping(activeChat.friendId, false);
              }
              setActiveChat(null);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#064E3B" />
          </TouchableOpacity>

          <View style={styles.chatHeaderAvatarWrapper}>
            <Image
              source={{ uri: activeChat.avatarUrl || FROG_MASCOT_URI }}
              style={styles.chatHeaderAvatar}
            />
            {isFriendOnline && <View style={styles.onlineBadgeDot} />}
          </View>

          <View style={styles.chatHeaderInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.chatHeaderName} numberOfLines={1}>
                {activeChat.name}
              </Text>
              {activeChat.badge && (
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{activeChat.badge}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.chatHeaderStatus,
                isFriendTyping && { color: '#059669', fontWeight: '700' },
              ]}
            >
              {activeChat.isAi
                ? (isVi ? 'Trợ lý tài chính Monett 24/7' : 'Monett Financial AI 24/7')
                : isFriendTyping
                ? (isVi ? '💬 Đang soạn tin...' : '💬 Typing...')
                : isFriendOnline
                ? (isVi ? '🟢 Đang trực tuyến' : '🟢 Online')
                : (isVi ? 'Hoạt động gần đây' : 'Recently active')}
            </Text>
          </View>

          {/* Quick Actions Header */}
          <View style={styles.chatHeaderActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setIsSplitBillModalVisible(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="wallet-outline" size={20} color="#047857" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => alert(isVi ? 'Đã ghim cuộc trò chuyện này!' : 'Pinned this conversation!')}
              activeOpacity={0.75}
            >
              <Ionicons name="bookmark-outline" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Khung Tin Nhắn Cuộn */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          {isLoadingMessages ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#047857" />
              <Text style={styles.loadingText}>{isVi ? 'Đang tải tin nhắn...' : 'Loading messages...'}</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={chatMessages}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.messagesListContent}
              renderItem={({ item }) => {
                const isMe = item.sender === 'me';
                const isAi = item.sender === 'ai';

                return (
                  <View
                    style={[
                      styles.messageRow,
                      isMe ? styles.messageRowMe : styles.messageRowOther,
                    ]}
                  >
                    {!isMe && (
                      <Image
                        source={{
                          uri: isAi
                            ? FROG_AI_AVATAR
                            : activeChat.avatarUrl || FROG_MASCOT_URI,
                        }}
                        style={styles.messageSenderAvatar}
                      />
                    )}

                    <View style={{ maxWidth: '78%' }}>
                      {/* Bong bóng tin nhắn chia bill */}
                      {item.type === 'bill_split' && item.billData ? (
                        <View style={styles.billCardBubble}>
                          <View style={styles.billCardHeader}>
                            <Ionicons name="receipt" size={18} color="#047857" />
                            <Text style={styles.billCardTitle}>{item.billData.title}</Text>
                          </View>
                          <Text style={styles.billCardTotal}>
                            {isVi ? 'Tổng bill: ' : 'Total: '}{formatCurrency(item.billData.amount)}
                          </Text>
                          <View style={styles.billCardDivider} />
                          <View style={styles.billCardSplitRow}>
                            <Text style={styles.billCardPerPersonLabel}>
                              {isVi ? `Mỗi người (${item.billData.splitCount} người):` : `Per person (${item.billData.splitCount} people):`}
                            </Text>
                            <Text style={styles.billCardPerPersonValue}>
                              {formatCurrency(item.billData.perPerson || 0)}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.billSettleBtn,
                              item.billData.isSettled && styles.billSettleBtnDone,
                            ]}
                            onPress={() => {
                              item.billData!.isSettled = !item.billData!.isSettled;
                              setChatMessages([...chatMessages]);
                            }}
                          >
                            <Ionicons
                              name={item.billData.isSettled ? 'checkmark-circle' : 'card-outline'}
                              size={16}
                              color="#FFFFFF"
                            />
                            <Text style={styles.billSettleBtnText}>
                              {item.billData.isSettled ? (isVi ? 'Đã thanh toán ✅' : 'Paid / Settled ✅') : (isVi ? 'Xác nhận chia tiền' : 'Confirm Split')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        /* Bong bóng văn bản thông thường */
                        <View
                          style={[
                            styles.bubble,
                            isMe
                              ? styles.bubbleMe
                              : isAi
                              ? styles.bubbleAi
                              : styles.bubbleOther,
                          ]}
                        >
                          <Text
                            style={[
                              styles.bubbleText,
                              isMe ? styles.bubbleTextMe : styles.bubbleTextOther,
                            ]}
                          >
                            {item.text}
                          </Text>
                        </View>
                      )}

                      <Text
                        style={[
                          styles.messageTimestamp,
                          isMe ? { textAlign: 'right' } : { textAlign: 'left' },
                        ]}
                      >
                        {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListFooterComponent={
                isAiTyping ? (
                  <View style={[styles.messageRow, styles.messageRowOther]}>
                    <Image source={{ uri: FROG_AI_AVATAR }} style={styles.messageSenderAvatar} />
                    <View style={styles.aiTypingBubble}>
                      <ActivityIndicator size="small" color="#047857" />
                      <Text style={styles.aiTypingText}>{isVi ? 'Ếch Monett đang suy nghĩ...' : 'Monett Frog is thinking...'}</Text>
                    </View>
                  </View>
                ) : isFriendTyping ? (
                  <View style={[styles.messageRow, styles.messageRowOther]}>
                    <Image
                      source={{ uri: activeChat?.avatarUrl || FROG_MASCOT_URI }}
                      style={styles.messageSenderAvatar}
                    />
                    <View style={styles.typingBubble}>
                      <TypingDots />
                      <Text style={styles.typingText}>
                        {isVi ? `${activeChat?.name || 'Bạn bè'} đang soạn tin...` : `${activeChat?.name || 'Friend'} is typing...`}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ height: 12 }} />
                )
              }
            />
          )}

          {/* Quick Suggestions Bar (Gợi ý nhanh phía trên ô gõ phím) */}
          <View style={styles.quickChipsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsContent}>
              {activeChat.isAi ? (
                <>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => handleSendMessage(isVi ? '💡 Mẹo tiết kiệm tuần này' : '💡 Weekly saving tips')}
                  >
                    <Text style={styles.quickChipText}>{isVi ? '💡 Mẹo tiết kiệm' : '💡 Saving tips'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => handleSendMessage(isVi ? '📊 Quy tắc 50/30/20 là gì?' : '📊 What is 50/30/20 rule?')}
                  >
                    <Text style={styles.quickChipText}>{isVi ? '📊 Quy tắc 50/30/20' : '📊 50/30/20 Rule'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => setIsSplitBillModalVisible(true)}
                  >
                    <Text style={styles.quickChipText}>{isVi ? '🧾 Chia hóa đơn' : '🧾 Split Bill'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => handleSendMessage(isVi ? 'Làm sao để hạn chế mua sắm linh tinh?' : 'How to stop impulse shopping?')}
                  >
                    <Text style={styles.quickChipText}>{isVi ? '🎯 Tránh mua sắm bốc đồng' : '🎯 Avoid impulse buy'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => handleSendMessage(isVi ? 'Chào bạn! 👋' : 'Hello! 👋')}
                  >
                    <Text style={styles.quickChipText}>{isVi ? 'Chào bạn! 👋' : 'Hello! 👋'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => handleSendMessage(isVi ? 'Trưa nay ăn gì nhỉ? 🍲' : 'What for lunch today? 🍲')}
                  >
                    <Text style={styles.quickChipText}>{isVi ? 'Ăn gì nhỉ? 🍲' : 'What for lunch? 🍲'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => setIsSplitBillModalVisible(true)}
                  >
                    <Text style={styles.quickChipText}>{isVi ? '💸 Chia bill ăn uống' : '💸 Split food bill'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => handleSendMessage(isVi ? 'Mình vừa gửi tiền nhé! 👍' : 'I just sent money! 👍')}
                  >
                    <Text style={styles.quickChipText}>{isVi ? 'Đã gửi tiền 👍' : 'Sent money 👍'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>

          {/* Input Bar */}
          <View style={styles.chatInputBar}>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={() => setIsSplitBillModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={26} color="#047857" />
            </TouchableOpacity>

            <TextInput
              style={styles.chatTextInput}
              placeholder={activeChat.isAi ? (isVi ? 'Hỏi Ếch Monett về tài chính...' : 'Ask Frog Monett about finance...') : (isVi ? 'Nhập tin nhắn...' : 'Type a message...')}
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (activeChat.friendId) {
                  sendTyping(activeChat.friendId, text.trim().length > 0);
                }
              }}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                !inputText.trim() && styles.sendBtnDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Modal Chia Bill */}
        <Modal
          visible={isSplitBillModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsSplitBillModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="receipt" size={22} color="#047857" />
                  <Text style={styles.modalTitle}>{isVi ? 'Chia hóa đơn / Yêu cầu tiền' : 'Split Bill / Request Money'}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsSplitBillModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>{isVi ? 'Tên khoản chi / Món ăn' : 'Expense / Food Title'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={isVi ? 'Ví dụ: Ăn trưa bún bò, Cà phê Phúc Long...' : 'e.g. Lunch with friends, Coffee...'}
                placeholderTextColor="#94A3B8"
                value={splitTitle}
                onChangeText={setSplitTitle}
              />

              <Text style={styles.inputLabel}>{isVi ? 'Tổng số tiền (VNĐ)' : 'Total Amount (VND)'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={isVi ? 'Ví dụ: 120000' : 'e.g. 120000'}
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={splitAmount}
                onChangeText={setSplitAmount}
              />

              <Text style={styles.inputLabel}>{isVi ? 'Số người chia' : 'Number of people'}</Text>
              <View style={styles.splitCountRow}>
                {['2', '3', '4', '5'].map((cnt) => (
                  <TouchableOpacity
                    key={cnt}
                    style={[
                      styles.splitCountBtn,
                      splitCount === cnt && styles.splitCountBtnActive,
                    ]}
                    onPress={() => setSplitCount(cnt)}
                  >
                    <Text
                      style={[
                        styles.splitCountBtnText,
                        splitCount === cnt && styles.splitCountBtnTextActive,
                      ]}
                    >
                      {cnt} {isVi ? 'người' : 'people'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {splitAmount ? (
                <View style={styles.splitResultBox}>
                  <Text style={styles.splitResultLabel}>{isVi ? 'Mỗi người đóng:' : 'Each person pays:'}</Text>
                  <Text style={styles.splitResultValue}>
                    {formatCurrency(
                      Math.round(
                        (parseFloat(splitAmount.replace(/\D/g, '')) || 0) /
                          (parseInt(splitCount, 10) || 1)
                      )
                    )}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.sendBillConfirmBtn}
                onPress={handleSendSplitBill}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.sendBillConfirmBtnText}>{isVi ? 'Gửi thẻ chia tiền vào Chat' : 'Send Split Bill to Chat'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GIAO DIỆN 2: DANH SÁCH TIN NHẮN (INBOX LIST CHÍNH)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header Bar: Tin nhắn + Nút Tạo mới & Tìm kiếm */}
      <View style={styles.inboxHeader}>
        <View style={styles.inboxHeaderTitleRow}>
          <View style={styles.brandBadgeIcon}>
            <Ionicons name="chatbubbles" size={20} color="#047857" />
          </View>
          <View>
            <Text style={styles.inboxTitle}>{isVi ? 'Tin nhắn' : 'Messages'}</Text>
            <Text style={styles.inboxSubtitle}>{isVi ? 'Kết nối & Chia sẻ chi tiêu' : 'Connect & Share Expenses'}</Text>
          </View>
        </View>

        <View style={styles.inboxHeaderActions}>
          <TouchableOpacity
            style={styles.circleActionBtn}
            onPress={() => setIsSearching(!isSearching)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isSearching ? 'close' : 'search-outline'}
              size={18}
              color="#064E3B"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circleActionBtn, { backgroundColor: '#ECFDF5', position: 'relative' }]}
            onPress={() => {
              setIsFriendsModalVisible(true);
              loadPendingRequests();
              loadFriendsData();
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="person-add" size={18} color="#047857" />
            {pendingRequests.length > 0 && <View style={styles.headerFriendBadgeDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Thanh Tìm kiếm (Hiển thị khi bật tìm kiếm) */}
      {isSearching && (
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder={isVi ? 'Tìm theo tên bạn bè, nội dung tin nhắn...' : 'Search by friend name, messages...'}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* 3. Bạn bè đang hoạt động (Online Friends Stories Carousel) */}
      <View style={styles.activeStoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeStoriesScroll}
        >
          {/* Mục 1: Trợ lý Ếch AI Luôn Sẵn sàng */}
          <TouchableOpacity
            style={styles.storyItem}
            onPress={() => {
              const aiItem = conversations.find((c) => c.isAi) || INITIAL_CONVERSATIONS[0];
              setActiveChat(aiItem);
            }}
            activeOpacity={0.75}
          >
            <View style={styles.storyAiRing}>
              <Image source={{ uri: FROG_AI_AVATAR }} style={styles.storyAvatar} />
              <View style={styles.storyAiBadge}>
                <Ionicons name="sparkles" size={10} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.storyNameText} numberOfLines={1}>
              {isVi ? 'Ếch AI 🌟' : 'AI Frog 🌟'}
            </Text>
          </TouchableOpacity>

          {/* Các bạn bè đang online */}
          {conversations
            .filter((c) => !c.isAi)
            .map((item) => {
              const isOnline = item.friendId ? isUserOnline(item.friendId) : !!item.isOnline;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.storyItem}
                  onPress={() => setActiveChat(item)}
                  activeOpacity={0.75}
                >
                  <View style={styles.storyAvatarRing}>
                    <Image
                      source={{ uri: item.avatarUrl || FROG_MASCOT_URI }}
                      style={styles.storyAvatar}
                    />
                    {isOnline && <View style={styles.storyOnlineDot} />}
                  </View>
                  <Text style={styles.storyNameText} numberOfLines={1}>
                    {item.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      </View>

      {/* 4. Tab lọc phân loại: Tất cả / Bạn bè / Trợ lý AI / Chưa đọc */}
      <View style={styles.filterTabsRow}>
        <TouchableOpacity
          style={[styles.filterTabPill, activeTab === 'all' && styles.filterTabPillActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text
            style={[
              styles.filterTabPillText,
              activeTab === 'all' && styles.filterTabPillTextActive,
            ]}
          >
            {isVi ? `Tất cả (${conversations.length})` : `All (${conversations.length})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTabPill, activeTab === 'friends' && styles.filterTabPillActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text
            style={[
              styles.filterTabPillText,
              activeTab === 'friends' && styles.filterTabPillTextActive,
            ]}
          >
            {isVi ? 'Bạn bè' : 'Friends'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTabPill, activeTab === 'ai' && styles.filterTabPillActive]}
          onPress={() => setActiveTab('ai')}
        >
          <Text
            style={[
              styles.filterTabPillText,
              activeTab === 'ai' && styles.filterTabPillTextActive,
            ]}
          >
            {isVi ? 'Trợ lý AI 🐸' : 'AI Bot 🐸'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTabPill, activeTab === 'unread' && styles.filterTabPillActive]}
          onPress={() => setActiveTab('unread')}
        >
          <Text
            style={[
              styles.filterTabPillText,
              activeTab === 'unread' && styles.filterTabPillTextActive,
            ]}
          >
            {isVi ? 'Chưa đọc' : 'Unread'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 5. Danh sách các cuộc trò chuyện */}
      <ScrollView
        style={styles.conversationsScroll}
        contentContainerStyle={styles.conversationsScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredConversations.length === 0 ? (
          <View style={styles.emptyInboxState}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyInboxTitle}>{isVi ? 'Không tìm thấy cuộc trò chuyện nào' : 'No conversations found'}</Text>
            <Text style={styles.emptyInboxSubtitle}>
              {isVi ? 'Thử tìm kiếm với tên khác hoặc bắt đầu trò chuyện cùng Ếch Monett nhé!' : 'Try searching for another name or start chatting with Monett Frog!'}
            </Text>
          </View>
        ) : (
          filteredConversations.map((item) => {
            const isOnline = item.isAi
              ? true
              : item.friendId
              ? isUserOnline(item.friendId)
              : !!item.isOnline;
            const isTyping = item.friendId ? isUserTyping(item.friendId) : false;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.conversationItemCard,
                  item.isAi && styles.conversationItemCardAi,
                ]}
                onPress={() => setActiveChat(item)}
                activeOpacity={0.7}
              >
                {/* Avatar */}
                <View style={styles.convAvatarContainer}>
                  <Image
                    source={{ uri: item.avatarUrl || FROG_MASCOT_URI }}
                    style={styles.convAvatar}
                  />
                  {isOnline && <View style={styles.convOnlineDot} />}
                  {item.isAi && (
                    <View style={styles.convAiPinIcon}>
                      <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </View>

                {/* Thông tin ở giữa */}
                <View style={styles.convCenterInfo}>
                  <View style={styles.convNameRow}>
                    <Text
                      style={[
                        styles.convNameText,
                        item.isAi && { color: '#064E3B', fontWeight: '800' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.badge && (
                      <View
                        style={[
                          styles.convBadgePill,
                          item.isAi && { backgroundColor: '#D1FAE5' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.convBadgePillText,
                            item.isAi && { color: '#047857' },
                          ]}
                        >
                          {item.badge}
                        </Text>
                      </View>
                    )}
                  </View>

                  {isTyping ? (
                    <Text
                      style={[
                        styles.convLastMessageText,
                        { color: '#059669', fontStyle: 'italic', fontWeight: '600' },
                      ]}
                      numberOfLines={1}
                    >
                      {isVi ? '💬 Đang soạn tin...' : '💬 Typing...'}
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.convLastMessageText,
                        item.unreadCount > 0 && styles.convLastMessageUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.lastMessage}
                    </Text>
                  )}
                </View>

                {/* Cột phải: Thời gian & Unread Badge */}
                <View style={styles.convRightColumn}>
                  <Text style={styles.convTimeText}>{item.lastMessageTime}</Text>
                  {item.unreadCount > 0 ? (
                    <View style={styles.unreadCounterBadge}>
                      <Text style={styles.unreadCounterText}>{item.unreadCount}</Text>
                    </View>
                  ) : item.streak ? (
                    <View style={styles.streakSmallBadge}>
                      <Text style={styles.streakSmallText}>🔥 {item.streak}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── MODAL: BẠN BÈ, KẾT BẠN & QR CODE HUB ── */}
      <Modal
        visible={isFriendsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFriendsModalVisible(false)}
      >
        <View style={styles.friendsModalOverlay}>
          <View style={styles.friendsModalCard}>
            {/* Modal Header */}
            <View style={styles.friendsModalHeader}>
              <View style={styles.friendsModalHeaderTitleRow}>
                <View style={styles.friendsModalHeaderIcon}>
                  <Ionicons name="people" size={20} color="#047857" />
                </View>
                <View>
                  <Text style={styles.friendsModalTitle}>{isVi ? 'Bạn bè & Kết nối' : 'Friends & Connect'}</Text>
                  <Text style={styles.friendsModalSubtitle}>{isVi ? 'Mã QR, tìm bạn & danh sách bạn bè' : 'QR code, find friends & friends list'}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.friendsModalCloseBtn}
                onPress={() => setIsFriendsModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Segmented Tabs */}
            <View style={styles.friendsTabsNav}>
              <TouchableOpacity
                style={[styles.friendsTabBtn, friendsModalTab === 'qr' && styles.friendsTabBtnActive]}
                onPress={() => setFriendsModalTab('qr')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={16}
                  color={friendsModalTab === 'qr' ? '#047857' : '#64748B'}
                />
                <Text style={[styles.friendsTabText, friendsModalTab === 'qr' && styles.friendsTabTextActive]}>
                  {isVi ? 'Mã QR & Thêm' : 'QR & Add'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.friendsTabBtn, friendsModalTab === 'requests' && styles.friendsTabBtnActive]}
                onPress={() => {
                  setFriendsModalTab('requests');
                  loadPendingRequests();
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={friendsModalTab === 'requests' ? '#047857' : '#64748B'}
                />
                <Text style={[styles.friendsTabText, friendsModalTab === 'requests' && styles.friendsTabTextActive]}>
                  {isVi ? 'Lời mời' : 'Requests'}
                </Text>
                {pendingRequests.length > 0 && (
                  <View style={styles.friendsTabBadge}>
                    <Text style={styles.friendsTabBadgeText}>{pendingRequests.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.friendsTabBtn, friendsModalTab === 'list' && styles.friendsTabBtnActive]}
                onPress={() => {
                  setFriendsModalTab('list');
                  loadFriendsData();
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={friendsModalTab === 'list' ? '#047857' : '#64748B'}
                />
                <Text style={[styles.friendsTabText, friendsModalTab === 'list' && styles.friendsTabTextActive]}>
                  {isVi ? `Bạn bè (${dbFriendsList.length})` : `Friends (${dbFriendsList.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Contents */}
            <ScrollView
              style={styles.friendsModalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* TAB 1: MÃ QR & KẾT BẠN BẰNG ID */}
              {friendsModalTab === 'qr' && (
                <View style={styles.friendsTabContent}>
                  {/* Card Thêm bạn bằng ID */}
                  <View style={styles.friendSectionCard}>
                    <View style={styles.friendSectionHeader}>
                      <Ionicons name="person-add-outline" size={18} color="#047857" />
                      <Text style={styles.friendSectionTitle}>{isVi ? 'Thêm bạn bằng ID người dùng' : 'Add Friend by User ID'}</Text>
                    </View>
                    <Text style={styles.friendSectionDesc}>
                      {isVi ? 'Dán hoặc nhập mã ID người dùng Monett để gửi lời mời kết bạn trực tiếp' : 'Paste or enter a Monett User ID to send a direct friend request'}
                    </Text>
                    <View style={styles.friendInputRow}>
                      <TextInput
                        style={styles.friendIdInput}
                        placeholder={isVi ? 'Dán ID bạn bè (VD: 660f...)' : 'Paste friend ID (e.g. 660f...)'}
                        placeholderTextColor="#94A3B8"
                        value={friendIdInput}
                        onChangeText={setFriendIdInput}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={[
                          styles.friendSendBtn,
                          isSendingFriendReq && { opacity: 0.7 }
                        ]}
                        onPress={handleAddFriend}
                        disabled={isSendingFriendReq}
                        activeOpacity={0.8}
                      >
                        {isSendingFriendReq ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="paper-plane" size={14} color="#FFFFFF" />
                            <Text style={styles.friendSendBtnText}>{isVi ? 'Kết bạn' : 'Add'}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Card QR Code cá nhân */}
                  <View style={styles.friendSectionCard}>
                    <View style={styles.friendSectionHeader}>
                      <Ionicons name="qr-code" size={18} color="#047857" />
                      <Text style={styles.friendSectionTitle}>{isVi ? 'Mã QR cá nhân của bạn' : 'Your Personal QR Code'}</Text>
                    </View>
                    <Text style={styles.friendSectionDesc}>
                      {isVi ? 'Chia sẻ mã QR này để bạn bè quét hoặc gửi ID để họ kết bạn với bạn' : 'Share this QR code for friends to scan or send your ID to connect'}
                    </Text>

                    <View style={styles.qrCodeWrapper}>
                      <View style={styles.qrCodeBox}>
                        <QRCode
                          value={user?.id || (user as any)?._id || 'monett-user'}
                          size={156}
                          fgColor="#047857"
                        />
                      </View>
                    </View>

                    <View style={styles.userIdDisplayBox}>
                      <Text style={styles.userIdLabel}>{isVi ? 'ID Monett của bạn:' : 'Your Monett ID:'}</Text>
                      <Text style={styles.userIdText} numberOfLines={1} selectable>
                        {user?.id || (user as any)?._id || '...'}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyIdBtn}
                        onPress={handleCopyId}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="copy-outline" size={14} color="#047857" />
                        <Text style={styles.copyIdBtnText}>{isVi ? 'Sao chép ID' : 'Copy ID'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 2: LỜI MỜI KẾT BẠN */}
              {friendsModalTab === 'requests' && (
                <View style={styles.friendsTabContent}>
                  {pendingRequests.length === 0 ? (
                    <View style={styles.friendsEmptyState}>
                      <View style={styles.friendsEmptyIconBox}>
                        <Ionicons name="mail-open-outline" size={36} color="#94A3B8" />
                      </View>
                      <Text style={styles.friendsEmptyTitle}>{isVi ? 'Không có lời mời kết bạn nào' : 'No friend requests'}</Text>
                      <Text style={styles.friendsEmptyDesc}>
                        {isVi ? 'Khi ai đó gửi lời mời kết bạn cho bạn, yêu cầu sẽ hiển thị tại đây.' : 'When someone sends you a friend request, it will appear here.'}
                      </Text>
                    </View>
                  ) : (
                    pendingRequests.map((req) => (
                      <View key={req._id} style={styles.friendRequestCard}>
                        <View style={styles.friendRequestInfo}>
                          <View style={styles.friendRequestAvatarBox}>
                            <Ionicons name="person" size={20} color="#047857" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.friendRequestName}>
                              {req.requester?.fullName || req.requester?.email || (isVi ? 'Người dùng' : 'User')}
                            </Text>
                            <Text style={styles.friendRequestEmail}>
                              {req.requester?.email || (isVi ? 'Đã gửi lời mời kết bạn' : 'Sent a friend request')}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.friendRequestActions}>
                          <TouchableOpacity
                            style={styles.friendAcceptBtn}
                            onPress={() => handleRespondRequest(req._id, 'accepted')}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="checkmark-sharp" size={14} color="#FFFFFF" />
                            <Text style={styles.friendAcceptBtnText}>{isVi ? 'Đồng ý' : 'Accept'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.friendDeclineBtn}
                            onPress={() => handleRespondRequest(req._id, 'rejected')}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="close" size={14} color="#64748B" />
                            <Text style={styles.friendDeclineBtnText}>{isVi ? 'Từ chối' : 'Decline'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* TAB 3: DANH SÁCH BẠN BÈ */}
              {friendsModalTab === 'list' && (
                <View style={styles.friendsTabContent}>
                  {/* Mục chat cùng Trợ lý Ếch Monett AI */}
                  <TouchableOpacity
                    style={styles.aiQuickChatCard}
                    onPress={() => {
                      setIsFriendsModalVisible(false);
                      const ai = conversations.find((c) => c.isAi) || INITIAL_CONVERSATIONS[0];
                      setActiveChat(ai);
                    }}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: FROG_AI_AVATAR }} style={styles.friendListAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendListName}>{isVi ? 'Trợ lý Ếch Monett AI 🌟' : 'Monett Frog AI Assistant 🌟'}</Text>
                      <Text style={styles.friendListEmail}>{isVi ? 'Hỏi đáp ngân sách, mẹo tiết kiệm 24/7' : 'Budget Q&A, saving tips 24/7'}</Text>
                    </View>
                    <View style={styles.aiBadgePill}>
                      <Text style={styles.aiBadgePillText}>AI Bot</Text>
                    </View>
                  </TouchableOpacity>

                  {isLoadingFriendsList ? (
                    <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#047857" />
                      <Text style={{ marginTop: 8, fontSize: 13, color: '#64748B' }}>{isVi ? 'Đang tải danh sách bạn bè...' : 'Loading friends list...'}</Text>
                    </View>
                  ) : dbFriendsList.length === 0 ? (
                    <View style={styles.friendsEmptyState}>
                      <View style={styles.friendsEmptyIconBox}>
                        <Ionicons name="people-outline" size={36} color="#94A3B8" />
                      </View>
                      <Text style={styles.friendsEmptyTitle}>{isVi ? 'Chưa có bạn bè kết nối' : 'No friends connected yet'}</Text>
                      <Text style={styles.friendsEmptyDesc}>
                        {isVi ? 'Hãy qua tab "Mã QR & Thêm" chia sẻ mã QR hoặc nhập ID của bạn bè để kết nối nhé!' : 'Go to "QR & Add" tab to share QR code or enter your friend ID to connect!'}
                      </Text>
                    </View>
                  ) : (
                    dbFriendsList.map((friend) => (
                      <View key={friend._id} style={styles.friendListItem}>
                        <Image
                          source={{ uri: friend.avatarUrl || FROG_MASCOT_URI }}
                          style={styles.friendListAvatar}
                        />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.friendListName}>{friend.fullName}</Text>
                            {isUserOnline(friend._id) && <View style={styles.onlineStatusDot} />}
                          </View>
                          <Text style={styles.friendListEmail}>{friend.email || (isVi ? 'Bạn bè Monett' : 'Monett Friend')}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.friendStartChatBtn}
                          onPress={() => handleStartChatWithFriend(friend)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="chatbubble-ellipses" size={14} color="#047857" />
                          <Text style={styles.friendStartChatBtnText}>{isVi ? 'Nhắn tin' : 'Message'}</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              )}

              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Backwards compatibility alias
export const CalendarScreen = MessagesScreen;
export default MessagesScreen;

// ─── STYLES ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ── Header Inbox ──
  inboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  inboxHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandBadgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  inboxTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#064E3B',
    letterSpacing: -0.3,
  },
  inboxSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  inboxHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Search Bar ──
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },

  // ── Active Friends Stories ──
  activeStoriesSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activeStoriesScroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: 60,
  },
  storyAvatarRing: {
    position: 'relative',
    padding: 2,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  storyAiRing: {
    position: 'relative',
    padding: 2,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  storyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  storyOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  storyAiBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  storyNameText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },

  // ── Category Filter Pills ──
  filterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FAFAF9',
  },
  filterTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  filterTabPillActive: {
    backgroundColor: '#064E3B',
  },
  filterTabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterTabPillTextActive: {
    color: '#FFFFFF',
  },

  // ── Conversations List ──
  conversationsScroll: {
    flex: 1,
  },
  conversationsScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  conversationItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.03)' } as any,
    }),
  },
  conversationItemCardAi: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  convAvatarContainer: {
    position: 'relative',
  },
  convAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
  },
  convOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  convAiPinIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  convCenterInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  convNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  convNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  convBadgePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  convBadgePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  convLastMessageText: {
    fontSize: 13,
    color: '#64748B',
  },
  convLastMessageUnread: {
    color: '#0F172A',
    fontWeight: '700',
  },
  convRightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  convTimeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  unreadCounterBadge: {
    backgroundColor: '#047857',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  streakSmallBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  streakSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },

  emptyInboxState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyInboxTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptyInboxSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  // ── Chat Room Header ──
  chatRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  chatBackBtn: {
    padding: 6,
    marginRight: 4,
  },
  chatHeaderAvatarWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  chatHeaderStatus: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
    marginTop: 1,
  },
  badgePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Message Bubbles ──
  messagesListContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageSenderAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
    marginBottom: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: '#047857',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  bubbleAi: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
  },
  bubbleTextOther: {
    color: '#0F172A',
  },
  messageTimestamp: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    marginHorizontal: 4,
  },

  // ── Bill Card In Chat ──
  billCardBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.06)' } as any,
    }),
  },
  billCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  billCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#064E3B',
  },
  billCardTotal: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  billCardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  billCardSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  billCardPerPersonLabel: {
    fontSize: 12,
    color: '#475569',
  },
  billCardPerPersonValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#047857',
  },
  billSettleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  billSettleBtnDone: {
    backgroundColor: '#10B981',
  },
  billSettleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── AI Typing Bubble ──
  aiTypingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  aiTypingText: {
    fontSize: 12,
    color: '#047857',
    fontStyle: 'italic',
  },

  // ── Quick Chips ──
  quickChipsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 6,
  },
  quickChipsContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  quickChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },

  // ── Chat Input Bar ──
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  attachBtn: {
    padding: 4,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 90,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
      android: { elevation: 6 },
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } as any,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#064E3B',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  splitCountRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  splitCountBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  splitCountBtnActive: {
    backgroundColor: '#047857',
  },
  splitCountBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  splitCountBtnTextActive: {
    color: '#FFFFFF',
  },
  splitResultBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  splitResultLabel: {
    fontSize: 13,
    color: '#064E3B',
    fontWeight: '600',
  },
  splitResultValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#047857',
  },
  sendBillConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    marginTop: 10,
  },
  sendBillConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── New Chat Contact Item ──
  newChatContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  newChatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  newChatName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  newChatDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // ── Header Friend Badge Dot ──
  headerFriendBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // ── Friends & QR Hub Modal ──
  friendsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  friendsModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingTop: 18,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  friendsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  friendsModalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  friendsModalHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  friendsModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: -0.3,
  },
  friendsModalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  friendsModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsTabsNav: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginTop: 14,
    marginBottom: 12,
    gap: 4,
  },
  friendsTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 11,
    gap: 5,
  },
  friendsTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  friendsTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  friendsTabTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  friendsTabBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  friendsTabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  friendsModalScroll: {
    maxHeight: '100%',
  },
  friendsTabContent: {
    paddingVertical: 8,
  },
  friendSectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  friendSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  friendSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  friendSectionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  friendInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  friendIdInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  friendSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  friendSendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  qrCodeWrapper: {
    alignItems: 'center',
    marginVertical: 10,
  },
  qrCodeBox: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  userIdDisplayBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  userIdLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  userIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  copyIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
    marginTop: 4,
  },
  copyIdBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  friendsEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  friendsEmptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  friendsEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  friendsEmptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  friendRequestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  friendRequestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  friendRequestAvatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  friendRequestName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  friendRequestEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  friendRequestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  friendAcceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  friendAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  friendDeclineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  friendDeclineBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  aiQuickChatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 12,
  },
  aiBadgePill: {
    backgroundColor: '#047857',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiBadgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  friendListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  friendListAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  onlineStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  friendListName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  friendListEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  friendStartChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
  },
  friendStartChatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 8,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  typingText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
});
