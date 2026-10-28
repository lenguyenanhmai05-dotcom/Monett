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
import {
  getMessagesApi,
  sendMessageApi,
  addMomentCommentApi,
  normalizeAvatarUrl,
  getGroupMessagesApi,
  sendGroupMessageApi,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import { GroupIconSvg } from './GroupIconSvg';
import { formatMessengerActiveTime } from '../utils/dateUtils';

// ─── THEMES MESSENGER ────────────────────────────────────────────────────────
export interface ChatTheme {
  id: string;
  name: string;
  primary: string;
  gradientSecondary: string;
  bubbleText: string;
  lightBg: string;
}

export const CHAT_THEMES: Record<string, ChatTheme> = {
  emerald: {
    id: 'emerald',
    name: 'Monett Xanh Ngọc',
    primary: '#059669',
    gradientSecondary: '#10B981',
    bubbleText: '#FFFFFF',
    lightBg: '#ECFDF5',
  },
  pink: {
    id: 'pink',
    name: 'Kẹo Ngọt Hồng',
    primary: '#EC4899',
    gradientSecondary: '#F472B6',
    bubbleText: '#FFFFFF',
    lightBg: '#FDF2F8',
  },
  purple: {
    id: 'purple',
    name: 'Hoàng Hôn Tím',
    primary: '#8B5CF6',
    gradientSecondary: '#A78BFA',
    bubbleText: '#FFFFFF',
    lightBg: '#F5F3FF',
  },
  ocean: {
    id: 'ocean',
    name: 'Đại Dương Xanh',
    primary: '#0284C7',
    gradientSecondary: '#38BDF8',
    bubbleText: '#FFFFFF',
    lightBg: '#F0F9FF',
  },
  orange: {
    id: 'orange',
    name: 'Năng Lượng Cam',
    primary: '#EA580C',
    gradientSecondary: '#FB923C',
    bubbleText: '#FFFFFF',
    lightBg: '#FFF7ED',
  },
  midnight: {
    id: 'midnight',
    name: 'Dạ Hội Đen',
    primary: '#334155',
    gradientSecondary: '#475569',
    bubbleText: '#FFFFFF',
    lightBg: '#F8FAFC',
  },
};

// ─── SPLIT BILL DATA MODEL ──────────────────────────────────────────────────
export interface BillSplitData {
  id: string;
  title: string;
  totalAmount: number;
  perPersonAmount: number;
  numPeople: number;
  paidMembers: string[]; // List of user IDs who have confirmed payment
  receipts: Record<string, string>; // userId -> receipt base64/url
  createdBy: string;
  creatorName: string;
}

export interface Message {
  _id: string;
  sender: any;
  senderName?: string;
  receiver: string;
  text: string;
  createdAt: string;
  imageUrl?: string;
  bill?: BillSplitData;
  isSystem?: boolean;
}

export interface ChatMomentReplyData {
  id: string;
  photo: string;
  caption?: string;
  userName?: string;
}

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  friend: any;
  initialMomentReply?: ChatMomentReplyData | null;
  onCommentSent?: (momentId: string, commentText: string) => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  visible,
  onClose,
  friend,
  initialMomentReply,
  onCommentSent,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 640;
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { isUserOnline, refreshOnlineUsers, socket } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [momentReply, setMomentReply] = useState<ChatMomentReplyData | null>(null);

  useEffect(() => {
    if (visible && initialMomentReply) {
      setMomentReply(initialMomentReply);
    }
  }, [visible, initialMomentReply]);

  // Yêu cầu cập nhật danh sách người dùng online ngay khi mở khung chat
  useEffect(() => {
    if (visible) {
      if (refreshOnlineUsers) refreshOnlineUsers();
      if (socket?.connected) socket.emit('get_online_users');
    }
  }, [visible, refreshOnlineUsers, socket]);

  // Modals inside chat
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Split bill inputs
  const [billTitle, setBillTitle] = useState('');
  const [billTotal, setBillTotal] = useState('');
  const [billPeopleCount, setBillPeopleCount] = useState<number>(3);

  // Nickname input
  const [customNickname, setCustomNickname] = useState('');

  const flatListRef = useRef<FlatList>(null);

  const currentUserId = String(user?.id || (user as any)?._id || 'user_me');
  const currentUserName = (user as any)?.fullName || 'Tôi';

  const isGroup = !!friend?.isGroup;
  const convId = isGroup
    ? String(friend?.id || friend?._id || 'group_default')
    : String(
        friend?._id ||
        friend?.id ||
        friend?.friendId ||
        (friend?.requester && (String(friend?.requester?._id || friend?.requester?.id) === String(currentUserId)
          ? (friend?.recipient?._id || friend?.recipient?.id)
          : (friend?.requester?._id || friend?.requester?.id))) ||
        ''
      );

  // Danh sách toàn bộ các ID khả dĩ của đối phương để kiểm tra online realtime chính xác nhất
  const candidateFriendIds = [
    convId,
    friend?._id,
    friend?.id,
    friend?.friendId,
    friend?.userId,
    friend?.user?._id,
    friend?.user?.id,
    friend?.recipient?._id,
    friend?.recipient?.id,
    friend?.requester?._id,
    friend?.requester?.id,
  ].filter(Boolean).map(String);

  const isSocketOnline = !isGroup && candidateFriendIds.some((cid) => isUserOnline(cid));
  const isPropOnline = !isGroup && (
    friend?.isOnline === true ||
    friend?.status === 'online' ||
    friend?.online === true
  );
  const isOnline = isSocketOnline || isPropOnline;

  // Trạng thái hoạt động gần đây (nếu có streak hoặc điểm danh)
  const isRecentlyActive = !isGroup && !isOnline && (
    friend?.activeToday === true ||
    (friend?.streak && friend.streak > 0)
  );
  const rawFriendName =
    friend?.name ||
    friend?.fullName ||
    friend?.user?.fullName ||
    friend?.user?.name ||
    friend?.recipient?.fullName ||
    friend?.requester?.fullName ||
    friend?.email ||
    (isGroup ? 'Nhóm trò chuyện' : 'Bạn bè');

  const friendAvatar = isGroup
    ? null
    : normalizeAvatarUrl(
        friend?.avatarUrl ||
        friend?.avatar ||
        friend?.user?.avatarUrl ||
        friend?.user?.avatar ||
        friend?.recipient?.avatarUrl ||
        friend?.recipient?.avatar ||
        friend?.requester?.avatarUrl ||
        friend?.requester?.avatar
      );
  const groupIcon = isGroup ? (friend?.icon || '👥') : null;

  // Fallback màu sắc cho avatar chữ cái đầu
  const getAvatarBgColor = (name: string) => {
    const colors = ['#059669', '#8B5CF6', '#F59E0B', '#EF4444', '#0EA5E9', '#EC4899', '#6366F1'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const [avatarErr, setAvatarErr] = useState(false);

  useEffect(() => {
    setAvatarErr(false);
  }, [convId, friendAvatar]);

  // ─── NICKNAME & THEME PERSISTENCE ──────────────────────────────────────────
  const [activeThemeId, setActiveThemeId] = useState<string>('emerald');
  const [nickname, setNickname] = useState<string>('');

  useEffect(() => {
    if (visible && convId) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const savedTheme = window.localStorage.getItem(`monett_theme_${convId}`);
          if (savedTheme && CHAT_THEMES[savedTheme]) {
            setActiveThemeId(savedTheme);
          } else {
            setActiveThemeId('emerald');
          }

          const savedNickname = window.localStorage.getItem(`monett_nickname_${convId}`);
          if (savedNickname) {
            setNickname(savedNickname);
            setCustomNickname(savedNickname);
          } else {
            setNickname('');
            setCustomNickname('');
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }
  }, [visible, convId]);

  const activeTheme = CHAT_THEMES[activeThemeId] || CHAT_THEMES.emerald;
  const displayName = nickname || rawFriendName;

  // ─── LOAD & SAVE LOCAL/API MESSAGES ─────────────────────────────────────────
  const deduplicateMessages = (msgs: Message[]): Message[] => {
    const result: Message[] = [];

    for (const msg of msgs) {
      if (!msg) continue;

      const msgSender = String(msg.sender?._id || msg.sender || '');
      const msgText = (msg.text || '').trim();
      const msgImg = msg.imageUrl || '';
      const msgTime = new Date(msg.createdAt).getTime();

      const existingIndex = result.findIndex((existing) => {
        // 1. Trùng chính xác _id
        if (existing._id && msg._id && existing._id === msg._id) {
          return true;
        }

        // 2. Hệ thống (biệt danh, thông báo)
        if (existing.isSystem && msg.isSystem && existing.text === msg.text) {
          return true;
        }

        // 3. Tin nhắn người dùng: cùng người gửi, cùng nội dung, cùng hình ảnh (hoặc cùng không ảnh),
        // và gửi trong khoảng thời gian sát nhau (dưới 15 giây)
        const existingSender = String(existing.sender?._id || existing.sender || '');
        const existingText = (existing.text || '').trim();
        const existingImg = existing.imageUrl || '';
        const existingTime = new Date(existing.createdAt).getTime();

        const sameSender = existingSender === msgSender;
        const sameText = existingText === msgText;
        const sameImg = existingImg === msgImg;
        const closeTime = Math.abs(existingTime - msgTime) < 15000;

        return sameSender && sameText && sameImg && closeTime;
      });

      if (existingIndex === -1) {
        result.push(msg);
      } else {
        // Nếu đã có nhưng tin nhắn hiện tại mang MongoDB ID thật (không phải msg_...) thì cập nhật ID thật
        if (msg._id && !msg._id.startsWith('msg_') && result[existingIndex]._id.startsWith('msg_')) {
          result[existingIndex] = { ...result[existingIndex], _id: msg._id };
        }
      }
    }

    return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const getLocalStorageMessages = (): Message[] => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(`monett_chat_msgs_${convId}`);
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  };

  const saveLocalStorageMessages = (msgs: Message[]) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`monett_chat_msgs_${convId}`, JSON.stringify(msgs));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const loadMessages = async () => {
    if (!convId) return;
    const localMsgs = getLocalStorageMessages();

    if (isGroup) {
      try {
        const groupMsgs = await getGroupMessagesApi(convId);
        const apiMsgs: Message[] = Array.isArray(groupMsgs) ? groupMsgs : [];
        const combined = [...apiMsgs, ...localMsgs];
        const mergedList = deduplicateMessages(combined);
        setMessages(mergedList);
        saveLocalStorageMessages(mergedList);
      } catch (e) {
        console.warn('Lỗi tải tin nhắn nhóm từ server:', e);
        const cleaned = deduplicateMessages(localMsgs);
        setMessages(cleaned);
        saveLocalStorageMessages(cleaned);
      }
      return;
    }

    try {
      const data = await getMessagesApi(convId);
      const apiMsgs: Message[] = Array.isArray(data) ? data : [];

      // Hợp nhất tin nhắn API & tin nhắn local (đính kèm ảnh, bill) và loại bỏ trùng lặp triệt để
      const combined = [...apiMsgs, ...localMsgs];
      const mergedList = deduplicateMessages(combined);

      setMessages(mergedList);
      saveLocalStorageMessages(mergedList);
    } catch (e) {
      console.warn('Lỗi tải tin nhắn từ server:', e);
      const cleaned = deduplicateMessages(localMsgs);
      setMessages(cleaned);
      saveLocalStorageMessages(cleaned);
    }
  };

  useEffect(() => {
    if (visible && convId) {
      setIsMinimized(false);
      setLoading(true);
      loadMessages().finally(() => setLoading(false));

      const interval = setInterval(() => {
        loadMessages();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [visible, convId, isGroup]);

  // ─── LẮNG NGHE TIN NHẮN REALTIME KHI ĐANG MỞ KHUNG CHAT ───
  useEffect(() => {
    if (!socket || !visible || !convId) return;

    const handleIncomingGroupMsg = (msg: any) => {
      if (isGroup && msg && String(msg.groupId) === String(convId)) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          const formatted: Message = {
            _id: String(msg._id || Date.now()),
            sender: String(msg.sender || ''),
            senderName: msg.senderName,
            receiver: convId,
            text: msg.text || '',
            imageUrl: msg.imageUrl,
            bill: msg.bill,
            createdAt: msg.createdAt || new Date().toISOString(),
          };
          const next = deduplicateMessages([...prev, formatted]);
          saveLocalStorageMessages(next);
          return next;
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    const handleIncomingDirectMsg = (msg: any) => {
      if (!isGroup && msg && (String(msg.sender) === String(convId) || String(msg.receiver) === String(convId))) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          const formatted: Message = {
            _id: String(msg._id || Date.now()),
            sender: String(msg.sender || ''),
            senderName: msg.senderName,
            receiver: convId,
            text: msg.text || '',
            imageUrl: msg.imageUrl,
            bill: msg.bill,
            createdAt: msg.createdAt || new Date().toISOString(),
          };
          const next = deduplicateMessages([...prev, formatted]);
          saveLocalStorageMessages(next);
          return next;
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    socket.on('receive_group_message', handleIncomingGroupMsg);
    socket.on('receive_message', handleIncomingDirectMsg);

    return () => {
      socket.off('receive_group_message', handleIncomingGroupMsg);
      socket.off('receive_message', handleIncomingDirectMsg);
    };
  }, [socket, visible, convId, isGroup]);

  // ─── SEND MESSAGE ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (isSendingRef.current) return;
    if ((!text.trim() && !attachedImage && !momentReply) || !convId) return;

    isSendingRef.current = true;
    setIsSending(true);

    const currentText = text.trim();
    const currentImg = attachedImage || (momentReply ? momentReply.photo : null);
    const replyTargetMoment = momentReply;
    const tempId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    setText('');
    setAttachedImage(null);
    setMomentReply(null);

    const newMsg: Message = {
      _id: tempId,
      sender: currentUserId,
      senderName: currentUserName,
      receiver: convId,
      text: currentText,
      imageUrl: currentImg || undefined,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const nextMsgs = deduplicateMessages([...prev, newMsg]);
      saveLocalStorageMessages(nextMsgs);
      return nextMsgs;
    });
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Gửi lên API server
    if (!isGroup) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(
            'monett_cross_tab_notif',
            JSON.stringify({
              type: 'message',
              recipientId: convId,
              senderId: currentUserId,
              senderName: currentUserName,
              senderAvatar: (user as any)?.avatarUrl || null,
              text: currentText,
              imageUrl: currentImg || null,
              timestamp: Date.now(),
            })
          );
        }
      } catch {}

      try {
        const savedMsg = await sendMessageApi(convId, currentText, currentImg || undefined);
        if (savedMsg && (savedMsg._id || savedMsg.id)) {
          const realId = String(savedMsg._id || savedMsg.id);
          setMessages((prev) => {
            const updated = prev.map((m) => (m._id === tempId ? { ...m, _id: realId } : m));
            const deduplicated = deduplicateMessages(updated);
            saveLocalStorageMessages(deduplicated);
            return deduplicated;
          });
        }
      } catch (e) {
        console.warn('Failed to sync to API:', e);
      }
    }

    if (isGroup) {
      try {
        const savedMsg = await sendGroupMessageApi(convId, currentText, currentImg || undefined);
        if (savedMsg && (savedMsg._id || savedMsg.id)) {
          const realId = String(savedMsg._id || savedMsg.id);
          setMessages((prev) => {
            const updated = prev.map((m) => (m._id === tempId ? { ...m, _id: realId } : m));
            const deduplicated = deduplicateMessages(updated);
            saveLocalStorageMessages(deduplicated);
            return deduplicated;
          });
        }
      } catch (e) {
        console.warn('Failed to sync group message to API:', e);
      }
    }

    // Nếu đang trả lời bài đăng, đồng bộ luôn vào bình luận bài viết
    if (replyTargetMoment && currentText) {
      try {
        await addMomentCommentApi(replyTargetMoment.id, currentText);
        onCommentSent?.(replyTargetMoment.id, currentText);
      } catch (e) {
        console.warn('Failed to sync moment comment to API:', e);
      }
    }

    setTimeout(() => {
      isSendingRef.current = false;
      setIsSending(false);
    }, 400);
  };

  // ─── IMAGE PICKER (BROWSER / EXPO) ─────────────────────────────────────────
  const handlePickImage = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setAttachedImage(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      };
      fileInput.click();
    }
  };

  // ─── SPLIT BILL ACTION ─────────────────────────────────────────────────────
  const handleCreateSplitBill = () => {
    const rawNum = billTotal.replace(/\D/g, '');
    const total = parseInt(rawNum, 10);
    if (!total || total <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ để chia bill!');
      return;
    }
    const title = billTitle.trim() || 'Hóa đơn chi tiêu nhóm 🧾';
    const numPeople = billPeopleCount > 1 ? billPeopleCount : 2;
    const perPerson = Math.round(total / numPeople);

    const newBill: BillSplitData = {
      id: 'bill_' + Date.now(),
      title,
      totalAmount: total,
      perPersonAmount: perPerson,
      numPeople,
      paidMembers: [currentUserId], // Người tạo bill mặc định coi như đã thanh toán
      receipts: {},
      createdBy: currentUserId,
      creatorName: currentUserName,
    };

    const billMsg: Message = {
      _id: 'bill_msg_' + Date.now(),
      sender: currentUserId,
      senderName: currentUserName,
      receiver: convId,
      text: `🧾 Đã tạo chia bill: ${title} - ${total.toLocaleString('vi-VN')} đ (Mỗi người: ${perPerson.toLocaleString('vi-VN')} đ)`,
      createdAt: new Date().toISOString(),
      bill: newBill,
    };

    const nextMsgs = [...messages, billMsg];
    setMessages(nextMsgs);
    saveLocalStorageMessages(nextMsgs);

    if (isGroup) {
      sendGroupMessageApi(convId, billMsg.text, undefined, newBill).catch(() => {});
    }

    setShowSplitBillModal(false);
    setBillTitle('');
    setBillTotal('');
    setBillPeopleCount(3);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ─── CONFIRM PAYMENT IN SPLIT BILL ─────────────────────────────────────────
  const handleToggleBillPaid = (msgId: string) => {
    const updated = messages.map((m) => {
      if (m._id !== msgId || !m.bill) return m;
      const isPaid = m.bill.paidMembers.includes(currentUserId);
      const newPaid = isPaid
        ? m.bill.paidMembers.filter((id) => id !== currentUserId)
        : [...m.bill.paidMembers, currentUserId];

      return {
        ...m,
        bill: {
          ...m.bill,
          paidMembers: newPaid,
        },
      };
    });

    setMessages(updated);
    saveLocalStorageMessages(updated);
  };

  // ─── ATTACH RECEIPT IN SPLIT BILL ──────────────────────────────────────────
  const handleAttachBillReceipt = (msgId: string) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const receiptImg = event.target?.result as string;
            const updated = messages.map((m) => {
              if (m._id !== msgId || !m.bill) return m;
              const newPaid = m.bill.paidMembers.includes(currentUserId)
                ? m.bill.paidMembers
                : [...m.bill.paidMembers, currentUserId];

              return {
                ...m,
                bill: {
                  ...m.bill,
                  paidMembers: newPaid,
                  receipts: {
                    ...(m.bill.receipts || {}),
                    [currentUserId]: receiptImg,
                  },
                },
              };
            });
            setMessages(updated);
            saveLocalStorageMessages(updated);
          };
          reader.readAsDataURL(file);
        }
      };
      fileInput.click();
    }
  };

  // ─── SAVE THEME ────────────────────────────────────────────────────────────
  const handleSelectTheme = (themeId: string) => {
    setActiveThemeId(themeId);
    setShowThemeModal(false);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`monett_theme_${convId}`, themeId);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // ─── SAVE NICKNAME ─────────────────────────────────────────────────────────
  const handleSaveNickname = () => {
    const trimmed = customNickname.trim();
    setNickname(trimmed);
    setShowNicknameModal(false);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (trimmed) {
          window.localStorage.setItem(`monett_nickname_${convId}`, trimmed);
        } else {
          window.localStorage.removeItem(`monett_nickname_${convId}`);
        }
      }
    } catch (e) {
      console.warn(e);
    }

    if (trimmed) {
      const sysMsg: Message = {
        _id: 'sys_' + Date.now(),
        sender: 'system',
        receiver: convId,
        text: `Bạn đã đặt biệt danh là "${trimmed}"`,
        createdAt: new Date().toISOString(),
        isSystem: true,
      };
      const next = [...messages, sysMsg];
      setMessages(next);
      saveLocalStorageMessages(next);
    }
  };

  const quickReplies = [
    'Chào bạn! 👋',
    'Dạo này sao rồi?',
    'Lát nữa đi cafe không? ☕',
    'Mình vừa chuyển khoản nhé! 💸',
    'Nhớ giữ chuỗi nhé! 🔥',
  ];

  if (!visible || !friend) return null;

  // ─── RENDER TIN NHẮN TỪNG DÒNG ─────────────────────────────────────────────
  const renderMessageItem = ({ item }: { item: Message }) => {
    if (item.isSystem) {
      return (
        <View style={styles.systemMessageWrap}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
        </View>
      );
    }

    const isMe = String(item.sender?._id || item.sender) === currentUserId;
    const timeStr = item.createdAt
      ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    // Render thẻ Hóa đơn Chia tiền (Split Bill Card)
    if (item.bill) {
      const bill = item.bill;
      const isPaidByMe = bill.paidMembers.includes(currentUserId);
      const paidCount = bill.paidMembers.length;
      const progressPercent = Math.min(100, Math.round((paidCount / bill.numPeople) * 100));
      const myReceipt = bill.receipts?.[currentUserId];

      return (
        <View style={[styles.billCardWrap, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
          <View style={[styles.billCard, { borderColor: activeTheme.primary }]}>
            {/* Bill Header */}
            <View style={[styles.billCardHeader, { backgroundColor: activeTheme.primary }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="receipt" size={18} color="#FFFFFF" />
                <Text style={styles.billCardHeaderTitle}>HÓA ĐƠN CHIA TIỀN</Text>
              </View>
              <Text style={styles.billCardHeaderTime}>{timeStr}</Text>
            </View>

            {/* Bill Body */}
            <View style={styles.billCardBody}>
              <Text style={styles.billCardTitle} numberOfLines={2}>
                {bill.title}
              </Text>

              {/* Amount highlights */}
              <View style={[styles.billCardAmountRow, { backgroundColor: isDark ? '#1E293B' : activeTheme.lightBg }]}>
                <View>
                  <Text style={styles.billCardSubLabel}>Mỗi người chuyển</Text>
                  <Text style={[styles.billCardBigAmount, { color: activeTheme.primary }]}>
                    {bill.perPersonAmount.toLocaleString('vi-VN')} đ
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.billCardSubLabel}>Tổng bill</Text>
                  <Text style={styles.billCardTotalAmount}>
                    {bill.totalAmount.toLocaleString('vi-VN')} đ ({bill.numPeople} người)
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.billCardProgressLabel}>
                    Tiến độ thanh toán: <Text style={{ fontWeight: '800', color: activeTheme.primary }}>{paidCount}/{bill.numPeople} người</Text>
                  </Text>
                  <Text style={[styles.billCardProgressPercent, { color: activeTheme.primary }]}>
                    {progressPercent}%
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: activeTheme.primary }]} />
                </View>
              </View>

              {/* User Receipt Preview if uploaded */}
              {myReceipt && (
                <TouchableOpacity
                  style={styles.receiptPreviewChip}
                  onPress={() => setPreviewImageModal(myReceipt)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: myReceipt }} style={styles.receiptMiniThumb} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.receiptChipTitle}>Đã đính kèm biên lai ✓</Text>
                    <Text style={styles.receiptChipSub}>Chạm để xem ảnh chuyển tiền</Text>
                  </View>
                  <Ionicons name="eye-outline" size={16} color={activeTheme.primary} />
                </TouchableOpacity>
              )}

              {/* Action Buttons */}
              <View style={styles.billCardActions}>
                <TouchableOpacity
                  style={[
                    styles.billPaidBtn,
                    isPaidByMe
                      ? { backgroundColor: '#10B981' }
                      : { backgroundColor: activeTheme.primary },
                  ]}
                  onPress={() => handleToggleBillPaid(item._id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isPaidByMe ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 5 }}
                  />
                  <Text style={styles.billPaidBtnText}>
                    {isPaidByMe ? 'Đã chuyển tiền ✓' : 'Xác nhận đã chuyển'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.billReceiptBtn, { borderColor: activeTheme.primary }]}
                  onPress={() => handleAttachBillReceipt(item._id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={15} color={activeTheme.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.billReceiptBtnText, { color: activeTheme.primary }]}>
                    {myReceipt ? 'Đổi biên lai' : 'Chụp bill chuyển'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageBubbleWrap, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
        {/* Nếu là nhóm và không phải tin của mình, hiển thị tên người gửi */}
        {isGroup && !isMe && item.senderName && (
          <Text style={styles.groupSenderLabel}>{item.senderName}</Text>
        )}

        <View
          style={[
            styles.messageBubble,
            isMe
              ? [styles.myMessage, { backgroundColor: activeTheme.primary }]
              : [styles.theirMessage, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }],
          ]}
        >
          {/* Ảnh đính kèm trong tin nhắn */}
          {item.imageUrl && (
            <TouchableOpacity
              onPress={() => setPreviewImageModal(item.imageUrl || null)}
              activeOpacity={0.9}
              style={{ marginBottom: item.text ? 6 : 0 }}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.chatAttachedImage} />
            </TouchableOpacity>
          )}

          {/* Nội dung text */}
          {!!item.text && (
            <Text
              style={[
                styles.messageText,
                isMe ? [styles.myMessageText, { color: activeTheme.bubbleText }] : { color: isDark ? '#F8FAFC' : '#0F172A' },
              ]}
            >
              {item.text}
            </Text>
          )}

          {/* Giờ gửi */}
          {timeStr ? (
            <Text
              style={[
                styles.timeText,
                isMe ? { color: 'rgba(255,255,255,0.75)' } : { color: isDark ? '#94A3B8' : '#64748B' },
              ]}
            >
              {timeStr}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  // ─── CHAT MESSENGER BOX ────────────────────────────────────────────────────
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
      <View
        style={[
          styles.header,
          { borderBottomColor: isDark ? '#334155' : '#F1F5F9' },
          isMinimized && { borderBottomWidth: 0 },
        ]}
      >
        {/* Left: Avatar & Tên & Chấm online */}
        <TouchableOpacity
          style={styles.headerLeft}
          activeOpacity={0.8}
          onPress={() => isMinimized && setIsMinimized(false)}
        >
          <View style={styles.avatarWrap}>
            {isGroup ? (
              <View style={[styles.avatarPlaceholder, { backgroundColor: activeTheme.lightBg }]}>
                <GroupIconSvg name={groupIcon || 'users'} size={20} />
              </View>
            ) : friendAvatar && !avatarErr ? (
              <Image
                source={{ uri: friendAvatar }}
                style={styles.avatarImg}
                onError={() => setAvatarErr(true)}
              />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: getAvatarBgColor(displayName) },
                ]}
              >
                <Text style={styles.avatarInitial}>
                  {(displayName.charAt(0) || 'U').toUpperCase()}
                </Text>
              </View>
            )}

            {!isGroup && (
              <View style={[styles.onlineDot, !isOnline && styles.offlineDot]} />
            )}
          </View>

          <View style={styles.headerInfo}>
            <Text
              style={[styles.headerName, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
              {isGroup ? (
                <Text style={[styles.headerStatus, { color: activeTheme.primary }]}>
                  👥 Nhóm ({friend.members?.length || 2} thành viên)
                </Text>
              ) : (
                <>
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 3.5,
                      backgroundColor: isOnline ? '#10B981' : '#94A3B8',
                    }}
                  />
                  <Text
                    style={[
                      styles.headerStatus,
                      {
                        color: isOnline
                          ? '#10B981'
                          : isDark
                          ? '#94A3B8'
                          : '#64748B',
                        fontWeight: isOnline ? '700' : '600',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {formatMessengerActiveTime(friend, isOnline)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Right Actions: Chủ đề 🎨, Biệt danh ✏️, Thu nhỏ `_`, Đóng `✕` */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => setShowThemeModal(true)}
            style={styles.iconActionBtn}
            activeOpacity={0.7}
            accessibilityLabel="Đổi chủ đề"
          >
            <Ionicons name="color-palette-outline" size={18} color={activeTheme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowNicknameModal(true)}
            style={styles.iconActionBtn}
            activeOpacity={0.7}
            accessibilityLabel="Đổi biệt danh"
          >
            <Ionicons name="create-outline" size={18} color={isDark ? '#CBD5E1' : '#64748B'} />
          </TouchableOpacity>

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
            <Ionicons name="close" size={19} color={isDark ? '#CBD5E1' : '#64748B'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── NỘI DUNG CHAT (ẨN KHI THU NHỎ) ── */}
      {!isMinimized && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={activeTheme.primary} />
              <Text style={{ marginTop: 8, fontSize: 12, color: '#94A3B8' }}>
                Đang tải tin nhắn...
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              renderItem={renderMessageItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  {isGroup ? (
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: activeTheme.lightBg, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                      <GroupIconSvg name={groupIcon || 'users'} size={32} />
                    </View>
                  ) : (
                    <Text style={{ fontSize: 36, marginBottom: 8 }}>👋</Text>
                  )}
                  <Text style={[styles.emptyText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                    Chưa có tin nhắn nào.{'\n'}
                    {isGroup
                      ? 'Hãy gửi lời chào đầu tiên tới nhóm hoặc tạo chia bill!'
                      : 'Hãy gửi lời chào hoặc tạo hóa đơn chia tiền cùng bạn bè!'}
                  </Text>
                </View>
              }
            />
          )}

          {/* Quick Replies Bar */}
          <View style={[styles.quickRepliesBar, { backgroundColor: isDark ? '#0F172A' : '#FAFAFA' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRepliesScroll}>
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
                  <Text style={[styles.quickReplyText, { color: isDark ? '#94A3B8' : '#475569' }]}>
                    {reply}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Image Preview Thumbnail if attached */}
          {attachedImage && (
            <View style={styles.attachedImagePreviewRow}>
              <View style={styles.attachedImageWrap}>
                <Image source={{ uri: attachedImage }} style={styles.attachedImageThumb} />
                <TouchableOpacity
                  style={styles.attachedImageRemoveBtn}
                  onPress={() => setAttachedImage(null)}
                >
                  <Ionicons name="close" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.attachedImageTip}>Đã chọn 1 ảnh đính kèm</Text>
            </View>
          )}

          {/* Moment Reply Preview Bar (như Locket & Instagram story reply) */}
          {momentReply && (
            <View style={[styles.momentReplyBanner, { backgroundColor: isDark ? '#1E293B' : '#ECFDF5', borderTopColor: isDark ? '#334155' : '#A7F3D0' }]}>
              {momentReply.photo ? (
                <Image source={{ uri: momentReply.photo }} style={styles.momentReplyThumb} />
              ) : (
                <View style={[styles.momentReplyThumb, { backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="image" size={16} color="#FFF" />
                </View>
              )}
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="chatbubble-ellipses" size={11} color="#059669" />
                  <Text style={[styles.momentReplyTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]} numberOfLines={1}>
                    Bình luận bài viết của {momentReply.userName || displayName}
                  </Text>
                </View>
                <Text style={[styles.momentReplyCaption, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                  {momentReply.caption ? `"${momentReply.caption}"` : 'Khoảnh khắc chi tiêu'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setMomentReply(null)}
                style={styles.momentReplyCloseBtn}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}

          {/* Khung Nhập Tin Nhắn & Action Bar */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderTopColor: isDark ? '#334155' : '#F1F5F9',
              },
            ]}
          >
            {/* Nút gửi ảnh */}
            <TouchableOpacity
              style={styles.mediaActionBtn}
              onPress={handlePickImage}
              activeOpacity={0.7}
              accessibilityLabel="Gửi hình ảnh"
            >
              <Ionicons name="image-outline" size={21} color={activeTheme.primary} />
            </TouchableOpacity>

            {/* Nút Chia Bill */}
            <TouchableOpacity
              style={[styles.splitBillTriggerBtn, { backgroundColor: isDark ? '#334155' : activeTheme.lightBg }]}
              onPress={() => setShowSplitBillModal(true)}
              activeOpacity={0.8}
              accessibilityLabel="Chia bill hóa đơn"
            >
              <Ionicons name="receipt-outline" size={16} color={activeTheme.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.splitBillTriggerText, { color: activeTheme.primary }]}>Chia bill</Text>
            </TouchableOpacity>

            {/* Ô nhập tin nhắn */}
            <TextInput
              style={[
                styles.input,
                {
                  color: isDark ? '#F1F5F9' : '#0F172A',
                  backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                },
              ]}
              placeholder={momentReply ? "Nhập bình luận bài viết..." : "Nhập tin nhắn..."}
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={text}
              onChangeText={setText}
              onSubmitEditing={handleSend}
              maxLength={500}
              returnKeyType="send"
            />

            {/* Nút gửi */}
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: activeTheme.primary },
                ((!text.trim() && !attachedImage) || isSending) && { opacity: 0.5, backgroundColor: '#94A3B8' },
              ]}
              onPress={handleSend}
              disabled={(!text.trim() && !attachedImage) || isSending}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── MODAL ĐỔI CHỦ ĐỀ MESSENGER ── */}
      <Modal visible={showThemeModal} transparent animationType="fade" onRequestClose={() => setShowThemeModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowThemeModal(false)} />
          <View style={[styles.themeDialog, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', zIndex: 10 }]}>
            <View style={styles.dialogHeader}>
              <Text style={[styles.dialogTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                Chọn chủ đề đoạn chat 🎨
              </Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.themeGrid}>
              {Object.values(CHAT_THEMES).map((thm) => {
                const isSelected = activeThemeId === thm.id;
                return (
                  <TouchableOpacity
                    key={thm.id}
                    style={[
                      styles.themeCard,
                      isSelected && { borderColor: thm.primary, borderWidth: 2, backgroundColor: thm.lightBg },
                    ]}
                    onPress={() => handleSelectTheme(thm.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.themeCircle, { backgroundColor: thm.primary }]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.themeCardText, isSelected && { color: thm.primary, fontWeight: '800' }]}>
                      {thm.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL ĐỔI BIỆT DANH ── */}
      <Modal visible={showNicknameModal} transparent animationType="fade" onRequestClose={() => setShowNicknameModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowNicknameModal(false)} />
          <View style={[styles.nicknameDialog, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', zIndex: 10 }]}>
            <View style={styles.dialogHeader}>
              <Text style={[styles.dialogTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                Đặt biệt danh trò chuyện ✏️
              </Text>
              <TouchableOpacity onPress={() => setShowNicknameModal(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
              Đặt biệt danh để hiển thị tên thân thiết trong đoạn chat này:
            </Text>

            <TextInput
              style={[
                styles.dialogInput,
                {
                  color: isDark ? '#FFFFFF' : '#0F172A',
                  borderColor: isDark ? '#334155' : '#CBD5E1',
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                },
              ]}
              placeholder={`Nhập biệt danh (vd: Bạn thân, Cục cưng...)`}
              placeholderTextColor="#94A3B8"
              value={customNickname}
              onChangeText={setCustomNickname}
            />

            <View style={styles.dialogButtonRow}>
              {nickname ? (
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => {
                    setCustomNickname('');
                    setNickname('');
                    try {
                      if (typeof window !== 'undefined' && window.localStorage) {
                        window.localStorage.removeItem(`monett_nickname_${convId}`);
                      }
                    } catch {}
                    setShowNicknameModal(false);
                  }}
                >
                  <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13 }}>Gỡ biệt danh</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setShowNicknameModal(false)}>
                  <Text style={{ color: '#64748B', fontWeight: '700', fontSize: 13 }}>Hủy</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.dialogSaveBtn, { backgroundColor: activeTheme.primary }]}
                onPress={handleSaveNickname}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>Lưu biệt danh</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL TẠO CHIA BILL (SPLIT BILL) ── */}
      <Modal visible={showSplitBillModal} transparent animationType="fade" onRequestClose={() => setShowSplitBillModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowSplitBillModal(false)} />
          <View style={[styles.splitBillDialog, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', zIndex: 10 }]}>
            <View style={styles.dialogHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.dialogIconBadge, { backgroundColor: activeTheme.lightBg }]}>
                  <Ionicons name="receipt" size={18} color={activeTheme.primary} />
                </View>
                <Text style={[styles.dialogTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                  Chia sẻ hóa đơn (Split Bill)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSplitBillModal(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Nội dung chi tiêu */}
              <Text style={styles.dialogFieldLabel}>Nội dung chi tiêu:</Text>
              <TextInput
                style={[
                  styles.dialogInput,
                  {
                    color: isDark ? '#FFFFFF' : '#0F172A',
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  },
                ]}
                placeholder="Ví dụ: Lẩu Haidilao, Trà sữa Gongcha..."
                placeholderTextColor="#94A3B8"
                value={billTitle}
                onChangeText={setBillTitle}
              />

              {/* Tổng số tiền */}
              <Text style={styles.dialogFieldLabel}>Tổng số tiền cần chia (VNĐ):</Text>
              <TextInput
                style={[
                  styles.dialogInput,
                  {
                    color: activeTheme.primary,
                    fontWeight: '800',
                    fontSize: 16,
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  },
                ]}
                placeholder="Nhập tổng tiền (vd: 600000)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={billTotal}
                onChangeText={(v) => {
                  const cleaned = v.replace(/\D/g, '');
                  setBillTotal(cleaned ? parseInt(cleaned, 10).toLocaleString('vi-VN') : '');
                }}
              />

              {/* Số người chia */}
              <Text style={styles.dialogFieldLabel}>Chia cho bao nhiêu người?</Text>
              <View style={styles.peopleCountChipsRow}>
                {[2, 3, 4, 5, 6].map((num) => {
                  const isSelected = billPeopleCount === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.peopleCountChip,
                        isSelected && { backgroundColor: activeTheme.primary, borderColor: activeTheme.primary },
                      ]}
                      onPress={() => setBillPeopleCount(num)}
                    >
                      <Text
                        style={[
                          styles.peopleCountChipText,
                          isSelected && { color: '#FFFFFF', fontWeight: '800' },
                        ]}
                      >
                        {num} người
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Real-time Calculation Card */}
              {(() => {
                const total = parseInt(billTotal.replace(/\D/g, '') || '0', 10);
                const perPerson = total > 0 ? Math.round(total / billPeopleCount) : 0;
                return (
                  <View style={[styles.calcCard, { backgroundColor: isDark ? '#0F172A' : activeTheme.lightBg }]}>
                    <Text style={styles.calcCardLabel}>Mỗi người cần chuyển khoản:</Text>
                    <Text style={[styles.calcCardAmount, { color: activeTheme.primary }]}>
                      {perPerson.toLocaleString('vi-VN')} đ
                    </Text>
                    <Text style={styles.calcCardNote}>
                      ({total.toLocaleString('vi-VN')} đ ÷ {billPeopleCount} người)
                    </Text>
                  </View>
                );
              })()}
            </ScrollView>

            <View style={styles.dialogButtonRow}>
              <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setShowSplitBillModal(false)}>
                <Text style={{ color: '#64748B', fontWeight: '700', fontSize: 13 }}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dialogSaveBtn,
                  { backgroundColor: activeTheme.primary },
                  !billTotal && { opacity: 0.6 },
                ]}
                onPress={handleCreateSplitBill}
                disabled={!billTotal}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                  Gửi bill vào chat 🚀
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL XEM ẢNH FULL SIZE ── */}
      <Modal visible={!!previewImageModal} transparent animationType="fade" onRequestClose={() => setPreviewImageModal(null)}>
        <TouchableOpacity style={styles.previewImageOverlay} activeOpacity={1} onPress={() => setPreviewImageModal(null)}>
          <View style={styles.previewImageCard}>
            <Image source={{ uri: previewImageModal || '' }} style={styles.fullPreviewImg} resizeMode="contain" />
            <TouchableOpacity style={styles.closeFullPreviewBtn} onPress={() => setPreviewImageModal(null)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  if (isDesktop) {
    return chatContent;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.mobileModalBackdrop}>
        <TouchableOpacity style={styles.mobileBackdropDismiss} onPress={onClose} activeOpacity={1} />
        {chatContent}
      </View>
    </Modal>
  );
};

// ─── STYLESHEET ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  messengerBox: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  desktopMessengerBox: {
    position: 'fixed' as any,
    bottom: 0,
    right: 28,
    width: 380,
    height: 540,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    zIndex: 999999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 24,
  },
  minimizedMessengerBox: {
    height: 50,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
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
    height: '84%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarWrap: {
    width: 34,
    height: 34,
    position: 'relative',
  },
  avatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
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
    fontSize: 10.5,
    fontWeight: '600',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  messageBubbleWrap: {
    maxWidth: '85%',
    marginBottom: 4,
  },
  groupSenderLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
    marginLeft: 6,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  myMessage: {
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    borderBottomLeftRadius: 4,
  },
  chatAttachedImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  myMessageText: {
    fontWeight: '500',
  },
  timeText: {
    fontSize: 9.5,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  systemMessageWrap: {
    alignSelf: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 4,
  },
  systemMessageText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingTop: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
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
    fontSize: 11,
    fontWeight: '600',
  },
  attachedImagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    gap: 8,
  },
  attachedImageWrap: {
    position: 'relative',
  },
  attachedImageThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  attachedImageRemoveBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachedImageTip: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  momentReplyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: 1,
  },
  momentReplyThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  momentReplyTitle: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  momentReplyCaption: {
    fontSize: 11,
    marginTop: 1,
  },
  momentReplyCloseBtn: {
    padding: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  mediaActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitBillTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  splitBillTriggerText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── BILL CARD IN CHAT ───
  billCardWrap: {
    maxWidth: '92%',
    marginBottom: 6,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  billCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  billCardHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  billCardHeaderTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  billCardBody: {
    padding: 12,
  },
  billCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  billCardAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  billCardSubLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  billCardBigAmount: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  billCardTotalAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  billCardProgressLabel: {
    fontSize: 11,
    color: '#475569',
  },
  billCardProgressPercent: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  receiptPreviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 6,
    marginTop: 8,
  },
  receiptMiniThumb: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  receiptChipTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  receiptChipSub: {
    fontSize: 9.5,
    color: '#64748B',
  },
  billCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  billPaidBtn: {
    flex: 1.3,
    height: 34,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  billPaidBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  billReceiptBtn: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  billReceiptBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ─── DIALOGS & MODALS ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(6px)' } : {}),
  },
  themeDialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  nicknameDialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  splitBillDialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dialogTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  dialogIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  themeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  dialogFieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  dialogInput: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    fontSize: 13.5,
    marginBottom: 6,
  },
  peopleCountChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  peopleCountChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  peopleCountChipText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '700',
  },
  calcCard: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
    alignItems: 'center',
  },
  calcCardLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  calcCardAmount: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 2,
  },
  calcCardNote: {
    fontSize: 11,
    color: '#94A3B8',
  },
  dialogButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  dialogCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dialogSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  previewImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewImageCard: {
    width: '100%',
    height: '80%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPreviewImg: {
    width: '100%',
    height: '100%',
  },
  closeFullPreviewBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

