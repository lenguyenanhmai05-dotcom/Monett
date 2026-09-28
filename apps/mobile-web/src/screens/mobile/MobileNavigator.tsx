import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
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

export type MobileTab = 'home' | 'analytics' | 'wallets' | 'categories' | 'profile';
export type ActiveModal = 'none' | 'camera' | 'add_expense' | 'quick_save' | 'detail';

export const MobileNavigator: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<MobileTab>('home');
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [capturedPhoto, setCapturedPhoto] = useState<string | undefined>();
  const [selectedTxId, setSelectedTxId] = useState<string | undefined>();

  const handlePhotoCaptured = (photoUrl: string) => {
    setCapturedPhoto(photoUrl);
    setActiveModal('add_expense');
  };

  const renderCurrentTabScreen = () => {
    switch (currentTab) {
      case 'home':
        return (
          <HomeScreen
            onNavigateToCamera={() => setActiveModal('camera')}
            onNavigateToAddExpense={() => setActiveModal('add_expense')}
            onNavigateToQuickSave={() => setActiveModal('camera')}
            onNavigateToDetail={(id) => {
              setSelectedTxId(id);
              setActiveModal('detail');
            }}
            onNavigateToAnalytics={() => setCurrentTab('analytics')}
          />
        );
      case 'analytics':
        return <AnalyticsScreen />;
      case 'wallets':
        return <WalletsScreen onAddWallet={() => {}} />;
      case 'categories':
        return <CategoriesScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.rootContainer}>
      {/* 1. Màn hình Tab chính */}
      <View style={styles.mainContent}>{renderCurrentTabScreen()}</View>

      {/* 2. Thanh Bottom Navigation chuẩn theo Stitch */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('home')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color="#FFFFFF"
            style={{ opacity: currentTab === 'home' ? 1 : 0.65 }}
          />
          <Text style={[styles.navLabel, currentTab === 'home' && styles.navLabelActive]}>
            Trang chủ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('analytics')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'analytics' ? 'bar-chart' : 'bar-chart-outline'}
            size={22}
            color="#FFFFFF"
            style={{ opacity: currentTab === 'analytics' ? 1 : 0.65 }}
          />
          <Text
            style={[
              styles.navLabel,
              currentTab === 'analytics' && styles.navLabelActive,
            ]}
          >
            Thống kê
          </Text>
        </TouchableOpacity>

        {/* Nút tròn nổi chính giữa: Chụp ảnh mở camera luôn, bỏ qua lưu nhanh */}
        <View style={styles.centerFabContainer}>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => setActiveModal('camera')}
            activeOpacity={0.85}
          >
            <Ionicons name="camera-outline" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('wallets')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'wallets' ? 'wallet' : 'wallet-outline'}
            size={22}
            color="#FFFFFF"
            style={{ opacity: currentTab === 'wallets' ? 1 : 0.65 }}
          />
          <Text
            style={[
              styles.navLabel,
              currentTab === 'wallets' && styles.navLabelActive,
            ]}
          >
            Ví
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('profile')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'profile' ? 'person' : 'person-outline'}
            size={22}
            color="#FFFFFF"
            style={{ opacity: currentTab === 'profile' ? 1 : 0.65 }}
          />
          <Text
            style={[
              styles.navLabel,
              currentTab === 'profile' && styles.navLabelActive,
            ]}
          >
            Cá nhân
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Màn hình Camera Fullscreen */}
      {activeModal === 'camera' && (
        <View style={StyleSheet.absoluteFill}>
          <CameraScreen
            onClose={() => setActiveModal('none')}
            onPhotoCaptured={handlePhotoCaptured}
          />
        </View>
      )}

      {/* 4. Màn hình Thêm Chi Tiêu */}
      {activeModal === 'add_expense' && (
        <View style={StyleSheet.absoluteFill}>
          <AddExpenseScreen
            initialPhotoUrl={capturedPhoto}
            onBack={() => setActiveModal('none')}
            onSaveSuccess={() => {
              setActiveModal('none');
              setCapturedPhoto(undefined);
            }}
          />
        </View>
      )}

      {/* 5. Màn hình Chi Tiết Giao Dịch */}
      {activeModal === 'detail' && (
        <View style={StyleSheet.absoluteFill}>
          <TransactionDetail
            transactionId={selectedTxId}
            onBack={() => setActiveModal('none')}
            onEdit={() => setActiveModal('add_expense')}
            onDelete={() => setActiveModal('none')}
          />
        </View>
      )}

      {/* 6. Modal QuickSave (Bạn vừa chi?) */}
      <QuickSaveModal
        visible={activeModal === 'quick_save'}
        onClose={() => setActiveModal('none')}
        onSaveQuick={(amount, category) => {
          console.log('Saved quick expense:', amount, category);
          setActiveModal('none');
        }}
        onOpenFullCamera={() => setActiveModal('camera')}
      />
    </SafeAreaView>
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
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    position: 'relative',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#34D399',
    fontWeight: '800',
  },
  centerFabContainer: {
    position: 'relative',
    top: -18,
    width: 64,
    alignItems: 'center',
  },
  fabBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 22,
  },
});
