import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';

interface HomeScreenProps {
  onNavigateToCamera?: () => void;
  onNavigateToAddExpense?: () => void;
  onNavigateToQuickSave?: () => void;
  onNavigateToDetail?: (transactionId: string) => void;
  onNavigateToAnalytics?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToCamera,
  onNavigateToAddExpense,
  onNavigateToQuickSave,
  onNavigateToDetail,
  onNavigateToAnalytics,
}) => {
  // Dữ liệu tuần mẫu (bám sát thiết kế Stitch)
  const weekDays = [
    { day: 'T2', date: '9/9', amount: '85k', image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=120&auto=format&fit=crop&q=80', active: false },
    { day: 'T3', date: '10/9', amount: '45k', image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=120&auto=format&fit=crop&q=80', active: false },
    { day: 'T4', date: '11/9', amount: '320k', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&auto=format&fit=crop&q=80', active: false },
    { day: 'T5', date: '12/9', amount: '150k', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120&auto=format&fit=crop&q=80', active: false },
    { day: 'T6', date: '13/9', amount: '65k', image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=120&auto=format&fit=crop&q=80', active: false },
    { day: 'T7', date: '14/9', amount: '120k', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=120&auto=format&fit=crop&q=80', active: false },
    { day: 'CN', date: '15/9', amount: '185k', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=120&auto=format&fit=crop&q=80', active: true },
  ];

  // Các giao dịch hôm nay
  const todayExpenses = [
    {
      id: 'tx_1',
      title: 'Bún bò Huế',
      amount: '-85.000 đ',
      time: '12:30',
      category: 'Ăn uống',
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200&auto=format&fit=crop&q=80',
    },
    {
      id: 'tx_2',
      title: 'Cà phê muối',
      amount: '-45.000 đ',
      time: '10:15',
      category: 'Cà phê',
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&auto=format&fit=crop&q=80',
    },
    {
      id: 'tx_3',
      title: 'Đổ xăng xe',
      amount: '-55.000 đ',
      time: '08:20',
      category: 'Di chuyển',
      image: 'https://images.unsplash.com/photo-1527018607912-0ab8dc7ff34c?w=200&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🐸</Text>
          </View>
          <Text style={styles.brandTitle}>Monett</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.quickSaveBtn} onPress={onNavigateToQuickSave} activeOpacity={0.8}>
            <Text style={styles.quickSaveBtnText}>⚡ Lưu nhanh</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80' }}
            style={styles.avatar}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 2. Lời chào */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingSub}>Chào buổi sáng,</Text>
          <Text style={styles.greetingName}>Bảo 👋</Text>
        </View>

        {/* 3. Daily Expense Card (Tone xanh Lục bảo Monett) */}
        <TouchableOpacity
          style={styles.dailyCard}
          activeOpacity={0.9}
          onPress={onNavigateToAnalytics}
        >
          <View style={styles.dailyCardInfo}>
            <View style={styles.dateTag}>
              <Text style={styles.dateTagText}>📅 Hôm nay, 15/09</Text>
            </View>
            <Text style={styles.dailyLabel}>Bạn đã chi</Text>
            <Text style={styles.dailyAmount}>185.000 đ</Text>
            <View style={styles.trendBadge}>
              <Text style={styles.trendText}>↓ 12% so với hôm qua</Text>
            </View>
          </View>

          <View style={styles.dailyImageWrapper}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200&auto=format&fit=crop&q=80' }}
              style={styles.dailyImage}
            />
          </View>
        </TouchableOpacity>

        {/* 4. Tổng quan tuần (Weekly Overview 7 ngày) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TUẦN NÀY</Text>
          <TouchableOpacity onPress={onNavigateToAnalytics}>
            <Text style={styles.viewAllText}>Xem tất cả ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekGrid}>
          {weekDays.map((item, index) => (
            <View
              key={index}
              style={[
                styles.dayColumn,
                item.active && styles.dayColumnActive,
              ]}
            >
              <Text style={[styles.dayName, item.active && styles.dayNameActive]}>{item.day}</Text>
              <Text style={[styles.dayDate, item.active && styles.dayDateActive]}>{item.date}</Text>
              
              <View style={[styles.dayImageContainer, item.active && styles.dayImageContainerActive]}>
                <Image source={{ uri: item.image }} style={styles.dayThumb} />
              </View>

              <Text style={[styles.dayAmount, item.active && styles.dayAmountActive]}>
                {item.amount}
              </Text>
            </View>
          ))}
        </View>

        {/* 5. Giao dịch hôm nay (Today's Expenses) */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>HÔM NAY</Text>
          <TouchableOpacity onPress={onNavigateToAddExpense}>
            <Text style={styles.viewAllText}>+ Thêm khoản chi</Text>
          </TouchableOpacity>
        </View>

        {/* Cuộn ngang các món chi tiêu có ảnh */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.todayScroll}>
          {todayExpenses.map((exp) => (
            <TouchableOpacity
              key={exp.id}
              style={styles.expenseCard}
              activeOpacity={0.8}
              onPress={() => onNavigateToDetail && onNavigateToDetail(exp.id)}
            >
              <Image source={{ uri: exp.image }} style={styles.expenseThumb} />
              <Text style={styles.expenseTitle} numberOfLines={1}>{exp.title}</Text>
              <Text style={styles.expenseAmount}>{exp.amount}</Text>
              <Text style={styles.expenseTime}>{exp.time}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tổng kết hôm nay */}
        <View style={styles.todaySummary}>
          <Text style={styles.todaySummaryLabel}>Tổng hôm nay</Text>
          <Text style={styles.todaySummaryAmount}>-185.000 đ</Text>
        </View>

        {/* Nút hành động nhanh Camera */}
        <TouchableOpacity
          style={styles.cameraBannerBtn}
          activeOpacity={0.85}
          onPress={onNavigateToCamera}
        >
          <Text style={styles.cameraBannerIcon}>📷</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cameraBannerTitle}>Chụp ảnh món ăn & Hóa đơn</Text>
            <Text style={styles.cameraBannerDesc}>Lưu giữ khoảnh khắc chi tiêu trong 1 chạm</Text>
          </View>
          <Text style={styles.cameraBannerArrow}>➔</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#064E3B',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickSaveBtn: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  quickSaveBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  iconButton: {
    padding: 6,
    position: 'relative',
  },
  bellIcon: {
    fontSize: 18,
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  greetingSection: {
    marginBottom: 16,
  },
  greetingSub: {
    fontSize: 13,
    color: '#6B7280',
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  dailyCard: {
    backgroundColor: '#0D3B37',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
  },
  dailyCardInfo: {
    flex: 1,
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateTagText: {
    fontSize: 12,
    color: '#A7F3D0',
    fontWeight: '500',
  },
  dailyLabel: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  dailyAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  trendBadge: {
    backgroundColor: '#15564F',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  trendText: {
    fontSize: 11,
    color: '#6EE7B7',
    fontWeight: '600',
  },
  dailyImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dailyImage: {
    width: '100%',
    height: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 0.8,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  dayColumnActive: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  dayName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayNameActive: {
    color: '#065F46',
    fontWeight: '800',
  },
  dayDate: {
    fontSize: 9,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  dayDateActive: {
    color: '#059669',
    fontWeight: '600',
  },
  dayImageContainer: {
    width: 36,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dayImageContainerActive: {
    borderColor: '#059669',
    borderWidth: 1.5,
  },
  dayThumb: {
    width: '100%',
    height: '100%',
  },
  dayAmount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  dayAmountActive: {
    color: '#047857',
    fontWeight: '800',
  },
  todayScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  expenseCard: {
    width: 115,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  expenseThumb: {
    width: '100%',
    height: 70,
    borderRadius: 10,
    marginBottom: 8,
  },
  expenseTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  expenseAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E11D48',
    marginTop: 2,
  },
  expenseTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  todaySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 4,
  },
  todaySummaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  todaySummaryAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E11D48',
  },
  cameraBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 18,
    padding: 14,
    marginTop: 20,
  },
  cameraBannerIcon: {
    fontSize: 28,
  },
  cameraBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  cameraBannerDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  cameraBannerArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: '#047857',
  },
});
