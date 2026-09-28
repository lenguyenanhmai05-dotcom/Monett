import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { MobileCameraScreen } from './MobileCameraScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type MobileTab = 'camera' | 'home' | 'journal' | 'profile';

export interface TransactionItem {
  id: string;
  title: string;
  category: string;
  categoryIcon: string;
  amount: number;
  time: string;
  note?: string;
  photoUri?: string;
  type: 'expense' | 'income';
}

const INITIAL_TRANSACTIONS: TransactionItem[] = [
  {
    id: 'tx-1',
    title: "Pizza 4P's Bến Thành",
    category: 'Ẩm thực',
    categoryIcon: '🍕',
    amount: -450000,
    time: '12:35',
    note: 'Ăn trưa cùng nhóm bạn thân',
    photoUri: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop',
    type: 'expense',
  },
  {
    id: 'tx-2',
    title: 'Cà phê sáng Highlands',
    category: 'Đồ uống',
    categoryIcon: '☕',
    amount: -65000,
    time: '08:30',
    note: 'Năng lượng chạy deadline',
    photoUri: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop',
    type: 'expense',
  },
  {
    id: 'tx-3',
    title: 'GrabCar gặp đối tác',
    category: 'Di chuyển',
    categoryIcon: '🚗',
    amount: -85000,
    time: '14:20',
    note: 'Gặp gỡ khách hàng Quận 1',
    type: 'expense',
  },
  {
    id: 'tx-4',
    title: 'Siêu thị WinMart',
    category: 'Nhu yếu phẩm',
    categoryIcon: '🛍️',
    amount: -920000,
    time: '18:15',
    note: 'Mua sắm thực phẩm cho tuần',
    type: 'expense',
  },
  {
    id: 'tx-5',
    title: 'Thưởng dự án Freelance',
    category: 'Thu nhập phụ',
    categoryIcon: '💰',
    amount: 1200000,
    time: '10:00',
    note: 'Thanh toán hoàn tất thiết kế UI',
    type: 'income',
  },
];

const WEEK_DAYS = [
  { label: 'Th 2', date: 14 },
  { label: 'Th 3', date: 15 },
  { label: 'Th 4', date: 16 },
  { label: 'Th 5', date: 17 },
  { label: 'Th 6', date: 18 },
  { label: 'Th 7', date: 19 },
  { label: 'CN', date: 20 },
];

