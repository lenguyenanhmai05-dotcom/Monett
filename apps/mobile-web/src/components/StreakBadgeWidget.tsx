import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getStreakApi, checkInStreakApi } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export const StreakBadgeWidget: React.FC = () => {
  const { language } = useLanguage();
  const [streak, setStreak] = useState<number>(1);
  const [activeToday, setActiveToday] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    getStreakApi()
      .then((data: any) => {
        if (mounted && data) {
          setStreak(data.streak || 1);
          setActiveToday(Boolean(data.activeToday));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleCheckIn = async () => {
    if (loading || activeToday) return;
    try {
      setLoading(true);
      const res: any = await checkInStreakApi();
      if (res && res.streak) {
        setStreak(res.streak);
        setActiveToday(true);
        setMsg(res.message || 'Duy trì chuỗi thành công!');
        setTimeout(() => setMsg(''), 4000);
      }
    } catch (e: any) {
      setMsg(e.message || 'Lỗi khi điểm danh');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <View style={styles.iconCircle}>
          <Text style={styles.fireEmoji}>🔥</Text>
        </View>
        <View style={{ marginLeft: 12 }}>
          <View style={styles.streakRow}>
            <Text style={styles.streakCount}>{streak}</Text>
            <Text style={styles.streakLabel}>
              {language === 'vi' ? 'NGÀY LIÊN TỤC' : 'DAY STREAK'}
            </Text>
          </View>
          <Text style={styles.subText}>
            {activeToday
              ? (language === 'vi' ? '✅ Đã ghi nhận hôm nay' : '✅ Active today')
              : (language === 'vi' ? '⚡ Chưa ghi chép hôm nay' : '⚡ Pending today')}
          </Text>
          {msg ? <Text style={styles.msgText}>{msg}</Text> : null}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btn, activeToday && styles.btnDone]}
        onPress={handleCheckIn}
        disabled={activeToday || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={[styles.btnText, activeToday && styles.btnTextDone]}>
            {activeToday
              ? (language === 'vi' ? 'Đã giữ chuỗi 🔥' : 'Maintained 🔥')
              : (language === 'vi' ? 'Duy trì chuỗi ⚡' : 'Check-in ⚡')}
          </Text>
        )}
      </TouchableOpacity>
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
  subText: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
  },
  msgText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  btn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  btnDone: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  btnTextDone: {
    color: '#059669',
  },
});
