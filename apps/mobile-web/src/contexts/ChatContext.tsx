import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { getFriendsApi } from '../services/api';

export interface ChatGroup {
  id: string;
  name: string;
  icon: string;
  memberIds: string[];
  members: Array<{ id: string; name: string; avatar?: string }>;
  createdAt: string;
  createdBy: string;
  isGroup: boolean;
  lastMessage?: string;
}

interface ChatContextType {
  isMessengerOpen: boolean;
  openMessenger: () => void;
  closeMessenger: () => void;
  toggleMessenger: () => void;
  activeChatFriend: any | null;
  activeMomentReply: any | null;
  openChat: (friend: any, momentReply?: any) => void;
  closeChat: () => void;
  friendsList: any[];
  chatGroups: ChatGroup[];
  saveChatGroups: (newGroups: ChatGroup[]) => void;
  createGroup: (name: string, icon: string, selectedFriendIds: string[]) => ChatGroup | null;
  pinnedChatIds: string[];
  togglePinChat: (chatId: string) => void;
  hiddenChatIds: string[];
  deleteConversation: (target: { id: string; type: 'group' | 'friend' | 'moment'; name: string }) => void;
  refreshFriends: () => Promise<void>;
  isFriendOnline: (friend: any) => boolean;
  unreadChatCount: number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { isUserOnline, refreshOnlineUsers, socket } = useSocket();

  const myId = String((user as any)?._id || (user as any)?.id || '');

