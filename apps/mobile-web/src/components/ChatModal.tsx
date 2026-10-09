import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMessagesApi, sendMessageApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { isDark } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  
  const currentUserId = user?.id;

  const loadMessages = async () => {
    const friendId = friend?._id || friend?.id;
    if (!friendId) return;
    try {
      const data = await getMessagesApi(friendId);
      setMessages(data);
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  };

  const prevMsgCount = useRef(0);

  useEffect(() => {
    const friendId = friend?._id || friend?.id;
    if (visible && friendId) {
      setLoading(true);
      loadMessages().finally(() => setLoading(false));
      
      const interval = setInterval(() => {
        loadMessages();
      }, 3000);
      return () => clearInterval(interval);
    } else {
      prevMsgCount.current = 0;
    }
  }, [visible, friend]);

  useEffect(() => {
    if (visible && messages.length > prevMsgCount.current && prevMsgCount.current > 0) {
      playNotificationSound();
    }
    prevMsgCount.current = messages.length;
  }, [messages.length, visible]);

  const handleSend = async () => {
    const friendId = friend?._id || friend?.id;
    if (!text.trim() || !friendId) return;
    try {
      const currentText = text;
      setText(''); // Optimistic clear
      const newMsg = await sendMessageApi(friendId, currentText);
      setMessages(prev => [...prev, newMsg]);
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
    'Nhớ giữ chuỗi nhé! 🔥'
  ];

  if (!friend) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="chevron-back" size={24} color={isDark ? '#F1F5F9' : '#0F172A'} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
              {friend.fullName || 'Bạn bè'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Chat Area */}
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#059669" />
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
                  return (
                    <View style={[
                      styles.messageBubble, 
                      isMe ? styles.myMessage : [styles.theirMessage, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]
                    ]}>
                      <Text style={[
                        styles.messageText, 
                        isMe ? styles.myMessageText : { color: isDark ? '#F8FAFC' : '#0F172A' }
                      ]}>
                        {item.text}
                      </Text>
                      <Text style={[
                        styles.timeText,
                        isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: isDark ? '#94A3B8' : '#64748B' }
                      ]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <Text style={[styles.emptyText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                    Chưa có tin nhắn nào. Bắt đầu trò chuyện!
                  </Text>
                }
              />
            )}

            {/* Quick Replies */}
            <View style={{ backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
              >
                {quickReplies.map((reply, idx) => (
                  <TouchableOpacity 
                    key={idx}
                    style={{
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isDark ? '#334155' : '#E2E8F0'
                    }}
                    onPress={() => setText(reply)}
                  >
                    <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#475569' }}>{reply}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Input Area */}
            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderTopColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <TextInput
                style={[styles.input, { color: isDark ? '#F1F5F9' : '#0F172A', backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[styles.sendButton, !text.trim() && { opacity: 0.5 }]} 
                onPress={handleSend}
                disabled={!text.trim()}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 0.9,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
