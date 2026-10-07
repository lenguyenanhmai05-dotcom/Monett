import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import {
  uploadAvatarApi,
  updateProfileApi,
  changePasswordApi,
  exportDataApi,
  sendFriendRequestApi,
  getFriendsApi,
  getFriendRequestsApi,
  respondFriendRequestApi,
  normalizeAvatarUrl,
  getStreakApi,
  checkInStreakApi,
  submitFeedbackApi,
} from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTransactions } from '../../contexts/TransactionContext';
import { FROGS } from '../../../assets/frogIndex';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-qr-code';
import { ChatModal } from '../../components/ChatModal';

interface ProfileScreenProps {
  onBack?: () => void;
  onLogout?: () => void;
  onNavigateToWallets?: () => void;
  onNavigateToCategories?: () => void;
  onNavigateToFeed?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack,
  onLogout,
  onNavigateToWallets,
  onNavigateToCategories,
  onNavigateToFeed,
}) => {
  const { user: authUser, logout, refreshUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const isVi = language === 'vi';
  const displayName = authUser?.fullName || (isVi ? 'Người dùng Monett' : 'Monett User');
  const displayEmail = authUser?.email || 'monett.user@monett.app';
  // Normalize avatar URL so it works on mobile (converts localhost → tunnel/LAN IP)
  const avatarUri = normalizeAvatarUrl(authUser?.avatarUrl);

  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: '#FEE2E2', text: '#B91C1C' }, // Red
      { bg: '#FEF3C7', text: '#D97706' }, // Yellow
      { bg: '#D1FAE5', text: '#059669' }, // Green
      { bg: '#DBEAFE', text: '#2563EB' }, // Blue
      { bg: '#E0E7FF', text: '#4F46E5' }, // Indigo
      { bg: '#FCE7F3', text: '#DB2777' }, // Pink
      { bg: '#F3E8FF', text: '#7E22CE' }, // Purple
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const avatarColor = getAvatarColor(displayName);
  const [imageError, setImageError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Language Modal State
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Currency & Reminder Settings State
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isUpdatingReminder, setIsUpdatingReminder] = useState(false);
  const [customReminderTime, setCustomReminderTime] = useState('');

  // Export Data State
  const { transactions } = useTransactions();
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // QR / Add Friend State
  const [showQRModal, setShowQRModal] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState('');
  const [isSendingFriendReq, setIsSendingFriendReq] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Friends Modal State (List + Requests tabs - like web)
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendsTab, setFriendsTab] = useState<'list' | 'requests'>('list');
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [activeChatFriend, setActiveChatFriend] = useState<any | null>(null);

  // Streak & Gamification State (Interactive)
  const [streakCount, setStreakCount] = useState<number>(authUser?.streak || 1);
  const [activeToday, setActiveToday] = useState<boolean>(false);
  const [totalActiveDays, setTotalActiveDays] = useState<number>(authUser?.totalActiveDays || 0);
  const [longestStreak, setLongestStreak] = useState<number>(authUser?.longestStreak || 0);
  const [shieldAvailable, setShieldAvailable] = useState<boolean>(true);
  const [shieldUsedToday, setShieldUsedToday] = useState<boolean>(false);
  const [streakLoading, setStreakLoading] = useState<boolean>(false);
  const [showStreakModal, setShowStreakModal] = useState<boolean>(false);
  const [showFrogModal, setShowFrogModal] = useState<boolean>(false);

  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('general');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const loadStreakData = async () => {
    try {
      const data: any = await getStreakApi();
      if (data) {
        if (data.streak !== undefined) setStreakCount(data.streak);
        if (data.activeToday !== undefined) setActiveToday(Boolean(data.activeToday));
        if (data.totalActiveDays !== undefined) setTotalActiveDays(data.totalActiveDays);
        if (data.longestStreak !== undefined) setLongestStreak(data.longestStreak);
        if (data.shieldAvailable !== undefined) setShieldAvailable(Boolean(data.shieldAvailable));
        if (data.shieldUsedToday !== undefined) setShieldUsedToday(Boolean(data.shieldUsedToday));
      }
    } catch (e) {
      console.warn('Error loading streak data:', e);
    }
  };

  useEffect(() => {
    loadStreakData();
  }, [authUser?.streak]);

  const handleCheckInStreak = async () => {
    if (activeToday || streakLoading) return;
    try {
      setStreakLoading(true);
      const res: any = await checkInStreakApi();
      if (res && res.streak !== undefined) {
        setStreakCount(res.streak);
        setActiveToday(true);
        if (res.totalActiveDays !== undefined) setTotalActiveDays(res.totalActiveDays);
        if (res.longestStreak !== undefined) setLongestStreak(res.longestStreak);
        if (res.shieldAvailable !== undefined) setShieldAvailable(Boolean(res.shieldAvailable));
        if (res.shieldUsed) setShieldUsedToday(true);
        if (refreshUser) await refreshUser();
        Alert.alert(
          '🔥 ' + (isVi ? 'Thành công!' : 'Awesome!'),
          res.message || (isVi ? `Tuyệt vời! Bạn đã duy trì chuỗi ${res.streak} ngày!` : `Great job! You maintained a ${res.streak}-day streak!`)
        );
      }
    } catch (e: any) {
      Alert.alert(isVi ? 'Thông báo' : 'Notice', e.message || (isVi ? 'Lỗi điểm danh' : 'Check-in failed'));
    } finally {
      setStreakLoading(false);
    }
  };

  // Dynamic Frog XP & Level Calculation
  const txCount = transactions?.length || 0;
  const currentStreak = streakCount || authUser?.streak || 1;
  const baseXP = 850;
  const currentXP = baseXP + txCount * 15 + (currentStreak - 1) * 20;
  const targetXP = 1000;
  const xpInLevel = currentXP % targetXP;
  const xpPercent = Math.min(100, Math.max(8, Math.round((xpInLevel / targetXP) * 100)));
  const xpRemaining = Math.max(0, targetXP - xpInLevel);
  const currentLevel = 12 + Math.floor(currentXP / targetXP) - 1;
  const nextLevel = currentLevel + 1;

  const frogStages = [
    { stage: 1, nameVi: 'Bé Nòng Nọc', nameEn: 'Baby Tadpole', minLvl: 1, maxLvl: 3, imgIndex: 0, descVi: 'Mới làm quen ghi chép tài chính', descEn: 'Beginning financial tracking' },
    { stage: 2, nameVi: 'Ếch Nhỏ Ham Học', nameEn: 'Tiny Froglet', minLvl: 4, maxLvl: 7, imgIndex: 1, descVi: 'Xây dựng thói quen chi tiêu thông minh', descEn: 'Forming mindful spending habits' },
    { stage: 3, nameVi: 'Ếch Thám Hiểm', nameEn: 'Explorer Frog', minLvl: 8, maxLvl: 12, imgIndex: 2, descVi: 'Thành thạo tối ưu và phân loại ngân sách', descEn: 'Mastering budgets and smart insights' },
    { stage: 4, nameVi: 'Ếch Dũng Sĩ', nameEn: 'Warrior Frog', minLvl: 13, maxLvl: 19, imgIndex: 3, descVi: 'Kiểm soát tài chính kiên cường, giữ lửa kỷ luật', descEn: 'Unshakable discipline & money control' },
    { stage: 5, nameVi: 'Vua Ếch Hoàng Gia', nameEn: 'Royal Frog King', minLvl: 20, maxLvl: 99, imgIndex: 4, descVi: 'Đỉnh cao tự do và thịnh vượng tài chính', descEn: 'Peak wealth freedom and prosperity' },
  ];
  const currentStage = frogStages.find(s => currentLevel >= s.minLvl && currentLevel <= s.maxLvl) || frogStages[2];

  const loadFriendsData = async () => {
    try {
      setFriendsLoading(true);
      const [friends, requests] = await Promise.all([
        getFriendsApi().catch(() => []),
        getFriendRequestsApi().catch(() => []),
      ]);
      // Normalize friends list
      const myId = authUser?.id || (authUser as any)?._id || '';
      const normalized = ((friends as any[]) || []).map((f: any) => {
        const friend = (f.requester || f.recipient)
          ? ((f.requester?._id === myId || f.requester?.id === myId) ? f.recipient : f.requester)
          : f;
        return {
          _id: friend?._id || friend?.id || f._id,
          fullName: friend?.fullName || f.fullName || 'User',
          email: friend?.email || f.email || '',
          avatarUrl: normalizeAvatarUrl(friend?.avatarUrl || f.avatarUrl),
          lastActiveDate: friend?.lastActiveDate || f.lastActiveDate || '',
          updatedAt: friend?.updatedAt || f.updatedAt || '',
        };
      }).filter((f: any) => f._id && f._id !== myId);
      setFriendsList(normalized);
      setPendingRequests((requests as any[]) || []);
    } catch (e) {
      console.warn('Error loading friends data:', e);
    } finally {
      setFriendsLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const reqs = await getFriendRequestsApi();
      setPendingRequests(reqs || []);
    } catch (e) {
      console.warn('Error loading friend requests:', e);
    }
  };

  const handleRespondRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await respondFriendRequestApi(requestId, status);
      Alert.alert('✅', status === 'accepted' ? (isVi ? 'Đã đồng ý kết bạn!' : 'Friend request accepted!') : (isVi ? 'Đã từ chối' : 'Declined'));
      loadPendingRequests();
    } catch (e: any) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', e.message || (isVi ? 'Lỗi xử lý yêu cầu' : 'Error handling request'));
    }
  };

  const handleAddFriend = async () => {
    let cleanId = friendIdInput.trim();
    if (cleanId.startsWith('#')) cleanId = cleanId.slice(1);
    if (!cleanId) { Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Vui lòng nhập ID bạn bè' : 'Please enter friend ID'); return; }
    try {
      setIsSendingFriendReq(true);
      await sendFriendRequestApi(cleanId);
      Alert.alert('✅ ' + (isVi ? 'Thành công' : 'Success'), isVi ? 'Đã gửi lời mời kết bạn!' : 'Friend request sent!');
      setFriendIdInput('');
      loadPendingRequests();
    } catch (e: any) {
      Alert.alert('❌ ' + (isVi ? 'Lỗi' : 'Error'), e.message || (isVi ? 'Không thể gửi lời mời kết bạn' : 'Failed to send friend request'));
    } finally {
      setIsSendingFriendReq(false);
    }
  };

  const handleExportData = async (format: 'csv' | 'json') => {
    try {
      setIsExporting(true);
      const blob = await exportDataApi(format, transactions || []);
      
      if (typeof window !== 'undefined' && window.URL && document.createElement) {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const timestamp = new Date().toISOString().split('T')[0];
        a.download = `monett_financial_report_${timestamp}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }

      setShowExportModal(false);
      Alert.alert(
        'Thành công', 
        `Đã xuất báo cáo tài chính thành công! File .${format.toUpperCase()} đã được chuẩn bị tải về.`
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Lỗi xuất dữ liệu');
    } finally {
      setIsExporting(false);
    }
  };

  const currentCurrency = authUser?.currency || 'VND';
  const handleSelectCurrency = async (code: string) => {
    try {
      setIsUpdatingCurrency(true);
      await updateProfileApi({ currency: code });
      if (refreshUser) await refreshUser();
      Alert.alert('Thành công', 'Đã cập nhật đơn vị tiền tệ!');
      setShowCurrencyModal(false);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Lỗi cập nhật tiền tệ');
    } finally {
      setIsUpdatingCurrency(false);
    }
  };

  const handleSelectReminder = async (time: string | null) => {
    try {
      setIsUpdatingReminder(true);
      await updateProfileApi({ reminderTime: time || '' });
      if (refreshUser) await refreshUser();
      Alert.alert('Thành công', time ? `Đã đặt giờ nhắc nhở lúc ${time}` : 'Đã tắt nhắc nhở hằng ngày!');
      setShowReminderModal(false);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Lỗi cập nhật giờ nhắc nhở');
    } finally {
      setIsUpdatingReminder(false);
    }
  };

  // Profile Edit State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newFullName, setNewFullName] = useState(displayName);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdateProfile = async () => {
    const trimmedName = newFullName.trim();
    if (!trimmedName) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Tên hiển thị không được để trống' : 'Display name cannot be empty');
      return;
    }
    try {
      setIsUpdatingProfile(true);
      await updateProfileApi({ fullName: trimmedName });
      if (refreshUser) await refreshUser();
      Alert.alert(
        '✅ ' + (isVi ? 'Thành công' : 'Success'),
        isVi ? 'Đã lưu thay đổi thông tin cá nhân!' : 'Profile updated successfully!'
      );
      setShowProfileModal(false);
    } catch (error: any) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', error.message || (isVi ? 'Lỗi cập nhật hồ sơ' : 'Failed to update profile'));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Vui lòng nhập đầy đủ mật khẩu' : 'Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Mật khẩu xác nhận không khớp' : 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Mật khẩu mới phải ít nhất 6 ký tự' : 'New password must be at least 6 characters');
      return;
    }
    try {
      setIsUpdatingPassword(true);
      await changePasswordApi({ currentPassword, newPassword });
      Alert.alert('✅ ' + (isVi ? 'Thành công' : 'Success'), isVi ? 'Đã cập nhật mật khẩu!' : 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordModal(false);
    } catch (error: any) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', error.message || (isVi ? 'Lỗi đổi mật khẩu' : 'Failed to change password'));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Yêu cầu permission trước khi mở thư viện ảnh
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isVi ? 'Cần quyền truy cập' : 'Permission Required',
          isVi ? 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh trong Cài đặt.' : 'Please allow access to your photo library in Settings.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploading(true);
        const asset = result.assets[0];
        const uri = asset.uri;
        const filename = asset.fileName || uri.split('/').pop() || 'avatar.jpg';
        const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
        const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

        await uploadAvatarApi(uri, type, filename);
        if (refreshUser) await refreshUser();
        setImageError(false);
        Alert.alert(
          '✅ ' + (isVi ? 'Thành công' : 'Success'),
          isVi ? 'Đã cập nhật ảnh đại diện!' : 'Avatar updated successfully!'
        );
      }
    } catch (error: any) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', error.message || (isVi ? 'Lỗi khi tải ảnh lên' : 'Failed to upload image'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyId = async () => {
    const myId = authUser?.id || (authUser as any)?._id || '';
    if (myId) {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(myId);
        } catch (e) {}
      }
      Alert.alert('✅', isVi ? `Đã sao chép ID: ${myId}` : `Copied ID: ${myId}`);
    }
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
    logout();
  };

  type MenuItem = {
    iconName: keyof typeof Ionicons.glyphMap;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
  };

  const menuItems: MenuItem[] = [
    ...(onNavigateToWallets ? [{
      iconName: 'wallet-outline' as const,
      iconBg: '#ECFDF5',
      iconColor: '#059669',
      title: isVi ? 'Ví của tôi' : 'My Wallets',
      subtitle: isVi ? 'Quản lý tài khoản ngân hàng & nguồn tiền' : 'Manage bank accounts & wallets',
      onPress: onNavigateToWallets,
    }] : []),
    ...(onNavigateToCategories ? [{
      iconName: 'grid-outline' as const,
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
      title: isVi ? 'Danh mục chi tiêu' : 'Categories',
      subtitle: isVi ? 'Quản lý danh mục & hạn mức ngân sách' : 'Manage expense categories & limits',
      onPress: onNavigateToCategories,
    }] : []),
    ...(onNavigateToFeed ? [{
      iconName: 'people-outline' as const,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      title: isVi ? 'Bảng tin bạn bè' : 'Friends Feed',
      subtitle: isVi ? 'Khoảnh khắc chi tiêu & trò chuyện cùng bạn' : 'Moments & chat with friends',
      onPress: onNavigateToFeed,
    }] : []),
    {
      iconName: 'people-outline' as const,
      iconBg: '#ECFDF5',
      iconColor: '#059669',
      title: isVi ? 'Bạn bè' : 'Friends',
      subtitle: isVi ? 'Quản lý mạng lưới bạn bè' : 'Manage your network',
      onPress: () => {
        setFriendsTab('list');
        setShowFriendsModal(true);
        loadFriendsData();
      },
    },
    {
      iconName: 'qr-code-outline' as const,
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
      title: isVi ? 'Kết bạn & QR Code' : 'Add Friends & QR Code',
      subtitle: isVi ? 'Chia sẻ mã & kết bạn' : 'Share QR code & add friends',
      onPress: () => {
        setShowQRModal(true);
        loadPendingRequests();
      },
    },
    { 
      iconName: 'alarm-outline' as const, 
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      title: isVi ? 'Nhắc nhở giữ chuỗi Streak' : 'Daily Streak Reminder', 
      subtitle: (authUser as any)?.reminderTime
        ? (isVi ? `Hằng ngày lúc ${(authUser as any).reminderTime}` : `Daily at ${(authUser as any).reminderTime}`)
        : (isVi ? 'Đang tắt' : 'Disabled'),
      onPress: () => setShowReminderModal(true) 
    },
    {
      iconName: 'globe-outline' as const,
      iconBg: '#F3E8FF',
      iconColor: '#7C3AED',
      title: isVi ? 'Ngôn ngữ' : 'Language',
      subtitle: isVi ? 'Tiếng Việt' : 'English',
      rightElement: (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 }}>
          <Image source={{ uri: isVi ? 'https://flagcdn.com/w40/vn.png' : 'https://flagcdn.com/w40/us.png' }} style={{ width: 18, height: 13, marginRight: 6, borderRadius: 2 }} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{isVi ? 'VI' : 'EN'}</Text>
        </View>
      ),
      onPress: () => setShowLanguageModal(true),
    },
    {
      iconName: 'cash-outline' as const,
      iconBg: '#ECFDF5',
      iconColor: '#059669',
      title: isVi ? 'Đơn vị tiền tệ' : 'Currency',
      subtitle: currentCurrency === 'USD' ? 'US Dollar ($)' : 'Việt Nam Đồng (₫)',
      rightElement: (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 }}>
          <Image source={{ uri: currentCurrency === 'USD' ? 'https://flagcdn.com/w40/us.png' : 'https://flagcdn.com/w40/vn.png' }} style={{ width: 18, height: 13, marginRight: 6, borderRadius: 2 }} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{currentCurrency}</Text>
        </View>
      ),
      onPress: () => setShowCurrencyModal(true),
    },
    {
      iconName: 'document-text-outline' as const,
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
      title: isVi ? 'Xuất dữ liệu thu chi' : 'Export Financial Data',
      subtitle: isVi ? 'Tải báo cáo Excel (CSV) hoặc file JSON' : 'Download Excel (CSV) or JSON report',
      onPress: () => setShowExportModal(true),
    },
    { 
      iconName: 'help-circle-outline' as const,
      iconBg: '#F1F5F9',
      iconColor: '#475569',
      title: isVi ? 'Trợ giúp & Góp ý' : 'Help & Feedback', 
      subtitle: isVi ? 'Cộng đồng người dùng Monett' : 'Monett user community', 
      onPress: () => {
        setFeedbackSubmitted(false);
        setFeedbackMessage('');
        setFeedbackCategory('general');
        setShowFeedbackModal(true);
      }
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.headerBtn} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color="#1E293B" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{isVi ? 'Hồ Sơ Cá Nhân' : 'My Profile'}</Text>
        <TouchableOpacity style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="settings-outline" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. User Hero Card */}
        <View style={styles.profileHeroCard}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage} disabled={isUploading} activeOpacity={0.8}>
            {isUploading ? (
              <View style={[styles.avatarImg, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ color: '#64748B', fontSize: 11, marginTop: 6 }}>{isVi ? 'Đang tải...' : 'Uploading...'}</Text>
              </View>
            ) : avatarUri && !imageError ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImg}
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={[styles.avatarImg, { backgroundColor: avatarColor.bg, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: avatarColor.text, fontWeight: '800', fontSize: 36 }}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {/* Camera badge - luôn hiện để cho user biết có thể nhấn đổi ảnh */}
            <View style={[styles.levelBadge, { backgroundColor: '#059669', borderWidth: 2, borderColor: '#FFFFFF' }]}>
              {isUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => { setNewFullName(displayName); setShowProfileModal(true); }}>
            <Text style={styles.userName}>{displayName}</Text>
            {authUser?.isPro && (
              <View style={{ backgroundColor: '#FEF08A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8, borderWidth: 1, borderColor: '#FDE047' }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#854D0E' }}>PRO</Text>
              </View>
            )}
            <Ionicons name="pencil" size={14} color="#059669" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          <Text style={styles.userEmail}>{displayEmail}</Text>


        </View>

        {/* 3. Streak Card (Interactive) */}
        <TouchableOpacity
          style={styles.streakCard}
          activeOpacity={0.85}
          onPress={() => setShowStreakModal(true)}
        >
          <Text style={styles.streakFlame}>🔥</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.streakTitle}>
                {isVi
                  ? `Chuỗi ${currentStreak} ngày bùng cháy`
                  : `${currentStreak}-Day Blazing Streak`}
              </Text>
              {activeToday ? (
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#16A34A' }}>
                    {isVi ? 'ĐÃ GIỮ CHUỖI' : 'ACTIVE'}
                  </Text>
                </View>
              ) : (
                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706' }}>
                    {isVi ? 'CHƯA ĐIỂM DANH' : 'PENDING'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.streakSub}>
              {activeToday
                ? (isVi
                    ? 'Đã ghi nhận khoảnh khắc hôm nay. Chạm để xem chi tiết & mốc thưởng!'
                    : 'Continuous moments recorded. Tap to view perks & milestones!')
                : (isVi
                    ? 'Chưa duy trì hôm nay. Nhấn để điểm danh ngay trước 23:00!'
                    : 'Not maintained today. Tap to check-in before 23:00!')}
            </Text>
          </View>
        </TouchableOpacity>


        {/* 5. Cài đặt Menu */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{isVi ? 'CÀI ĐẶT ỨNG DỤNG' : 'APP SETTINGS'}</Text>
        <View style={styles.menuContainer}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.menuRow,
                { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
              ]}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.iconName} size={18} color={item.iconColor} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              {item.rightElement}
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ))}
          {!(authUser as any)?.googleId && (
            <TouchableOpacity
              style={[styles.menuRow, { borderBottomWidth: 0 }]}
              activeOpacity={0.7}
              onPress={() => setShowPasswordModal(true)}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="key-outline" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuTitle}>{isVi ? 'Đổi mật khẩu' : 'Change Password'}</Text>
                <Text style={styles.menuSubtitle}>{isVi ? 'Cập nhật mật khẩu tài khoản' : 'Update account password'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* 6. Nút Đăng Xuất */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.logoutText}>{isVi ? 'Đăng xuất khỏi tài khoản' : 'Log out of account'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL: BẠN BÈ (List + Requests tabs - giống web) */}
      <Modal visible={showFriendsModal} transparent animationType="slide" onRequestClose={() => setShowFriendsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' }]}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
              <Text style={styles.modalTitle}>{isVi ? '👥 Bạn bè' : '👥 Friends'}</Text>
              <TouchableOpacity onPress={() => setShowFriendsModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: '#F1F5F9', paddingHorizontal: 20 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: friendsTab === 'list' ? '#059669' : 'transparent' }}
                onPress={() => setFriendsTab('list')}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: friendsTab === 'list' ? '#059669' : '#94A3B8' }}>
                  {isVi ? 'Danh sách' : 'List'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: friendsTab === 'requests' ? '#059669' : 'transparent' }}
                onPress={() => setFriendsTab('requests')}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: friendsTab === 'requests' ? '#059669' : '#94A3B8' }}>
                  {isVi ? 'Lời mời' : 'Requests'}
                  {pendingRequests.length > 0 && (
                    <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '800' }}> ({pendingRequests.length})</Text>
                  )}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            {friendsLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#059669" />
                <Text style={{ marginTop: 10, color: '#94A3B8', fontSize: 13 }}>{isVi ? 'Đang tải...' : 'Loading...'}</Text>
              </View>
            ) : friendsTab === 'list' ? (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                {friendsList.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Text style={{ fontSize: 40, marginBottom: 12 }}>👥</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 6 }}>
                      {isVi ? 'Chưa có bạn bè nào' : 'No friends yet'}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
                      {isVi ? 'Hãy kết bạn để cùng theo dõi chi tiêu!' : 'Add friends to track expenses together!'}
                    </Text>
                  </View>
                ) : (
                  friendsList.map((friend, i) => {
                    // Generate Genshin style background colors
                    const bgColors = [
                      ['#FFF5F5', '#FED7D7'],
                      ['#F0FFF4', '#C6F6D5'],
                      ['#EBF8FF', '#BEE3F8'],
                      ['#FAF5FF', '#E9D8FD'],
                      ['#FFFFF0', '#FEFCBF']
                    ];
                    const cardBg = bgColors[i % 5][0];
                    
                    let isOnline = false;
                    let offlineString = '';
                    if (friend.updatedAt || friend.lastActiveDate) {
                      const now = new Date();
                      // Try to use updatedAt for accurate time difference
                      if (friend.updatedAt) {
                        const lastActive = new Date(friend.updatedAt);
                        const diffMs = Math.abs(now.getTime() - lastActive.getTime());
                        const diffMins = Math.floor(diffMs / (1000 * 60));
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        
                        // Consider online if active within last 10 minutes
                        if (diffMins < 10) {
                          isOnline = true;
                        } else if (diffHours < 1) {
                          offlineString = isVi ? `Đăng nhập lần cuối ${diffMins} phút` : `Last login ${diffMins} mins`;
                        } else if (diffHours < 24) {
                          offlineString = isVi ? `Đăng nhập lần cuối ${diffHours} giờ` : `Last login ${diffHours} hrs`;
                        } else {
                          offlineString = isVi ? `Đăng nhập lần cuối ${diffDays} ngày` : `Last login ${diffDays} days`;
                        }
                      } else {
                        // Fallback to lastActiveDate (YYYY-MM-DD)
                        const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
                        const todayStr = vnTime.toISOString().split('T')[0];
                        if (friend.lastActiveDate === todayStr) {
                          isOnline = true;
                        } else {
                          const lastActive = new Date(friend.lastActiveDate);
                          const diffTime = Math.abs(vnTime.getTime() - lastActive.getTime());
                          const daysOffline = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                          offlineString = isVi ? `Đăng nhập lần cuối ${daysOffline} ngày` : `Last login ${daysOffline} days`;
                        }
                      }
                    } else {
                      offlineString = isVi ? 'Đăng nhập lần cuối > 30 ngày' : 'Last login > 30 days';
                    }
                    
                    const initial = (friend.fullName || '?').charAt(0).toUpperCase();
                    return (
                      <View key={friend._id || i} style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        paddingVertical: 12, 
                        paddingHorizontal: 16,
                        borderRadius: 24,
                        marginBottom: 10,
                        backgroundColor: cardBg,
                        borderWidth: 1,
                        borderColor: 'rgba(0,0,0,0.05)',
                        justifyContent: 'space-between'
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {/* Avatar */}
                          {friend.avatarUrl ? (
                            <Image source={{ uri: friend.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#FFFFFF' }} />
                          ) : (
                            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' }}>
                              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{initial}</Text>
                            </View>
                          )}
                          <View style={{ marginLeft: 12 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>{friend.fullName || 'Người dùng'}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, marginRight: 6, backgroundColor: isOnline ? '#4ADE80' : '#94A3B8' }} />
                              <Text style={{ fontSize: 12, fontWeight: '500', color: isOnline ? '#4ADE80' : '#64748B' }}>
                                {isOnline ? (isVi ? 'Trực tuyến' : 'Online') : offlineString}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', marginLeft: 16 }}>
                          <TouchableOpacity 
                            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' }}
                            onPress={() => setActiveChatFriend(friend)}
                          >
                            <Ionicons name="chatbubble-ellipses" size={18} color="#475569" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                {pendingRequests.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Text style={{ fontSize: 40, marginBottom: 12 }}>📩</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 6 }}>
                      {isVi ? 'Không có lời mời nào' : 'No pending requests'}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
                      {isVi ? 'Các lời mời kết bạn sẽ hiện ở đây' : 'Friend requests will appear here'}
                    </Text>
                  </View>
                ) : (
                  pendingRequests.map((req) => {
                    const colors = ['#059669', '#8B5CF6', '#F59E0B', '#EF4444', '#0EA5E9'];
                    const name = req.requester?.fullName || 'User';
                    let hash = 0;
                    for (let j = 0; j < name.length; j++) hash = name.charCodeAt(j) + ((hash << 5) - hash);
                    const bg = colors[Math.abs(hash) % colors.length];
                    const initial = name.charAt(0).toUpperCase();
                    const avatarUrl = normalizeAvatarUrl(req.requester?.avatarUrl);
                    return (
                      <View key={req._id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        {avatarUrl ? (
                          <Image source={{ uri: avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                        ) : (
                          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{initial}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{name}</Text>
                          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{req.requester?.email || ''}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={{ backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }}
                            onPress={async () => {
                              await handleRespondRequest(req._id, 'accepted');
                              loadFriendsData();
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{isVi ? 'Đồng ý' : 'Accept'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' }}
                            onPress={async () => {
                              await handleRespondRequest(req._id, 'rejected');
                              loadFriendsData();
                            }}
                          >
                            <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '700' }}>{isVi ? 'Từ chối' : 'Decline'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: KẾT BẠN & QR CODE */}
      <Modal visible={showQRModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.modalTitle}>{isVi ? '🤝 Kết bạn & QR Code' : '🤝 Friends & QR Code'}</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Text style={{ fontSize: 26, color: '#94A3B8' }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Thêm bạn bằng ID */}
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 8 }}>
                {isVi ? 'Thêm bạn mới bằng ID:' : 'Add friend by ID:'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder={isVi ? 'Dán hoặc nhập ID bạn bè...' : 'Paste or enter friend ID...'}
                  placeholderTextColor="#94A3B8"
                  value={friendIdInput}
                  onChangeText={setFriendIdInput}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.btnSave, { paddingHorizontal: 16, opacity: isSendingFriendReq ? 0.6 : 1 }]}
                  onPress={handleAddFriend}
                  disabled={isSendingFriendReq}
                >
                  <Text style={styles.btnSaveText}>{isSendingFriendReq ? '...' : (isVi ? 'Kết bạn' : 'Add')}</Text>
                </TouchableOpacity>
              </View>

              {/* Lời mời kết bạn đang chờ (nếu có) */}
              {pendingRequests.length > 0 && (
                <View style={{ backgroundColor: '#EFF6FF', borderRadius: 14, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E40AF', marginBottom: 8 }}>
                    {isVi ? `📩 Lời mời kết bạn (${pendingRequests.length}):` : `📩 Friend Requests (${pendingRequests.length}):`}
                  </Text>
                  {pendingRequests.map((req) => (
                    <View key={req._id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 10, marginBottom: 6 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>{req.requester?.fullName || (isVi ? 'Người dùng' : 'User')}</Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>{req.requester?.email || ''}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={{ backgroundColor: '#059669', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                          onPress={() => handleRespondRequest(req._id, 'accepted')}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{isVi ? 'Đồng ý' : 'Accept'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' }}
                          onPress={() => handleRespondRequest(req._id, 'rejected')}
                        >
                          <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '700' }}>{isVi ? 'Từ chối' : 'Decline'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 }} />

              {/* QR Code của user */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12, textAlign: 'center' }}>
                  {isVi ? 'Chia sẻ mã QR hoặc ID của bạn để kết bạn:' : 'Share your QR code or ID to connect:'}
                </Text>
                <View style={{ padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 }}>
                  <QRCode
                    value={authUser?.id || (authUser as any)?._id || 'monett-user'}
                    size={160}
                    fgColor="#047857"
                  />
                </View>
                <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>{isVi ? 'ID của bạn:' : 'Your ID:'}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A', fontFamily: 'monospace', textAlign: 'center', marginBottom: 10, marginHorizontal: 8 }}>
                  {authUser?.id || (authUser as any)?._id || '...'}
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 20, borderWidth: 1, borderColor: '#E2E8F0' }}
                  onPress={handleCopyId}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>{isVi ? '📋 Sao chép ID' : '📋 Copy ID'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: SỬA THÔNG TIN */}
      <Modal visible={showProfileModal} transparent animationType="fade" onRequestClose={() => setShowProfileModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.modalTitle}>{isVi ? '✏️ Sửa thông tin' : '✏️ Edit Profile'}</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 24, color: '#94A3B8', lineHeight: 28 }}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>{isVi ? 'Tên hiển thị' : 'Display Name'}</Text>
            <TextInput
              style={styles.textInput}
              value={newFullName}
              onChangeText={setNewFullName}
              placeholder={isVi ? 'Nhập tên mới...' : 'Enter new name...'}
              placeholderTextColor="#94A3B8"
              autoFocus
              maxLength={50}
            />
            <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12, textAlign: 'right' }}>
              {newFullName.length}/50
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowProfileModal(false)}>
                <Text style={styles.btnCancelText}>{isVi ? 'Hủy' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnSave, (!newFullName.trim() || isUpdatingProfile) && { opacity: 0.5 }]}
                onPress={handleUpdateProfile}
                disabled={isUpdatingProfile || !newFullName.trim()}
              >
                {isUpdatingProfile
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnSaveText}>{isVi ? 'Lưu' : 'Save'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ĐỔI MẬT KHẨU */}
      <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={() => setShowPasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.modalTitle}>{isVi ? '🔑 Đổi mật khẩu' : '🔑 Change Password'}</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 24, color: '#94A3B8', lineHeight: 28 }}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>{isVi ? 'Mật khẩu hiện tại' : 'Current Password'}</Text>
            <TextInput
              style={styles.textInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder={isVi ? 'Nhập mật khẩu cũ...' : 'Enter current password...'}
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <Text style={styles.inputLabel}>{isVi ? 'Mật khẩu mới' : 'New Password'}</Text>
            <TextInput
              style={styles.textInput}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder={isVi ? 'Nhập mật khẩu mới (tối thiểu 6 ký tự)...' : 'New password (min 6 chars)...'}
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <Text style={styles.inputLabel}>{isVi ? 'Xác nhận mật khẩu' : 'Confirm Password'}</Text>
            <TextInput
              style={styles.textInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder={isVi ? 'Nhập lại mật khẩu mới...' : 'Confirm new password...'}
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setShowPasswordModal(false);
              }}>
                <Text style={styles.btnCancelText}>{isVi ? 'Hủy' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSave, isUpdatingPassword && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={isUpdatingPassword}>
                {isUpdatingPassword
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnSaveText}>{isVi ? 'Đổi MK' : 'Change'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CHỌN NGÔN NGỮ */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn ngôn ngữ</Text>
            <TouchableOpacity
              style={[
                styles.langOption,
                language === 'vi' && styles.langOptionActive,
              ]}
              onPress={() => { setLanguage('vi'); setShowLanguageModal(false); }}
            >
              <Image source={{ uri: 'https://flagcdn.com/w40/vn.png' }} style={{ width: 24, height: 16, marginRight: 12, borderRadius: 2 }} />
              <Text style={[styles.langLabel, language === 'vi' && styles.langLabelActive]}>Tiếng Việt</Text>
              {language === 'vi' && <Text style={styles.langCheck}>✓</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.langOption,
                language === 'en' && styles.langOptionActive,
              ]}
              onPress={() => { setLanguage('en'); setShowLanguageModal(false); }}
            >
              <Image source={{ uri: 'https://flagcdn.com/w40/us.png' }} style={{ width: 24, height: 16, marginRight: 12, borderRadius: 2 }} />
              <Text style={[styles.langLabel, language === 'en' && styles.langLabelActive]}>English</Text>
              {language === 'en' && <Text style={styles.langCheck}>✓</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnCancel, { alignSelf: 'center', marginTop: 8 }]} onPress={() => setShowLanguageModal(false)}>
              <Text style={styles.btnCancelText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: CHỌN ĐƠN VỊ TIỀN TỆ */}
      <Modal visible={showCurrencyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đơn vị tiền tệ</Text>
            {isUpdatingCurrency ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#10B981" />
              </View>
            ) : (
              <View>
                {[
                  { code: 'VND', label: 'Việt Nam Đồng (₫)', flag: '🇻🇳' },
                  { code: 'USD', label: 'US Dollar ($)', flag: '🇺🇸' },
                ].map((c) => {
                  const isSelected = currentCurrency === c.code;
                  return (
                    <TouchableOpacity
                      key={c.code}
                      style={[styles.langOption, isSelected && styles.langOptionActive]}
                      onPress={() => handleSelectCurrency(c.code)}
                    >
                      <Text style={styles.langFlag}>{c.flag}</Text>
                      <Text style={[styles.langLabel, isSelected && styles.langLabelActive]}>{c.label}</Text>
                      {isSelected && <Text style={styles.langCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={[styles.btnCancel, { alignSelf: 'center', marginTop: 8 }]} onPress={() => setShowCurrencyModal(false)}>
                  <Text style={styles.btnCancelText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: CHỌN GIỜ NHẮC NHỞ */}
      <Modal visible={showReminderModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Giờ nhắc nhở hằng ngày</Text>
            {isUpdatingReminder ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#10B981" />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {[
                  { value: null, label: 'Tắt nhắc nhở', icon: '🔕' },
                  { value: '08:00', label: '08:00 Sáng (Bắt đầu ngày mới)', icon: '⏰' },
                  { value: '12:30', label: '12:30 Trưa (Sau bữa trưa)', icon: '⏰' },
                  { value: '20:00', label: '20:00 Tối (Ghi chép chi tiêu)', icon: '⏰' },
                  { value: '21:30', label: '21:30 Đêm (Giữ chuỗi Streak)', icon: '🔥' },
                  { value: '22:30', label: '22:30 Đêm (Trước khi ngủ)', icon: '🌙' },
                ].map((item, idx) => {
                  const isSelected = item.value === null ? !(authUser as any)?.reminderTime : (authUser as any)?.reminderTime === item.value;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.langOption, isSelected && styles.langOptionActive]}
                      onPress={() => handleSelectReminder(item.value)}
                    >
                      <Text style={styles.langFlag}>{item.icon}</Text>
                      <Text style={[styles.langLabel, isSelected && styles.langLabelActive]}>{item.label}</Text>
                      {isSelected && <Text style={styles.langCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}

                {/* Custom Time */}
                <View style={{ marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 6, fontWeight: '600' }}>Giờ tùy chỉnh (HH:mm):</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.textInput, { flex: 1, marginBottom: 0, paddingVertical: 8 }]}
                      placeholder="VD: 21:00"
                      value={customReminderTime}
                      onChangeText={setCustomReminderTime}
                      maxLength={5}
                    />
                    <TouchableOpacity
                      style={[styles.btnSave, { paddingHorizontal: 16, justifyContent: 'center' }]}
                      onPress={() => {
                        const trimmed = customReminderTime.trim();
                        if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trimmed)) {
                          handleSelectReminder(trimmed);
                        } else {
                          Alert.alert('Lỗi', 'Vui lòng nhập đúng định dạng giờ (VD: 21:30)');
                        }
                      }}
                    >
                      <Text style={styles.btnSaveText}>Lưu</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={[styles.btnCancel, { alignSelf: 'center', marginTop: 12 }]} onPress={() => setShowReminderModal(false)}>
                  <Text style={styles.btnCancelText}>Đóng</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: XUẤT DỮ LIỆU BÁO CÁO */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xuất báo cáo tài chính</Text>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 16, textAlign: 'center' }}>
              Tải toàn bộ dữ liệu giao dịch thu chi và khoảnh khắc về thiết bị của bạn:
            </Text>

            {isExporting ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ marginTop: 12, fontSize: 13, color: '#374151', fontWeight: '600' }}>
                  Đang xử lý xuất dữ liệu...
                </Text>
              </View>
            ) : (
              <View>
                <TouchableOpacity
                  style={styles.langOption}
                  onPress={() => handleExportData('csv')}
                >
                  <Text style={styles.langFlag}>📊</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.langLabel, { color: '#059669', fontWeight: '700' }]}>
                      Bảng tính Excel (.CSV)
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      Mở trên Excel, Google Sheets, chuẩn font Tiếng Việt
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.langOption}
                  onPress={() => handleExportData('json')}
                >
                  <Text style={styles.langFlag}>📑</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.langLabel}>
                      File sao lưu JSON (.JSON)
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      Dữ liệu cấu trúc gốc để lưu trữ dự phòng
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btnCancel, { alignSelf: 'center', marginTop: 8 }]} 
                  onPress={() => setShowExportModal(false)}
                >
                  <Text style={styles.btnCancelText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: TIẾN HÓA LINH VẬT ẾCH MONETT (FROG EVOLUTION & XP ROADMAP) */}
      <Modal visible={showFrogModal} transparent animationType="slide" onRequestClose={() => setShowFrogModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden' }]}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#059669', borderWidth: 1.5, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 }}>
                    <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                  </View>
                  <Text style={styles.modalTitle}>{isVi ? 'Cấp Độ & Tiến Hóa Linh Vật' : 'Mascot Level & Evolution'}</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  {isVi ? 'Cùng Linh Vật Monett đồng hành trên đường đua tài chính' : 'Grow your Monett companion through mindful habits'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowFrogModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              {/* Spotlight Mascot Card */}
              <View style={{ backgroundColor: '#F0FDF4', borderRadius: 20, padding: 18, alignItems: 'center', borderWidth: 1.5, borderColor: '#BBF7D0', marginBottom: 20 }}>
                <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: '#86EFAC' }}>
                  <Image
                    source={FROGS[currentStage.imgIndex] || FROGS[2]}
                    style={{ width: 70, height: 70 }}
                    resizeMode="contain"
                  />
                </View>
                <View style={{ backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, marginBottom: 6 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>LV. {currentLevel}</Text>
                </View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#065F46', marginBottom: 2 }}>
                  {isVi ? currentStage.nameVi : currentStage.nameEn}
                </Text>
                <Text style={{ fontSize: 12, color: '#047857', textAlign: 'center', marginBottom: 14 }}>
                  {isVi ? currentStage.descVi : currentStage.descEn}
                </Text>

                {/* XP Progress Bar */}
                <View style={{ width: '100%' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#065F46' }}>
                      {isVi ? 'Kinh nghiệm (XP)' : 'Experience Points'}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#059669' }}>
                      {xpInLevel} / {targetXP} XP
                    </Text>
                  </View>
                  <View style={{ height: 10, backgroundColor: '#BBF7D0', borderRadius: 5, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${xpPercent}%`, backgroundColor: '#059669', borderRadius: 5 }} />
                  </View>
                  <Text style={{ fontSize: 11, color: '#047857', textAlign: 'center', marginTop: 8 }}>
                    {isVi
                      ? `✨ Tích lũy thêm ${xpRemaining} XP để tiến hóa lên Cấp độ ${nextLevel}!`
                      : `✨ Earn ${xpRemaining} more XP to evolve to Level ${nextLevel}!`}
                  </Text>
                </View>
              </View>

              {/* Evolution Roadmap */}
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>
                {isVi ? '🗺️ 5 Giai Đoạn Tiến Hóa' : '🗺️ 5 Evolution Stages'}
              </Text>
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 }}>
                {frogStages.map((stage) => {
                  const isCurrent = currentLevel >= stage.minLvl && currentLevel <= stage.maxLvl;
                  const isUnlocked = currentLevel >= stage.minLvl;
                  return (
                    <View
                      key={stage.stage}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderRadius: 12,
                        backgroundColor: isCurrent ? '#ECFDF5' : 'transparent',
                        borderWidth: isCurrent ? 1 : 0,
                        borderColor: '#A7F3D0',
                        marginBottom: 4,
                      }}
                    >
                      <Image
                        source={FROGS[stage.imgIndex]}
                        style={{ width: 40, height: 40, opacity: isUnlocked ? 1 : 0.4 }}
                        resizeMode="contain"
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: isUnlocked ? '#0F172A' : '#94A3B8' }}>
                            {isVi ? stage.nameVi : stage.nameEn}
                          </Text>
                          {isCurrent && (
                            <View style={{ marginLeft: 8, backgroundColor: '#059669', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                                {isVi ? 'HIỆN TẠI' : 'CURRENT'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: isUnlocked ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                          {isVi ? `Cấp độ ${stage.minLvl}${stage.maxLvl < 99 ? ` - ${stage.maxLvl}` : '+'} • ${stage.descVi}` : `Level ${stage.minLvl}${stage.maxLvl < 99 ? ` - ${stage.maxLvl}` : '+'} • ${stage.descEn}`}
                        </Text>
                      </View>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isUnlocked ? '#DCFCE7' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12 }}>{isUnlocked ? '✓' : '🔒'}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Ways to Earn XP */}
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>
                {isVi ? '⚡ Nhiệm Vụ Kiếm Điểm XP Hàng Ngày' : '⚡ How to Earn Daily XP'}
              </Text>
              <View style={{ gap: 8, marginBottom: 20 }}>
                {[
                  { icon: '📸', titleVi: 'Chụp ảnh khoảnh khắc chi tiêu', titleEn: 'Snap expense photo moment', xp: '+50 XP' },
                  { icon: '📝', titleVi: 'Thêm giao dịch chi tiêu mới', titleEn: 'Add financial transaction', xp: '+20 XP' },
                  { icon: '🔥', titleVi: 'Điểm danh duy trì chuỗi Streak', titleEn: 'Daily streak check-in', xp: '+30 XP' },
                  { icon: '👥', titleVi: 'Kết bạn & chia sẻ mã QR', titleEn: 'Add friends & share QR', xp: '+40 XP' },
                ].map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 22, marginRight: 12 }}>{item.icon}</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#1E293B' }}>
                      {isVi ? item.titleVi : item.titleEn}
                    </Text>
                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>{item.xp}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.btnSave, { width: '100%', marginBottom: 10 }]}
                onPress={() => setShowFrogModal(false)}
              >
                <Text style={styles.btnSaveText}>{isVi ? 'Đã hiểu & Tiếp tục nuôi Ếch 🌱' : 'Got it & Keep growing 🌱'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* GENSHIN STYLE STREAK MODAL */}
      <Modal visible={showStreakModal} transparent animationType="fade" onRequestClose={() => setShowStreakModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.modalContent, { maxHeight: '92%', width: '92%', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden', backgroundColor: '#1A1C23', borderRadius: 16, borderWidth: 1, borderColor: '#4B5563' }]}>
            
            {/* Header: Genshin style deep blue/gold */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#374151' }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#E5C07B', marginBottom: 4 }}>
                  {isVi ? '✨ Hành Trình Kỷ Luật' : '✨ Mindful Journey'}
                </Text>
                <Text style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 18 }}>
                  {isVi ? 'Duy trì ngọn lửa để nhận Thạch thưởng' : 'Keep the flame alive for mystical rewards'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowStreakModal(false)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4B5563' }}>
                  <Ionicons name="close" size={20} color="#E5C07B" />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
              
              {/* Flame Hero Card */}
              <View style={{ backgroundColor: 'rgba(229, 192, 123, 0.05)', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(229, 192, 123, 0.3)' }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(229, 192, 123, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E5C07B' }}>
                  <Text style={{ fontSize: 42 }}>🔥</Text>
                </View>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#FDFBF7', marginBottom: 6 }}>
                  {isVi ? `${currentStreak} Ngày` : `${currentStreak} Days`}
                </Text>
                <Text style={{ fontSize: 14, color: activeToday ? '#E5C07B' : '#FCA5A5', textAlign: 'center', marginBottom: 24, fontWeight: '600' }}>
                  {activeToday
                    ? (isVi ? '✨ Đã thắp sáng hôm nay!' : '✨ Streak illuminated today!')
                    : (isVi ? '⚡ Ngọn lửa đang tàn! Thắp sáng ngay.' : '⚡ The flame fades! Ignite it now.')}
                </Text>

                {/* Check-in CTA Button: Genshin Gold */}
                <TouchableOpacity
                  style={{
                    backgroundColor: activeToday ? 'rgba(255,255,255,0.1)' : '#E5C07B',
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    borderRadius: 8,
                    width: '100%',
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: activeToday ? '#4B5563' : '#FBBF24',
                  }}
                  onPress={handleCheckInStreak}
                  disabled={activeToday || streakLoading}
                  activeOpacity={0.8}
                >
                  {streakLoading ? (
                    <ActivityIndicator size="small" color={activeToday ? '#9CA3AF' : '#171822'} />
                  ) : (
                    <Text style={{ color: activeToday ? '#9CA3AF' : '#171822', fontSize: 16, fontWeight: '800' }}>
                      {activeToday
                        ? (isVi ? '✓ Đã thắp sáng' : '✓ Illuminated')
                        : (isVi ? 'Thắp Sáng Ngay ✦' : 'Ignite Now ✦')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Stats Panel */}
              <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#374151' }}>
                <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#374151' }}>
                  <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8, fontWeight: '600' }}>
                    {isVi ? 'Tổng hành trình' : 'Total Journey'}
                  </Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#FDFBF7' }}>
                    {Math.max(totalActiveDays, currentStreak)}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8, fontWeight: '600' }}>
                    {isVi ? 'Hạng cao nhất' : 'Highest Rank'}
                  </Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#E5C07B' }}>
                    {Math.max(longestStreak, currentStreak)}
                  </Text>
                </View>
              </View>

              {/* Streak Shield */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#374151' }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: shieldAvailable ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 16, opacity: shieldAvailable ? 1 : 0.5, borderWidth: 1, borderColor: shieldAvailable ? '#3B82F6' : '#4B5563' }}>
                  <Text style={{ fontSize: 22 }}>🛡️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: shieldAvailable ? '#93C5FD' : '#6B7280', marginBottom: 4 }}>
                    {shieldUsedToday
                      ? (isVi ? 'Khiên đã kích hoạt ✨' : 'Shield Activated ✨')
                      : shieldAvailable
                        ? (isVi ? 'Khiên Hộ Thể (1/tuần)' : 'Aegis Shield (1 left)')
                        : (isVi ? 'Khiên Hộ Thể (Đã vỡ)' : 'Aegis Shield (Shattered)')}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 20 }}>
                    {shieldAvailable
                      ? (isVi ? 'Tự động bảo vệ chuỗi nếu bạn quên thắp sáng 1 ngày.' : 'Auto-protects your streak if you miss 1 day.')
                      : (isVi ? 'Hồi phục vào Thứ 2. Tránh bỏ lỡ để không rớt hạng.' : 'Refills on Monday. Don\'t miss a day to keep your rank.')}
                  </Text>
                </View>
              </View>

              {/* Milestones */}
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#E5C07B', marginBottom: 16 }}>
                {isVi ? 'Phần Thưởng Đột Phá' : 'Breakthrough Rewards'}
              </Text>
              <View style={{ gap: 12, marginBottom: 24 }}>
                {[
                  { days: 3, icon: '🌟', titleVi: 'Ngôi Sao Sơ Khởi', titleEn: 'Initial Star', rewardVi: 'MỞ KHÓA BẢN PRO', rewardEn: 'UNLOCK PRO', highlight: true },
                  { days: 7, icon: '💎', titleVi: 'Tuần Lễ Khai Sáng', titleEn: 'Enlightened Week', rewardVi: 'Huy hiệu Streak Đồng', rewardEn: 'Bronze Badge' },
                  { days: 14, icon: '⚡', titleVi: 'Dấu Ấn Kiên Định', titleEn: 'Mark of Resolve', rewardVi: 'Huy hiệu Bạc + 300 XP', rewardEn: 'Silver Badge + 300 XP' },
                ].map((m, idx) => {
                  const reached = currentStreak >= m.days;
                  return (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: (m.highlight && !reached) ? '#E5C07B' : (reached ? '#4B5563' : '#374151'),
                      }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: '#4B5563' }}>
                        <Text style={{ fontSize: 20 }}>{m.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#FDFBF7' }}>
                            {m.days} {isVi ? 'ngày' : 'days'}
                          </Text>
                          {m.highlight && (
                            <View style={{ marginLeft: 8, backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#EF4444' }}>
                              <Text style={{ color: '#FCA5A5', fontSize: 10, fontWeight: '800' }}>HOT</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: m.highlight ? '700' : '500', color: m.highlight ? '#E5C07B' : '#9CA3AF' }}>
                          {isVi ? m.rewardVi : m.rewardEn}
                        </Text>
                      </View>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: reached ? 'rgba(229, 192, 123, 0.2)' : 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: reached ? '#E5C07B' : '#4B5563' }}>
                        {reached ? <Ionicons name="star" size={16} color="#E5C07B" /> : <Ionicons name="lock-closed" size={14} color="#6B7280" />}
                      </View>
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity
                style={{ width: '100%', paddingVertical: 16, alignItems: 'center' }}
                onPress={() => setShowStreakModal(false)}
              >
                <Text style={{ color: '#9CA3AF', fontSize: 16, fontWeight: '700' }}>{isVi ? 'Đóng (X)' : 'Close (X)'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 💬 FEEDBACK MODAL */}
      <Modal visible={showFeedbackModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>{isVi ? 'Góp ý cho Monett' : 'Send Feedback'}</Text>
              <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
                <Ionicons name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {feedbackSubmitted ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 56, marginBottom: 12 }}>💌</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8 }}>
                  {isVi ? 'Đã nhận góp ý!' : 'Feedback Received!'}
                </Text>
                <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>
                  {isVi ? 'Cảm ơn bạn! Đội ngũ Monett sẽ đọc và cải thiện ứng dụng dựa trên ý kiến của bạn.' : 'Thank you! The Monett team will read your feedback and improve the app.'}
                </Text>
                <TouchableOpacity style={[styles.btnSave, { marginTop: 24, width: '100%' }]} onPress={() => setShowFeedbackModal(false)}>
                  <Text style={styles.btnSaveText}>{isVi ? 'Đóng' : 'Close'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                  {isVi ? 'Ý kiến của bạn giúp chúng tôi phát triển Monett tốt hơn mỗi ngày.' : 'Your feedback helps us improve Monett every day.'}
                </Text>

                {/* Category Chips */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 10 }}>
                  {isVi ? 'Chủ đề góp ý:' : 'Feedback category:'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {[
                    { key: 'general', labelVi: '💬 Chung', labelEn: '💬 General' },
                    { key: 'bug', labelVi: '🐛 Báo lỗi', labelEn: '🐛 Bug Report' },
                    { key: 'feature', labelVi: '✨ Tính năng mới', labelEn: '✨ Feature Request' },
                    { key: 'ui', labelVi: '🎨 Giao diện', labelEn: '🎨 UI/UX' },
                    { key: 'performance', labelVi: '⚡ Hiệu suất', labelEn: '⚡ Performance' },
                    { key: 'other', labelVi: '📝 Khác', labelEn: '📝 Other' },
                  ].map((cat) => {
                    const isSelected = feedbackCategory === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        onPress={() => setFeedbackCategory(cat.key)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                          backgroundColor: isSelected ? '#059669' : '#F1F5F9',
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#059669' : '#E2E8F0',
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#FFFFFF' : '#475569' }}>
                          {isVi ? cat.labelVi : cat.labelEn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Message Input */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8 }}>
                  {isVi ? 'Nội dung góp ý:' : 'Your message:'}
                </Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 120, textAlignVertical: 'top', paddingTop: 12, borderWidth: 1, borderColor: '#E2E8F0' }]}
                  placeholder={isVi ? 'Mô tả chi tiết ý kiến của bạn... (tối thiểu 5 ký tự)' : 'Describe your feedback in detail... (min 5 characters)'}
                  placeholderTextColor="#94A3B8"
                  value={feedbackMessage}
                  onChangeText={setFeedbackMessage}
                  multiline
                  numberOfLines={5}
                />
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, marginBottom: 20 }}>
                  {feedbackMessage.length}/500 {isVi ? 'ký tự' : 'characters'}
                </Text>

                <TouchableOpacity
                  style={[styles.btnSave, { opacity: (feedbackMessage.trim().length < 5 || isSubmittingFeedback) ? 0.5 : 1 }]}
                  disabled={feedbackMessage.trim().length < 5 || isSubmittingFeedback}
                  onPress={async () => {
                    try {
                      setIsSubmittingFeedback(true);
                      await submitFeedbackApi(feedbackCategory, feedbackMessage.trim());
                      setFeedbackSubmitted(true);
                    } catch (e: any) {
                      Alert.alert(isVi ? 'Lỗi' : 'Error', e.message || (isVi ? 'Lỗi gửi góp ý' : 'Failed to send feedback'));
                    } finally {
                      setIsSubmittingFeedback(false);
                    }
                  }}
                >
                  <Text style={styles.btnSaveText}>
                    {isSubmittingFeedback ? '⏳ Đang gửi...' : (isVi ? '📨 Gửi góp ý' : '📨 Send Feedback')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <ChatModal 
        visible={!!activeChatFriend}
        onClose={() => setActiveChatFriend(null)}
        friend={activeChatFriend}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnIcon: {
    fontSize: 24,
    color: '#374151',
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    borderColor: '#10B981',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#047857',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  frogBanner: {
    width: '100%',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  frogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  frogTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  xpText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  xpTrack: {
    height: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  frogSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 6,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  streakFlame: {
    fontSize: 32,
  },
  streakTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C2410C',
  },
  streakSub: {
    fontSize: 11,
    color: '#EA580C',
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  badgeCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  badgeLocked: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  badgeIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 18,
    color: '#D1D5DB',
  },
  logoutBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    flexShrink: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  btnCancelText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  btnSave: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  btnSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
  },
  langOptionActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  langFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  langLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  langLabelActive: {
    color: '#059669',
    fontWeight: '700',
  },
  langCheck: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: '700',
  },
});
