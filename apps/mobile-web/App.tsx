import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Platform, useWindowDimensions, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ResponsiveLayout, TabKey } from './src/layouts/ResponsiveLayout';
import { HomeScreen } from './src/screens/web/HomeScreen';
import { ProfileScreen } from './src/screens/web/ProfileScreen';
import { AuthScreen } from './src/screens/web/AuthScreen';
import { LandingScreen } from './src/screens/web/LandingScreen';
import { FinancialReportScreen } from './src/screens/web/FinancialReportScreen';
import { TransactionsScreen } from './src/screens/web/TransactionsScreen';
import { SavingsScreen } from './src/screens/web/SavingsScreen';
import { EventsScreen } from './src/screens/web/EventsScreen';
import { RecurringScreen } from './src/screens/web/RecurringScreen';
import { DebtScreen } from './src/screens/web/DebtScreen';
import { RemindersScreen } from './src/screens/web/RemindersScreen';
import { CalendarScreen } from './src/screens/mobile/CalendarScreen';
import { MessagesScreen } from './src/screens/mobile/MessagesScreen';
import { FriendsFeedScreen } from './src/screens/mobile/FriendsFeedScreen';
import { WebFeedScreen } from './src/screens/web/WebFeedScreen';
import { MobileAuthScreen } from './src/screens/mobile/MobileAuthScreen';
import { MobileNavigator } from './src/screens/mobile/MobileNavigator';
import { UserRole } from '@monett/shared';
import { AdminDashboardScreen } from './src/screens/admin/AdminDashboardScreen';
import { TransactionProvider } from './src/contexts/TransactionContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { ChatProvider } from './src/contexts/ChatContext';

// Xóa bỏ hoàn toàn viền đen mặc định của trình duyệt web trên mọi ô nhập liệu
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'monett-global-focus-reset';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.innerHTML = `
      input, textarea, select {
        outline: none !important;
        outline-style: none !important;
        outline-width: 0 !important;
        box-shadow: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      input:focus, textarea:focus, select:focus {
        outline: none !important;
        outline-style: none !important;
        outline-width: 0 !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

function MainApp() {
  const { user, isLoading } = useAuth();
  const { language } = useLanguage();
  const { width } = useWindowDimensions();
  const isMobileScreen = Platform.OS !== 'web' || width < 768;
  const [adminViewMode, setAdminViewMode] = useState<'app' | 'admin'>(
    Platform.OS === 'web' && width >= 768 ? 'admin' : 'app'
  );
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [publicScreen, setPublicScreen] = useState<'landing' | 'auth'>(
    Platform.OS === 'web' ? 'landing' : 'auth'
  );
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  const isSystemAdmin =
    user?.role === UserRole.ADMIN ||
    user?.email?.toLowerCase().trim() === 'lenguyenanhmai05@gmail.com';

  const handleNavigateToAuth = (mode: 'login' | 'register') => {
    setAuthInitialMode(mode);
    setPublicScreen('auth');
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToLanding = () => {
    setPublicScreen('landing');
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('./assets/monett-brand-logo.png')}
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

  // Khi người dùng chưa đăng nhập:
  if (!user) {
    if (isMobileScreen) {
      return (
        <MobileAuthScreen
          initialMode={authInitialMode}
          onSuccess={() => {}}
          onBackToHome={handleBackToLanding}
        />
      );
    }

    if (publicScreen === 'landing') {
      return <LandingScreen onNavigateToAuth={handleNavigateToAuth} />;
    }
    return (
      <AuthScreen
        initialMode={authInitialMode}
        onBackToHome={handleBackToLanding}
      />
    );
  }

  // Khi người dùng ĐÃ đăng nhập trên thiết bị Mobile:
  if (isMobileScreen) {
    if (isSystemAdmin && adminViewMode === 'admin') {
      return <AdminDashboardScreen onBackToApp={() => setAdminViewMode('app')} />;
    }
    return (
      <TransactionProvider>
        <MobileNavigator onOpenAdminDashboard={isSystemAdmin ? () => setAdminViewMode('admin') : undefined} />
      </TransactionProvider>
    );
  }

  // Khi tài khoản là ADMIN trên Web Desktop (mặc định vào Admin Dashboard, có thể bấm về App):
  if (isSystemAdmin && adminViewMode === 'admin') {
    return <AdminDashboardScreen onBackToApp={() => setAdminViewMode('app')} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigateToTab={setActiveTab} />;
      case 'messages':
        return <WebFeedScreen initialTab="chat" />;
      case 'feed':
        return <WebFeedScreen initialTab="feed" />;
      case 'profile':
        return <ProfileScreen />;
      case 'transactions':
      case 'analytics':
        return <FinancialReportScreen onNavigateToTab={setActiveTab} />;
      case 'events':
        return <EventsScreen onNavigateToTab={setActiveTab} />;
      case 'budget':
        return <SavingsScreen onNavigateToTab={setActiveTab} />;
      case 'recurring':
        return <RecurringScreen onNavigateToTab={setActiveTab} />;
      case 'debts':
        return <DebtScreen onNavigateToTab={setActiveTab} />;
      case 'reminders':
        return <RemindersScreen onNavigateToTab={setActiveTab} />;
      default:
        return <HomeScreen onNavigateToTab={setActiveTab} />;
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
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <SocketProvider>
            <ThemeProvider>
              <NotificationProvider>
                <ChatProvider>
                  <StatusBar style="dark" />
                  <MainApp />
                </ChatProvider>
              </NotificationProvider>
            </ThemeProvider>
          </SocketProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
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
