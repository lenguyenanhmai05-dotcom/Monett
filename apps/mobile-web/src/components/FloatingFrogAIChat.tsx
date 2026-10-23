import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  StyleSheet,
  Image,
  Animated,
  useWindowDimensions,
  ScrollView,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  action?: {
    label: string;
    tabKey: string;
    elementId?: string;
  };
}

interface FloatingFrogAIChatProps {
  onNavigateToTab?: (tabKey: any) => void;
  activeTab?: string;
}

const FROG_AVATAR = require('../../assets/frogs/frog-vietnam.png');

// Các trang tính năng chính (Khớp 100% với 7 tab trên thanh điều hướng)
const TOPICS: {
  chip: string;
  iconName: keyof typeof Ionicons.glyphMap;
  query: string;
  reply: string;
  action: {
    label: string;
    tabKey: string;
    elementId?: string;
  };
}[] = [
  {
    chip: 'Tổng quan',
    iconName: 'grid-outline',
    query: 'Chuyển đến trang Tổng quan',
    reply: 'Trang Tổng Quan giúp bạn xem toàn bộ dòng tiền thu chi, lịch chi tiêu hằng ngày, mục nhắc nhở và quản lý tài chính tổng thể!',
    action: { label: '⊞ Đến Trang Tổng Quan', tabKey: 'home' },
  },
  {
    chip: 'Bảng tin',
    iconName: 'newspaper-outline',
    query: 'Chuyển đến trang Bảng tin',
    reply: 'Trang Bảng Tin cho phép bạn chia sẻ khoảnh khắc chi tiêu kèm ảnh với bạn bè, tương tác và trò chuyện riêng tư nhé!',
    action: { label: '📰 Đến Trang Bảng Tin', tabKey: 'feed' },
  },
  {
    chip: 'Sự kiện',
    iconName: 'calendar-outline',
    query: 'Chuyển đến trang Sự kiện',
    reply: 'Trang Sự Kiện giúp bạn theo dõi các sự kiện tài chính, chuyến đi chơi, tiệc tùng cùng bạn bè và chia tiền tiện lợi!',
    action: { label: '📅 Đến Trang Sự Kiện', tabKey: 'events' },
  },
  {
    chip: 'Báo cáo',
    iconName: 'bar-chart-outline',
    query: 'Chuyển đến trang Báo cáo',
    reply: 'Trang Báo Cáo cung cấp biểu đồ phân tích xu hướng thu chi, tỷ trọng các nhóm chi tiêu theo Ngày, Tháng, Năm chi tiết nhất!',
    action: { label: '📊 Đến Trang Báo Cáo', tabKey: 'analytics' },
  },
  {
    chip: 'Tích lũy',
    iconName: 'wallet-outline',
    query: 'Chuyển đến trang Tích lũy',
    reply: 'Trang Tích Lũy giúp bạn nuôi heo đất, tạo các mục tiêu tích lũy (mua xe, du lịch, quỹ dự phòng...) và theo dõi tiến độ nạp tiền mỗi ngày!',
    action: { label: '👛 Đến Trang Tích Lũy', tabKey: 'budget' },
  },
  {
    chip: 'Định kỳ',
    iconName: 'repeat-outline',
    query: 'Chuyển đến trang Định kỳ',
    reply: 'Trang Định Kỳ giúp bạn quản lý các hóa đơn cố định lặp lại như tiền trọ, điện nước, internet, đăng ký dịch vụ để không bao giờ bị quên hạn!',
    action: { label: '🔁 Đến Trang Định Kỳ', tabKey: 'recurring' },
  },
  {
    chip: 'Sổ ghi nợ',
    iconName: 'book-outline',
    query: 'Chuyển đến trang Sổ ghi nợ',
    reply: 'Trang Sổ Ghi Nợ giúp bạn ghi chép các khoản tiền cho mượn và nợ cần trả rõ ràng, minh bạch, tránh thất thoát!',
    action: { label: '📖 Đến Trang Sổ Ghi Nợ', tabKey: 'debts' },
  },
];

