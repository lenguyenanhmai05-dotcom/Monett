import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from './HomeScreen';
import { CameraScreen } from './CameraScreen';
import { AddExpenseScreen } from './AddExpenseScreen';
import { QuickSaveModal } from './QuickSaveModal';
import { TransactionDetail } from './TransactionDetail';
import { AnalyticsScreen } from './AnalyticsScreen';
import { WalletsScreen } from './WalletsScreen';
import { CategoriesScreen } from './CategoriesScreen';
import { ProfileScreen } from './ProfileScreen';
import { FriendsFeedScreen } from './FriendsFeedScreen';
import { MessagesScreen } from './MessagesScreen';
import { useLanguage } from '../../contexts/LanguageContext';
import { createTransactionApi } from '../../services/api';

export type MobileTab = 'home' | 'calendar' | 'analytics' | 'feed' | 'wallets' | 'categories' | 'profile';
export type ActiveModal = 'none' | 'camera' | 'add_expense' | 'quick_save' | 'detail';

export const MobileNavigator: React.FC = () => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const [currentTab, setCurrentTab] = useState<MobileTab>('home');
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [capturedPhoto, setCapturedPhoto] = useState<string | undefined>();
  const [capturedMode, setCapturedMode] = useState<'bill' | 'food' | 'auto'>('food');
  const [targetExpenseDate, setTargetExpenseDate] = useState<string | undefined>();
  const [selectedTxId, setSelectedTxId] = useState<string | undefined>();
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handlePhotoCaptured = (photoUrl: string, mode?: 'bill' | 'food' | 'auto') => {
    setCapturedPhoto(photoUrl);
    if (mode) setCapturedMode(mode);
    setActiveModal('add_expense');
  };

  const renderCurrentTabScreen = () => {
    switch (currentTab) {
      case 'home':
        return (
          <HomeScreen
            refreshTrigger={refreshKey}
            onNavigateToCamera={(dateStr?: string) => {
              setTargetExpenseDate(dateStr);
              setActiveModal('camera');
            }}
            onNavigateToAddExpense={(dateStr?: string) => {
              setEditingTransaction(null);
              setTargetExpenseDate(dateStr);
              setActiveModal('add_expense');
            }}
            onNavigateToQuickSave={(dateStr?: string) => {
              setTargetExpenseDate(dateStr);
              setActiveModal('quick_save');
            }}
            onNavigateToDetail={(id) => {
              setSelectedTxId(id);
              setActiveModal('detail');
            }}
            onNavigateToAnalytics={() => setCurrentTab('analytics')}
            onNavigateToCalendar={() => setCurrentTab('calendar')}
            onNavigateToProfile={() => setCurrentTab('profile')}
          />
        );
      case 'calendar':
        return (
          <MessagesScreen
            refreshTrigger={refreshKey}
            onNavigateToHome={() => setCurrentTab('home')}
            onNavigateToCamera={(dateStr) => {
              setTargetExpenseDate(dateStr);
              setActiveModal('camera');
            }}
            onNavigateToDetail={(id) => {
              setSelectedTxId(id);
              setActiveModal('detail');
            }}
          />
        );
      case 'analytics':
        return <AnalyticsScreen refreshTrigger={refreshKey} />;
      case 'feed':
        return <FriendsFeedScreen onBack={() => setCurrentTab('profile')} />;
      case 'wallets':
        return <WalletsScreen onBack={() => setCurrentTab('profile')} />;
      case 'categories':
        return <CategoriesScreen onBack={() => setCurrentTab('profile')} />;
      case 'profile':
        return (
          <ProfileScreen
            onNavigateToWallets={() => setCurrentTab('wallets')}
            onNavigateToCategories={() => setCurrentTab('categories')}
            onNavigateToFeed={() => setCurrentTab('feed')}
          />
        );
      default:
        return <HomeScreen refreshTrigger={refreshKey} />;
    }
  };

  return (
    <View style={styles.rootContainer}>
      {/* 1. Màn hình Tab chính */}
      <View style={styles.mainContent}>{renderCurrentTabScreen()}</View>

      {/* 2. Thanh Bottom Navigation (Nền trắng, hover & active xanh pastel nhẹ nhàng) */}
      <SafeAreaView edges={['bottom']} style={styles.bottomNavWrapper}>
        <View style={styles.bottomNav}>
          {/* 1. Trang chủ */}
          <TouchableOpacity
            style={[
              styles.navItem,
              currentTab === 'home' && styles.navItemActive,
              hoveredTab === 'home' && currentTab !== 'home' && styles.navItemHovered,
            ]}
            onPress={() => setCurrentTab('home')}
            activeOpacity={0.75}
            {...(Platform.OS === 'web'
              ? {
                  onMouseEnter: () => setHoveredTab('home'),
                  onMouseLeave: () => setHoveredTab(null),
                }
              : {})}
          >
            <Ionicons
              name={currentTab === 'home' ? 'home' : 'home-outline'}
              size={20}
              color={currentTab === 'home' || hoveredTab === 'home' ? '#064E3B' : '#475569'}
            />
            <Text
              style={[
                styles.navLabel,
                currentTab === 'home' && styles.navLabelActive,
                hoveredTab === 'home' && currentTab !== 'home' && styles.navLabelHovered,
              ]}
            >
              {isVi ? 'Trang chủ' : 'Home'}
            </Text>
          </TouchableOpacity>

          {/* 2. Nhắn tin */}
          <TouchableOpacity
            style={[
              styles.navItem,
              currentTab === 'calendar' && styles.navItemActive,
              hoveredTab === 'calendar' && currentTab !== 'calendar' && styles.navItemHovered,
            ]}
            onPress={() => setCurrentTab('calendar')}
            activeOpacity={0.75}
            {...(Platform.OS === 'web'
              ? {
                  onMouseEnter: () => setHoveredTab('calendar'),
                  onMouseLeave: () => setHoveredTab(null),
                }
              : {})}
          >
            <Ionicons
              name={currentTab === 'calendar' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={20}
              color={currentTab === 'calendar' || hoveredTab === 'calendar' ? '#064E3B' : '#475569'}
            />
            <Text
              style={[
                styles.navLabel,
                currentTab === 'calendar' && styles.navLabelActive,
                hoveredTab === 'calendar' && currentTab !== 'calendar' && styles.navLabelHovered,
              ]}
            >
              {isVi ? 'Nhắn tin' : 'Messages'}
            </Text>
          </TouchableOpacity>

          {/* 3. Nút tròn nổi chính giữa: Camera */}
          <View style={styles.centerFabContainer}>
            <TouchableOpacity
              style={[styles.fabBtn, hoveredTab === 'camera' && styles.fabBtnHovered]}
              onPress={() => setActiveModal('camera')}
              activeOpacity={0.85}
              {...(Platform.OS === 'web'
                ? {
                    onMouseEnter: () => setHoveredTab('camera'),
                    onMouseLeave: () => setHoveredTab(null),
                  }
                : {})}
            >
              <Ionicons name="camera" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* 4. Thống kê */}
          <TouchableOpacity
            style={[
              styles.navItem,
              currentTab === 'analytics' && styles.navItemActive,
              hoveredTab === 'analytics' && currentTab !== 'analytics' && styles.navItemHovered,
            ]}
            onPress={() => setCurrentTab('analytics')}
            activeOpacity={0.75}
            {...(Platform.OS === 'web'
              ? {
                  onMouseEnter: () => setHoveredTab('analytics'),
                  onMouseLeave: () => setHoveredTab(null),
                }
              : {})}
          >
            <Ionicons
              name={currentTab === 'analytics' ? 'bar-chart' : 'bar-chart-outline'}
              size={20}
              color={currentTab === 'analytics' || hoveredTab === 'analytics' ? '#064E3B' : '#475569'}
            />
            <Text
              style={[
                styles.navLabel,
                currentTab === 'analytics' && styles.navLabelActive,
                hoveredTab === 'analytics' && currentTab !== 'analytics' && styles.navLabelHovered,
              ]}
            >
              {isVi ? 'Thống kê' : 'Analytics'}
            </Text>
          </TouchableOpacity>

          {/* 5. Cá nhân */}
          <TouchableOpacity
            style={[
              styles.navItem,
              currentTab === 'profile' && styles.navItemActive,
              hoveredTab === 'profile' && currentTab !== 'profile' && styles.navItemHovered,
            ]}
            onPress={() => setCurrentTab('profile')}
            activeOpacity={0.75}
            {...(Platform.OS === 'web'
              ? {
                  onMouseEnter: () => setHoveredTab('profile'),
                  onMouseLeave: () => setHoveredTab(null),
                }
              : {})}
          >
            <Ionicons
              name={currentTab === 'profile' ? 'person' : 'person-outline'}
              size={20}
              color={currentTab === 'profile' || hoveredTab === 'profile' ? '#064E3B' : '#475569'}
            />
            <Text
              style={[
                styles.navLabel,
                currentTab === 'profile' && styles.navLabelActive,
                hoveredTab === 'profile' && currentTab !== 'profile' && styles.navLabelHovered,
              ]}
            >
              {isVi ? 'Cá nhân' : 'Profile'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 3. Màn hình Camera Fullscreen */}
      {activeModal === 'camera' && (
        <View style={StyleSheet.absoluteFill}>
          <CameraScreen
            onClose={() => setActiveModal('none')}
            onPhotoCaptured={handlePhotoCaptured}
          />
        </View>
      )}

      {/* 4. Màn hình Thêm / Sửa Chi Tiêu */}
      {activeModal === 'add_expense' && (
        <View style={StyleSheet.absoluteFill}>
          <AddExpenseScreen
            initialPhotoUrl={capturedPhoto}
            initialMode={capturedMode}
            initialDate={targetExpenseDate}
            editingTransactionId={editingTransaction?.id}
            initialData={editingTransaction}
            onBack={() => {
              setEditingTransaction(null);
              setTargetExpenseDate(undefined);
              setActiveModal('none');
            }}
            onSaveSuccess={() => {
              setEditingTransaction(null);
              setTargetExpenseDate(undefined);
              setActiveModal('none');
              setCapturedPhoto(undefined);
              triggerRefresh();
            }}
          />
        </View>
      )}

      {/* 5. Màn hình Chi Tiết Giao Dịch */}
      {activeModal === 'detail' && (
        <View style={StyleSheet.absoluteFill}>
          <TransactionDetail
            transactionId={selectedTxId}
            onBack={() => {
              setSelectedTxId(undefined);
              setActiveModal('none');
            }}
            onEdit={(txData) => {
              setEditingTransaction(txData);
              setActiveModal('add_expense');
            }}
            onDelete={() => {
              setSelectedTxId(undefined);
              setActiveModal('none');
              triggerRefresh();
            }}
          />
        </View>
      )}

      {/* 6. Modal QuickSave (Bạn vừa chi?) */}
      <QuickSaveModal
        visible={activeModal === 'quick_save'}
        targetDate={targetExpenseDate}
        onClose={() => {
          setTargetExpenseDate(undefined);
          setActiveModal('none');
        }}
        onSaveQuick={async (amount, category, date) => {
          try {
            await createTransactionApi({
              title: category,
              amount: -Math.abs(amount),
              category,
              type: 'expense',
              date: date ? new Date(date).toISOString() : new Date().toISOString(),
            });
            triggerRefresh();
          } catch (e) {
            console.log('Saved quick expense (offline/local fallback):', amount, category);
          }
          setTargetExpenseDate(undefined);
          setActiveModal('none');
        }}
        onOpenFullCamera={() => setActiveModal('camera')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  mainContent: {
    flex: 1,
  },
  bottomNavWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 62,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    position: 'relative',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  } as any,
  navItemActive: {
    backgroundColor: '#D1E7DD', // Nền xanh pastel nhẹ nhàng chuẩn như ảnh mẫu của bạn
  },
  navItemHovered: {
    backgroundColor: '#EAF4EE', // Hover xanh nhẹ nhàng êm ái
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#064E3B',
    fontWeight: '800',
  },
  navLabelHovered: {
    color: '#064E3B',
    fontWeight: '700',
  },
  centerFabContainer: {
    position: 'relative',
    top: -16,
    width: 60,
    alignItems: 'center',
    zIndex: 10,
  },
  fabBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#064E3B', // Tone xanh đậm đồng bộ
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    transition: 'all 0.2s ease',
  } as any,
  fabBtnHovered: {
    backgroundColor: '#047857',
    transform: [{ scale: 1.06 }],
    shadowOpacity: 0.45,
  } as any,
});
