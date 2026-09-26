import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
} from 'react-native';

interface ProfileScreenProps {
  onBack?: () => void;
  onLogout?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack, onLogout }) => {
  const badges = [
    { id: 'b1', name: 'Nhiếp ảnh gia ví tiền', icon: '📸', desc: 'Chụp 50+ ảnh chi tiêu', unlocked: true },
    { id: 'b2', name: 'Chuỗi rực rỡ', icon: '🔥', desc: 'Giữ chuỗi 18 ngày', unlocked: true },
    { id: 'b3', name: 'Tiết kiệm vàng', icon: '💰', desc: 'Dưới ngân sách tuần', unlocked: true },
    { id: 'b4', name: 'Bậc thầy tài chính', icon: '👑', desc: 'Đạt Level 15', unlocked: false },
  ];

  const menuItems = [
    { icon: '⏰', title: 'Nhắc nhở giữ chuỗi Streak', subtitle: 'Hằng ngày lúc 21:30' },
    { icon: '🌐', title: 'Ngôn ngữ hiển thị', subtitle: 'Tiếng Việt (VI 🇻🇳)' },
    { icon: '🔒', title: 'Bảo mật & Mã PIN', subtitle: 'Bảo vệ dữ liệu tài chính' },
    { icon: '❓', title: 'Trợ giúp & Góp ý', subtitle: 'Cộng đồng người dùng Monett' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <Text style={styles.headerBtnIcon}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Hồ Sơ Cá Nhân</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Text style={{ fontSize: 16 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. User Hero Card */}
        <View style={styles.profileHeroCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80' }}
              style={styles.avatarImg}
            />
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Lv.12</Text>
            </View>
          </View>

          <Text style={styles.userName}>Bảo Lương</Text>
          <Text style={styles.userEmail}>bao.luong@monett.app</Text>

          {/* Linh vật ếch Monett & XP Bar */}
          <View style={styles.frogBanner}>
            <View style={styles.frogHeader}>
              <Text style={styles.frogTitle}>🐸 Chú Ếch Thám Hiểm</Text>
              <Text style={styles.xpText}>850 / 1.000 XP</Text>
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: '85%' }]} />
            </View>
            <Text style={styles.frogSub}>Còn 150 XP nữa để tiến hóa lên Cấp độ 13!</Text>
          </View>
        </View>

        {/* 3. Streak Card */}
        <View style={styles.streakCard}>
          <Text style={styles.streakFlame}>🔥</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.streakTitle}>Chuỗi 18 ngày bùng cháy</Text>
            <Text style={styles.streakSub}>
              Đã ghi nhận khoảnh khắc liên tục. Hãy duy trì trước 23:00 hôm nay!
            </Text>
          </View>
        </View>

        {/* 4. Bộ sưu tập huy hiệu */}
        <Text style={styles.sectionTitle}>HUY HIỆU THÀNH TỰU (3/4)</Text>
        <View style={styles.badgesGrid}>
          {badges.map((b) => (
            <View
              key={b.id}
              style={[styles.badgeCard, !b.unlocked && styles.badgeLocked]}
            >
              <Text style={styles.badgeIcon}>{b.icon}</Text>
              <Text style={styles.badgeName}>{b.name}</Text>
              <Text style={styles.badgeDesc}>{b.desc}</Text>
            </View>
          ))}
        </View>

        {/* 5. Cài đặt Menu */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>CÀI ĐẶT ỨNG DỤNG</Text>
        <View style={styles.menuContainer}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.menuRow,
                idx === menuItems.length - 1 && { borderBottomWidth: 0 },
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 6. Nút Đăng Xuất */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Đăng xuất khỏi tài khoản</Text>
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
  menuIcon: {
    fontSize: 18,
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
});
