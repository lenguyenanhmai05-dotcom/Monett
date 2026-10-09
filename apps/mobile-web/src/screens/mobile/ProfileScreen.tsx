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
  normalizeAvatarUrl,
  getStreakApi,
  checkInStreakApi,
  submitFeedbackApi,
} from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTransactions } from '../../contexts/TransactionContext';
import { FROGS } from '../../../assets/frogIndex';
import * as ImagePicker from 'expo-image-picker';

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




  const handleLogout = () => {
    if (onLogout) onLogout();
    logout();
  };

  type MenuItem = {
    iconName: keyof typeof Ionicons.glyphMap;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle?: string;
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
      subtitle: undefined,
      onPress: onNavigateToFeed,
    }] : []),

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          {onBack && (
            <TouchableOpacity style={styles.headerBtn} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={22} color="#1E293B" />
            </TouchableOpacity>
          )}
          <View style={styles.brandBadgeIcon}>
            <Ionicons name="person" size={20} color="#047857" />
          </View>
          <View>
            <Text style={styles.headerTitle}>{isVi ? 'Hồ sơ cá nhân' : 'My Profile'}</Text>
            <Text style={styles.headerSubtitle}>{isVi ? 'Tài khoản & Thiết lập' : 'Account & Settings'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="settings-outline" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            <Ionicons name="pencil" size={14} color="#059669" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          <Text style={styles.userEmail}>{displayEmail}</Text>

          {authUser?.isPro && (
            <View style={{
              backgroundColor: '#059669',
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 20,
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 4,
            }}>
              <Ionicons name="star" size={14} color="#FDE047" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                PRO • {isVi ? 'Thành viên Tinh Hoa' : 'Elite Member'}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FDE047', marginLeft: 8 }}>
                VIP
              </Text>
            </View>
          )}

        </View>

        {/* 3. Streak Card (Interactive) */}
        <TouchableOpacity
          style={styles.streakCard}
          activeOpacity={0.85}
          onPress={() => setShowStreakModal(true)}
        >
          <Image 
            source={require('../../../assets/frogs/frog-3d-m-coin-transparent.png')} 
            style={{ width: 90, height: 90, marginLeft: -12, marginTop: -24, marginBottom: -24, zIndex: 10 }} 
            resizeMode="contain"
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
              <Text style={[styles.streakTitle, { fontSize: 16, flexShrink: 1 }]}>
                {isVi
                  ? `Chuỗi ${currentStreak} ngày bùng cháy`
                  : `${currentStreak}-Day Blazing Streak`}
              </Text>
              {activeToday ? (
                <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981', marginRight: 4 }}>
                    {isVi ? 'ĐÃ GIỮ CHUỖI' : 'ACTIVE'}
                  </Text>
                  <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                </View>
              ) : (
                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706' }}>
                    {isVi ? 'CHƯA ĐIỂM DANH' : 'PENDING'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.streakSub, { marginTop: 4, color: '#475569' }]}>
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
                {item.subtitle ? <Text style={styles.menuSubtitle}>{item.subtitle}</Text> : null}
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

      {/* PREMIUM STREAK MODAL */}
      <Modal visible={showStreakModal} transparent animationType="fade" onRequestClose={() => setShowStreakModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(15, 23, 42, 0.7)' }]}>
          <View style={[styles.modalContent, { maxHeight: '95%', width: '92%', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, overflow: 'hidden', backgroundColor: '#F8FAFC', borderRadius: 28, borderWidth: 1, borderColor: '#E2E8F0' }]}>
            
            {/* Header: Premium Style */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', zIndex: 10 }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#047857', marginBottom: 4 }}>
                  {isVi ? '✨ Hành Trình Kỷ Luật' : '✨ Mindful Journey'}
                </Text>

              </View>
              <TouchableOpacity onPress={() => setShowStreakModal(false)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
              
              {/* Flame Hero Card with Decorative Elements */}
              <View style={{ backgroundColor: '#059669', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 24, overflow: 'hidden', shadowColor: '#059669', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}>
                {/* Decorative Circles */}
                <View style={{ position: 'absolute', top: -30, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <View style={{ position: 'absolute', bottom: -40, left: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' }} />

                <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#EA580C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 }}>
                  <Image 
                    source={require('../../../assets/frogs/frog-3d-m-coin-transparent.png')} 
                    style={{ width: 64, height: 64 }} 
                    resizeMode="contain"
                  />
                </View>
                <Text style={{ fontSize: 36, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 }}>
                  {isVi ? `${currentStreak} Ngày` : `${currentStreak} Days`}
                </Text>
                
                <View style={{ backgroundColor: activeToday ? 'rgba(255,255,255,0.2)' : 'rgba(252, 165, 165, 0.3)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, color: activeToday ? '#FFFFFF' : '#FEE2E2', fontWeight: '800' }}>
                    {activeToday
                      ? (isVi ? '✨ ĐÃ THẮP SÁNG HÔM NAY' : '✨ ILLUMINATED TODAY')
                      : (isVi ? '⚡ ĐANG TÀN! THẮP SÁNG NGAY' : '⚡ FADING! IGNITE NOW')}
                  </Text>
                </View>

                {/* Check-in CTA Button & Progress Combined */}
                <View style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 16 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: activeToday ? 'rgba(255,255,255,0.95)' : '#FCD34D',
                      paddingVertical: 14,
                      paddingHorizontal: 20,
                      borderRadius: 14,
                      width: '100%',
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 6,
                      elevation: 4,
                      marginBottom: 16,
                    }}
                    onPress={handleCheckInStreak}
                    disabled={activeToday || streakLoading}
                    activeOpacity={0.8}
                  >
                    {streakLoading ? (
                      <ActivityIndicator size="small" color="#059669" />
                    ) : (
                      <Text style={{ color: activeToday ? '#047857' : '#92400E', fontSize: 16, fontWeight: '900', textTransform: 'uppercase' }}>
                        {activeToday && <Text style={{ color: '#F97316' }}>✓ </Text>}
                        {activeToday
                          ? (isVi ? 'Lửa Đang Cháy' : 'Flame is Alive')
                          : (isVi ? 'Thắp Lửa Ngay ✦' : 'Ignite Flame ✦')}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>{isVi ? 'Tiến độ Cột Mốc' : 'Milestone Progress'}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#D1FAE5' }}>
                      {currentStreak} / {currentStreak < 3 ? 3 : currentStreak < 7 ? 7 : currentStreak < 14 ? 14 : 30}
                    </Text>
                  </View>
                  <View style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 5, overflow: 'hidden' }}>
                    <View style={{ 
                      height: '100%', 
                      width: `${Math.min(100, (currentStreak / (currentStreak < 3 ? 3 : currentStreak < 7 ? 7 : currentStreak < 14 ? 14 : 30)) * 100)}%`, 
                      backgroundColor: '#FCD34D', 
                      borderRadius: 5 
                    }} />
                  </View>
                  <Text style={{ fontSize: 11, color: '#D1FAE5', marginTop: 8, textAlign: 'center', fontWeight: '500' }}>
                    {isVi ? 'Duy trì thêm để nhận Thưởng Đột Phá' : 'Keep going for Breakthrough Rewards!'}
                  </Text>
                </View>
              </View>

                            {/* Stats Box with Skill Icons */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, alignItems: 'center' }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#DCFCE7', shadowColor: '#22C55E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2 }}>
                    <Text style={{ fontSize: 26 }}>🗺️</Text>
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A', marginBottom: 2 }}>
                    {Math.max(totalActiveDays, currentStreak)}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 }}>
                    {isVi ? 'TỔNG HÀNH TRÌNH' : 'TOTAL DAYS'}
                  </Text>
                </View>

                <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#FFFBEB', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3, alignItems: 'center' }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 2 }}>
                    <Text style={{ fontSize: 26 }}>🏆</Text>
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#D97706', marginBottom: 2 }}>
                    {Math.max(longestStreak, currentStreak)}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 }}>
                    {isVi ? 'HẠNG CAO NHẤT' : 'HIGHEST RANK'}
                  </Text>
                </View>
              </View>

              {/* Streak Shield */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: 16, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: shieldAvailable ? '#DBEAFE' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 16, opacity: shieldAvailable ? 1 : 0.5, borderWidth: 2, borderColor: shieldAvailable ? '#93C5FD' : '#E2E8F0' }}>
                  <Text style={{ fontSize: 24 }}>🛡️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: shieldAvailable ? '#1D4ED8' : '#64748B', marginBottom: 6 }}>
                    {shieldUsedToday
                      ? (isVi ? 'Khiên đã kích hoạt ✨' : 'Shield Activated ✨')
                      : shieldAvailable
                        ? (isVi ? 'Khiên Hộ Thể (1/tuần)' : 'Aegis Shield (1 left)')
                        : (isVi ? 'Khiên Hộ Thể (Đã vỡ)' : 'Aegis Shield (Shattered)')}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20, fontWeight: '500' }}>
                    {shieldAvailable
                      ? (isVi ? 'Kỹ năng nội tại: Tự động bảo vệ chuỗi nếu bạn quên thắp sáng 1 ngày.' : 'Passive: Auto-protects your streak if you miss 1 day.')
                      : (isVi ? 'Hồi phục vào Thứ 2. Tránh bỏ lỡ để không rớt hạng.' : 'Refills on Monday. Don\'t miss a day to keep your rank.')}
                  </Text>
                </View>
              </View>

              {/* Milestones */}
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 16 }}>
                {isVi ? '🎁 Phần Thưởng Đột Phá' : '🎁 Breakthrough Rewards'}
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
                        backgroundColor: '#FFFFFF',
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: (m.highlight && !reached) ? '#FCD34D' : (reached ? '#10B981' : '#E2E8F0'),
                        shadowColor: m.highlight ? '#FBBF24' : '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: m.highlight ? 0.2 : 0.03,
                        shadowRadius: 4,
                        elevation: m.highlight ? 3 : 1,
                      }}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: reached ? '#ECFDF5' : '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: reached ? '#A7F3D0' : '#E2E8F0' }}>
                        <Text style={{ fontSize: 20 }}>{m.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A' }}>
                            {m.days} {isVi ? 'ngày' : 'days'}
                          </Text>
                          {m.highlight && (
                            <View style={{ marginLeft: 8, backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FECACA' }}>
                              <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '800' }}>HOT</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: m.highlight ? '700' : '600', color: m.highlight ? '#D97706' : (reached ? '#059669' : '#64748B') }}>
                          {isVi ? m.rewardVi : m.rewardEn}
                        </Text>
                      </View>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: reached ? '#10B981' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
                        {reached ? <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" /> : <Ionicons name="lock-closed" size={14} color="#94A3B8" />}
                      </View>
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity
                style={{ width: '100%', paddingVertical: 18, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}
                onPress={() => setShowStreakModal(false)}
              >
                <Text style={{ color: '#475569', fontSize: 15, fontWeight: '800' }}>{isVi ? 'Đóng cửa sổ' : 'Close window'}</Text>
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



    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  header: {
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
  headerTitleRow: {
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
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
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'visible',
  },
  streakFlame: {
    fontSize: 32,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  streakSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 4,
    lineHeight: 18,
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
