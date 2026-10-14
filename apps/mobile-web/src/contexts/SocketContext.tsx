import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getBaseUrl } from '../services/api';

export interface SocketMessagePayload {
  _id: string;
  sender: string;
  receiver: string;
  text: string;
  type?: 'text' | 'bill_split' | 'payment_confirm';
  billData?: any;
  createdAt: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: string[];
  typingUsers: Record<string, boolean>; // userId -> isTyping
  isUserOnline: (userId: string) => boolean;
  isUserTyping: (userId: string) => boolean;
  sendMessage: (
    receiverId: string,
    text: string,
    type?: string,
    billData?: any
  ) => Promise<SocketMessagePayload | null>;
  sendTyping: (receiverId: string, isTyping: boolean) => void;
  lastMessage: SocketMessagePayload | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUserIds: [],
  typingUsers: {},
  isUserOnline: () => false,
  isUserTyping: () => false,
  sendMessage: async () => null,
  sendTyping: () => {},
  lastMessage: null,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [lastMessage, setLastMessage] = useState<SocketMessagePayload | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutsRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setOnlineUserIds([]);
      setTypingUsers({});
      return;
    }

    const serverUrl = getBaseUrl();
    const newSocket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('get_online_users');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Danh sách người dùng online ban đầu
    newSocket.on('initial_online_users', (userIds: string[]) => {
      if (Array.isArray(userIds)) {
        setOnlineUserIds(userIds.map(String));
      }
    });

    // Cập nhật khi có người vào/ra
    newSocket.on('user_status', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      const targetId = String(userId);
      setOnlineUserIds((prev) => {
        if (isOnline) {
          if (!prev.includes(targetId)) return [...prev, targetId];
          return prev;
        } else {
          return prev.filter((id) => id !== targetId);
        }
      });
    });

    // Nhận thông báo đối phương đang gõ tin nhắn
    newSocket.on('user_typing', ({ senderId, isTyping }: { senderId: string; isTyping: boolean }) => {
      const senderKey = String(senderId);
      setTypingUsers((prev) => ({
        ...prev,
        [senderKey]: isTyping,
      }));

      // Tự động tắt typing sau 3.5s nếu bên kia ngừng gõ mà không gửi event stop
      if (typingTimeoutsRef.current[senderKey]) {
        clearTimeout(typingTimeoutsRef.current[senderKey]);
      }
      if (isTyping) {
        typingTimeoutsRef.current[senderKey] = setTimeout(() => {
          setTypingUsers((prev) => ({
            ...prev,
            [senderKey]: false,
          }));
        }, 3500);
      }
    });

    // Nhận tin nhắn mới
    newSocket.on('receive_message', (msg: SocketMessagePayload) => {
      setLastMessage(msg);
      // Khi đối phương đã gửi tin thì tắt trạng thái typing của họ
      if (msg?.sender) {
        setTypingUsers((prev) => ({
          ...prev,
          [String(msg.sender)]: false,
        }));
      }
    });

    return () => {
      Object.values(typingTimeoutsRef.current).forEach((t) => clearTimeout(t));
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const isUserOnline = useCallback(
    (userId: string) => {
      if (!userId) return false;
      return onlineUserIds.includes(String(userId));
    },
    [onlineUserIds]
  );

  const isUserTyping = useCallback(
    (userId: string) => {
      if (!userId) return false;
      return !!typingUsers[String(userId)];
    },
    [typingUsers]
  );

  const sendMessage = useCallback(
    async (
      receiverId: string,
      text: string,
      type: string = 'text',
      billData?: any
    ): Promise<SocketMessagePayload | null> => {
      const socket = socketRef.current;
      if (!socket || !isConnected) return null;

      return new Promise((resolve) => {
        socket.emit(
          'send_message',
          { receiverId, text, type, billData },
          (response: any) => {
            if (response?.success && response?.data) {
              resolve(response.data);
            } else {
              resolve(null);
            }
          }
        );
      });
    },
    [isConnected]
  );

  const sendTyping = useCallback(
    (receiverId: string, isTyping: boolean) => {
      const socket = socketRef.current;
      if (socket && isConnected) {
        socket.emit('typing', { receiverId, isTyping });
      }
    },
    [isConnected]
  );

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        onlineUserIds,
        typingUsers,
        isUserOnline,
        isUserTyping,
        sendMessage,
        sendTyping,
        lastMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
