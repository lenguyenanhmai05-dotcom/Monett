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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  currentLimit = 22000000,
  currentPayday = 5,
  currentSpent = 6180000,
}) => {
  const [limitStr, setLimitStr] = useState<string>(String(currentLimit));
  const [paydayStr, setPaydayStr] = useState<string>(String(currentPayday));
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setLimitStr(String(currentLimit));
      setPaydayStr(String(currentPayday));
    }
  }, [visible, currentLimit, currentPayday]);

  const numLimit = Math.max(0, parseInt(limitStr.replace(/\D/g, '') || '0', 10));
  const numPayday = Math.min(31, Math.max(1, parseInt(paydayStr.replace(/\D/g, '') || '5', 10)));

  const presetLimits = [10000000, 15000000, 20000000, 25000000, 30000000];

  // Dự tính tỷ lệ chi tiêu nếu đổi hạn mức
  const previewSpentPercent = numLimit > 0 ? Number(((currentSpent / numLimit) * 100).toFixed(1)) : 0;
  const isDanger = previewSpentPercent > 100;
  const isWarning = previewSpentPercent >= 80 && !isDanger;

  const handleSave = async () => {
    if (numLimit <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập hạn mức lớn hơn 0 đ');
      return;
    }

    try {
      setLoading(true);
      const res = await setBudgetApi({
        limit: numLimit,
        payday: numPayday,
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
          spentPercent: previewSpentPercent,
          remainingPercent: Math.max(0, Number((100 - previewSpentPercent).toFixed(1))),
          status: isDanger ? 'danger' : isWarning ? 'warning' : 'safe',
          payday: numPayday,
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
                <Ionicons name="wallet-outline" size={20} color="#059669" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Thiết Lập Ngân Sách Tháng</Text>
                <Text style={styles.modalSubtitle}>Kiểm soát hạn mức và cảnh báo chi tiêu</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <View style={styles.body}>
            {/* 1. Hạn mức chi tiêu */}
            <Text style={styles.inputLabel}>Hạn mức chi tiêu mong muốn (VND):</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencyPrefix}>₫</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={numLimit > 0 ? numLimit.toLocaleString('vi-VN') : ''}
                onChangeText={(text) => setLimitStr(text.replace(/\D/g, ''))}
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

            {/* 2. Ngày trả lương định kỳ */}
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Ngày nhận lương định kỳ (1 - 31):</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={18} color="#64748B" style={{ marginLeft: 4, marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={paydayStr}
                onChangeText={setPaydayStr}
                placeholder="05"
                placeholderTextColor="#94A3B8"
                maxLength={2}
              />
            </View>

            {/* 3. Xem trước trạng thái tiến độ & Cảnh báo màu */}
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewLabel}>Mô phỏng tỷ lệ chi hiện tại:</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isDanger ? '#FEF2F2' : isWarning ? '#FFFBEB' : '#ECFDF5',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: isDanger ? '#DC2626' : isWarning ? '#D97706' : '#059669' },
                    ]}
                  >
                    {isDanger ? '🚨 Vượt ngân sách' : isWarning ? '⚠️ Trên 80% (Cảnh báo)' : '✅ An toàn'}
                  </Text>
                </View>
              </View>

              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, previewSpentPercent)}%`,
                      backgroundColor: isDanger ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981',
                    },
                  ]}
                />
              </View>

              <View style={styles.previewFooterRow}>
                <Text style={styles.previewFooterText}>
                  Đã tiêu: {currentSpent.toLocaleString('vi-VN')} đ
                </Text>
                <Text style={styles.previewFooterPercent}>{previewSpentPercent}%</Text>
              </View>
            </View>
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Lưu ngân sách</Text>
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
    height: 44,
    backgroundColor: '#F8FAFC',
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
    color: '#0F172A',
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  previewCard: {
    marginTop: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#64748B',
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
    backgroundColor: '#E2E8F0',
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
    color: '#64748B',
  },
  previewFooterPercent: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
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
