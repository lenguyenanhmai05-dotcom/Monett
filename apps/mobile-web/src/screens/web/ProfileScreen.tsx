import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, 
  Image, useWindowDimensions, Switch, Platform, Modal, FlatList, ActivityIndicator 
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { FROGS } from '../../../assets/frogIndex';
import QRCode from 'react-qr-code';
import { updateProfileApi, changePasswordApi, uploadAvatarApi, sendFriendRequestApi, getFriendRequestsApi, getFriendsApi, respondFriendRequestApi, exportDataApi, submitFeedbackApi, submitRatingApi } from '../../services/api';
import { useTransactions } from '../../contexts/TransactionContext';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export const ProfileScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const { user, logout, refreshUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const isDark = (user as any)?.theme === 'dark';
  const styles = getStyles(isDark);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [friendIdInput, setFriendIdInput] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);

  const [isRemindFrog, setIsRemindFrog] = useState(true);
  const [isFaceId, setIsFaceId] = useState(false);

  const [isFriendsModalVisible, setIsFriendsModalVisible] = useState(false);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [activeFriendTab, setActiveFriendTab] = useState<'friends' | 'requests'>('friends');

  // Currency & Reminder Settings State
  const [isCurrencyModalVisible, setIsCurrencyModalVisible] = useState(false);
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
  const [isUpdatingSetting, setIsUpdatingSetting] = useState(false);
  const [customReminderInput, setCustomReminderInput] = useState('');

  // Export Data State
  const { transactions } = useTransactions();
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Rating State
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Feedback State
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('general');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleExportData = async (format: 'csv' | 'json') => {
    try {
      setIsExporting(true);
      const blob = await exportDataApi(format, transactions || []);
      
      // Tải file tự động về máy tính / thiết bị
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `monett_financial_report_${timestamp}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setIsExportModalVisible(false);
      window.alert(
        language === 'vi' 
          ? `Đã xuất dữ liệu thành công! File .${format.toUpperCase()} đã được tải về máy của bạn.` 
          : `Report exported successfully! .${format.toUpperCase()} file downloaded.`
      );
    } catch (error: any) {
      window.alert(error.message || 'Lỗi xuất dữ liệu báo cáo');
    } finally {
      setIsExporting(false);
    }
  };

  const CURRENCIES = [
    { code: 'VND', nameVi: 'Việt Nam Đồng (đ)', nameEn: 'Vietnamese Dong (đ)', symbol: '₫', flag: '🇻🇳' },
    { code: 'USD', nameVi: 'Đô la Mỹ ($)', nameEn: 'US Dollar ($)', symbol: '$', flag: '🇺🇸' },
    { code: 'EUR', nameVi: 'Đồng Euro (€)', nameEn: 'Euro (€)', symbol: '€', flag: '🇪🇺' },
    { code: 'JPY', nameVi: 'Yên Nhật (¥)', nameEn: 'Japanese Yen (¥)', symbol: '¥', flag: '🇯🇵' },
    { code: 'GBP', nameVi: 'Bảng Anh (£)', nameEn: 'British Pound (£)', symbol: '£', flag: '🇬🇧' },
  ];

  const REMINDER_OPTIONS = [
    { value: null, labelVi: 'Tắt nhắc nhở', labelEn: 'Turn Off', descVi: 'Không nhận thông báo hằng ngày', descEn: 'Disabled' },
    { value: '08:00', labelVi: '08:00 Sáng', labelEn: '08:00 AM', descVi: 'Bắt đầu ngày mới và ghi chép chi tiêu', descEn: 'Start your day tracking' },
    { value: '12:30', labelVi: '12:30 Trưa', labelEn: '12:30 PM', descVi: 'Ghi lại chi tiêu bữa trưa', descEn: 'Record lunch expenses' },
    { value: '20:00', labelVi: '20:00 Tối', labelEn: '08:00 PM', descVi: 'Tổng kết chi tiêu trong ngày', descEn: 'Daily review' },
    { value: '21:30', labelVi: '21:30 Đêm', labelEn: '09:30 PM', descVi: 'Nhắc nhở giữ chuỗi Streak', descEn: 'Streak reminder' },
    { value: '22:30', labelVi: '22:30 Đêm', labelEn: '10:30 PM', descVi: 'Trước khi đi ngủ', descEn: 'Bedtime reminder' },
  ];

  const currentCurrency = user?.currency || 'VND';
  const getCurrencySubtitle = () => {
    switch (currentCurrency) {
      case 'USD': return language === 'vi' ? 'Đô la Mỹ ($)' : 'US Dollar ($)';
      case 'EUR': return language === 'vi' ? 'Đồng Euro (€)' : 'Euro (€)';
      case 'JPY': return language === 'vi' ? 'Yên Nhật (¥)' : 'Japanese Yen (¥)';
      case 'GBP': return language === 'vi' ? 'Bảng Anh (£)' : 'British Pound (£)';
      default: return language === 'vi' ? 'Việt Nam Đồng (đ)' : 'Vietnamese Dong (đ)';
    }
  };

  const hasReminder = Boolean(user?.reminderTime);
  const getReminderSubtitle = () => {
    if (hasReminder) {
      return language === 'vi' ? `Hằng ngày lúc ${user?.reminderTime}` : `Daily at ${user?.reminderTime}`;
    }
    return language === 'vi' ? 'Đang tắt' : 'Disabled';
  };

  const handleSelectCurrency = async (currencyCode: string) => {
    try {
      setIsUpdatingSetting(true);
      await updateProfileApi({ currency: currencyCode });
      if (refreshUser) await refreshUser();
      setIsCurrencyModalVisible(false);
    } catch (error: any) {
      window.alert(error.message || 'Lỗi cập nhật tiền tệ');
    } finally {
      setIsUpdatingSetting(false);
    }
  };

  const handleSelectReminder = async (timeValue: string | null) => {
    try {
      setIsUpdatingSetting(true);
      await updateProfileApi({ reminderTime: timeValue || '' });
      if (refreshUser) await refreshUser();
      setIsReminderModalVisible(false);
    } catch (error: any) {
      window.alert(error.message || 'Lỗi cập nhật giờ nhắc nhở');
    } finally {
      setIsUpdatingSetting(false);
    }
  };

  const handleToggleTheme = async () => {
    try {
      const newTheme = (user as any)?.theme === 'dark' ? 'light' : 'dark';
      await updateProfileApi({ theme: newTheme });
      await refreshUser();
    } catch (error) {
      window.alert(language === 'vi' ? 'Không thể cập nhật giao diện' : 'Failed to update appearance');
    }
  };
  const [frogSeed] = useState(() => Math.floor(Math.random() * FROGS.length));

  const getInitial = () => {
    if (user?.fullName) return user.fullName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: '#FEE2E2', text: '#B91C1C' }, { bg: '#FEF3C7', text: '#B45309' }, 
      { bg: '#DCFCE7', text: '#047857' }, { bg: '#E0F2FE', text: '#0369A1' }, 
      { bg: '#EDE9FE', text: '#6D28D9' }, { bg: '#FCE7F3', text: '#BE185D' }
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const avatarColor = getAvatarColor(user?.fullName || user?.email || 'U');

  const handleUpdateProfile = async () => {
    try {
      setIsLoadingProfile(true);
      await updateProfileApi({ fullName });
      if (refreshUser) await refreshUser();
      window.alert(language === 'vi' ? 'Đã lưu thay đổi!' : 'Profile updated!');
    } catch (error: any) {
      window.alert(error.message || 'Error updating profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploading(true);
        const asset = result.assets[0];
        const match = /\.(\w+)$/.exec(asset.fileName || asset.uri.split('/').pop() || 'avatar.jpg');
        await uploadAvatarApi(asset.uri, match ? `image/${match[1]}` : `image`, asset.fileName || 'avatar.jpg');
        if (refreshUser) await refreshUser();
        setImageError(false);
      }
    } catch (error: any) {
      window.alert(error.message || 'Error uploading avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return window.alert('Vui lòng nhập đầy đủ');
    try {
      setIsLoadingPassword(true);
      await changePasswordApi({ currentPassword, newPassword });
      window.alert('Đã cập nhật mật khẩu!');
      setCurrentPassword(''); setNewPassword('');
    } catch (error: any) {
      window.alert(error.message);
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleCopyId = () => {
    if (user?.id) navigator.clipboard.writeText(user.id).then(() => window.alert('Đã sao chép ID!'));
  };

  const handleAddFriend = async () => {
    if (!friendIdInput) return window.alert(language === 'vi' ? 'Vui lòng nhập ID bạn bè!' : 'Please enter a friend ID!');
    let cleanedId = friendIdInput.trim();
    if (cleanedId.startsWith('#')) cleanedId = cleanedId.slice(1);
    
    try {
      setIsSendingRequest(true);
      const result = await sendFriendRequestApi(cleanedId);
      console.log('[AddFriend] Result:', result);
      window.alert(language === 'vi' ? '✅ Đã gửi lời mời kết bạn!' : '✅ Friend request sent!');
      setFriendIdInput('');
    } catch (error: any) {
      console.error('[AddFriend] Error:', error);
      window.alert('❌ ' + (error.message || 'Lỗi khi gửi lời mời'));
    } finally {
      setIsSendingRequest(false);
    }
  };

  const loadFriendsData = async () => {
    try {
      setIsFriendsLoading(true);
      const [friends, requests] = await Promise.all([
        getFriendsApi(),
        getFriendRequestsApi()
      ]);
      setFriendsList(friends as unknown as any[]);
      setFriendRequests(requests as unknown as any[]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFriendsLoading(false);
    }
  };

  const handleOpenFriendsModal = () => {
    setIsFriendsModalVisible(true);
    loadFriendsData();
  };

  const handleRespondFriendRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await respondFriendRequestApi(requestId, status);
      await loadFriendsData();
    } catch (e) {
      window.alert(language === 'vi' ? 'Lỗi xử lý yêu cầu' : 'Error responding to request');
    }
  };

  const SettingRow = ({ icon, title, subtitle, value, color, onPress, isSwitch, switchValue, onSwitchChange, isPro }: any) => (
    <TouchableOpacity style={styles.settingRow} activeOpacity={onPress ? 0.7 : 1} onPress={onPress}>
      <View style={styles.settingRowLeft}>
        <View style={[styles.settingIconBox, { backgroundColor: color + '15' }]}>
          {typeof icon === 'string' ? (
            <Text style={[styles.settingIcon, { textShadowColor: color + '40', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }]}>{icon}</Text>
          ) : (
            icon
          )}
        </View>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.settingTitle}>{title}</Text>
            {isPro && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRowRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {isSwitch ? (
          <Switch value={switchValue} onValueChange={onSwitchChange} trackColor={{ false: '#E2E8F0', true: '#10B981' }} style={{ transform: [{ scale: 0.9 }] }} />
        ) : (
          <View style={styles.chevronBox}>
            <Text style={styles.settingChevron}>›</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      
      {/* 🌟 SOFT PASTEL HEADER SECTION */}
      <View style={styles.headerSection}>
        <View style={styles.coverBanner} />
        <View style={styles.profileMetaBox}>
          <View style={styles.avatarContainer}>
            {user?.avatarUrl && !imageError ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} onError={() => setImageError(true)} />
            ) : (
              <View style={[styles.avatarImg, { backgroundColor: avatarColor.bg, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={[styles.avatarInitials, { color: avatarColor.text }]}>{getInitial()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarBtn} onPress={handlePickImage} disabled={isUploading}>
              <Text style={styles.editAvatarIcon}>📷</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.metaTextContainer}>
          <Text style={styles.userNameText}>{user?.fullName || 'Người dùng Monett'}</Text>
          <Text style={styles.userEmailText}>{user?.email}</Text>
          {/* Badge conditionally rendered based on user PRO status */}
          {(user?.isPro || (user as any)?.role === 'ADMIN' || (user?.streak ?? 0) >= 7) ? (
            <View style={styles.eliteBadge}>
              <Text style={styles.eliteBadgeText}>✨ PRO • {language === 'vi' ? 'Thành viên Tinh Hoa' : 'Elite Member'}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.standardBadge} onPress={() => window.alert(language === 'vi' ? `Giữ chuỗi streak ${user?.streak ?? 0}/7 ngày để mở khóa PRO miễn phí!` : `Keep a ${user?.streak ?? 0}/7 day streak to unlock PRO for free!`)}>
              <Text style={styles.standardBadgeText}>🌱 {language === 'vi' ? `Bản Tiêu chuẩn • Streak ${user?.streak ?? 0}/7` : `Standard • Streak ${user?.streak ?? 0}/7`}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.grid, isDesktop ? styles.rowDesktop : styles.rowMobile]}>
        
        {/* ================= LEFT COLUMN ================= */}
        <View style={[styles.column, isDesktop && styles.leftColumn]}>
          
          {/* QR Code Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardIcon}>🌱</Text>
                <Text style={styles.cardTitle}>{language === 'vi' ? 'Kết nối bạn bè' : 'Connect Friends'}</Text>
              </View>
            </View>
            <View style={styles.qrContainer}>
              <View style={styles.qrFrame}>
                <QRCode value={user?.id || 'monett-user'} size={150} fgColor="#047857" />
              </View>
              <Text style={styles.userIdDisplay}>ID của bạn:</Text>
              <Text style={[styles.userIdBold, { fontSize: 12, marginBottom: 16, textAlign: 'center', flexWrap: 'wrap' }]}>{user?.id || 'loading...'}</Text>
              <TouchableOpacity style={styles.actionBtnSoft} onPress={handleCopyId}>
                <Text style={styles.actionBtnSoftText}>📋 {language === 'vi' ? 'Sao chép ID' : 'Copy ID'}</Text>
              </TouchableOpacity>
              
              {/* Add Friend Input */}
              <View style={{ marginTop: 24, width: '100%' }}>
                <Text style={[styles.inputLabel, { fontSize: 11, marginBottom: 6 }]}>{language === 'vi' ? 'Thêm bạn mới' : 'Add New Friend'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput 
                    style={[styles.textInput, { flex: 1, paddingVertical: 10, paddingHorizontal: 16, fontSize: 14 }]} 
                    placeholder={language === 'vi' ? 'Nhập ID bạn bè...' : 'Enter friend ID...'}
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    value={friendIdInput}
                    onChangeText={setFriendIdInput}
                  />
                  <TouchableOpacity 
                    style={[styles.primaryBtn, { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, opacity: isSendingRequest ? 0.7 : 1 }]} 
                    onPress={handleAddFriend}
                    disabled={isSendingRequest}
                  >
                    <Text style={styles.primaryBtnText}>
                      {isSendingRequest ? '...' : (language === 'vi' ? 'Thêm' : 'Add')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Monett Frog Mascot */}
          <View style={styles.mascotCard}>
            <Image source={FROGS[frogSeed]} style={styles.mascotImage} resizeMode="contain" />
            <View style={styles.mascotTextContainer}>
              <Text style={styles.mascotGreeting}>Monett</Text>
              <Text style={styles.mascotMessage}>
                {language === 'vi' 
                  ? [
                      'Chúc cậu một ngày quản lý tài chính hiệu quả nhé!',
                      'Đừng quên ghi chép lại chi tiêu hôm nay nha!',
                      'Tiết kiệm hôm nay, sung túc ngày mai!',
                      'Cố gắng giữ vững ngân sách của tuần này nhé!',
                      'Hôm nay là một ngày tuyệt vời để đầu tư cho bản thân!'
                    ][new Date().getDate() % 5]
                  : [
                      'Have a frog-tastic financial day!',
                      'Remember to log all your expenses today!',
                      'Save today, thrive tomorrow!',
                      'Keep up the great work with your weekly budget!',
                      'Today is a great day to invest in yourself!'
                    ][new Date().getDate() % 5]
                }
              </Text>
            </View>
          </View>
        </View>

        {/* ================= RIGHT COLUMN ================= */}
        <View style={[styles.column, isDesktop && styles.rightColumn]}>
          
          {/* Personal Info */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{language === 'vi' ? 'Hồ Sơ Cá Nhân' : 'Personal Profile'}</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{language === 'vi' ? 'Tên hiển thị' : 'Display Name'}</Text>
              <TextInput style={styles.textInput} value={fullName} onChangeText={setFullName} selectionColor="#059669" />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdateProfile} disabled={isLoadingProfile}>
              <Text style={styles.primaryBtnText}>{isLoadingProfile ? '⏳...' : (language === 'vi' ? 'Lưu thay đổi' : 'Save Changes')}</Text>
            </TouchableOpacity>
          </View>

          {/* 🌟 TÍNH NĂNG NỔI BẬT */}
          <View style={styles.settingsGroup}>
            <Text style={styles.settingsGroupTitle}>{language === 'vi' ? 'Khám phá' : 'Explore'}</Text>
            <View style={styles.settingsBlock}>
              <SettingRow 
                icon={<MaterialCommunityIcons name="crown" size={24} color="#F59E0B" />} 
                title={language === 'vi' ? 'Nâng cấp lên PRO' : 'Upgrade to PRO'} 
                subtitle={language === 'vi' ? 'Mở khóa mọi tính năng' : 'Unlock all features'} 
                color="#F59E0B" 
                onPress={() => window.alert('Tính năng nâng cấp PRO đang phát triển!')} 
              />
              <SettingRow 
                icon={<Ionicons name="people" size={24} color="#8B5CF6" />} 
                title={language === 'vi' ? 'Danh sách bạn bè' : 'Friends'} 
                subtitle={language === 'vi' ? 'Quản lý bạn bè của bạn' : 'Manage your network'} 
                color="#8B5CF6" 
                onPress={handleOpenFriendsModal} 
              />
            </View>
          </View>

          {/* 🌟 GIAO DIỆN & TÙY CHỌN */}
          <View style={styles.settingsGroup}>
            <Text style={styles.settingsGroupTitle}>{language === 'vi' ? 'Giao diện & Tùy chọn' : 'Display & Options'}</Text>
            <View style={styles.settingsBlock}>
              <SettingRow 
                icon={<Ionicons name={(user as any)?.theme === 'dark' ? 'moon' : 'moon-outline'} size={24} color="#64748B" />} 
                title={language === 'vi' ? 'Giao diện' : 'Appearance'} 
                subtitle={(user as any)?.theme === 'dark' ? (language === 'vi' ? 'Chế độ Tối' : 'Dark Mode') : (language === 'vi' ? 'Chế độ Sáng' : 'Light Mode')} 
                value={(user as any)?.theme === 'dark' ? (language === 'vi' ? 'Tối' : 'Dark') : (language === 'vi' ? 'Sáng' : 'Light')} 
                color="#64748B" 
                onPress={handleToggleTheme} 
              />
              <SettingRow icon={<Ionicons name="language-outline" size={24} color="#10B981" />} title={language === 'vi' ? 'Ngôn Ngữ' : 'Language'} subtitle={language === 'vi' ? 'Tiếng Việt' : 'English'} value={language === 'vi' ? 'VI' : 'EN'} color="#10B981" onPress={() => setLanguage(language === 'vi' ? 'en' : 'vi')} />
              <SettingRow 
                icon={<Ionicons name="globe-outline" size={24} color="#0EA5E9" />} 
                title={language === 'vi' ? 'Đơn Vị Tiền Tệ' : 'Currency'} 
                subtitle={getCurrencySubtitle()} 
                value={currentCurrency} 
                color="#0EA5E9" 
                onPress={() => setIsCurrencyModalVisible(true)} 
              />
              <SettingRow icon={<Ionicons name="layers-outline" size={24} color="#8B5CF6" />} title={language === 'vi' ? 'Hạng Mục Chi Tiêu' : 'Categories'} subtitle={language === 'vi' ? 'Tùy chỉnh danh mục thu chi' : 'Manage expense categories'} color="#8B5CF6" isPro onPress={() => window.alert('Tính năng PRO đang phát triển!')} />

              {user?.authProvider !== 'google' && (
                <SettingRow icon={<Ionicons name="shield-checkmark-outline" size={24} color="#14B8A6" />} title={language === 'vi' ? 'Xác thực 2 bước' : 'Two-Factor Auth'} subtitle={language === 'vi' ? 'Bảo vệ tài khoản bằng mã OTP' : 'Protect with OTP code'} color="#14B8A6" isPro isSwitch switchValue={isFaceId} onSwitchChange={setIsFaceId} />
              )}
            </View>
          </View>

          {/* 🌟 QUẢN LÝ DỮ LIỆU */}
          <View style={styles.settingsGroup}>
            <Text style={styles.settingsGroupTitle}>{language === 'vi' ? 'Quản lý dữ liệu' : 'Data Management'}</Text>
            <View style={styles.settingsBlock}>
              <SettingRow icon={<Ionicons name="cloud-done-outline" size={24} color="#0EA5E9" />} title={language === 'vi' ? 'Đồng bộ đám mây' : 'Cloud Sync'} subtitle={language === 'vi' ? 'Dữ liệu đã được sao lưu an toàn' : 'Data is safely backed up'} color="#0EA5E9" onPress={() => window.alert(language === 'vi' ? 'Dữ liệu của bạn đang được đồng bộ hóa an toàn!' : 'Your data is safely synced!')} />
              <SettingRow 
                icon={<Ionicons name="download-outline" size={24} color="#059669" />} 
                title={language === 'vi' ? 'Xuất dữ liệu (Excel/CSV)' : 'Export Data'} 
                subtitle={language === 'vi' ? 'Tải xuống báo cáo thu chi' : 'Download financial reports'} 
                color="#059669" 
                isPro 
                onPress={() => setIsExportModalVisible(true)} 
              />
            </View>
          </View>

          {/* 🌟 THÔNG BÁO & NHẮC NHỞ */}
          <View style={styles.settingsGroup}>
            <Text style={styles.settingsGroupTitle}>{language === 'vi' ? 'Thông báo & Nhắc nhở' : 'Notifications'}</Text>
            <View style={styles.settingsBlock}>
              <SettingRow 
                icon={<Ionicons name={hasReminder ? "notifications" : "notifications-off-outline"} size={24} color={hasReminder ? "#10B981" : "#94A3B8"} />} 
                title={language === 'vi' ? 'Giờ Nhắc Nhở' : 'Reminder Time'} 
                subtitle={getReminderSubtitle()} 
                value={hasReminder ? user?.reminderTime : (language === 'vi' ? 'Tắt' : 'Off')} 
                color={hasReminder ? "#10B981" : "#94A3B8"} 
                onPress={() => setIsReminderModalVisible(true)} 
              />
            </View>
          </View>

          {/* 🌟 ĐÁNH GIÁ & HỖ TRỢ */}
          <View style={styles.settingsGroup}>
            <Text style={styles.settingsGroupTitle}>{language === 'vi' ? 'Đánh giá & Hỗ trợ' : 'Support'}</Text>
            <View style={styles.settingsBlock}>
              <SettingRow icon={<Ionicons name="star" size={24} color="#F59E0B" />} title={language === 'vi' ? 'Đánh giá Monett 5 sao' : 'Rate Monett'} subtitle={language === 'vi' ? 'Ủng hộ nhà phát triển' : 'Support developers'} color="#F59E0B" onPress={() => { setRatingSubmitted(false); setSelectedStars(0); setRatingComment(''); setIsRatingModalVisible(true); }} />
              <SettingRow icon={<Ionicons name="mail-outline" size={24} color="#3B82F6" />} title={language === 'vi' ? 'Góp ý cải thiện ứng dụng' : 'Feedback'} subtitle={language === 'vi' ? 'Gửi ý kiến đóng góp' : 'Send us feedback'} color="#3B82F6" onPress={() => { setFeedbackSubmitted(false); setFeedbackMessage(''); setFeedbackCategory('general'); setIsFeedbackModalVisible(true); }} />
              <SettingRow icon={<Ionicons name="log-out-outline" size={24} color="#EF4444" />} title={language === 'vi' ? 'Đăng xuất' : 'Sign Out'} subtitle={language === 'vi' ? 'Thoát tài khoản an toàn' : 'Log out securely'} color="#EF4444" onPress={logout} />
            </View>
          </View>

        </View>
      </View>

      {/* 🌟 FRIENDS MODAL */}
      <Modal visible={isFriendsModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{language === 'vi' ? 'Bạn bè' : 'Friends'}</Text>
              <TouchableOpacity onPress={() => setIsFriendsModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#F1F5F9' : '#1E293B'} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalTabs}>
              <TouchableOpacity 
                style={[styles.modalTab, activeFriendTab === 'friends' && styles.modalTabActive]}
                onPress={() => setActiveFriendTab('friends')}
              >
                <Text style={[styles.modalTabText, activeFriendTab === 'friends' && styles.modalTabTextActive]}>
                  {language === 'vi' ? 'Danh sách' : 'List'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalTab, activeFriendTab === 'requests' && styles.modalTabActive]}
                onPress={() => setActiveFriendTab('requests')}
              >
                <Text style={[styles.modalTabText, activeFriendTab === 'requests' && styles.modalTabTextActive]}>
                  {language === 'vi' ? 'Lời mời' : 'Requests'} {friendRequests.length > 0 && `(${friendRequests.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            {isFriendsLoading ? (
              <View style={styles.modalEmpty}>
                <ActivityIndicator size="large" color="#059669" />
              </View>
            ) : activeFriendTab === 'friends' ? (
              <FlatList
                data={friendsList}
                keyExtractor={(item) => item._id?.toString() || item.id || String(Math.random())}
                renderItem={({ item }) => {
                  const name = item.fullName || item.email || 'N';
                  const initial = name.charAt(0).toUpperCase();
                  return (
                    <View style={styles.friendRow}>
                      <View style={styles.friendRowLeft}>
                        {item.avatarUrl ? (
                          <Image
                            source={{ uri: item.avatarUrl }}
                            style={{ width: 40, height: 40, borderRadius: 20 }}
                          />
                        ) : (
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{initial}</Text>
                          </View>
                        )}
                        <View>
                          <Text style={styles.friendName}>{name}</Text>
                          {item.email && item.fullName && <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#94A3B8' }}>{item.email}</Text>}
                        </View>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={<Text style={styles.modalEmptyText}>{language === 'vi' ? 'Chưa có bạn bè nào' : 'No friends yet'}</Text>}
              />
            ) : (
              <FlatList
                data={friendRequests}
                keyExtractor={(item) => item._id?.toString() || item.id || String(Math.random())}
                renderItem={({ item }) => {
                  const requester = item.requester || {};
                  const name = requester.fullName || requester.email || 'Người dùng';
                  const initial = name.charAt(0).toUpperCase();
                  const requestId = item._id?.toString() || item.id;
                  return (
                  <View style={styles.friendRow}>
                    <View style={styles.friendRowLeft}>
                      {requester.avatarUrl ? (
                        <Image
                          source={{ uri: requester.avatarUrl }}
                          style={{ width: 40, height: 40, borderRadius: 20 }}
                        />
                      ) : (
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{initial}</Text>
                        </View>
                      )}
                      <View>
                        <Text style={styles.friendName}>{name}</Text>
                      </View>
                    </View>
                    <View style={styles.friendActions}>
                      <TouchableOpacity style={[styles.primaryBtn, { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }]} onPress={() => handleRespondFriendRequest(requestId, 'accepted')}>
                        <Text style={styles.primaryBtnText}>{language === 'vi' ? 'Duyệt' : 'Accept'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.outlineBtn, { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'transparent' }]} onPress={() => handleRespondFriendRequest(requestId, 'rejected')}>
                        <Text style={styles.outlineBtnText}>{language === 'vi' ? 'Xóa' : 'Decline'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  );
                }}
                ListEmptyComponent={<Text style={styles.modalEmptyText}>{language === 'vi' ? 'Không có lời mời nào' : 'No requests'}</Text>}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* 🌟 CURRENCY MODAL */}
      <Modal visible={isCurrencyModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{language === 'vi' ? 'Đơn vị tiền tệ' : 'Currency'}</Text>
              <TouchableOpacity onPress={() => setIsCurrencyModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#F1F5F9' : '#1E293B'} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginBottom: 16 }}>
              {language === 'vi' ? 'Chọn đơn vị tiền tệ chính cho tài khoản của bạn' : 'Select your primary currency'}
            </Text>

            {isUpdatingSetting ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#059669" />
              </View>
            ) : (
              <View>
                {CURRENCIES.map((c) => {
                  const isSelected = currentCurrency === c.code;
                  return (
                    <TouchableOpacity
                      key={c.code}
                      style={[styles.settingOptionCard, isSelected && styles.settingOptionCardActive]}
                      onPress={() => handleSelectCurrency(c.code)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.settingOptionIcon}>{c.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.settingOptionLabel, isSelected && { color: '#059669' }]}>
                          {c.code} - {c.symbol}
                        </Text>
                        <Text style={styles.settingOptionDesc}>
                          {language === 'vi' ? c.nameVi : c.nameEn}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 🌟 REMINDER TIME MODAL */}
      <Modal visible={isReminderModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{language === 'vi' ? 'Giờ nhắc nhở hằng ngày' : 'Reminder Time'}</Text>
              <TouchableOpacity onPress={() => setIsReminderModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#F1F5F9' : '#1E293B'} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginBottom: 16 }}>
              {language === 'vi' ? 'Thông báo giữ chuỗi streak và ghi chép chi tiêu' : 'Set your daily reminder notification time'}
            </Text>

            {isUpdatingSetting ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#059669" />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {REMINDER_OPTIONS.map((opt, idx) => {
                  const isSelected = opt.value === null ? !user?.reminderTime : user?.reminderTime === opt.value;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.settingOptionCard, isSelected && styles.settingOptionCardActive]}
                      onPress={() => handleSelectReminder(opt.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.settingOptionIcon}>
                        {opt.value === null ? '🔕' : '⏰'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.settingOptionLabel, isSelected && { color: '#059669' }]}>
                          {language === 'vi' ? opt.labelVi : opt.labelEn}
                        </Text>
                        <Text style={styles.settingOptionDesc}>
                          {language === 'vi' ? opt.descVi : opt.descEn}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
                    </TouchableOpacity>
                  );
                })}

                {/* Custom Time Input */}
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#E2E8F0' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#F1F5F9' : '#1E293B', marginBottom: 8 }}>
                    {language === 'vi' ? 'Hoặc nhập giờ tùy chỉnh (HH:mm):' : 'Or enter custom time (HH:mm):'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, paddingVertical: 10 }]}
                      placeholder="VD: 21:00"
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      value={customReminderInput}
                      onChangeText={setCustomReminderInput}
                      maxLength={5}
                    />
                    <TouchableOpacity
                      style={[styles.primaryBtn, { paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' }]}
                      onPress={() => {
                        const trimmed = customReminderInput.trim();
                        if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trimmed)) {
                          handleSelectReminder(trimmed);
                        } else {
                          window.alert(language === 'vi' ? 'Vui lòng nhập đúng định dạng giờ (VD: 21:30)' : 'Please enter valid format (e.g. 21:30)');
                        }
                      }}
                    >
                      <Text style={styles.primaryBtnText}>{language === 'vi' ? 'Lưu' : 'Set'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 🌟 EXPORT DATA MODAL */}
      <Modal visible={isExportModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.modalTitle}>{language === 'vi' ? 'Xuất báo cáo tài chính' : 'Export Data'}</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsExportModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#F1F5F9' : '#1E293B'} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginBottom: 16 }}>
              {language === 'vi' 
                ? 'Tải toàn bộ lịch sử chi tiêu, khoảnh khắc và số liệu tài chính về máy của bạn:' 
                : 'Download all your transactions and financial moments to your device:'}
            </Text>

            {isExporting ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#059669" />
                <Text style={{ marginTop: 16, fontSize: 14, fontWeight: '600', color: isDark ? '#F1F5F9' : '#1E293B' }}>
                  {language === 'vi' ? 'Đang khởi tạo báo cáo tài chính...' : 'Generating financial report...'}
                </Text>
              </View>
            ) : (
              <View>
                {/* Option 1: CSV / Excel */}
                <TouchableOpacity
                  style={styles.settingOptionCard}
                  onPress={() => handleExportData('csv')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.settingOptionIcon}>📊</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.settingOptionLabel, { color: '#059669' }]}>
                        {language === 'vi' ? 'Bảng tính Excel (.CSV)' : 'Excel Spreadsheet (.CSV)'}
                      </Text>
                      <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#047857' }}>Khuyên dùng</Text>
                      </View>
                    </View>
                    <Text style={styles.settingOptionDesc}>
                      {language === 'vi' ? 'Mở trực tiếp trên Microsoft Excel, Google Sheets, hiển thị chuẩn font tiếng Việt' : 'Compatible with MS Excel & Google Sheets'}
                    </Text>
                  </View>
                  <Ionicons name="download" size={20} color="#059669" />
                </TouchableOpacity>

                {/* Option 2: JSON Backup */}
                <TouchableOpacity
                  style={styles.settingOptionCard}
                  onPress={() => handleExportData('json')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.settingOptionIcon}>📑</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingOptionLabel}>
                      {language === 'vi' ? 'File sao lưu JSON (.JSON)' : 'Raw Backup Data (.JSON)'}
                    </Text>
                    <Text style={styles.settingOptionDesc}>
                      {language === 'vi' ? 'Dữ liệu cấu trúc gốc để lập trình viên hoặc sao lưu phục hồi hệ thống' : 'Full raw data format for developer backup'}
                    </Text>
                  </View>
                  <Ionicons name="download" size={20} color="#64748B" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.outlineBtn, { marginTop: 12 }]} 
                  onPress={() => setIsExportModalVisible(false)}
                >
                  <Text style={styles.outlineBtnText}>{language === 'vi' ? 'Đóng' : 'Close'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ⭐ RATING MODAL */}
      <Modal visible={isRatingModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{language === 'vi' ? 'Đánh giá Monett' : 'Rate Monett'}</Text>
              <TouchableOpacity onPress={() => setIsRatingModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#F1F5F9' : '#1E293B'} />
              </TouchableOpacity>
            </View>

            {ratingSubmitted ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 56, marginBottom: 12 }}>🎉</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#F1F5F9' : '#1E293B', marginBottom: 8 }}>
                  {language === 'vi' ? 'Cảm ơn bạn!' : 'Thank you!'}
                </Text>
                <Text style={{ fontSize: 14, color: isDark ? '#94A3B8' : '#64748B', textAlign: 'center' }}>
                  {language === 'vi' ? 'Đánh giá của bạn giúp chúng tôi cải thiện Monett tốt hơn mỗi ngày!' : 'Your rating helps us make Monett better every day!'}
                </Text>
                <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24, width: '100%' }]} onPress={() => setIsRatingModalVisible(false)}>
                  <Text style={styles.primaryBtnText}>{language === 'vi' ? 'Đóng' : 'Close'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={{ fontSize: 14, color: isDark ? '#94A3B8' : '#64748B', textAlign: 'center', marginBottom: 20 }}>
                  {language === 'vi' ? 'Trải nghiệm của bạn với Monett như thế nào?' : 'How is your experience with Monett?'}
                </Text>

                {/* Star Selector */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setSelectedStars(star)} activeOpacity={0.7}>
                      <Text style={{ fontSize: 44, opacity: star <= selectedStars ? 1 : 0.25 }}>⭐</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 20 }}>
                  {selectedStars === 0 ? (language === 'vi' ? 'Chọn số sao...' : 'Select stars...')
                    : selectedStars === 1 ? (language === 'vi' ? '😞 Rất tệ' : '😞 Very Poor')
                    : selectedStars === 2 ? (language === 'vi' ? '😐 Tạm được' : '😐 Poor')
                    : selectedStars === 3 ? (language === 'vi' ? '🙂 Ổn' : '🙂 Average')
                    : selectedStars === 4 ? (language === 'vi' ? '😊 Tốt' : '😊 Good')
                    : (language === 'vi' ? '🤩 Tuyệt vời!' : '🤩 Excellent!')}
                </Text>

                {/* Optional Comment */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#CBD5E1' : '#64748B', marginBottom: 8 }}>
                  {language === 'vi' ? 'Nhận xét thêm (không bắt buộc):' : 'Additional comment (optional):'}
                </Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                  placeholder={language === 'vi' ? 'Chia sẻ trải nghiệm của bạn...' : 'Share your experience...'}
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  value={ratingComment}
                  onChangeText={setRatingComment}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 20, opacity: (selectedStars === 0 || isSubmittingRating) ? 0.5 : 1 }]}
                  disabled={selectedStars === 0 || isSubmittingRating}
                  onPress={async () => {
                    try {
                      setIsSubmittingRating(true);
                      await submitRatingApi(selectedStars, ratingComment || undefined);
                      setRatingSubmitted(true);
                    } catch (e: any) {
                      window.alert(e.message || (language === 'vi' ? 'Lỗi gửi đánh giá' : 'Failed to submit rating'));
                    } finally {
                      setIsSubmittingRating(false);
                    }
                  }}
                >
                  <Text style={styles.primaryBtnText}>
                    {isSubmittingRating ? '⏳...' : (language === 'vi' ? `Gửi đánh giá ${selectedStars > 0 ? selectedStars + '⭐' : ''}` : `Submit ${selectedStars > 0 ? selectedStars + '⭐' : 'Rating'}`)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 💬 FEEDBACK MODAL */}
      <Modal visible={isFeedbackModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{language === 'vi' ? 'Góp ý cho Monett' : 'Send Feedback'}</Text>
              <TouchableOpacity onPress={() => setIsFeedbackModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#F1F5F9' : '#1E293B'} />
              </TouchableOpacity>
            </View>

            {feedbackSubmitted ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 56, marginBottom: 12 }}>💌</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#F1F5F9' : '#1E293B', marginBottom: 8 }}>
                  {language === 'vi' ? 'Đã nhận góp ý!' : 'Feedback Received!'}
                </Text>
                <Text style={{ fontSize: 14, color: isDark ? '#94A3B8' : '#64748B', textAlign: 'center' }}>
                  {language === 'vi' ? 'Cảm ơn bạn! Đội ngũ Monett sẽ đọc và cải thiện ứng dụng dựa trên ý kiến của bạn.' : 'Thank you! The Monett team will read your feedback and improve the app.'}
                </Text>
                <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24, width: '100%' }]} onPress={() => setIsFeedbackModalVisible(false)}>
                  <Text style={styles.primaryBtnText}>{language === 'vi' ? 'Đóng' : 'Close'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginBottom: 16 }}>
                  {language === 'vi' ? 'Ý kiến của bạn giúp chúng tôi phát triển Monett tốt hơn mỗi ngày.' : 'Your feedback helps us improve Monett every day.'}
                </Text>

                {/* Category Chips */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#CBD5E1' : '#64748B', marginBottom: 10 }}>
                  {language === 'vi' ? 'Chủ đề góp ý:' : 'Feedback category:'}
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
                          backgroundColor: isSelected ? '#059669' : (isDark ? '#334155' : '#F1F5F9'),
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#059669' : (isDark ? '#475569' : '#E2E8F0'),
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#FFFFFF' : (isDark ? '#CBD5E1' : '#475569') }}>
                          {language === 'vi' ? cat.labelVi : cat.labelEn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Message Input */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#CBD5E1' : '#64748B', marginBottom: 8 }}>
                  {language === 'vi' ? 'Nội dung góp ý:' : 'Your message:'}
                </Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 120, textAlignVertical: 'top', paddingTop: 12 }]}
                  placeholder={language === 'vi' ? 'Mô tả chi tiết ý kiến của bạn... (tối thiểu 5 ký tự)' : 'Describe your feedback in detail... (min 5 characters)'}
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  value={feedbackMessage}
                  onChangeText={setFeedbackMessage}
                  multiline
                  numberOfLines={5}
                />
                <Text style={{ fontSize: 11, color: isDark ? '#64748B' : '#94A3B8', marginTop: 4, marginBottom: 20 }}>
                  {feedbackMessage.length}/500 {language === 'vi' ? 'ký tự' : 'characters'}
                </Text>

                <TouchableOpacity
                  style={[styles.primaryBtn, { opacity: (feedbackMessage.trim().length < 5 || isSubmittingFeedback) ? 0.5 : 1 }]}
                  disabled={feedbackMessage.trim().length < 5 || isSubmittingFeedback}
                  onPress={async () => {
                    try {
                      setIsSubmittingFeedback(true);
                      await submitFeedbackApi(feedbackCategory, feedbackMessage.trim());
                      setFeedbackSubmitted(true);
                    } catch (e: any) {
                      window.alert(e.message || (language === 'vi' ? 'Lỗi gửi góp ý' : 'Failed to send feedback'));
                    } finally {
                      setIsSubmittingFeedback(false);
                    }
                  }}
                >
                  <Text style={styles.primaryBtnText}>
                    {isSubmittingFeedback ? '⏳ Đang gửi...' : (language === 'vi' ? '📨 Gửi góp ý' : '📨 Send Feedback')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#1E293B' : '#F3F6F8' }, // Softer Dark Slate
  contentContainer: { paddingBottom: 60 },
  headerSection: {
    backgroundColor: isDark ? '#334155' : '#FFFFFF', // Lighter dark card
    paddingTop: 32, paddingBottom: 32,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    shadowColor: isDark ? '#000000' : '#64748B', shadowOpacity: isDark ? 0.2 : 0.05, shadowRadius: 20, elevation: 3,
    marginBottom: 32, overflow: 'hidden',
  },
  coverBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
    backgroundColor: '#064E3B',
    ...(Platform.OS === 'web' ? { 
      backgroundImage: 'linear-gradient(135deg, #0F766E 0%, #022C22 100%)' 
    } : {}) as any
  },
  profileMetaBox: { paddingHorizontal: 40, alignItems: 'center', marginTop: 80 },
  avatarContainer: { position: 'relative', width: 130 },
  avatarImg: { width: 130, height: 130, borderRadius: 65, borderWidth: 6, borderColor: isDark ? '#334155' : '#FFFFFF', backgroundColor: '#DCFCE7' },
  avatarInitials: { fontSize: 48, fontWeight: '800', color: '#047857' },
  editAvatarBtn: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: isDark ? '#475569' : '#FFFFFF', width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3,
    borderWidth: 1, borderColor: isDark ? '#64748B' : '#F1F5F9',
  },
  editAvatarIcon: { fontSize: 18 },
  metaTextContainer: { paddingHorizontal: 40, paddingTop: 16, alignItems: 'center' },
  userNameText: { fontSize: 26, fontWeight: '800', color: isDark ? '#F1F5F9' : '#1E293B', letterSpacing: -0.5 },
  userEmailText: { fontSize: 15, color: isDark ? '#94A3B8' : '#64748B', marginTop: 4 },
  eliteBadge: {
    backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, marginTop: 12, borderWidth: 1, borderColor: '#334155',
    shadowColor: '#F59E0B', shadowOpacity: 0.15, shadowRadius: 10, elevation: 4
  },
  eliteBadgeText: { color: '#FBBF24', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  standardBadge: {
    backgroundColor: isDark ? '#475569' : '#F1F5F9', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, marginTop: 12, borderWidth: 1, borderColor: isDark ? '#64748B' : '#E2E8F0',
  },
  standardBadgeText: { color: isDark ? '#F1F5F9' : '#64748B', fontSize: 13, fontWeight: '700' },

  grid: { paddingHorizontal: 40, gap: 32, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  rowDesktop: { flexDirection: 'row' }, rowMobile: { flexDirection: 'column' },
  column: { flex: 1, gap: 24 }, leftColumn: { flex: 0.35 }, rightColumn: { flex: 0.65 },

  card: {
    backgroundColor: isDark ? '#334155' : '#FFFFFF', borderRadius: 24, padding: 28,
    shadowColor: isDark ? '#000000' : '#64748B', shadowOpacity: isDark ? 0.2 : 0.04, shadowRadius: 15, elevation: 2,
    borderWidth: 1, borderColor: isDark ? '#475569' : '#F1F5F9',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { fontSize: 20 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: isDark ? '#F1F5F9' : '#334155' },

  qrContainer: { alignItems: 'center', paddingVertical: 10 },
  qrFrame: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#475569' : '#E2E8F0' },
  userIdDisplay: { fontSize: 14, color: isDark ? '#CBD5E1' : '#64748B', marginBottom: 16 },
  userIdBold: { fontWeight: '700', color: isDark ? '#F8FAFC' : '#0F172A', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  actionBtnSoft: { backgroundColor: isDark ? '#475569' : '#F8FAFC', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: isDark ? '#64748B' : '#E2E8F0' },
  actionBtnSoftText: { fontSize: 14, fontWeight: '700', color: isDark ? '#F1F5F9' : '#475569' },

  mascotCard: {
    backgroundColor: '#047857', borderRadius: 24, padding: 24,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    shadowColor: '#047857', shadowOpacity: 0.2, shadowRadius: 12, elevation: 3,
  },
  mascotImage: { width: 64, height: 64 },
  mascotTextContainer: { flex: 1 },
  mascotGreeting: { fontSize: 16, fontWeight: '800', color: '#A7F3D0', marginBottom: 4 },
  mascotMessage: { fontSize: 13, color: '#FFFFFF', lineHeight: 20 },

  inputWrapper: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: isDark ? '#CBD5E1' : '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: {
    backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderWidth: 1, borderColor: isDark ? '#475569' : '#E2E8F0',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: isDark ? '#F1F5F9' : '#1E293B', fontWeight: '500',
  },
  primaryBtn: { backgroundColor: '#059669', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  outlineBtn: { backgroundColor: isDark ? '#334155' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? '#64748B' : '#CBD5E1', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  outlineBtnText: { color: isDark ? '#F1F5F9' : '#475569', fontSize: 14, fontWeight: '700' },

  settingsGroup: { marginBottom: 32 },
  settingsGroupTitle: { fontSize: 13, fontWeight: '800', color: isDark ? '#94A3B8' : '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16, marginLeft: 16 },
  settingsBlock: {
    backgroundColor: isDark ? '#334155' : '#FFFFFF', borderRadius: 28, overflow: 'hidden',
    shadowColor: isDark ? '#000000' : '#64748B', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: isDark ? 0.2 : 0.06, shadowRadius: 36, elevation: 6,
    borderWidth: 1, borderColor: isDark ? '#475569' : 'rgba(241, 245, 249, 0.8)',
  },
  passwordSection: { padding: 24, borderBottomWidth: 1, borderBottomColor: isDark ? '#475569' : '#F8FAFC' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 20, paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: isDark ? '#475569' : '#F8FAFC',
  },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  settingIconBox: { 
    width: 48, height: 48, borderRadius: 18, 
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: isDark ? '#475569' : '#FFFFFF',
  },
  settingIcon: { fontSize: 24 },
  settingTitle: { fontSize: 16, fontWeight: '700', color: isDark ? '#F8FAFC' : '#0F172A' },
  settingSubtitle: { fontSize: 13, color: isDark ? '#CBD5E1' : '#94A3B8', marginTop: 2 },
  proBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  proBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  input: {
    backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderWidth: 1, borderColor: isDark ? '#475569' : '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: isDark ? '#F1F5F9' : '#1E293B', fontWeight: '500',
  },
  settingRowRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingValue: { fontSize: 14, fontWeight: '600', color: isDark ? '#F1F5F9' : '#64748B', backgroundColor: isDark ? '#475569' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  chevronBox: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  settingChevron: { fontSize: 22, color: isDark ? '#94A3B8' : '#CBD5E1', fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: isDark ? '#F1F5F9' : '#1E293B' },
  modalTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#E2E8F0', marginBottom: 16 },
  modalTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  modalTabActive: { borderBottomWidth: 2, borderBottomColor: '#059669' },
  modalTabText: { fontSize: 14, fontWeight: '600', color: isDark ? '#64748B' : '#94A3B8' },
  modalTabTextActive: { color: '#059669' },
  modalEmpty: { padding: 40, alignItems: 'center' },
  modalEmptyText: { color: isDark ? '#64748B' : '#94A3B8', textAlign: 'center', marginTop: 20 },
  friendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F1F5F9' },
  friendRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  friendName: { fontSize: 15, fontWeight: '600', color: isDark ? '#F1F5F9' : '#1E293B' },
  friendActions: { flexDirection: 'row', gap: 8 },

  settingOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: isDark ? '#334155' : '#E2E8F0',
    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
    marginBottom: 10,
    cursor: 'pointer' as any,
  },
  settingOptionCardActive: {
    borderColor: '#10B981',
    backgroundColor: isDark ? 'rgba(6, 78, 59, 0.25)' : '#ECFDF5',
  },
  settingOptionIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  settingOptionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: isDark ? '#F1F5F9' : '#1E293B',
  },
  settingOptionDesc: {
    fontSize: 12,
    color: isDark ? '#94A3B8' : '#64748B',
    marginTop: 2,
  },
});
