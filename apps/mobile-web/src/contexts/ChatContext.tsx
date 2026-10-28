import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { getFriendsApi, createChatGroupApi, getChatGroupsApi } from '../services/api';

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

  // Tải danh sách nhóm trò chuyện từ server
  const refreshGroups = useCallback(async () => {
    try {
      const serverGroups = await getChatGroupsApi();
      if (Array.isArray(serverGroups) && serverGroups.length > 0) {
        setChatGroups((prev) => {
          const map = new Map<string, ChatGroup>();
          // Giữ các nhóm hiện có
          prev.forEach((g) => map.set(g.id, g));
          // Cập nhật/thêm các nhóm từ server
          serverGroups.forEach((sg: any) => {
            const gId = String(sg._id || sg.id);
            map.set(gId, {
              id: gId,
              name: sg.name,
              icon: sg.icon || 'users',
              memberIds: (sg.memberIds || []).map(String),
              members: sg.members || [],
              createdAt: sg.createdAt || new Date().toISOString(),
              createdBy: String(sg.createdBy || ''),
              isGroup: true,
              lastMessage: sg.lastMessage || 'Nhóm trò chuyện 👥',
            });
          });
          const combined = Array.from(map.values());
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem('monett_chat_groups', JSON.stringify(combined));
            }
          } catch {}
          return combined;
        });
      }
    } catch (e) {
      console.warn('Error fetching groups in ChatContext:', e);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshFriends();
      refreshGroups();
    }
  }, [user, refreshFriends, refreshGroups]);

  // ─── LẮNG NGHE REALTIME KHI ĐƯỢC THÊM VÀO NHÓM HOẶC CÓ TIN NHẮN NHÓM MỚI ───
  useEffect(() => {
    const handleGroupCreated = (group: any) => {
      if (!group) return;
      const gId = String(group._id || group.id);
      const formattedGroup: ChatGroup = {
        id: gId,
        name: group.name,
        icon: group.icon || 'users',
        memberIds: (group.memberIds || []).map(String),
        members: group.members || [],
        createdAt: group.createdAt || new Date().toISOString(),
        createdBy: String(group.createdBy || ''),
        isGroup: true,
        lastMessage: group.lastMessage || 'Nhóm đã được tạo thành công!',
      };

      setChatGroups((prev) => {
        if (prev.some((g) => g.id === gId)) return prev;
        const next = [formattedGroup, ...prev];
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('monett_chat_groups', JSON.stringify(next));
          }
        } catch {}
        return next;
      });
    };

    const handleReceiveGroupMessage = (msg: any) => {
      if (!msg || !msg.groupId) return;
      const gId = String(msg.groupId);
      setChatGroups((prev) => {
        const next = prev.map((g) => {
          if (g.id === gId) {
            return {
              ...g,
              lastMessage: msg.text || (msg.imageUrl ? '[Hình ảnh]' : (msg.bill ? '[Chia bill]' : g.lastMessage)),
            };
          }
          return g;
        });
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('monett_chat_groups', JSON.stringify(next));
          }
        } catch {}
        return next;
      });
    };

    if (socket) {
      socket.on('group_created', handleGroupCreated);
      socket.on('receive_group_message', handleReceiveGroupMessage);
    }

    // Lắng nghe cross-tab trong cùng trình duyệt
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'monett_cross_tab_group_created' && e.newValue) {
        try {
          const item = JSON.parse(e.newValue);
          if (item && item.recipientId === myId && item.group) {
            handleGroupCreated(item.group);
          }
        } catch {}
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', handleStorage);
    }

    return () => {
      if (socket) {
        socket.off('group_created', handleGroupCreated);
        socket.off('receive_group_message', handleReceiveGroupMessage);
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('storage', handleStorage);
      }
    };
  }, [socket, myId]);

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
    refreshGroups();
  }, [refreshOnlineUsers, socket, refreshFriends, refreshGroups]);

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
        refreshGroups();
      }
      return next;
    });
  }, [refreshOnlineUsers, socket, refreshFriends, refreshGroups]);

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

    const tempId = 'group_' + Date.now();
    const newGroup: ChatGroup = {
      id: tempId,
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

    // Lưu lên backend và bắn realtime Socket cho bạn bè
    createChatGroupApi(name.trim(), icon || 'users', selectedFriendIds)
      .then((serverGroup: any) => {
        if (serverGroup && (serverGroup._id || serverGroup.id)) {
          const realId = String(serverGroup._id || serverGroup.id);
          const realGroup: ChatGroup = {
            id: realId,
            name: serverGroup.name,
            icon: serverGroup.icon || 'users',
            memberIds: (serverGroup.memberIds || []).map(String),
            members: serverGroup.members || members,
            createdAt: serverGroup.createdAt || newGroup.createdAt,
            createdBy: String(serverGroup.createdBy || myId),
            isGroup: true,
            lastMessage: serverGroup.lastMessage || newGroup.lastMessage,
          };
          setChatGroups((prev) => {
            const updated = prev.map((g) => (g.id === tempId ? realGroup : g));
            saveChatGroups(updated);
            return updated;
          });
          setActiveChatFriend((curr: any) => (curr?.id === tempId ? realGroup : curr));
        }
      })
      .catch((err) => {
        console.warn('Lỗi lưu nhóm lên API:', err);
      });

    // Bắn thông báo chéo qua localStorage cho test cùng trình duyệt
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        selectedFriendIds.forEach((friendId) => {
          window.localStorage.setItem(
            'monett_cross_tab_group_created',
            JSON.stringify({
              recipientId: friendId,
              creatorId: myId,
              creatorName: (user as any)?.fullName || 'Bạn bè',
              creatorAvatar: (user as any)?.avatarUrl || null,
              group: newGroup,
              timestamp: Date.now(),
            })
          );
        });
      }
    } catch {}

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
