import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeAvatarUrl } from '../services/api';

export interface MenuDrawerModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
  currentTab?: string;
}

export const MenuDrawerModal: React.FC<MenuDrawerModalProps> = ({
  visible,
  onClose,
  onNavigateToTab,
  currentTab = 'home',
}) => {
  const { user: authUser, logout } = useAuth();
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const { height: screenHeight } = useWindowDimensions();

  const drawerHeight = useMemo(() => {
    return Math.min(640, Math.max(440, Math.round(screenHeight * 0.8)));
  }, [screenHeight]);

  const displayName = authUser?.fullName || (isVi ? 'Người dùng Monett' : 'Monett User');
  const avatarUri = normalizeAvatarUrl(authUser?.avatarUrl);
  const [imageError, setImageError] = React.useState(false);

  const handleSelectTab = (tab: string) => {
    onClose();
    if (onNavigateToTab) {
      onNavigateToTab(tab);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      isVi ? 'Đăng xuất' : 'Log out',
      isVi ? 'Bạn có chắc chắn muốn đăng xuất tài khoản?' : 'Are you sure you want to log out?',
      [
        { text: isVi ? 'Hủy' : 'Cancel', style: 'cancel' },
        {
          text: isVi ? 'Đăng xuất' : 'Log out',
          style: 'destructive',
          onPress: () => {
            onClose();
            logout();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.drawerOverlay}>
        {/* Backdrop tối mờ xung quanh */}
        <TouchableOpacity
          style={styles.drawerBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Khung Hộp Thoại Nổi Ở Giữa (Centered Rounded Card) */}
        <View style={[styles.drawerContainer, { height: drawerHeight }]}>
          {/* Header: "Tất cả chức năng" + Nút đóng X tròn */}
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerHeaderTitle}>
              {isVi ? 'Tất cả chức năng' : 'All Features'}
            </Text>
            <TouchableOpacity
              style={styles.drawerCloseBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={isVi ? 'Đóng' : 'Close'}
            >
              <Ionicons name="close" size={18} color="#52525B" />
            </TouchableOpacity>
          </View>

          {/* Danh sách các chức năng (cuộn mượt mà) */}
          <ScrollView
            style={styles.drawerMenuList}
            contentContainerStyle={styles.drawerMenuContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Tổng quan */}
            <TouchableOpacity
              style={[
                styles.drawerMenuItem,
                currentTab === 'home' && styles.drawerMenuItemActive,
              ]}
              onPress={() => handleSelectTab('home')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="home-outline"
                size={20}
                color={currentTab === 'home' ? '#064E3B' : '#27272A'}
                style={styles.drawerMenuIcon}
              />
              <Text
                style={[
                  styles.drawerMenuText,
                  currentTab === 'home' && styles.drawerMenuTextActive,
                ]}
              >
                {isVi ? 'Tổng quan' : 'Overview'}
              </Text>
            </TouchableOpacity>

            {/* 2. Bảng tin */}
            <TouchableOpacity
              style={[
                styles.drawerMenuItem,
                currentTab === 'feed' && styles.drawerMenuItemActive,
              ]}
              onPress={() => handleSelectTab('feed')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="newspaper-outline"
                size={20}
                color={currentTab === 'feed' ? '#064E3B' : '#27272A'}
                style={styles.drawerMenuIcon}
              />
              <Text
                style={[
                  styles.drawerMenuText,
                  currentTab === 'feed' && styles.drawerMenuTextActive,
                ]}
              >
                {isVi ? 'Bảng tin' : 'Feed'}
              </Text>
            </TouchableOpacity>

            {/* 3. Báo cáo */}
            <TouchableOpacity
              style={[
                styles.drawerMenuItem,
                currentTab === 'analytics' && styles.drawerMenuItemActive,
              ]}
              onPress={() => handleSelectTab('analytics')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="pie-chart-outline"
                size={20}
                color={currentTab === 'analytics' ? '#064E3B' : '#27272A'}
                style={styles.drawerMenuIcon}
              />
              <Text
                style={[
                  styles.drawerMenuText,
                  currentTab === 'analytics' && styles.drawerMenuTextActive,
                ]}
              >
                {isVi ? 'Báo cáo' : 'Reports'}
              </Text>
            </TouchableOpacity>

            {/* 4. Ngân sách */}
            <TouchableOpacity
              style={[
                styles.drawerMenuItem,
                (currentTab === 'income' || currentTab === 'budget') && styles.drawerMenuItemActive,
              ]}
              onPress={() => handleSelectTab('income')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="wallet-outline"
                size={20}
                color={currentTab === 'income' || currentTab === 'budget' ? '#064E3B' : '#27272A'}
                style={styles.drawerMenuIcon}
              />
              <Text
                style={[
                  styles.drawerMenuText,
                  (currentTab === 'income' || currentTab === 'budget') && styles.drawerMenuTextActive,
                ]}
              >
                {isVi ? 'Ngân sách' : 'Budget'}
              </Text>
            </TouchableOpacity>

            {/* 5. Tích lũy */}
            <TouchableOpacity
              style={[
                styles.drawerMenuItem,
                currentTab === 'savings' && styles.drawerMenuItemActive,
              ]}
              onPress={() => handleSelectTab('savings')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="flag-outline"
                size={20}
                color={currentTab === 'savings' ? '#064E3B' : '#27272A'}
                style={styles.drawerMenuIcon}
              />
              <Text
                style={[
                  styles.drawerMenuText,
                  currentTab === 'savings' && styles.drawerMenuTextActive,
                ]}
              >
                {isVi ? 'Tích lũy' : 'Savings'}
              </Text>
            </TouchableOpacity>

            {/* 6. Định kỳ */}
            <TouchableOpacity
              style={[
                styles.drawerMenuItem,
                currentTab === 'recurring' && styles.drawerMenuItemActive,
              ]}
              onPress={() => handleSelectTab('recurring')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="sync-outline"
                size={20}
                color={currentTab === 'recurring' ? '#064E3B' : '#27272A'}
                style={styles.drawerMenuIcon}
              />
              <Text
                style={[
                  styles.drawerMenuText,
                  currentTab === 'recurring' && styles.drawerMenuTextActive,
                ]}
              >
                {isVi ? 'Định kỳ' : 'Recurring'}
              </Text>
            </TouchableOpacity>

            {/* 7. Sự kiện */}
            <TouchableOpacity
              style={[
                styles.drawerMenuItem,
                currentTab === 'events' && styles.drawerMenuItemActive,
              ]}
              onPress={() => handleSelectTab('events')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={currentTab === 'events' ? '#064E3B' : '#27272A'}
                style={styles.drawerMenuIcon}
              />
              <Text
                style={[
                  styles.drawerMenuText,
                  currentTab === 'events' && styles.drawerMenuTextActive,
                ]}
              >
                {isVi ? 'Sự kiện' : 'Events'}
              </Text>
            </TouchableOpacity>

            {/* 8. Sổ ghi nợ */}
            <TouchableOpacity
              style={[
                styles.drawerMenuItem,
                currentTab === 'debt' && styles.drawerMenuItemActive,
              ]}
              onPress={() => handleSelectTab('debt')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="book-outline"
                size={20}
                color={currentTab === 'debt' ? '#064E3B' : '#27272A'}
                style={styles.drawerMenuIcon}
              />
              <Text
                style={[
                  styles.drawerMenuText,
                  currentTab === 'debt' && styles.drawerMenuTextActive,
                ]}
              >
                {isVi ? 'Sổ ghi nợ' : 'Debt Book'}
              </Text>
            </TouchableOpacity>

            {/* PHÂN MỤC: CỘNG TÁC */}
            <Text style={styles.drawerSectionTitle}>
              {isVi ? 'CỘNG TÁC' : 'COLLABORATION'}
            </Text>

            {/* 9. Bạn bè */}
            <TouchableOpacity
              style={[
                styles.drawerMenuItem,
                currentTab === 'friends' && styles.drawerMenuItemActive,
              ]}
              onPress={() => handleSelectTab('friends')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={currentTab === 'friends' ? '#064E3B' : '#27272A'}
                style={styles.drawerMenuIcon}
              />
              <Text
                style={[
                  styles.drawerMenuText,
                  currentTab === 'friends' && styles.drawerMenuTextActive,
                ]}
              >
                {isVi ? 'Bạn bè' : 'Friends'}
              </Text>
            </TouchableOpacity>

            {/* 10. Trò chuyện */}
            <TouchableOpacity
              style={[
                styles.drawerMenuItem,
                (currentTab === 'calendar' || currentTab === 'messages') && styles.drawerMenuItemActive,
              ]}
              onPress={() => handleSelectTab('calendar')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="chatbubble-outline"
                size={20}
                color={currentTab === 'calendar' || currentTab === 'messages' ? '#064E3B' : '#27272A'}
                style={styles.drawerMenuIcon}
              />
              <Text
                style={[
                  styles.drawerMenuText,
                  (currentTab === 'calendar' || currentTab === 'messages') && styles.drawerMenuTextActive,
                ]}
              >
                {isVi ? 'Trò chuyện' : 'Chat'}
              </Text>
            </TouchableOpacity>

            {/* PHÂN MỤC: TÀI KHOẢN */}
            <Text style={styles.drawerSectionTitle}>
              {isVi ? 'TÀI KHOẢN' : 'ACCOUNT'}
            </Text>

            {/* 11. Cài đặt */}
            <TouchableOpacity
              style={[
                styles.drawerMenuItem,
                currentTab === 'profile' && styles.drawerMenuItemActive,
              ]}
              onPress={() => handleSelectTab('profile')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={currentTab === 'profile' ? '#064E3B' : '#27272A'}
                style={styles.drawerMenuIcon}
              />
              <Text
                style={[
                  styles.drawerMenuText,
                  currentTab === 'profile' && styles.drawerMenuTextActive,
                ]}
              >
                {isVi ? 'Cài đặt' : 'Settings'}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Ở DƯỚI CÙNG: Ảnh đại diện / Chữ cái, Tên, Gmail, và Nút Icon Đăng xuất */}
          <View style={styles.drawerFooter}>
            <View style={styles.drawerUserProfile}>
              {avatarUri && !imageError ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.drawerUserAvatar}
                  onError={() => setImageError(true)}
                />
              ) : (
                <View
                  style={[
                    styles.drawerUserAvatar,
                    styles.drawerUserAvatarFallback,
                    { backgroundColor: '#E4E4E7' },
                  ]}
                >
                  <Text style={styles.drawerUserAvatarText}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.drawerUserInfo}>
                <Text style={styles.drawerUserName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.drawerUserEmail} numberOfLines={1}>
                  {authUser?.email || 'tfongcs05@gmail.com'}
                </Text>
              </View>
            </View>

            {/* Nút Icon Đăng xuất hình tròn */}
            <TouchableOpacity
              style={styles.drawerLogoutBtn}
              onPress={handleLogout}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel={isVi ? 'Đăng xuất tài khoản' : 'Log out'}
            >
              <Ionicons name="log-out-outline" size={19} color="#52525B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  drawerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 28,
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  drawerContainer: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 24,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexShrink: 0,
  },
  drawerHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18181B',
    letterSpacing: -0.3,
  },
  drawerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  drawerMenuList: {
    flex: 1,
  },
  drawerMenuContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  drawerSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 6,
    marginLeft: 14,
    textTransform: 'uppercase',
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    marginBottom: 2,
    backgroundColor: 'transparent',
  },
  drawerMenuItemActive: {
    backgroundColor: '#A7F3D0', // Màu xanh mint pastel
  },
  drawerMenuIcon: {
    marginRight: 14,
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#27272A',
    letterSpacing: -0.2,
  },
  drawerMenuTextActive: {
    fontWeight: '700',
    color: '#064E3B',
  },
  drawerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
  },
  drawerUserProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  drawerUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  drawerUserAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerUserAvatarText: {
    color: '#18181B',
    fontWeight: '800',
    fontSize: 16,
  },
  drawerUserInfo: {
    flex: 1,
  },
  drawerUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18181B',
    marginBottom: 2,
  },
  drawerUserEmail: {
    fontSize: 11.5,
    color: '#71717A',
  },
  drawerLogoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

