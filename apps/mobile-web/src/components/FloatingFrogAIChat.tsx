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
}

const FROG_AVATAR = require('../../assets/frogs/frog-vietnam.png');

export const FloatingFrogAIChat: React.FC<FloatingFrogAIChatProps> = ({ onNavigateToTab }) => {
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
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        setPanOffset((prev) => ({
          x: prev.x + gestureState.dx,
          y: prev.y + gestureState.dy,
        }));
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

  // Danh sách tin nhắn khởi tạo
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `Chào ${userName}! 🐸 Mình là Trợ lý Ếch Monett.\nBạn cần mình chỉ đường đến tính năng nào, hay cần tư vấn tài chính hôm nay không?`,
      time: 'Vừa xong',
    },
  ]);

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

  // Các chủ đề hướng dẫn nhanh có sẵn
  const TOPICS = [
    {
      chip: '🎯 Hũ tiết kiệm',
      query: 'Chỉ mình chỗ hũ tiết kiệm với!',
      reply: 'Mục Tiêu Tiết Kiệm nằm ở trang Tổng quan giúp bạn nuôi heo đất, tích lũy tiền cho các mục tiêu (mua xe, du lịch, dự phòng...) và theo dõi tiến độ nạp tiền đó!',
      action: {
        label: '🎯 Mở Hũ Tiết Kiệm Ngay',
        tabKey: 'home',
        elementId: 'savings-goals-section',
      },
    },
    {
      chip: '📸 Lưu ảnh & Lịch chi tiêu',
      query: 'Lưu ảnh hóa đơn và xem lịch ở đâu?',
      reply: 'Lịch Tài Chính nằm ngay trên Trang chủ giúp bạn xem lại ảnh hóa đơn/món ăn của từng ngày. Bạn có thể bấm vào bất kỳ ô ngày nào để xem lại hoặc nhập khoản chi mới nhé!',
      action: {
        label: '📅 Đến Lịch Tài Chính',
        tabKey: 'home',
        elementId: 'financial-calendar-section',
      },
    },
    {
      chip: '📊 Báo cáo & Chi tiêu',
      query: 'Xem báo cáo và chi tiêu ở đâu?',
      reply: 'Trang Báo Cáo đã được gộp chung đầy đủ cả biểu đồ phân tích xu hướng Ngày/Tháng/Năm lẫn bảng kê nhật ký từng khoản chi tiêu chi tiết đó bạn!',
      action: {
        label: '📊 Đến Trang Báo Cáo',
        tabKey: 'analytics',
      },
    },
    {
      chip: '🔔 Hóa đơn & Nhắc nợ',
      query: 'Chỉ mình chỗ xem hóa đơn và nợ',
      reply: 'Khu vực Hóa đơn định kỳ & Sổ nợ giúp bạn không bao giờ quên tiền trọ, điện nước hay các khoản nợ bạn bè!',
      action: {
        label: '🧾 Mở Hóa Đơn & Sổ Nợ',
        tabKey: 'home',
        elementId: 'bills-debts-section',
      },
    },
    {
      chip: '💳 Ngân sách & Tích lũy',
      query: 'Chỉ mình chỗ xem ngân sách và hũ tích lũy',
      reply: 'Trang Ngân Sách & Tích Lũy giúp bạn vừa đặt hạn mức chi tiêu tháng vừa theo dõi tiến độ nuôi heo đất các hũ tích lũy đạt ước mơ!',
      action: {
        label: '💳 Đến Ngân Sách & Tích Lũy',
        tabKey: 'budget',
      },
    },
    {
      chip: '📰 Bảng tin & Bạn bè',
      query: 'Chỉ mình chỗ Bảng tin và chat bạn bè',
      reply: 'Trang Bảng Tin cho phép bạn chia sẻ khoảnh khắc chi tiêu kèm ảnh với bạn bè, thả cảm xúc tương tác và nhắn tin trò chuyện riêng tư nhé!',
      action: {
        label: '📰 Đến Trang Bảng Tin',
        tabKey: 'feed',
      },
    },
  ];

  const handleSelectTopic = (topic: typeof TOPICS[0]) => {
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
    let replyText = 'Mình đã ghi nhận câu hỏi của bạn! 🐸 Bạn có thể thử bấm vào các chủ đề gợi ý bên dưới để mình dẫn đường trực tiếp nhé!';
    let actionData: ChatMessage['action'] | undefined = undefined;

    if (qLower.includes('tiết kiệm') || qLower.includes('hũ') || qLower.includes('heo') || qLower.includes('nuôi heo')) {
      replyText = 'Hũ tiết kiệm & Heo đất nằm ngay tại Trang chủ nhé! Bạn có thể tạo mục tiêu và nạp tiền đều đặn để sớm đạt ước mơ!';
      actionData = {
        label: '🎯 Mở Hũ Tiết Kiệm Ngay',
        tabKey: 'home',
        elementId: 'savings-goals-section',
      };
    } else if (qLower.includes('ảnh') || qLower.includes('lịch') || qLower.includes('chụp') || qLower.includes('hôm nay') || qLower.includes('hóa đơn')) {
      replyText = 'Lịch tài chính nằm trên Trang chủ nhé! Bạn có thể chạm vào từng ô ngày để xem ảnh hóa đơn bữa ăn hoặc lưu nhanh khoản chi!';
      actionData = {
        label: '📅 Đến Lịch Tài Chính',
        tabKey: 'home',
        elementId: 'financial-calendar-section',
      };
    } else if (qLower.includes('báo cáo') || qLower.includes('thống kê') || qLower.includes('sơ đồ') || qLower.includes('biểu đồ') || qLower.includes('tháng này') || qLower.includes('năm')) {
      replyText = 'Bạn hãy vào trang Báo Cáo nhé, ở đó có biểu đồ cột, donut tròn và bảng kê chi tiết theo từng Ngày, Tháng, Năm cực kỳ sắc nét!';
      actionData = {
        label: '📊 Đến Trang Báo Cáo',
        tabKey: 'analytics',
      };
    } else if (qLower.includes('nợ') || qLower.includes('tiền điện') || qLower.includes('tiền nước') || qLower.includes('tiền trọ') || qLower.includes('nhắc')) {
      replyText = 'Khu vực Hóa đơn & Nhắc nợ ở Trang chủ sẽ giúp bạn ghi lại các khoản cần đóng và tiền ai đang nợ bạn nè!';
      actionData = {
        label: '🧾 Mở Hóa Đơn & Sổ Nợ',
        tabKey: 'home',
        elementId: 'bills-debts-section',
      };
    } else if (qLower.includes('ngân sách') || qLower.includes('hạn mức') || qLower.includes('giới hạn') || qLower.includes('vượt')) {
      replyText = 'Hãy vào mục Ngân Sách để đặt mức chi tối đa cho từng nhóm như Ăn uống, Mua sắm... nhé!';
      actionData = {
        label: '💳 Đến Trang Ngân Sách',
        tabKey: 'budget',
      };
    } else if (qLower.includes('bạn bè') || qLower.includes('kết bạn') || qLower.includes('bảng tin') || qLower.includes('chia tiền') || qLower.includes('nhắn tin')) {
      replyText = 'Toàn bộ tính năng Bảng tin, Danh sách bạn bè và Nhắn tin trò chuyện đã được gộp gọn trong tab Bảng Tin đó bạn ơi!';
      actionData = {
        label: '📰 Đến Trang Bảng Tin',
        tabKey: 'feed',
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
  // Vị trí con ếch so với mép trái và mép trên màn hình
  const isNearLeftEdge = windowWidth - 96 + panOffset.x < 380;
  const isNearTopEdge = windowHeight - 96 + panOffset.y < 540;

  const renderChatWindow = () => (
    <View
      style={[
        styles.chatWindow,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
          marginBottom: isNearTopEdge ? 0 : 12,
          marginTop: isNearTopEdge ? 12 : 0,
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
              Trợ lý Ếch Monett 🐸
            </Text>
            <Text style={styles.headerSubtitle}>Chỉ đường & Trợ lý tài chính</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setIsOpen(false)}
          style={styles.closeBtn}
          activeOpacity={0.7}
          accessibilityLabel="Đóng"
        >
          <Ionicons name="close" size={20} color={isDark ? '#CBD5E1' : '#64748B'} />
        </TouchableOpacity>
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
          {TOPICS.map((t, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.topicChip,
                { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
              ]}
              onPress={() => handleSelectTopic(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.topicChipText, { color: isDark ? '#CBD5E1' : '#334155' }]}>{t.chip}</Text>
            </TouchableOpacity>
          ))}
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
      {/* ── CONTAINER DI CHUYỂN TOÀN BỘ THEO CON ẾCH ── */}
      <Animated.View
        style={[
          styles.dragContainer,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
            ],
            alignItems: isNearLeftEdge ? 'flex-start' : 'flex-end',
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Khi con ếch ở nửa dưới màn hình -> Bảng chat mở phía TRÊN con ếch */}
        {!isNearTopEdge && isOpen && renderChatWindow()}

        {/* ── CHÚ ẾCH MONETT KÉO DI CHUYỂN TỰ DO (DRAGGABLE FROG MASCOT) ── */}
        <Animated.View
          {...panResponder.panHandlers}
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
                isNearLeftEdge ? { left: 82, right: undefined } : { right: 82, left: undefined },
              ]}
              onPress={() => {
                setShowTooltip(false);
                setIsOpen(true);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.tooltipText}>Hỏi Ếch Monett 🐸</Text>
              <View
                style={[
                  styles.tooltipArrow,
                  isNearLeftEdge ? styles.tooltipArrowLeft : styles.tooltipArrowRight,
                ]}
              />
            </TouchableOpacity>
          )}

          <View style={styles.frogFloatBtn}>
            <Image
              source={FROG_AVATAR}
              style={[styles.frogFloatImg, { pointerEvents: 'none' } as any]}
              resizeMode="contain"
            />
            <View style={styles.floatingOnlineBadge} />
          </View>
        </Animated.View>

        {/* Khi con ếch ở gần mép trên màn hình -> Bảng chat mở phía DƯỚI con ếch để không bị tràn */}
        {isNearTopEdge && isOpen && renderChatWindow()}
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

  // Cửa sổ chat mini
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
    marginBottom: 12,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
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
