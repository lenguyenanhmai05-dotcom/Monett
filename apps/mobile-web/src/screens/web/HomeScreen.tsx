import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FROGS } from '../../../assets/frogIndex';
import { UserProfileHeader } from '../../components/UserProfileHeader';
import { SocialPostComposer } from '../../components/SocialPostComposer';
import { IntegratedBudgetBar } from '../../components/IntegratedBudgetBar';
import { RecentTransactionsWidget } from '../../components/RecentTransactionsWidget';
import { TransactionTableWidget } from '../../components/TransactionTableWidget';
import { getBudgetApi, BudgetData } from '../../services/api';

export const HomeScreen: React.FC<{ onNavigateToTab?: (tab: any) => void }> = ({ onNavigateToTab }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const styles = getStyles(isDark, colors);

  const [selectedDay, setSelectedDay] = useState<number>(18);
  const [showStreakShield, setShowStreakShield] = useState(true);

  const displayName = user?.fullName || 'Ánh Mai';
  const [imageError, setImageError] = useState(false);

  const [frogSeed] = useState(() => Math.floor(Math.random() * FROGS.length));

  const [budget, setBudget] = useState<BudgetData>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    limit: 22000000,
    spent: 6180000,
    remaining: 15820000,
    spentPercent: 28.1,
    remainingPercent: 71.9,
    status: 'safe',
    payday: 5,
    daysUntilPayday: 12,
    currency: 'VND',
  });

  useEffect(() => {
    let isMounted = true;
    getBudgetApi()
      .then((data) => {
        if (isMounted && data && data.limit) {
          setBudget(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: '#FEE2E2', text: '#B91C1C' }, // Red
      { bg: '#FEF3C7', text: '#B45309' }, // Amber
      { bg: '#DCFCE7', text: '#047857' }, // Green
      { bg: '#E0F2FE', text: '#0369A1' }, // Blue
      { bg: '#EDE9FE', text: '#6D28D9' }, // Purple
      { bg: '#FCE7F3', text: '#BE185D' }, // Pink
      { bg: '#F3F4F6', text: '#374151' }, // Gray
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const avatarColor = getAvatarColor(user?.fullName || user?.email || 'U');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ===================== PHẦN ĐẦU TRANG TỔNG QUAN (LIỀN MẠCH, THÔNG THOÁNG, KHÔNG ĐÓNG KHUNG) ===================== */}
      <View style={styles.overviewSection}>
        {/* 1. Header: Avatar + Tên + Badge + Streak liên tục */}
        <UserProfileHeader />

        {/* 2. Tổng Tài Sản & Hạn Mức Tháng (Tích hợp liền mạch, không chia ô tách biệt) */}
        <IntegratedBudgetBar
          budget={budget}
          onBudgetUpdated={setBudget}
          language={language as any}
        />

        {/* 3. Khung chia sẻ khoảnh khắc mạng xã hội (Facebook Composer Style) */}
        <SocialPostComposer user={user} />
      </View>

      {/* ===================== ROW 2: STREAK RỰC RỠ (FULL WIDTH) ===================== */}
      <View style={[styles.card, styles.fullWidthCard]}>
        <View style={styles.streakCardHeader}>
          <View style={styles.streakTitleBlock}>
            <View style={[styles.streakFlameTeardrop, { overflow: 'visible', justifyContent: 'center', alignItems: 'center' }]}>
              <Image
                source={FROGS[frogSeed]}
                style={[{ width: 44, height: 44 }, styles.shadow3D]}
                resizeMode="contain"
              />
            </View>
            <View>
              <View style={styles.streakBadgeRow}>
                <View style={styles.streakLabelBadge}>
                  <Text style={styles.streakLabelText}>
                    🔥 {language === 'vi' ? 'STREAK RỰC RỠ' : 'ACTIVE STREAK'}
                  </Text>
                </View>
                <Text style={styles.streakTimeAgo}>
                  {language === 'vi' ? 'Cập nhật 2 giờ trước' : 'Updated 2h ago'}
                </Text>
              </View>
              <Text style={styles.streakMainTitle}>
                {language === 'vi' ? (
                  <>
                    Chuỗi <Text style={styles.streakHighlightNum}>18</Text> Ngày Ghi Chép Liên Tục
                  </>
                ) : (
                  <>
                    <Text style={styles.streakHighlightNum}>18-Day</Text> Continuous Moment Streak
                  </>
                )}
              </Text>
            </View>
          </View>

          <View style={styles.multiplierCard}>
            <Text style={styles.multiplierMedal}>🎖️</Text>
            <View>
              <Text style={styles.multiplierLabel}>
                {language === 'vi' ? 'Hệ số tích lũy' : 'Bonus Multiplier'}
              </Text>
              <Text style={styles.multiplierValue}>
                x1.8{' '}
                <Text style={styles.multiplierDesc}>
                  {language === 'vi' ? 'Điểm thưởng' : 'Reward pts'}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.streakRecordNotice}>
          {language === 'vi'
            ? `Kỷ lục cá nhân cao nhất của ${displayName}: 24 ngày liên tiếp. Giữ vững phong độ nhé!`
            : `Personal best: 24 consecutive days. Keep up the brilliant momentum!`}
        </Text>

        {/* 30-Day Grid */}
        <View style={styles.streakJourneyBox}>
          <View style={styles.journeyHeader}>
            <Text style={styles.journeyTitle}>
              📊 {language === 'vi' ? 'Hành Trình 30 Ngày Gần Nhất' : '30-Day Activity Journey'}
            </Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
                <Text style={styles.legendText}>
                  {language === 'vi' ? 'Đã hoàn thành' : 'Completed'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.legendText}>
                  {language === 'vi' ? 'Hôm nay' : 'Today'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#E2E8F0' }]} />
                <Text style={styles.legendText}>
                  {language === 'vi' ? 'Chưa ghi' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>

          {/* Matrix 30 ngày (3 hàng x 10 cột) */}
          <View style={styles.daysMatrix}>
            {Array.from({ length: 30 }, (_, i) => {
              const dayNum = i + 1;
              const isCompleted = dayNum < 18;
              const isToday = dayNum === 18;
              const isSelected = selectedDay === dayNum;

              return (
                <TouchableOpacity
                  key={dayNum}
                  style={[
                    styles.dayCell,
                    isCompleted && styles.dayCellCompleted,
                    isToday && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                  ]}
                  onPress={() => setSelectedDay(dayNum)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayNumText,
                      isToday && styles.dayNumTextToday,
                      isCompleted && styles.dayNumTextCompleted,
                    ]}
                  >
                    {dayNum < 10 ? `0${dayNum}` : dayNum}
                  </Text>
                  <Text style={styles.dayStatusIcon}>
                    {isCompleted ? '🔥' : isToday ? '📈' : dayNum === 30 ? '🏁' : '○'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Footer Lá Chắn Streak */}
        <View style={styles.streakFooter}>
          <Text style={styles.streakShieldText}>
            🛡️{' '}
            {language === 'vi'
              ? 'Được bảo vệ bởi Lá Chắn Streak (Còn 1 lần dùng)'
              : 'Protected by Streak Shield (1 use remaining)'}
          </Text>
          <TouchableOpacity>
            <Text style={styles.streakRuleLink}>
              {language === 'vi' ? 'Tìm hiểu luật Streak >' : 'Streak rules >'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===================== ROW 3: GAMIFICATION & CẤP ĐỘ (FULL WIDTH) ===================== */}
      <View style={[styles.card, styles.fullWidthCard]}>
        <View style={styles.xpCardHeader}>
          <View style={styles.levelBadgeRow}>
            <View style={styles.lvlGreenBadge}>
              <Text style={styles.lvlGreenBadgeText}>LV. 4</Text>
            </View>
            <Text style={styles.levelTitle}>
              {language === 'vi'
                ? 'Hiệp Sĩ Quản Lý Ngân Sách'
                : 'Budget Knight Commander'}
            </Text>
          </View>
          <View style={styles.xpProgressBlock}>
            <Text style={styles.xpLabel}>
              {language === 'vi' ? 'Điểm kinh nghiệm (XP):' : 'Experience Points (XP):'}{' '}
              <Text style={styles.boldText}>850 / 1.000 XP</Text>
            </Text>
            <View style={styles.xpProgressBarTrack}>
              <View style={[styles.xpProgressBarFill, { width: '85%' }]} />
            </View>
            <Text style={styles.xpNextText}>
              {language === 'vi'
                ? '+150 XP nữa để nhận Huy hiệu Vàng'
                : '+150 XP to unlock Gold Badge'}
            </Text>
          </View>
        </View>

        <Text style={styles.levelSubNotice}>
          {language === 'vi'
            ? 'Bạn đã hoàn thành 85% hành trình để mở khóa danh xưng Đại Sứ Thịnh Vượng (Level 5)'
            : 'You have completed 85% of the journey toward Prosperity Ambassador (Level 5)'}
        </Text>

        {/* 4 Badges */}
        <View style={styles.badgesRow}>
          {/* Badge 1 */}
          <View style={styles.badgeCard}>
            <View style={[styles.badgeIconSquare, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.badgeEmoji}>🐷</Text>
            </View>
            <View style={styles.badgeContent}>
              <View style={[styles.tierPill, { backgroundColor: '#FEF08A' }]}>
                <Text style={styles.tierPillText}>
                  {language === 'vi' ? 'Hạng Vàng' : 'Gold Tier'}
                </Text>
              </View>
              <Text style={styles.badgeName}>
                {language === 'vi' ? 'Vua Tiết Kiệm Tuần' : 'Weekly Saving King'}
              </Text>
              <Text style={styles.badgeDesc}>
                {language === 'vi'
                  ? 'Giữ chi tiêu dưới hạn mức 4 tuần liên tiếp.'
                  : 'Kept spending below limit for 4 consecutive weeks.'}
              </Text>
              <Text style={styles.badgeAchieved}>
                ✓ {language === 'vi' ? 'Đã đạt' : 'Achieved'}
              </Text>
            </View>
          </View>

          {/* Badge 2 */}
          <View style={styles.badgeCard}>
            <View style={[styles.badgeIconSquare, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.badgeEmoji}>🖼️</Text>
            </View>
            <View style={styles.badgeContent}>
              <View style={[styles.tierPill, { backgroundColor: '#D1FAE5' }]}>
                <Text style={styles.tierPillText}>52 / 50 Ảnh</Text>
              </View>
              <Text style={styles.badgeName}>
                {language === 'vi' ? 'Nhiếp Ảnh Gia Ví Tiền' : 'Wallet Photographer'}
              </Text>
              <Text style={styles.badgeDesc}>
                {language === 'vi'
                  ? 'Ghi nhận hơn 50 khoảnh khắc tài chính bằng ảnh thật.'
                  : 'Recorded 50+ financial moments with real photos.'}
              </Text>
              <Text style={styles.badgeAchieved}>
                ✓ {language === 'vi' ? 'Đã đạt' : 'Achieved'}
              </Text>
            </View>
          </View>

          {/* Badge 3 */}
          <View style={styles.badgeCard}>
            <View style={[styles.badgeIconSquare, { backgroundColor: '#EEF2FF' }]}>
              <Text style={styles.badgeEmoji}>⚖️</Text>
            </View>
            <View style={styles.badgeContent}>
              <View style={[styles.tierPill, { backgroundColor: '#E0E7FF' }]}>
                <Text style={styles.tierPillText}>
                  {language === 'vi' ? 'Kỷ Luật Cao' : 'High Discipline'}
                </Text>
              </View>
              <Text style={styles.badgeName}>
                {language === 'vi' ? 'Người Quản Lý Tự Chủ' : 'Self-Mastery Manager'}
              </Text>
              <Text style={styles.badgeDesc}>
                {language === 'vi'
                  ? 'Không bội chi danh mục Ẩm thực & Giải trí trong 60 ngày.'
                  : 'No overspending in Food & Fun for 60 days.'}
              </Text>
              <Text style={styles.badgeAchieved}>
                ✓ {language === 'vi' ? 'Đã đạt' : 'Achieved'}
              </Text>
            </View>
          </View>

          {/* Badge 4 (Locked) */}
          <View style={[styles.badgeCard, styles.lockedBadgeCard]}>
            <View style={[styles.badgeIconSquare, { backgroundColor: '#F1F5F9' }]}>
              <Text style={styles.badgeEmoji}>🔒</Text>
            </View>
            <View style={styles.badgeContent}>
              <View style={[styles.tierPill, { backgroundColor: '#F1F5F9' }]}>
                <Text style={styles.tierPillText}>
                  {language === 'vi' ? 'Khóa (65%)' : 'Locked (65%)'}
                </Text>
              </View>
              <Text style={[styles.badgeName, { color: '#64748B' }]}>
                {language === 'vi' ? 'Đại Phú Hộ An Yên' : 'Serene Tycoon'}
              </Text>
              <Text style={styles.badgeDesc}>
                {language === 'vi'
                  ? 'Đạt khoản tích lũy 100.000.000 đ đầu tiên cùng Monett.'
                  : 'Accumulate first 100,000,000 VND saved with Monett.'}
              </Text>
              <View style={styles.miniProgressBar}>
                <View style={[styles.miniProgressFill, { width: '65%' }]} />
              </View>
            </View>
          </View>
        </View>
      </View>


      {/* ===================== ROW 4: GIAO DỊCH GẦN ĐÂY ===================== */}
      <RecentTransactionsWidget
        language={language as any}
        onViewAll={() => onNavigateToTab && onNavigateToTab('transactions')}
      />

      {/* ===================== ROW 5: BẢNG GIAO DỊCH CHI TIẾT (TRANSACTION TABLE) ===================== */}
      <TransactionTableWidget language={language as any} />
    </ScrollView>
  );
};

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    maxWidth: 1680,
    width: '100%',
    alignSelf: 'center',
    gap: 24,
  },
  overviewSection: {
    width: '100%',
    gap: 14,
    paddingBottom: 6,
  },

  gridRow: {
    gap: 24,
  },
  rowDesktop: {
    flexDirection: 'row',
  },
  rowMobile: {
    flexDirection: 'column',
  },
  flex1: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: isDark ? '#000000' : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 14,
    elevation: 3,
  },
  fullWidthCard: {
    width: '100%',
  },

  // ==================== PROFILE CARD STYLES ====================
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 68,
    height: 68,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#047857',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraIcon: {
    fontSize: 11,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  pioneerBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 14,
  },
  pioneerBadgeText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  userSubText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  userIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeDotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: isDark ? '#334155' : '#F8FAFC',
  },
  uploadPhotoIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  uploadPhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },

  // Slogan box (Editorial Pullquote Style - No Enclosing Box)


  // ==================== CASHFLOW CARD STYLES ====================
  cashflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cashflowTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankIcon: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  settingsBtn: {
    padding: 6,
  },
  settingsIcon: {
    fontSize: 18,
  },
  salaryBox: {
    backgroundColor: isDark ? '#334155' : '#F8FAFC',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  salaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  salaryAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -0.5,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  updateSalaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  updateSalaryIcon: {
    fontSize: 14,
  },
  updateSalaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  paydayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 18,
  },
  paydayNumberBox: {
    width: 44,
    height: 44,
    backgroundColor: '#FDE68A',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paydayNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#92400E',
  },
  paydayInfo: {
    flex: 1,
  },
  paydayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  paydayCycle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  daysRemainingBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  daysRemainingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  safeBudgetSection: {
    gap: 8,
  },
  safeBudgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  safeBudgetTitle: {
    fontSize: 13,
    color: '#475569',
  },
  boldText: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#047857',
    borderRadius: 5,
  },

  // ==================== STREAK CARD STYLES ====================
  streakCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  streakTitleBlock: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flex: 1,
  },
  streakFlameTeardrop: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFEDD5',
    borderWidth: 2,
    borderColor: '#FB923C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  streakFlameFrogImg: {
    width: 40,
    height: 40,
  },
  streakBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  streakLabelBadge: {
    backgroundColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  streakLabelText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#C2410C',
  },
  streakTimeAgo: {
    fontSize: 11,
    color: '#94A3B8',
  },
  streakMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  streakHighlightNum: {
    color: '#D97706',
    fontSize: 22,
    fontWeight: '900',
  },
  multiplierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 120,
    gap: 8,
  },
  multiplierMedal: {
    fontSize: 22,
  },
  multiplierLabel: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
  },
  multiplierValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#B45309',
  },
  multiplierDesc: {
    fontSize: 10,
    color: '#92400E',
  },
  streakRecordNotice: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  streakJourneyBox: {
    backgroundColor: isDark ? '#334155' : '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  journeyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
  },
  daysMatrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  dayCell: {
    width: '9%',
    aspectRatio: 0.9,
    backgroundColor: isDark ? '#334155' : '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  dayCellCompleted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  dayCellToday: {
    borderColor: '#92400E',
    borderWidth: 2,
    backgroundColor: '#FFFBEB',
  },
  dayCellSelected: {
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dayNumText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  dayNumTextCompleted: {
    color: '#065F46',
  },
  dayNumTextToday: {
    color: '#92400E',
    fontWeight: '900',
  },
  dayStatusIcon: {
    fontSize: 11,
  },
  streakFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  streakShieldText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  streakRuleLink: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '700',
  },



  // ==================== GAMIFICATION ROW 3 STYLES ====================
  xpCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  levelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lvlGreenBadge: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lvlGreenBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#065F46',
  },
  levelTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  levelSubNotice: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
  },
  xpProgressBlock: {
    minWidth: 260,
    gap: 4,
  },
  xpLabel: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'right',
  },
  xpProgressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpProgressBarFill: {
    height: '100%',
    backgroundColor: '#047857',
    borderRadius: 4,
  },
  xpNextText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '700',
    textAlign: 'right',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  badgeCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: isDark ? '#334155' : '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  lockedBadgeCard: {
    opacity: 0.75,
  },
  badgeIconSquare: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeContent: {
    flex: 1,
    gap: 3,
  },
  tierPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#854D0E',
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  badgeDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  badgeAchieved: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  miniProgressBar: {
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    marginTop: 4,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  shadow3D: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
});