export const FloatingFrogAIChat: React.FC<FloatingFrogAIChatProps> = ({ onNavigateToTab, activeTab }) => {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showTooltip, setShowTooltip] = useState(true);

  // Kéo di chuyển chú Ếch tự do (Draggable Frog Mascot)
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const isDraggingRef = useRef(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = false;
        pan.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4) {
          isDraggingRef.current = true;
          setShowTooltip(false);
        }

        const { width: winW, height: winH } = Dimensions.get('window');
        const minY = -(winH - 96 - 72);
        const maxY = 14;
        const minX = -(winW - 96 - 16);
        const maxX = 14;

        const rawY = panOffset.y + gestureState.dy;
        const rawX = panOffset.x + gestureState.dx;
        const clampedY = Math.max(minY, Math.min(maxY, rawY));
        const clampedX = Math.max(minX, Math.min(maxX, rawX));

        pan.setValue({ x: clampedX - panOffset.x, y: clampedY - panOffset.y });
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const { width: winW, height: winH } = Dimensions.get('window');
        const minY = -(winH - 96 - 72);
        const maxY = 14;
        const minX = -(winW - 96 - 16);
        const maxX = 14;

        const finalX = Math.max(minX, Math.min(maxX, panOffset.x + gestureState.dx));
        const finalY = Math.max(minY, Math.min(maxY, panOffset.y + gestureState.dy));
        setPanOffset({ x: finalX, y: finalY });

        // Nếu di chuyển rất ít (< 6px), tính là bấm chạm (click / tap) để mở / đóng chat!
        if (!isDraggingRef.current && Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6) {
          setIsOpen((prev) => !prev);
          setShowTooltip(false);
        }
        isDraggingRef.current = false;
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        isDraggingRef.current = false;
      },
    })
  ).current;

  // Animation cho bong bóng nổi
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);

  const userName = user?.fullName || (user as any)?.name || 'bạn';
  const userId = (user as any)?._id || (user as any)?.id || 'guest';
  const storageKey = `monett_frog_ai_chat_${userId}`;

  const getWelcomeMessage = (): ChatMessage => ({
    id: 'welcome-1',
    sender: 'ai',
    text: `Chào ${userName}! Mình là Trợ lý Ếch Monett.\nBạn cần mình chỉ đường đến tính năng nào, hay cần tư vấn tài chính hôm nay không?`,
    time: 'Vừa xong',
  });

  // Khởi tạo danh sách tin nhắn từ storage (đọc trước từ localStorage trên web để không giật nháy)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Lỗi đọc chat từ localStorage:', e);
      }
    }
    return [getWelcomeMessage()];
  });

  // Tải dữ liệu lưu trữ (hỗ trợ cả React Native AsyncStorage và khi đổi user)
  useEffect(() => {
    let isMounted = true;
    const loadSaved = async () => {
      try {
        let savedData: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          savedData = localStorage.getItem(storageKey);
        } else {
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            savedData = await AsyncStorage.getItem(storageKey);
          } catch (e) {
            console.warn('AsyncStorage load error:', e);
          }
        }

        if (savedData && isMounted) {
          const parsed = JSON.parse(savedData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch (e) {
        console.warn('Lỗi phân tích tin nhắn đã lưu:', e);
      }
    };

    loadSaved();
    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  // Tự động lưu mỗi khi có tin nhắn mới
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    try {
      const dataStr = JSON.stringify(messages);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, dataStr);
      } else {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        AsyncStorage.setItem(storageKey, dataStr).catch((e: any) =>
          console.warn('AsyncStorage save error:', e)
        );
      }
    } catch (err) {
      console.warn('Lỗi lưu tin nhắn chat:', err);
    }
  }, [messages, storageKey]);

  // Xóa lịch sử trò chuyện
  const handleClearChat = async () => {
    const welcome = [getWelcomeMessage()];
    setMessages(welcome);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      } else {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.warn('Lỗi xóa lịch sử chat:', e);
    }
  };

  // Hiệu ứng nhún nhảy nhẹ nhàng cho chú Ếch
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Ẩn tooltip sau 8 giây nếu chưa bấm
    const t = setTimeout(() => {
      setShowTooltip(false);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  // Cuộn xuống tin mới nhất
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages, isOpen]);

  // Hàm điều hướng và viền sáng vị trí tính năng
  const handleActionNavigate = (tabKey: string, elementId?: string) => {
    if (onNavigateToTab) {
      onNavigateToTab(tabKey);
    }

    if (tabKey === 'budget' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('monett_open_savings_tab'));
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (elementId && Platform.OS === 'web' && typeof document !== 'undefined') {
      setTimeout(() => {
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'all 0.4s ease';
          el.style.boxShadow = '0 0 0 4px #10B981, 0 12px 30px rgba(16, 185, 129, 0.35)';
          setTimeout(() => {
            el.style.boxShadow = '';
          }, 3500);
        }
      }, 350);
    }
  };

  const handleSelectTopic = (topic: typeof TOPICS[0]) => {
    // Không tự động chuyển trang khi bấm chip gợi ý.
    // Ếch gửi tin nhắn giải thích tính năng kèm nút "Đến Trang ...".
    // Người dùng bấm vào nút "Đến Trang ..." trong khung chat thì mới chuyển sang trang đó!
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: topic.query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiMsg: ChatMessage = {
      id: `ai-${Date.now() + 1}`,
      sender: 'ai',
      text: topic.reply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: topic.action,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
  };

  const handleSendCustomText = () => {
    if (!inputText.trim()) return;
    const query = inputText.trim();
    setInputText('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Phân tích từ khóa thông minh
    const qLower = query.toLowerCase();
    let replyText = 'Mình đã ghi nhận câu hỏi của bạn! Bạn có thể thử bấm vào các trang gợi ý bên dưới để mình dẫn đường trực tiếp nhé!';
    let actionData: ChatMessage['action'] | undefined = undefined;

    if (
      qLower.includes('tích lũy') ||
      qLower.includes('tich luy') ||
      qLower.includes('tiết kiệm') ||
      qLower.includes('tiet kiem') ||
      qLower.includes('hũ') ||
      qLower.includes('hủ') ||
      qLower.includes('heo') ||
      qLower.includes('nuôi heo')
    ) {
      replyText = 'Trang Tích Lũy (Tiết kiệm & Heo đất) sẽ giúp bạn theo dõi tiến độ nuôi heo, đặt mục tiêu mua sắm, dự phòng để sớm đạt ước mơ nhé!';
      actionData = {
        label: '👛 Đến Trang Tích Lũy',
        tabKey: 'budget',
      };
    } else if (qLower.includes('tổng quan') || qLower.includes('trang chủ') || qLower.includes('home')) {
      replyText = 'Trang Tổng Quan sẽ hiển thị biểu đồ thu chi, lịch chi tiêu và các lời nhắc việc hằng ngày của bạn!';
      actionData = {
        label: '⊞ Đến Trang Tổng Quan',
        tabKey: 'home',
      };
    } else if (qLower.includes('sự kiện') || qLower.includes('tiệc') || qLower.includes('du lịch') || qLower.includes('event')) {
      replyText = 'Trang Sự Kiện giúp bạn theo dõi các hoạt động ăn uống, hội họp cùng bạn bè và chia tiền tiện lợi!';
      actionData = {
        label: '📅 Đến Trang Sự Kiện',
        tabKey: 'events',
      };
    } else if (qLower.includes('báo cáo') || qLower.includes('thống kê') || qLower.includes('sơ đồ') || qLower.includes('biểu đồ') || qLower.includes('tháng này') || qLower.includes('năm')) {
      replyText = 'Bạn hãy vào trang Báo Cáo nhé, ở đó có biểu đồ cột, donut tròn và bảng kê chi tiết theo từng Ngày, Tháng, Năm cực kỳ sắc nét!';
      actionData = {
        label: '📊 Đến Trang Báo Cáo',
        tabKey: 'analytics',
      };
    } else if (qLower.includes('nợ') || qLower.includes('sổ nợ') || qLower.includes('cho mượn') || qLower.includes('ghi nợ')) {
      replyText = 'Trang Sổ Ghi Nợ sẽ giúp bạn ghi lại rõ ràng ai đang nợ tiền bạn hoặc bạn cần trả ai, tránh quên sót!';
      actionData = {
        label: '📖 Đến Trang Sổ Ghi Nợ',
        tabKey: 'debts',
      };
    } else if (qLower.includes('định kỳ') || qLower.includes('tiền điện') || qLower.includes('tiền nước') || qLower.includes('tiền trọ') || qLower.includes('hóa đơn')) {
      replyText = 'Trang Định Kỳ giúp bạn theo dõi và quản lý mọi hóa đơn cố định lặp lại mỗi tháng như tiền phòng, điện nước, internet!';
      actionData = {
        label: '🔁 Đến Trang Định Kỳ',
        tabKey: 'recurring',
      };
    } else if (qLower.includes('bạn bè') || qLower.includes('kết bạn') || qLower.includes('bảng tin') || qLower.includes('chia tiền') || qLower.includes('nhắn tin')) {
      replyText = 'Toàn bộ tính năng Bảng tin, Danh sách bạn bè và Nhắn tin trò chuyện đã được gộp gọn trong tab Bảng Tin đó bạn ơi!';
      actionData = {
        label: '📰 Đến Trang Bảng Tin',
        tabKey: 'feed',
      };
    } else if (qLower.includes('ngân sách') || qLower.includes('hạn mức') || qLower.includes('giới hạn') || qLower.includes('vượt')) {
      replyText = 'Bạn có thể theo dõi và quản lý các mục tiêu tài chính tại tab Tích Lũy nhé!';
      actionData = {
        label: '👛 Đến Trang Tích Lũy',
        tabKey: 'budget',
      };
    }



    const aiMsg: ChatMessage = {
      id: `ai-${Date.now() + 1}`,
      sender: 'ai',
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: actionData,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
  };

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const chatWidth = Math.min(360, windowWidth - 32);
  const chatHeight = Math.min(520, windowHeight - 96);

  // Vị trí con ếch trên màn hình (đo từ mép trái và mép trên)
  const frogX = windowWidth - 24 - 36 + panOffset.x;
  const frogY = windowHeight - 24 - 36 + panOffset.y;

  const isFrogOnLeft = frogX < windowWidth / 2;
  const isFrogOnTop = frogY < windowHeight / 2;

  // Tính vị trí X của cửa sổ chat (luôn nằm trọn vẹn trong màn hình, không tràn mép)
  const chatWindowHorizontalStyle = isFrogOnLeft
    ? {
        left: Math.max(16, Math.min(frogX - 36, windowWidth - chatWidth - 16)),
        right: undefined,
      }
    : {
        right: Math.max(16, Math.min(windowWidth - frogX - 36, windowWidth - chatWidth - 16)),
        left: undefined,
      };

  // Tính vị trí Y của cửa sổ chat:
  // - Nếu ếch ở nửa trên màn hình -> Cửa sổ chat mở phía DƯỚI con ếch
  // - Nếu ếch ở nửa dưới màn hình -> Cửa sổ chat mở phía TRÊN con ếch
  // - LUÔN ĐƯỢC GIỚI HẠN (CLAMPED): top tối thiểu 72px (dưới navbar), bottom tối thiểu 16px!
  const chatWindowVerticalStyle = isFrogOnTop
    ? {
        top: Math.max(72, Math.min(frogY + 44, windowHeight - chatHeight - 16)),
        bottom: undefined,
      }
    : {
        bottom: Math.max(16, Math.min(windowHeight - frogY + 44, windowHeight - chatHeight - 72)),
        top: undefined,
      };

  // Đóng chat khi bấm ra ngoài hoặc nhấn phím Escape (trên Web)
  useEffect(() => {
    if (!isOpen || Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleMouseDown = (e: MouseEvent) => {
      const chatEl = document.getElementById('monett-floating-frog-chat-window');
      const frogEl = document.getElementById('monett-floating-frog-btn');
      if (
        chatEl &&
        !chatEl.contains(e.target as Node) &&
        frogEl &&
        !frogEl.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const renderChatWindow = () => (
    <View
      nativeID="monett-floating-frog-chat-window"
      style={[
        styles.chatWindow,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
          position: 'fixed' as any,
          width: chatWidth,
          height: chatHeight,
          maxHeight: chatHeight,
          zIndex: 999998,
          ...chatWindowHorizontalStyle,
          ...chatWindowVerticalStyle,
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.chatHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
        <View style={styles.chatHeaderLeft}>
          <View style={styles.headerAvatarContainer}>
            <Image source={FROG_AVATAR} style={styles.headerFrogImg} resizeMode="contain" />
            <View style={styles.headerOnlineDot} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              Trợ lý Ếch Monett
            </Text>
            <Text style={styles.headerSubtitle}>Chỉ đường & Trợ lý tài chính</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {messages.length > 1 && (
            <TouchableOpacity
              onPress={handleClearChat}
              style={styles.closeBtn}
              activeOpacity={0.7}
              accessibilityLabel="Xóa lịch sử chat"
            >
              <Ionicons name="trash-outline" size={17} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setIsOpen(false)}
            style={styles.closeBtn}
            activeOpacity={0.7}
            accessibilityLabel="Đóng"
          >
            <Ionicons name="close" size={20} color={isDark ? '#CBD5E1' : '#64748B'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Body */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => {
          const isAi = item.sender === 'ai';
          return (
            <View style={[styles.msgRow, isAi ? styles.msgRowAi : styles.msgRowUser]}>
              {isAi && (
                <Image source={FROG_AVATAR} style={styles.msgFrogAvatar} resizeMode="contain" />
              )}
              <View style={{ maxWidth: '82%' }}>
                <View
                  style={[
                    styles.msgBubble,
                    isAi
                      ? [styles.msgBubbleAi, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]
                      : styles.msgBubbleUser,
                  ]}
                >
                  <Text
                    style={[
                      styles.msgText,
                      isAi
                        ? { color: isDark ? '#F8FAFC' : '#0F172A' }
                        : { color: '#FFFFFF' },
                    ]}
                  >
                    {item.text}
                  </Text>

                  {/* Nút hành động tương tác 1-chạm (Action Button) */}
                  {item.action && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleActionNavigate(item.action!.tabKey, item.action!.elementId)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.actionBtnText}>{item.action.label}</Text>
                      <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text
                  style={[
                    styles.msgTime,
                    isAi ? { textAlign: 'left', marginLeft: 4 } : { textAlign: 'right', marginRight: 4 },
                  ]}
                >
                  {item.time}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Quick Topic Chips */}
      <View style={[styles.topicsBar, { backgroundColor: isDark ? '#0F172A' : '#FAFAFA' }]}>
        <Text style={styles.topicsHint}>Hỏi nhanh Ếch Monett:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicsScroll}>
          {TOPICS.map((t, idx) => {
            const isActive = activeTab === t.action.tabKey;
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.topicChip,
                  {
                    backgroundColor: isActive
                      ? isDark
                        ? '#064E3B'
                        : '#ECFDF5'
                      : isDark
                      ? '#1E293B'
                      : '#FFFFFF',
                    borderColor: isActive
                      ? '#10B981'
                      : isDark
                      ? '#334155'
                      : '#E2E8F0',
                  },
                ]}
                onPress={() => handleSelectTopic(t)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.iconName}
                  size={13}
                  color={isActive ? '#10B981' : isDark ? '#34D399' : '#047857'}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.topicChipText,
                    {
                      color: isActive
                        ? '#059669'
                        : isDark
                        ? '#CBD5E1'
                        : '#334155',
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {t.chip}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Input Area */}
      <View
        style={[
          styles.inputArea,
          { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderTopColor: isDark ? '#334155' : '#F1F5F9' },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            { color: isDark ? '#F8FAFC' : '#0F172A', backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
          ]}
          placeholder="Hỏi vị trí tính năng, chi tiêu..."
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendCustomText}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            !inputText.trim() && { opacity: 0.5, backgroundColor: '#94A3B8' },
          ]}
          onPress={handleSendCustomText}
          disabled={!inputText.trim()}
          activeOpacity={0.85}
        >
          <Ionicons name="send" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.floatingWrapper} pointerEvents="box-none">
      {/* 1. CỬA SỔ CHAT TỰ ĐỘNG CÂN CHỈNH TRÊN MÀN HÌNH - KHÔNG BỊ TRÀN HAY MẤT NÚT ĐÓNG */}
      {isOpen && renderChatWindow()}

      {/* 2. CHÚ ẾCH MONETT KÉO DI CHUYỂN TỰ DO (DRAGGABLE FROG MASCOT) */}
      <Animated.View
        style={[
          styles.dragContainer,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
            ],
            zIndex: 999999,
          },
        ]}
        pointerEvents="box-none"
      >
        <Animated.View
          {...panResponder.panHandlers}
          nativeID="monett-floating-frog-btn"
          style={[
            styles.bubbleContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
            Platform.OS === 'web'
              ? ({
                  cursor: 'grab',
                  userSelect: 'none',
                  touchAction: 'none',
                } as any)
              : undefined,
          ]}
        >
          {/* Tooltip mời chào */}
          {showTooltip && !isOpen && (
            <TouchableOpacity
              style={[
                styles.tooltipBubble,
                isFrogOnLeft ? { left: 82, right: undefined } : { right: 82, left: undefined },
              ]}
              onPress={() => {
                setShowTooltip(false);
                setIsOpen(true);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.tooltipText}>Hỏi Ếch Monett</Text>
              <View
                style={[
                  styles.tooltipArrow,
                  isFrogOnLeft ? styles.tooltipArrowLeft : styles.tooltipArrowRight,
                ]}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.frogFloatBtn}
            onPress={() => {
              setIsOpen((prev) => !prev);
              setShowTooltip(false);
            }}
            activeOpacity={0.85}
          >
            <Image
              source={FROG_AVATAR}
              style={[styles.frogFloatImg, { pointerEvents: 'none' } as any]}
              resizeMode="contain"
            />
            {isOpen ? (
              <View style={styles.floatingCloseBadge}>
                <Ionicons name="close" size={11} color="#FFFFFF" />
              </View>
            ) : (
              <View style={styles.floatingOnlineBadge} />
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'fixed' as any,
    bottom: 24,
    right: 24,
    zIndex: 999998,
    alignItems: 'flex-end',
  },
  dragContainer: {
    alignItems: 'flex-end',
  },
  bubbleContainer: {
    alignItems: 'flex-end',
  },
  frogFloatBtn: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  frogFloatImg: {
    width: 72,
    height: 72,
  },
  floatingOnlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  floatingCloseBadge: {
    position: 'absolute',
    top: 0,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 5,
  },
  tooltipBubble: {
    position: 'absolute',
    top: 20,
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  tooltipArrow: {
    position: 'absolute',
    top: 10,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
  },
  tooltipArrowRight: {
    right: -6,
    borderLeftWidth: 6,
    borderLeftColor: '#064E3B',
  },
  tooltipArrowLeft: {
    left: -6,
    borderRightWidth: 6,
    borderRightColor: '#064E3B',
  },

  chatWindow: {
    width: 360,
    height: 520,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 25,
    flexDirection: 'column',
  },
  chatHeader: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatarContainer: {
    width: 38,
    height: 38,
    position: 'relative',
  },
  headerFrogImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerOnlineDot: {
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
  headerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginTop: 0.5,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Messages
  messagesList: {
    padding: 12,
    gap: 10,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  msgRowAi: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 8,
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgFrogAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: 2,
  },
  msgBubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
  },
  msgBubbleAi: {
    borderBottomLeftRadius: 4,
  },
  msgBubbleUser: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  msgTime: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 3,
  },

  // Action Button in AI Message
  actionBtn: {
    marginTop: 8,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },


  // Topics
  topicsBar: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  topicsHint: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  topicsScroll: {
    paddingHorizontal: 10,
    gap: 6,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  topicChipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Input
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    fontSize: 12.5,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
