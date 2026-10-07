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
          <Ionicons name="flame" size={22} color="#D97706" />
        </View>
        <View style={{ marginLeft: 12 }}>
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
          size={12}
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
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D',
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
    fontSize: 20,
    fontWeight: '900',
    color: '#B45309',
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  subTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  subText: {
    fontSize: 12,
    color: '#78350F',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  statusBadgeDone: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  statusText: {
    fontWeight: '800',
    fontSize: 12,
  },
  statusTextDone: {
    color: '#059669',
  },
  statusTextPending: {
    color: '#B45309',
  },
});
