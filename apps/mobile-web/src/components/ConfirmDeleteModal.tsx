import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

export interface ConfirmDeleteModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  itemTitle?: string;
  itemAmount?: string;
  itemImage?: string;
  itemCategory?: string;
  isDeleting?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  visible,
  title,
  message,
  itemTitle,
  itemAmount,
  itemImage,
  itemCategory,
  isDeleting = false,
  onConfirm,
  onCancel,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const finalTitle = title || (isVi ? 'Xác nhận xóa giao dịch?' : 'Confirm delete transaction?');
  const finalMessage = message || (isVi
    ? 'Khoản chi này sẽ bị xóa vĩnh viễn khỏi ngân sách và lịch của bạn. Hành động này không thể hoàn tác.'
    : 'This expense will be permanently deleted from your budget and calendar. This action cannot be undone.');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={isDeleting ? undefined : onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dialogContainer}>
              {/* 1. Icon vòng tròn kép đỏ Pastel sang trọng */}
              <View style={styles.iconOuterCircle}>
                <View style={styles.iconInnerCircle}>
                  <Ionicons name="trash" size={22} color="#DC2626" />
                </View>
              </View>

              {/* 2. Tiêu đề & Mô tả */}
              <Text style={styles.dialogTitle}>{finalTitle}</Text>
              <Text style={styles.dialogMessage}>{finalMessage}</Text>

              {/* 3. Card tóm tắt giao dịch sắp xóa */}
              {(itemTitle || itemAmount) && (
                <View style={styles.previewCard}>
                  {itemImage ? (
                    <Image source={{ uri: itemImage }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.previewIconBox}>
                      <Ionicons name="receipt-outline" size={20} color="#047857" />
                    </View>
                  )}
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewTitle} numberOfLines={1}>
                      {itemTitle || (isVi ? 'Giao dịch' : 'Transaction')}
                    </Text>
                    {itemCategory && (
                      <Text style={styles.previewCategory}>
                        {itemCategory}
                      </Text>
                    )}
                  </View>
                  {itemAmount && (
                    <Text style={styles.previewAmount}>
                      {itemAmount}
                    </Text>
                  )}
                </View>
              )}

              {/* 4. Hành động: Hủy bỏ & Xóa vĩnh viễn */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onCancel}
                  disabled={isDeleting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>{isVi ? 'Hủy bỏ' : 'Cancel'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.deleteBtn, isDeleting && styles.deleteBtnDisabled]}
                  onPress={onConfirm}
                  disabled={isDeleting}
                  activeOpacity={0.8}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.deleteBtnText}>{isVi ? 'Xóa vĩnh viễn' : 'Delete Permanently'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconOuterCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconInnerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  dialogMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  previewIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  previewCategory: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  previewAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 22,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  deleteBtn: {
    flex: 1.3,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteBtnDisabled: {
    opacity: 0.7,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
