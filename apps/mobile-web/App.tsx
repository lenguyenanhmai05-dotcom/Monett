import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ResponsiveLayout, TabKey } from './src/layouts/ResponsiveLayout';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';

function MainApp() {
  const { user, isLoading } = useAuth();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('./assets/monett-logo.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#047857" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>
          {language === 'vi' ? 'Đang khởi động Monett...' : 'Loading Monett...'}
        </Text>
      </View>
    );
  }

  // Nếu chưa đăng nhập, hiển thị màn hình AuthScreen thiết kế chuẩn
  if (!user) {
    return <AuthScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
      case 'profile':
        return <HomeScreen />;
      case 'moments':
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.placeholderIcon}>📸</Text>
            <Text style={styles.placeholderTitle}>
              {language === 'vi' ? 'Lịch Ảnh Chi Tiêu (Money Moments)' : 'Moments Journal'}
            </Text>
            <Text style={styles.placeholderDesc}>
              {language === 'vi'
                ? 'Thư viện ảnh chi tiêu trực quan của bạn sẽ hiển thị tại đây!'
                : 'Your visual expense diary and photo grid will appear here!'}
            </Text>
          </View>
        );
      case 'analytics':
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.placeholderIcon}>📈</Text>
            <Text style={styles.placeholderTitle}>
              {language === 'vi' ? 'Thống Kê & Phân Tích' : 'Analytics & Insights'}
            </Text>
            <Text style={styles.placeholderDesc}>
              {language === 'vi'
                ? 'Biểu đồ dòng tiền và cơ cấu chi tiêu sẽ hiển thị tại đây!'
                : 'Cashflow charts and category analytics will appear here!'}
            </Text>
          </View>
        );
      case 'transactions':
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.placeholderIcon}>📝</Text>
            <Text style={styles.placeholderTitle}>
              {language === 'vi' ? 'Quản Lý Chi Tiêu' : 'Expense Manager'}
            </Text>
            <Text style={styles.placeholderDesc}>
              {language === 'vi'
                ? 'Bảng dữ liệu nhật ký thu chi chi tiết sẽ hiển thị tại đây!'
                : 'Detailed transaction logs will appear here!'}
            </Text>
          </View>
        );
      case 'budget':
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.placeholderIcon}>💳</Text>
            <Text style={styles.placeholderTitle}>
              {language === 'vi' ? 'Kế Hoạch Ngân Sách' : 'Budget Plans'}
            </Text>
            <Text style={styles.placeholderDesc}>
              {language === 'vi'
                ? 'Thiết lập hạn mức chi tiêu theo tháng và danh mục tại đây!'
                : 'Set your monthly and category spending limits here!'}
            </Text>
          </View>
        );
      default:
        return <HomeScreen />;
    }
  };

  return (
    <ResponsiveLayout activeTab={activeTab} onSelectTab={setActiveTab}>
      {renderContent()}
    </ResponsiveLayout>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingLogo: {
    width: 180,
    height: 50,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  placeholderDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
});