  // Trạng thái mở Popover Messenger (Facebook style dropdown)
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);

  // Người bạn hoặc nhóm đang mở khung chat nổi ở góc dưới bên phải
  const [activeChatFriend, setActiveChatFriend] = useState<any | null>(null);
  const [activeMomentReply, setActiveMomentReply] = useState<any | null>(null);

  // Danh sách bạn bè
  const [friendsList, setFriendsList] = useState<any[]>([]);

  // Nhóm trò chuyện (Chat groups)
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('monett_chat_groups');
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading monett_chat_groups:', e);
    }
    return [
      {
        id: 'group_coffee_weekend',
        name: 'Hội Cà Phê Cuối Tuần ☕',
        icon: 'coffee',
        memberIds: [myId || 'me'],
        members: [{ id: myId || 'me', name: (user as any)?.fullName || 'Ánh Mai' }],
        createdAt: new Date().toISOString(),
        createdBy: myId || 'me',
        isGroup: true,
        lastMessage: 'Cuối tuần đi cafe chia tiền nhé! 💸',
      },
    ];
  });

  const saveChatGroups = useCallback((newGroups: ChatGroup[]) => {
    setChatGroups(newGroups);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('monett_chat_groups', JSON.stringify(newGroups));
      }
    } catch (e) {
      console.warn('Error saving monett_chat_groups:', e);
    }
  }, []);

  // Cuộc trò chuyện được ghim
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('monett_pinned_chats');
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return [];
  });

  const togglePinChat = useCallback((chatId: string) => {
    setPinnedChatIds((prev) => {
      const next = prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [chatId, ...prev];
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('monett_pinned_chats', JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  }, []);

  // Cuộc trò chuyện bị ẩn / xóa
  const [hiddenChatIds, setHiddenChatIds] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('monett_hidden_chats');
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return [];
  });

  const deleteConversation = useCallback((target: { id: string; type: 'group' | 'friend' | 'moment'; name: string }) => {
    const isGrp = target.type === 'group';
    const msg = isGrp
      ? `Bạn có chắc muốn xóa nhóm trò chuyện "${target.name}"?`
      : `Bạn có chắc muốn xóa cuộc trò chuyện với "${target.name}"?`;
    const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(msg) : true;
    if (confirmed) {
      if (isGrp) {
        setChatGroups((prev) => {
          const next = prev.filter((g) => g.id !== target.id);
          saveChatGroups(next);
          return next;
        });
      } else {
        setHiddenChatIds((prev) => {
          const next = [...prev, target.id];
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem('monett_hidden_chats', JSON.stringify(next));
            }
          } catch {}
          return next;
        });
      }

      if (pinnedChatIds.includes(target.id)) {
        setPinnedChatIds((prev) => {
          const next = prev.filter((id) => id !== target.id);
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem('monett_pinned_chats', JSON.stringify(next));
            }
          } catch {}
          return next;
        });
      }

      if (
        activeChatFriend?.id === target.id ||
        (activeChatFriend as any)?._id === target.id
      ) {
        setActiveChatFriend(null);
        setActiveMomentReply(null);
      }
    }
  }, [activeChatFriend, pinnedChatIds, saveChatGroups]);

  // Tải danh sách bạn bè
  const refreshFriends = useCallback(async () => {
    try {
      const data = await getFriendsApi();
      setFriendsList(data || []);
    } catch (err) {
      console.warn('Error fetching friends list in ChatContext:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshFriends();
    }
  }, [user, refreshFriends]);

  // Kiểm tra online chính xác
  const isFriendOnline = useCallback(
    (f: any) => {
      if (!f) return false;
      const candidateIds = [
        f._id,
        f.id,
        f.friendId,
        f.userId,
        f.user?._id,
        f.user?.id,
        f.recipient?._id,
        f.recipient?.id,
        f.requester?._id,
        f.requester?.id,
      ].filter(Boolean).map(String);
      return (
        candidateIds.some((cid) => isUserOnline(cid)) ||
        f.isOnline === true ||
        f.status === 'online' ||
        f.online === true
      );
    },
    [isUserOnline]
  );

  const openMessenger = useCallback(() => {
    setIsMessengerOpen(true);
    if (refreshOnlineUsers) refreshOnlineUsers();
    if (socket?.connected) socket.emit('get_online_users');
    refreshFriends();
  }, [refreshOnlineUsers, socket, refreshFriends]);

  const closeMessenger = useCallback(() => {
    setIsMessengerOpen(false);
  }, []);

  const toggleMessenger = useCallback(() => {
    setIsMessengerOpen((prev) => {
      const next = !prev;
      if (next) {
        if (refreshOnlineUsers) refreshOnlineUsers();
        if (socket?.connected) socket.emit('get_online_users');
        refreshFriends();
      }
      return next;
    });
  }, [refreshOnlineUsers, socket, refreshFriends]);

  const openChat = useCallback((friend: any, momentReply?: any) => {
    setIsMessengerOpen(false);
    setActiveChatFriend(friend);
    setActiveMomentReply(momentReply || null);
    if (refreshOnlineUsers) refreshOnlineUsers();
    if (socket?.connected) socket.emit('get_online_users');
  }, [refreshOnlineUsers, socket]);

  const closeChat = useCallback(() => {
    setActiveChatFriend(null);
    setActiveMomentReply(null);
  }, []);

  const createGroup = useCallback((name: string, icon: string, selectedFriendIds: string[]) => {
    if (!name.trim()) return null;

    const selectedFriends = friendsList.filter((f) =>
      selectedFriendIds.includes(String(f._id || f.id || ''))
    );

    const members = [
      {
        id: myId,
        name: (user as any)?.fullName || 'Tôi',
        avatar: (user as any)?.avatarUrl || (user as any)?.avatar,
      },
      ...selectedFriends.map((f) => ({
        id: String(f._id || f.id || ''),
        name: f.fullName || f.email || 'Bạn bè',
        avatar: f.avatarUrl || f.avatar,
      })),
    ];

    const newGroup: ChatGroup = {
      id: 'group_' + Date.now(),
      name: name.trim(),
      icon: icon || 'users',
      memberIds: [myId, ...selectedFriendIds],
      members,
      createdAt: new Date().toISOString(),
      createdBy: myId,
      isGroup: true,
      lastMessage: 'Nhóm đã được tạo thành công!',
    };

    const nextGroups = [newGroup, ...chatGroups];
    saveChatGroups(nextGroups);
    openChat(newGroup);
    return newGroup;
  }, [myId, user, friendsList, chatGroups, saveChatGroups, openChat]);

  // Unread or active count
  const unreadChatCount = useMemo(() => {
    return 0;
  }, []);

  const value = useMemo(
    () => ({
      isMessengerOpen,
      openMessenger,
      closeMessenger,
      toggleMessenger,
      activeChatFriend,
      activeMomentReply,
      openChat,
      closeChat,
      friendsList,
      chatGroups,
      saveChatGroups,
      createGroup,
      pinnedChatIds,
      togglePinChat,
      hiddenChatIds,
      deleteConversation,
      refreshFriends,
      isFriendOnline,
      unreadChatCount,
    }),
    [
      isMessengerOpen,
      openMessenger,
      closeMessenger,
      toggleMessenger,
      activeChatFriend,
      activeMomentReply,
      openChat,
      closeChat,
      friendsList,
      chatGroups,
      saveChatGroups,
      createGroup,
      pinnedChatIds,
      togglePinChat,
      hiddenChatIds,
      deleteConversation,
      refreshFriends,
      isFriendOnline,
      unreadChatCount,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
