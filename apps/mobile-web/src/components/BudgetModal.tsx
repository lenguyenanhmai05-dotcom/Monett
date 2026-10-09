import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setBudgetApi, BudgetData } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

interface BudgetModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (budget: BudgetData) => void;
  currentLimit?: number;
  currentPayday?: number;
  currentSpent?: number;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  visible,
  onClose,
  onSaved,
  currentLimit = 22000000,
  currentPayday = 5,
  currentSpent = 6180000,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const [limitStr, setLimitStr] = useState<string>(String(currentLimit));
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setLimitStr(String(currentLimit));
    }
  }, [visible, currentLimit]);

  const numLimit = Math.max(0, parseInt(limitStr.replace(/\D/g, '') || '0', 10));
  const presetLimits = [10000000, 15000000, 20000000, 25000000, 30000000];

  const handleSave = async () => {
    if (numLimit <= 0) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Vui lòng nhập hạn mức lớn hơn 0 đ' : 'Please enter a budget greater than 0 VND');
      return;
    }

    try {
      setLoading(true);
      const res = await setBudgetApi({
        limit: numLimit,
        payday: currentPayday || 5,
      });
      if (onSaved) onSaved(res);
      onClose();
    } catch (e: any) {
      console.warn('Set budget API error, fallback local:', e);
      if (onSaved) {
        onSaved({
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          limit: numLimit,
          spent: currentSpent,
          remaining: Math.max(0, numLimit - currentSpent),
          spentPercent: numLimit > 0 ? Number(((currentSpent / numLimit) * 100).toFixed(1)) : 0,
          remainingPercent: numLimit > 0 ? Math.max(0, Number((100 - (currentSpent / numLimit) * 100).toFixed(1))) : 100,
          status: 'safe',
          payday: currentPayday || 5,
          daysUntilPayday: 12,
          currency: 'VND',
        });
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="wallet-outline" size={20} color="#064E3B" />
              </View>
              <View>
                <Text style={styles.modalTitle}>{isVi ? 'Thiết Lập Ngân Sách Tháng' : 'Monthly Budget Setup'}</Text>
                <Text style={styles.modalSubtitle}>{isVi ? 'Nhập số tiền chi tiêu tối đa trong tháng' : 'Set your maximum monthly spending'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <View style={styles.body}>
            {/* 1. Hạn mức chi tiêu */}
            <Text style={styles.inputLabel}>{isVi ? 'Hạn mức chi tiêu mong muốn (VND):' : 'Target budget limit (VND):'}</Text>
            <View
              style={[
                styles.inputWrapper,
                (isFocused || isHovered) && styles.inputWrapperActive,
              ]}
              {...(Platform.OS === 'web'
                ? {
                    onMouseEnter: () => setIsHovered(true),
                    onMouseLeave: () => setIsHovered(false),
                  }
                : {})}
            >
              <Text style={[styles.currencyPrefix, (isFocused || isHovered) && styles.currencyPrefixActive]}>₫</Text>
              <TextInput
                style={[
                  styles.textInput,
                  Platform.OS === 'web' && ({
                    outline: 'none',
                    outlineStyle: 'none',
                    outlineWidth: 0,
                    outlineColor: 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    borderWidth: 0,
                  } as any),
                ]}
                keyboardType="numeric"
                value={numLimit > 0 ? numLimit.toLocaleString('vi-VN') : ''}
                onChangeText={(text) => setLimitStr(text.replace(/\D/g, ''))}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="20.000.000"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsRow}>
              {presetLimits.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[styles.presetChip, numLimit === preset && styles.presetChipActive]}
                  onPress={() => setLimitStr(String(preset))}
                >
                  <Text style={[styles.presetChipText, numLimit === preset && styles.presetChipTextActive]}>
                    {(preset / 1000000)}Tr
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>{isVi ? 'Hủy' : 'Cancel'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>{isVi ? 'Lưu ngân sách' : 'Save Budget'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#F8FAFC',
    transition: 'all 0.2s ease',
  } as any,
  inputWrapperActive: {
    borderColor: '#064E3B',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    boxShadow: '0 0 0 3px rgba(6, 78, 59, 0.12)',
  } as any,
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
    marginRight: 6,
  },
  currencyPrefixActive: {
    color: '#064E3B',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    height: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 0,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#064E3B',
    borderColor: '#064E3B',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
