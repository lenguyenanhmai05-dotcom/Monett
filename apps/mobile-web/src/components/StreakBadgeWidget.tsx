import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStreakApi } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export const StreakBadgeWidget: React.FC = () => {
  const { language } = useLanguage();
  const [streak, setStreak] = useState<number>(0);
  const [activeToday, setActiveToday] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    getStreakApi()
      .then((data: any) => {
        if (mounted && data) {
          setStreak(data.streak ?? 0);
          setActiveToday(Boolean(data.activeToday));
        }
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <View style={styles.iconCircle}>
          <Ionicons name="flame" size={26} color="#D97706" />
        </View>
        <View style={{ marginLeft: 14 }}>
          <View style={styles.streakRow}>
            {loading ? (
              <ActivityIndicator size="small" color="#B45309" />
            ) : (
              <Text style={styles.streakCount}>{streak}</Text>
            )}
            <Text style={styles.streakLabel}>
              {language === 'vi' ? 'NGÀY LIÊN TỤC' : 'DAY STREAK'}
            </Text>
          </View>
          <View style={styles.subTextRow}>
            <Ionicons
              name={activeToday ? 'checkmark-circle' : 'flash-outline'}
              size={13}
              color={activeToday ? '#059669' : '#D97706'}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.subText}>
              {activeToday
                ? (language === 'vi' ? 'Đã ghi nhận hôm nay' : 'Active today')
                : (language === 'vi' ? 'Chưa ghi chép hôm nay' : 'Pending today')}
            </Text>
          </View>
        </View>
      </View>

      {/* Badge trạng thái */}
      <View style={[styles.statusBadge, activeToday ? styles.statusBadgeDone : styles.statusBadgePending]}>
        <Ionicons
          name={activeToday ? 'flame' : 'sparkles-outline'}
          size={14}
          color={activeToday ? '#059669' : '#B45309'}
          style={{ marginRight: 4 }}
        />
        <Text style={[styles.statusText, activeToday ? styles.statusTextDone : styles.statusTextPending]}>
          {activeToday
            ? (language === 'vi' ? 'Đã giữ chuỗi' : 'Maintained')
            : (language === 'vi' ? 'Chưa điểm danh' : 'Check-in pending')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFCF3',
    borderWidth: 1,
    borderColor: '#FDE047',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FEF08A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FACC15',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  fireEmoji: {
    fontSize: 22,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  streakCount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#9A3412',
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#C2410C',
    letterSpacing: 0.5,
  },
  subTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  subText: {
    fontSize: 13,
    color: '#78350F',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statusBadgeDone: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#34D399',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  statusText: {
    fontWeight: '800',
    fontSize: 13,
  },
  statusTextDone: {
    color: '#059669',
  },
  statusTextPending: {
    color: '#B45309',
  },
});