export const MobileHomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const isVi = language === 'vi';

  // Giao diện chính mở trực tiếp Camera theo đúng yêu cầu người dùng
  const [activeTab, setActiveTab] = useState<MobileTab>('camera');
  const [selectedDate, setSelectedDate] = useState<number>(18);
  const [transactions, setTransactions] = useState<TransactionItem[]>(INITIAL_TRANSACTIONS);

  // Modal xem ảnh phóng to
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  // Modal Thêm Chi Tiêu Bằng Tay
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Ẩm thực');
  const [newNote, setNewNote] = useState('');

  // Tên hiển thị người dùng
  const displayName = user?.fullName || (user?.email ? user.email.split('@')[0] : 'Mai Linh');
  const userAvatarUri =
    user?.avatarUrl ||
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop';

  const formatVND = (val: number) => {
    return Math.abs(val).toLocaleString('vi-VN') + 'đ';
  };

  // Tính toán số dư
  const totalSpent = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, cur) => acc + Math.abs(cur.amount), 0);
  const budgetLimit = 22000000;
  const remainingBudget = Math.max(0, budgetLimit - totalSpent);
  const remainingPercent = ((remainingBudget / budgetLimit) * 100).toFixed(1);

  // Xử lý lưu khoảnh khắc chi tiêu từ Camera chụp ảnh
  const handleSaveMoment = (moment: {
    photoUri: string;
    title: string;
    amount: number;
    category: string;
    note?: string;
  }) => {
    const newTx: TransactionItem = {
      id: 'tx-' + Date.now(),
      title: moment.title,
      category: moment.category,
      categoryIcon:
        moment.category === 'Ẩm thực'
          ? '🍕'
          : moment.category === 'Đồ uống'
          ? '☕'
          : moment.category === 'Mua sắm'
          ? '🛍️'
          : moment.category === 'Di chuyển'
          ? '🚗'
          : '📸',
      amount: -moment.amount,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      note: moment.note,
      photoUri: moment.photoUri,
      type: 'expense',
    };

    setTransactions((prev) => [newTx, ...prev]);
  };

  // Xử lý thêm chi tiêu bằng tay
  const handleAddTransaction = () => {
    const parsedAmount = parseInt(newAmount.replace(/[^0-9]/g, ''), 10);
    if (!newTitle.trim()) {
      Alert.alert(isVi ? 'Thiếu thông tin' : 'Missing Info', isVi ? 'Vui lòng nhập tên khoản chi.' : 'Enter title.');
      return;
    }
    if (!parsedAmount || isNaN(parsedAmount)) {
      Alert.alert(isVi ? 'Thiếu số tiền' : 'Missing Amount', isVi ? 'Vui lòng nhập số tiền hợp lệ.' : 'Enter amount.');
      return;
    }

    const newTx: TransactionItem = {
      id: 'tx-' + Date.now(),
      title: newTitle.trim(),
      category: newCategory,
      categoryIcon: newCategory === 'Ẩm thực' ? '🍕' : newCategory === 'Di chuyển' ? '🚗' : newCategory === 'Mua sắm' ? '🛍️' : '💳',
      amount: -parsedAmount,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      note: newNote.trim() || undefined,
      type: 'expense',
    };

    setTransactions([newTx, ...transactions]);
    setShowAddModal(false);
    setNewTitle('');
    setNewAmount('');
    setNewNote('');
    Alert.alert(isVi ? 'Thành công' : 'Success', isVi ? 'Đã lưu chi tiêu vào nhật ký Monett! 🎉' : 'Expense recorded!');
  };

  // =========================================================================
  // NẾU ĐANG Ở TAB CAMERA: RENDER TRỰC TIẾP GIAO DIỆN CAMERA CHỤP HÌNH LOCKET
  // =========================================================================
  if (activeTab === 'camera') {
    return (
      <MobileCameraScreen
        onNavigateTab={(tab) => {
          if (tab === 'camera') return;
          setActiveTab(tab as MobileTab);
        }}
        onOpenProfile={() => setActiveTab('profile')}
        onSaveMoment={handleSaveMoment}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* ============================================================ */}
      {/* 1. TOP HEADER BAR                                             */}
      {/* ============================================================ */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../../assets/monett-brand-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerTextGroup}>
            <Text style={styles.brandTitle}>Monett</Text>
            <Text style={styles.brandSubtitle}>
              {activeTab === 'home'
                ? isVi ? 'Trang Chủ' : 'Home'
                : activeTab === 'journal'
                ? isVi ? 'Nhật Ký Ảnh' : 'Photo Journal'
                : isVi ? 'Cá Nhân' : 'Profile'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Streak Flame Badge */}
          <View style={styles.streakBadge}>
            <Text style={styles.streakFlame}>🔥</Text>
            <Text style={styles.streakCount}>5</Text>
          </View>

          {/* User Mini Avatar */}
          <TouchableOpacity
            style={styles.avatarMiniWrap}
            onPress={() => setActiveTab('profile')}
            activeOpacity={0.8}
          >
            <Image source={{ uri: userAvatarUri }} style={styles.avatarMini} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 2. MAIN SCROLLABLE CONTENT (HOME / JOURNAL / PROFILE)        */}
      {/* ============================================================ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================== */}
        {/* TAB 1: HOME (FINANCIAL OVERVIEW & BUDGET)                   */}
        {/* ========================================================== */}
        {activeTab === 'home' && (
          <>
            {/* GREETING ROW */}
            <View style={styles.greetingSection}>
              <View style={styles.avatarBigWrapper}>
                <Image source={{ uri: userAvatarUri }} style={styles.avatarBig} />
                <View style={styles.onlineDot} />
              </View>

              <View style={styles.greetingTextCol}>
                <Text style={styles.greetingTitle}>
                  {isVi ? `Chào ${displayName}!` : `Hi ${displayName}!`} ✨
                </Text>
                <Text style={styles.greetingSubtitle}>
                  {isVi ? 'Hôm nay bạn chi tiêu thế nào?' : 'How is your spending today?'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.openCameraPill}
                onPress={() => setActiveTab('camera')}
                activeOpacity={0.8}
              >
                <Text style={styles.openCameraPillIcon}>📷</Text>
                <Text style={styles.openCameraPillText}>Chụp</Text>
              </TouchableOpacity>
            </View>

            {/* THE SIGNATURE EMERALD BUDGET CARD */}
            <View style={styles.budgetCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardHeaderIcon}>💳</Text>
                  <Text style={styles.cardHeaderTag}>
                    {isVi ? 'HẠN MỨC THÁNG 10' : 'OCTOBER BUDGET'}
                  </Text>
                </View>
                <Text style={styles.cardTotalLimit}>{formatVND(budgetLimit)}</Text>
              </View>

              <Text style={styles.cardSubLabel}>
                {isVi ? 'Số dư khả dụng tháng' : 'Monthly Available Balance'}
              </Text>
              <Text style={styles.cardMainBalance}>{formatVND(remainingBudget)}</Text>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${remainingPercent}%` as any }]} />
                </View>
                <View style={styles.progressTextRow}>
                  <Text style={styles.progressTextLeft}>
                    {isVi
                      ? `Đã chi: ${formatVND(totalSpent)} (${(100 - parseFloat(remainingPercent)).toFixed(1)}%)`
                      : `Spent: ${formatVND(totalSpent)}`}
                  </Text>
                  <Text style={styles.progressTextRight}>{remainingPercent}% còn lại</Text>
                </View>
              </View>
            </View>

            {/* WEEKLY CALENDAR STRIP */}
            <View style={styles.calendarStripContainer}>
              {WEEK_DAYS.map((day) => {
                const isSelected = selectedDate === day.date;
                return (
                  <TouchableOpacity
                    key={day.date}
                    style={[styles.calendarDayCard, isSelected && styles.calendarDayCardActive]}
                    onPress={() => setSelectedDate(day.date)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.calendarDayLabel,
                        isSelected && styles.calendarDayLabelActive,
                      ]}
                    >
                      {day.label}
                    </Text>
                    <Text
                      style={[
                        styles.calendarDayNumber,
                        isSelected && styles.calendarDayNumberActive,
                      ]}
                    >
                      {day.date}
                    </Text>
                    <Text style={styles.calendarDotIcon}>{isSelected ? '🌱' : '♡'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* MONETT SMART NOTE */}
            <View style={styles.monettNoteCard}>
              <View style={styles.monettNoteLeft}>
                <Image
                  source={require('../../../assets/adaptive-icon.png')}
                  style={styles.monettNoteFrogImg}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.monettNoteBody}>
                <Text style={styles.monettNoteTitle}>
                  {isVi ? 'Lời nhắn Monett hôm nay' : 'Monett Daily Tip'} 🌱
                </Text>
                <Text style={styles.monettNoteContent}>
                  {isVi
                    ? 'Hôm nay bạn chi tiêu trong tầm kiểm soát rất tốt. Hãy chụp lại hóa đơn các món vừa chi để lưu giữ khoảnh khắc nhé!'
                    : 'Spending is well within budget. Snap photos of your expenses to keep track of financial moments!'}
                </Text>
              </View>
            </View>

            {/* RECENT TRANSACTIONS */}
            <View style={styles.txSectionHeader}>
              <View style={styles.txTitleGroup}>
                <Text style={styles.txIcon}>📊</Text>
                <Text style={styles.txMainTitle}>
                  {isVi ? 'Nhật ký tài chính · Hôm nay' : 'Financial Log · Today'}
                </Text>
              </View>
              <View style={styles.txSummaryBadge}>
                <Text style={styles.txSummaryText}>
                  {isVi ? `${formatVND(totalSpent)} đã chi` : `${formatVND(totalSpent)} spent`}
                </Text>
              </View>
            </View>

            <View style={styles.txListContainer}>
              {transactions.map((tx) => {
                const isExpense = tx.type === 'expense';
                return (
                  <View key={tx.id} style={styles.txCardItem}>
                    {/* Thumbnail ảnh nếu có, hoặc icon danh mục */}
                    {tx.photoUri ? (
                      <TouchableOpacity
                        onPress={() => setViewingPhoto(tx.photoUri || null)}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: tx.photoUri }} style={styles.txPhotoThumb} />
                        <View style={styles.txPhotoBadge}>
                          <Text style={styles.txPhotoBadgeText}>📸</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.txCategoryCircle}>
                        <Text style={styles.txCategoryEmoji}>{tx.categoryIcon}</Text>
                      </View>
                    )}

                    <View style={styles.txInfoCol}>
                      <Text style={styles.txItemTitle} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      <View style={styles.txItemMetaRow}>
                        <Text style={styles.txItemCategory}>{tx.category}</Text>
                        <Text style={styles.txMetaDot}>•</Text>
                        <Text style={styles.txItemTime}>{tx.time}</Text>
                        {tx.note ? (
                          <>
                            <Text style={styles.txMetaDot}>•</Text>
                            <Text style={styles.txItemNote} numberOfLines={1}>
                              {tx.note}
                            </Text>
                          </>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.txAmountCol}>
                      <Text
                        style={[
                          styles.txAmountText,
                          isExpense ? styles.txAmountExpense : styles.txAmountIncome,
                        ]}
                      >
                        {isExpense ? `-${formatVND(tx.amount)}` : `+${formatVND(tx.amount)}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ========================================================== */}
        {/* TAB 2: JOURNAL (KHOẢNH KHẮC ẢNH & CHI TIÊU)                 */}
        {/* ========================================================== */}
        {activeTab === 'journal' && (
          <View style={styles.journalContainer}>
            <View style={styles.journalBanner}>
              <View style={styles.journalBannerTextCol}>
                <Text style={styles.journalBannerTitle}>Khoảnh Khắc Chi Tiêu 📸</Text>
                <Text style={styles.journalBannerSubtitle}>
                  Mỗi hóa đơn là một khoảnh khắc sống động của bạn cùng Monett
                </Text>
              </View>
              <TouchableOpacity
                style={styles.journalSnapBtn}
                onPress={() => setActiveTab('camera')}
                activeOpacity={0.85}
              >
                <Text style={styles.journalSnapBtnText}>Chụp Ảnh 📷</Text>
              </TouchableOpacity>
            </View>

            {/* Danh sách ảnh & thẻ chi tiêu */}
            <View style={styles.momentsGrid}>
              {transactions.map((tx) => (
                <View key={tx.id} style={styles.momentCard}>
                  {tx.photoUri ? (
                    <TouchableOpacity
                      onPress={() => setViewingPhoto(tx.photoUri || null)}
                      activeOpacity={0.9}
                      style={styles.momentPhotoWrap}
                    >
                      <Image source={{ uri: tx.photoUri }} style={styles.momentPhoto} />
                      <View style={styles.momentBadgePill}>
                        <Text style={styles.momentBadgeText}>{formatVND(tx.amount)}</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.momentNoPhotoWrap}>
                      <Text style={styles.momentNoPhotoIcon}>{tx.categoryIcon}</Text>
                      <TouchableOpacity
                        style={styles.momentAddPhotoBtn}
                        onPress={() => setActiveTab('camera')}
                      >
                        <Text style={styles.momentAddPhotoText}>+ Chụp ảnh</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.momentCardBody}>
                    <Text style={styles.momentCardTitle} numberOfLines={1}>
                      {tx.title}
                    </Text>
                    <View style={styles.momentMetaRow}>
                      <Text style={styles.momentMetaCategory}>{tx.category}</Text>
                      <Text style={styles.momentMetaTime}>{tx.time}</Text>
                    </View>
                    {tx.note ? (
                      <Text style={styles.momentCardNote} numberOfLines={2}>
                        "{tx.note}"
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ========================================================== */}
        {/* TAB 3: PROFILE (TÀI KHOẢN & CÀI ĐẶT)                         */}
        {/* ========================================================== */}
        {activeTab === 'profile' && (
          <View style={styles.profileContainer}>
            <View style={styles.profileHeaderCard}>
              <Image source={{ uri: userAvatarUri }} style={styles.profileLargeAvatar} />
              <Text style={styles.profileNameText}>{displayName}</Text>
              <Text style={styles.profileEmailText}>{user?.email || 'lenguyenanhmai05@gmail.com'}</Text>
              <View style={styles.profilePill}>
                <Text style={styles.profilePillText}>🌟 Monett Pioneer</Text>
              </View>
            </View>

            {/* Language Switch */}
            <View style={styles.profileActionCard}>
              <Text style={styles.profileActionLabel}>
                {isVi ? 'Ngôn ngữ hiển thị' : 'Language'}
              </Text>
              <View style={styles.langToggleRow}>
                <TouchableOpacity
                  style={[styles.langBtn, isVi && styles.langBtnActive]}
                  onPress={() => setLanguage('vi')}
                >
                  <Text style={styles.langBtnText}>🇻🇳 Tiếng Việt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.langBtn, !isVi && styles.langBtnActive]}
                  onPress={() => setLanguage('en')}
                >
                  <Text style={styles.langBtnText}>🇺🇸 English</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Button to Camera */}
            <TouchableOpacity
              style={styles.profileActionBtn}
              onPress={() => setActiveTab('camera')}
              activeOpacity={0.8}
            >
              <Text style={styles.profileActionBtnText}>📷 Mở Camera Chụp Ảnh</Text>
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                Alert.alert(
                  isVi ? 'Đăng xuất' : 'Log Out',
                  isVi ? 'Bạn có chắc muốn đăng xuất khỏi Monett?' : 'Are you sure?',
                  [
                    { text: isVi ? 'Hủy' : 'Cancel', style: 'cancel' },
                    { text: isVi ? 'Đăng xuất' : 'Log Out', style: 'destructive', onPress: logout },
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutBtnText}>🚪 {isVi ? 'Đăng xuất tài khoản' : 'Log Out'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ============================================================ */}
      {/* 3. UNIFORM BOTTOM NAVIGATION DOCK (MATCHING CAMERA DOCK)     */}
      {/* ============================================================ */}
      <View style={styles.bottomNavWrapper}>
        <View style={styles.bottomDockPill}>
          {/* 1. Trang chủ */}
          <TouchableOpacity
            style={[styles.dockItemBtn, activeTab === 'home' && styles.dockItemBtnActiveHome]}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.7}
          >
            <Text style={styles.dockItemEmoji}>🏠</Text>
          </TouchableOpacity>

          {/* 2. Camera (Active Coral-Pink Circle) */}
          <TouchableOpacity
            style={[styles.dockItemBtn, styles.dockItemBtnActiveCamera]}
            onPress={() => setActiveTab('camera')}
            activeOpacity={0.8}
          >
            <Text style={styles.dockItemCameraEmoji}>📷</Text>
          </TouchableOpacity>

          {/* 3. Nhật ký */}
          <TouchableOpacity
            style={[styles.dockItemBtn, activeTab === 'journal' && styles.dockItemBtnActiveJournal]}
            onPress={() => setActiveTab('journal')}
            activeOpacity={0.7}
          >
            <Text style={styles.dockItemEmoji}>🧾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Phóng To Ảnh */}
      <Modal visible={!!viewingPhoto} transparent animationType="fade">
        <View style={styles.photoViewBackdrop}>
          <TouchableOpacity
            style={styles.photoViewCloseBtn}
            onPress={() => setViewingPhoto(null)}
          >
            <Text style={styles.photoViewCloseText}>✕ Đóng</Text>
          </TouchableOpacity>
          {viewingPhoto && (
            <Image source={{ uri: viewingPhoto }} style={styles.photoViewFullImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // 1. TOP HEADER
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 38,
    height: 38,
    marginRight: 10,
  },
  headerTextGroup: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#064E3B',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  streakFlame: {
    fontSize: 14,
    marginRight: 3,
  },
  streakCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
  },
  avatarMiniWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#10B981',
    overflow: 'hidden',
  },
  avatarMini: {
    width: '100%',
    height: '100%',
  },

  // SCROLL CONTENT
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // GREETING
  greetingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarBigWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarBig: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  greetingTextCol: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  greetingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  openCameraPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  openCameraPillIcon: {
    fontSize: 13,
  },
  openCameraPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // BUDGET CARD
  budgetCard: {
    backgroundColor: '#064E3B',
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  cardHeaderTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 0.5,
  },
  cardTotalLimit: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D1FAE5',
  },
  cardSubLabel: {
    fontSize: 13,
    color: '#A7F3D0',
    fontWeight: '600',
  },
  cardMainBalance: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 4,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressTextLeft: {
    fontSize: 11,
    color: '#D1FAE5',
    fontWeight: '600',
  },
  progressTextRight: {
    fontSize: 11,
    color: '#6EE7B7',
    fontWeight: '800',
  },

  // CALENDAR STRIP
  calendarStripContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  calendarDayCard: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: (SCREEN_WIDTH - 40 - 36) / 7,
  },
  calendarDayCardActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  calendarDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  calendarDayLabelActive: {
    color: '#A7F3D0',
  },
  calendarDayNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  calendarDayNumberActive: {
    color: '#FFFFFF',
  },
  calendarDotIcon: {
    fontSize: 10,
    color: '#10B981',
  },

  // MONETT NOTE
  monettNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  monettNoteLeft: {
    marginRight: 12,
  },
  monettNoteFrogImg: {
    width: 36,
    height: 36,
  },
  monettNoteBody: {
    flex: 1,
  },
  monettNoteTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 3,
  },
  monettNoteContent: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 17,
  },

  // TRANSACTIONS
  txSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  txTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  txMainTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  txSummaryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  txSummaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  txListContainer: {
    gap: 10,
  },
  txCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txCategoryCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txCategoryEmoji: {
    fontSize: 20,
  },
  txPhotoThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  txPhotoBadge: {
    position: 'absolute',
    bottom: -2,
    right: 8,
    backgroundColor: '#047857',
    borderRadius: 6,
    paddingHorizontal: 2,
  },
  txPhotoBadgeText: {
    fontSize: 9,
  },
  txInfoCol: {
    flex: 1,
  },
  txItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  txItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txItemCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  txMetaDot: {
    fontSize: 10,
    color: '#CBD5E1',
    marginHorizontal: 4,
  },
  txItemTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  txItemNote: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
    flex: 1,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  txAmountExpense: {
    color: '#EF4444',
  },
  txAmountIncome: {
    color: '#10B981',
  },

  // JOURNAL TAB
  journalContainer: {
    paddingBottom: 20,
  },
  journalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#064E3B',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  journalBannerTextCol: {
    flex: 1,
    marginRight: 12,
  },
  journalBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  journalBannerSubtitle: {
    fontSize: 12,
    color: '#A7F3D0',
    lineHeight: 16,
  },
  journalSnapBtn: {
    backgroundColor: '#FB7185',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  journalSnapBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  momentsGrid: {
    gap: 14,
  },
  momentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  momentPhotoWrap: {
    height: 180,
    position: 'relative',
    backgroundColor: '#000000',
  },
  momentPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  momentBadgePill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  momentBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  momentNoPhotoWrap: {
    height: 100,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentNoPhotoIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  momentAddPhotoBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  momentAddPhotoText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  momentCardBody: {
    padding: 14,
  },
  momentCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  momentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  momentMetaCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  momentMetaTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  momentCardNote: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },

  // PROFILE TAB
  profileContainer: {
    gap: 16,
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileLargeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#10B981',
    marginBottom: 12,
  },
  profileNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  profileEmailText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  profilePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  profilePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  profileActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileActionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  langToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langBtnActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileActionBtn: {
    backgroundColor: '#047857',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  profileActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },

  // UNIFORM BOTTOM DOCK
  bottomNavWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 14 : 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#201F25',
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  dockItemBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockItemBtnActiveHome: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dockItemBtnActiveJournal: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dockItemBtnActiveCamera: {
    backgroundColor: '#FB7185',
  },
  dockItemEmoji: {
    fontSize: 20,
  },
  dockItemCameraEmoji: {
    fontSize: 20,
    color: '#FFFFFF',
  },

  // MODAL PHÓNG TO ẢNH
  photoViewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  photoViewCloseText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  photoViewFullImg: {
    width: SCREEN_WIDTH * 0.92,
    height: '75%',
  },
});
