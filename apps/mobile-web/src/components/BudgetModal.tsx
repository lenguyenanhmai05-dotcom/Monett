import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { setBudgetApi, BudgetData } from '../services/api';

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
  currentLimit = 20000000,
  currentPayday = 5,
  currentSpent = 0,
}) => {
  const { isDark } = useTheme();
  const [limitStr, setLimitStr] = useState<string>(String(currentLimit));
  const [paydayStr, setPaydayStr] = useState<string>(String(currentPayday));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLimitStr(String(currentLimit || 20000000));
      setPaydayStr(String(currentPayday || 5));
      setErrorMsg(null);
    }
  }, [visible, currentLimit, currentPayday]);

  const numLimit = Math.max(0, parseInt(limitStr.replace(/\D/g, '') || '0', 10));
  const numPayday = parseInt(paydayStr.replace(/\D/g, '') || '5', 10);

  const presetLimits = [10000000, 15000000, 20000000, 25000000, 30000000];

  // Dự tính tỷ lệ chi tiêu nếu đổi hạn mức
  const previewSpentPercent = numLimit > 0 ? Number(((currentSpent / numLimit) * 100).toFixed(1)) : 0;
  const isDanger = previewSpentPercent > 100;
  const isWarning = previewSpentPercent >= 80 && !isDanger;

  const handleSave = async () => {
    if (numLimit <= 0) {
      setErrorMsg('Vui lòng nhập hạn mức lớn hơn 0 đ');
      return;
    }
    if (isNaN(numPayday) || numPayday < 1 || numPayday > 31) {
      setErrorMsg('Ngày trả lương hợp lệ phải từ 1 đến 31');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await setBudgetApi({
        limit: numLimit,
        payday: numPayday,
      });
      if (onSaved) onSaved(res);
      onClose();
    } catch (e: any) {
      console.error('Set budget API error:', e);
      setErrorMsg(
        e?.message || 'Không thể lưu hạn mức ngân sách vào máy chủ. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = getStyles(isDark);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={dynamicStyles.overlay}>
        <View style={dynamicStyles.modalBox}>
          {/* Header */}
          <View style={dynamicStyles.header}>
            <View style={dynamicStyles.headerLeft}>
              <View style={dynamicStyles.headerIconWrap}>
                <Ionicons name="wallet-outline" size={20} color="#059669" />
              </View>
              <View>
                <Text style={dynamicStyles.modalTitle}>Thiết Lập Ngân Sách Tháng</Text>
                <Text style={dynamicStyles.modalSubtitle}>Kiểm soát hạn mức và cảnh báo chi tiêu</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={dynamicStyles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <View style={dynamicStyles.body}>
            {errorMsg && (
              <View style={dynamicStyles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={dynamicStyles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* 1. Hạn mức chi tiêu */}
            <Text style={dynamicStyles.inputLabel}>Hạn mức chi tiêu mong muốn (VND):</Text>
            <View style={dynamicStyles.inputWrapper}>
              <Text style={dynamicStyles.currencyPrefix}>₫</Text>
              <TextInput
                style={dynamicStyles.textInput}
                keyboardType="numeric"
                value={numLimit > 0 ? numLimit.toLocaleString('vi-VN') : ''}
                onChangeText={(text) => setLimitStr(text.replace(/\D/g, ''))}
                placeholder="20.000.000"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Quick Presets */}
            <View style={dynamicStyles.presetsRow}>
              {presetLimits.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[dynamicStyles.presetChip, numLimit === preset && dynamicStyles.presetChipActive]}
                  onPress={() => setLimitStr(String(preset))}
                >
                  <Text style={[dynamicStyles.presetChipText, numLimit === preset && dynamicStyles.presetChipTextActive]}>
                    {preset / 1000000}Tr
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 2. Ngày trả lương định kỳ */}
            <Text style={[dynamicStyles.inputLabel, { marginTop: 14 }]}>Ngày nhận lương định kỳ (1 - 31):</Text>
            <View style={dynamicStyles.inputWrapper}>
              <Ionicons name="calendar-outline" size={18} color="#64748B" style={{ marginLeft: 4, marginRight: 8 }} />
              <TextInput
                style={dynamicStyles.textInput}
                keyboardType="numeric"
                value={paydayStr}
                onChangeText={setPaydayStr}
                placeholder="05"
                placeholderTextColor="#94A3B8"
                maxLength={2}
              />
            </View>

            {/* 3. Xem trước trạng thái tiến độ & Cảnh báo đổi màu */}
            <View style={dynamicStyles.previewCard}>
              <View style={dynamicStyles.previewHeader}>
                <Text style={dynamicStyles.previewLabel}>Mô phỏng tỷ lệ chi hiện tại:</Text>
                <View
                  style={[
                    dynamicStyles.statusBadge,
                    {
                      backgroundColor: isDanger
                        ? isDark ? '#450A0A' : '#FEF2F2'
                        : isWarning
                        ? isDark ? '#451A03' : '#FFFBEB'
                        : isDark ? '#064E3B' : '#ECFDF5',
                    },
                  ]}
                >
                  <Text
                    style={[
                      dynamicStyles.statusBadgeText,
                      { color: isDanger ? '#DC2626' : isWarning ? '#D97706' : '#059669' },
                    ]}
                  >
                    {isDanger ? '🚨 Vượt ngân sách' : isWarning ? '⚠️ Trên 80% (Cảnh báo)' : '✅ An toàn'}
                  </Text>
                </View>
              </View>

              <View style={dynamicStyles.progressBarTrack}>
                <View
                  style={[
                    dynamicStyles.progressBarFill,
                    {
                      width: `${Math.min(100, previewSpentPercent)}%`,
                      backgroundColor: isDanger ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981',
                    },
                  ]}
                />
              </View>

              <View style={dynamicStyles.previewFooterRow}>
                <Text style={dynamicStyles.previewFooterText}>
                  Đã tiêu: {currentSpent.toLocaleString('vi-VN')} đ
                </Text>
                <Text style={dynamicStyles.previewFooterPercent}>{previewSpentPercent}%</Text>
              </View>
            </View>
          </View>

          {/* Footer Actions */}
          <View style={dynamicStyles.footer}>
            <TouchableOpacity style={dynamicStyles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={dynamicStyles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={dynamicStyles.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={dynamicStyles.saveBtnText}>Lưu ngân sách</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalBox: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 24,
      width: '100%',
      maxWidth: 520,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 22,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#F1F5F9',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: isDark ? '#047857' : '#A7F3D0',
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: isDark ? '#F1F5F9' : '#0F172A',
    },
    modalSubtitle: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
      justifyContent: 'center',
      alignItems: 'center',
    },
    body: {
      paddingHorizontal: 22,
      paddingVertical: 18,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? '#991B1B' : '#FCA5A5',
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
    },
    errorText: {
      fontSize: 12,
      color: isDark ? '#FCA5A5' : '#DC2626',
      fontWeight: '600',
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#CBD5E1' : '#334155',
      marginBottom: 6,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
    },
    currencyPrefix: {
      fontSize: 18,
      fontWeight: '800',
      color: '#059669',
      marginRight: 6,
    },
    textInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: isDark ? '#F1F5F9' : '#0F172A',
      height: '100%',
    },
    presetsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    presetChip: {
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },
    presetChipActive: {
      backgroundColor: '#059669',
      borderColor: '#047857',
    },
    presetChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#475569',
    },
    presetChipTextActive: {
      color: '#FFFFFF',
    },
    previewCard: {
      marginTop: 18,
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },
    previewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    previewLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    progressBarTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? '#334155' : '#E2E8F0',
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    previewFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    previewFooterText: {
      fontSize: 11,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    previewFooterPercent: {
      fontSize: 11,
      fontWeight: '800',
      color: isDark ? '#F1F5F9' : '#0F172A',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      paddingHorizontal: 22,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#334155' : '#F1F5F9',
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
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
      color: isDark ? '#94A3B8' : '#64748B',
    },
    saveBtn: {
      backgroundColor: '#059669',
      paddingHorizontal: 22,
      paddingVertical: 10,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#059669',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    saveBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
