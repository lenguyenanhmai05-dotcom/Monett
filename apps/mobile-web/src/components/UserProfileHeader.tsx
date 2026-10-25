import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

interface UserProfileHeaderProps {
  onEditProfile?: () => void;
  onQuickSave?: () => void;
  onOpenIncome?: () => void;
}

interface GreetingItem {
  id: string;
  text: string;
  gradient: string;
  doodleGradId: string;
  doodleStops: { offset: string; color: string }[];
  renderDoodle: () => React.ReactNode;
}

// 6 lời chào quen thuộc với màu sắc loang loang (watercolor/pastel mesh) độc đáo và hình vẽ tay từng nét (trái tim, hoa, ngôi sao)
const GREETING_ITEMS: GreetingItem[] = [
  {
    id: 'hello',
    text: 'Hello',
    gradient: 'linear-gradient(135deg, #FF6584 0%, #F38181 40%, #B983FF 100%)', // Hồng phấn dâu loang tím lavender mộng mơ
    doodleGradId: 'doodle-hello',
    doodleStops: [
      { offset: '0%', color: '#FF6584' },
      { offset: '50%', color: '#F38181' },
      { offset: '100%', color: '#B983FF' },
    ],
    // Trái tim vẽ tay nét uốn lượn dễ thương
    renderDoodle: () => (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="monett-doodle-svg">
        <defs>
          <linearGradient id="doodle-hello" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6584" />
            <stop offset="50%" stopColor="#F38181" />
            <stop offset="100%" stopColor="#B983FF" />
          </linearGradient>
        </defs>
        <path
          className="monett-doodle-path"
          d="M 19 32 C 13.5 26.5 4.5 19.5 4.5 12 C 4.5 7 8.5 3.5 13 3.5 C 16.5 3.5 18 5.5 19 7 C 20 5.5 21.5 3.5 25 3.5 C 29.5 3.5 33.5 7 33.5 12 C 33.5 19.5 24.5 26.5 19 32 Z"
          stroke="url(#doodle-hello)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="monett-doodle-path-accent"
          d="M 11 8 C 9 9 8 11.5 8 13.5"
          stroke="url(#doodle-hello)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'xinchao',
    text: 'Xin chào',
    gradient: 'linear-gradient(135deg, #00D2FF 0%, #3a7bd5 45%, #00F260 100%)', // Xanh ngọc lam biển sâu loang xanh bạc hà thanh khiết
    doodleGradId: 'doodle-xinchao',
    doodleStops: [
      { offset: '0%', color: '#00D2FF' },
      { offset: '50%', color: '#3a7bd5' },
      { offset: '100%', color: '#00F260' },
    ],
    // Ngôi sao lấp lánh lãng mạn vẽ từng nét
    renderDoodle: () => (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="monett-doodle-svg">
        <defs>
          <linearGradient id="doodle-xinchao" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D2FF" />
            <stop offset="50%" stopColor="#3a7bd5" />
            <stop offset="100%" stopColor="#00F260" />
          </linearGradient>
        </defs>
        <path
          className="monett-doodle-path"
          d="M 19 3 C 19 11.5 22 15 31 19 C 22 23 19 26.5 19 35 C 19 26.5 16 23 7 19 C 16 15 19 11.5 19 3 Z"
          stroke="url(#doodle-xinchao)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="31" cy="8" r="2" fill="#00D2FF" />
        <circle cx="8" cy="30" r="1.6" fill="#00F260" />
      </svg>
    ),
  },
  {
    id: 'bonjour',
    text: 'Bonjour',
    gradient: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 50%, #F000FF 100%)', // Tím oải hương Paris loang hồng sen quý phái
    doodleGradId: 'doodle-bonjour',
    doodleStops: [
      { offset: '0%', color: '#8E2DE2' },
      { offset: '50%', color: '#4A00E0' },
      { offset: '100%', color: '#F000FF' },
    ],
    // Bông hoa hồng Paris vẽ từng cánh lãng mạn
    renderDoodle: () => (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="monett-doodle-svg">
        <defs>
          <linearGradient id="doodle-bonjour" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8E2DE2" />
            <stop offset="50%" stopColor="#4A00E0" />
            <stop offset="100%" stopColor="#F000FF" />
          </linearGradient>
        </defs>
        {/* Nụ hoa vẽ tay */}
        <path
          className="monett-doodle-path"
          d="M 19 16 C 15 10 10 14 14 19 C 17 21 21 21 24 19 C 28 14 23 10 19 16 Z"
          stroke="url(#doodle-bonjour)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Cành và lá */}
        <path
          className="monett-doodle-path-accent"
          d="M 19 21 Q 19 30 20 35 M 19 27 Q 26 25 28 21 M 19 29 Q 12 28 10 24"
          stroke="url(#doodle-bonjour)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'konnichiwa',
    text: 'こんにちは',
    gradient: 'linear-gradient(135deg, #FF758C 0%, #FF7EB3 50%, #FFA07A 100%)', // Hoa anh đào Nhật Bản loang hồng đào ngọt ngào
    doodleGradId: 'doodle-konnichiwa',
    doodleStops: [
      { offset: '0%', color: '#FF758C' },
      { offset: '50%', color: '#FF7EB3' },
      { offset: '100%', color: '#FFA07A' },
    ],
    // Bông hoa anh đào Sakura 5 cánh vẽ tay từng nét
    renderDoodle: () => (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="monett-doodle-svg">
        <defs>
          <linearGradient id="doodle-konnichiwa" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF758C" />
            <stop offset="50%" stopColor="#FF7EB3" />
            <stop offset="100%" stopColor="#FFA07A" />
          </linearGradient>
        </defs>
        {/* 5 cánh hoa anh đào nở */}
        <path
          className="monett-doodle-path"
          d="M 19 14 C 18 7 24 7 21 14 C 28 10 30 16 23 18 C 29 23 26 27 21 22 C 22 29 16 29 17 22 C 12 27 9 23 15 18 C 8 16 10 10 17 14 Z"
          stroke="url(#doodle-konnichiwa)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="19" cy="18" r="2.4" fill="#FF758C" />
      </svg>
    ),
  },
  {
    id: 'annyeong',
    text: '안녕하세요',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 50%, #7F00FF 100%)', // Cực quang huyền ảo (Xanh ngọc băng loang tím neon)
    doodleGradId: 'doodle-annyeong',
    doodleStops: [
      { offset: '0%', color: '#4facfe' },
      { offset: '50%', color: '#00f2fe' },
      { offset: '100%', color: '#7F00FF' },
    ],
    // Trái tim đôi lồng nhau phong cách Hàn Quốc vẽ từng nét
    renderDoodle: () => (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="monett-doodle-svg">
        <defs>
          <linearGradient id="doodle-annyeong" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4facfe" />
            <stop offset="50%" stopColor="#00f2fe" />
            <stop offset="100%" stopColor="#7F00FF" />
          </linearGradient>
        </defs>
        {/* Trái tim lớn */}
        <path
          className="monett-doodle-path"
          d="M 15 28 C 10 23 4 17.5 4 12 C 4 7.5 7.5 4.5 11 4.5 C 13.8 4.5 15.5 6 16.5 7.5 C 17.5 6 19.2 4.5 22 4.5 C 25.5 4.5 29 7.5 29 12 C 29 17.5 21 23 15 28 Z"
          stroke="url(#doodle-annyeong)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Trái tim nhỏ bay bổng góc trên */}
        <path
          className="monett-doodle-path-accent"
          d="M 26 17 C 24 14 20.5 11.5 20.5 8.5 C 20.5 6.5 22 5 24 5 C 25.5 5 26.5 6 27 7 C 27.5 6 28.5 5 30 5 C 32 5 33.5 6.5 33.5 8.5 C 33.5 11.5 30 14 26 17 Z"
          stroke="url(#doodle-annyeong)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'hola',
    text: 'Hola',
    gradient: 'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)', // Hồng san hô loang vàng ánh nắng nhẹ nhàng, ấm áp
    doodleGradId: 'doodle-hola',
    doodleStops: [
      { offset: '0%', color: '#FA709A' },
      { offset: '100%', color: '#FEE140' },
    ],
    // Bông hoa cúc họa mi / hướng dương tươi vui vẽ từng cánh
    renderDoodle: () => (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none" className="monett-doodle-svg">
        <defs>
          <linearGradient id="doodle-hola" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FA709A" />
            <stop offset="100%" stopColor="#FEE140" />
          </linearGradient>
        </defs>
        {/* Nhụy hoa */}
        <circle cx="19" cy="19" r="3.5" fill="#FEE140" />
        {/* Các cánh hoa vẽ nét tự nhiên */}
        <path
          className="monett-doodle-path"
          d="M 19 14.5 C 18 9 20 9 19 14.5 M 22.5 16 C 27 12 28 14 23 17 M 23.5 20.5 C 28 22 27 24 23 21.5 M 20 23.5 C 20 29 18 29 18 23.5 M 15.5 21.5 C 11 24 10 22 15 20 M 15 17 C 10 14 11 12 16 16"
          stroke="url(#doodle-hola)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({ onQuickSave, onOpenIncome }) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  // Hiệu ứng chữ gõ từng ký tự với font bay bổng nghệ thuật đa màu sắc, không xóa ngược
  const [wordIdx, setWordIdx] = useState(0);
  const [displayedChars, setDisplayedChars] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const currentItem = GREETING_ITEMS[wordIdx];
  const currentWordChars = useMemo(() => Array.from(currentItem.text), [currentItem.text]);
  const displayedText = currentWordChars.slice(0, displayedChars).join('');
  const isWordComplete = displayedChars >= currentWordChars.length;

  useEffect(() => {
    // 1. Chuyển cảnh (fade out từ cũ để sang từ mới - không xóa ngược)
    if (isExiting) {
      const exitTimer = setTimeout(() => {
        setWordIdx((prev) => (prev + 1) % GREETING_ITEMS.length);
        setDisplayedChars(0);
        setIsExiting(false);
      }, 320);
      return () => clearTimeout(exitTimer);
    }

    // 2. Viết xong từ + hình vẽ nét xong -> giữ nguyên 2.6s để ngắm trọn vẹn
    if (isWordComplete) {
      const holdTimer = setTimeout(() => {
        setIsExiting(true);
      }, 2600);
      return () => clearTimeout(holdTimer);
    }

    // 3. Gõ từng chữ một cách mượt mà (110ms)
    const typeTimer = setTimeout(() => {
      setDisplayedChars((prev) => prev + 1);
    }, 110);

    return () => clearTimeout(typeTimer);
  }, [displayedChars, isExiting, isWordComplete]);

  return (
    <View style={styles.headerContainer}>
      {/* Web Keyframes & Styles cho Font Cursive Bay Bổng và Animation Vẽ Nét Doodle */}
      {Platform.OS === 'web' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Dancing+Script:wght@600;700;800&family=Pacifico&family=Plus+Jakarta+Sans:wght@600;700;800&family=Zen+Maru+Gothic:wght@700;900&display=swap');

              .monett-script-container {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                flex-wrap: nowrap !important;
                white-space: nowrap !important;
                min-height: 58px !important;
                transition: opacity 0.32s cubic-bezier(0.4, 0, 0.2, 1), transform 0.32s cubic-bezier(0.4, 0, 0.2, 1) !important;
                user-select: none !important;
              }
              .monett-script-container.exiting {
                opacity: 0 !important;
                transform: translateY(-8px) scale(0.96) !important;
              }
              .monett-script-container.entering {
                opacity: 1 !important;
                transform: translateY(0) scale(1) !important;
              }

              .monett-gradient-script {
                font-family: 'Dancing Script', 'Pacifico', 'Caveat', 'Zen Maru Gothic', cursive, sans-serif !important;
                font-size: 52px !important;
                font-weight: 700 !important;
                line-height: 1.2 !important;
                letter-spacing: 0.5px !important;
                display: inline-block !important;
                background-clip: text !important;
                -webkit-background-clip: text !important;
                -webkit-text-fill-color: transparent !important;
                filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.08)) !important;
                padding-bottom: 4px !important;
                vertical-align: middle !important;
              }

              /* Hiệu ứng vẽ nét từng nét cho hình doodle (trái tim, hoa, ngôi sao) */
              @keyframes monettDrawStroke {
                0% {
                  stroke-dashoffset: 240;
                  opacity: 0;
                }
                15% {
                  opacity: 1;
                }
                100% {
                  stroke-dashoffset: 0;
                  opacity: 1;
                }
              }

              @keyframes monettDoodleFloat {
                0%, 100% {
                  transform: translateY(0) scale(1) rotate(0deg);
                }
                50% {
                  transform: translateY(-4px) scale(1.08) rotate(3deg);
                }
              }

              .monett-doodle-wrapper {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin-left: 12px !important;
                vertical-align: middle !important;
                flex-shrink: 0 !important;
                animation: monettDoodleFloat 2.2s ease-in-out infinite 0.7s !important;
              }

              .monett-doodle-path {
                stroke-dasharray: 240;
                stroke-dashoffset: 240;
                animation: monettDrawStroke 0.7s cubic-bezier(0.25, 1, 0.5, 1) forwards !important;
                filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.08)) !important;
              }

              .monett-doodle-path-accent {
                stroke-dasharray: 120;
                stroke-dashoffset: 120;
                animation: monettDrawStroke 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.25s forwards !important;
              }
            `,
          }}
        />
      )}

      {/* Dòng chữ nghệ thuật bay bổng nhiều màu sắc kèm hình vẽ tay nét THẲNG HÀNG NGANG NGAY SAU CHỮ */}
      <View style={styles.greetingContent}>
        {Platform.OS === 'web' ? (
          <div
            className={`monett-script-container ${isExiting ? 'exiting' : 'entering'}`}
            style={{
              display: 'inline-flex',
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'nowrap',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              className="monett-gradient-script"
              style={{
                backgroundImage: currentItem.gradient,
              }}
            >
              {displayedText}
            </span>

            {/* Hình vẽ tay từng nét (trái tim, hoa, ngôi sao) ĐỨNG NGANG HÀNG NGAY SAU CHỮ */}
            {isWordComplete && (
              <span
                className="monett-doodle-wrapper"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  marginLeft: 10,
                  flexShrink: 0,
                }}
              >
                {currentItem.renderDoodle()}
              </span>
            )}
          </div>
        ) : (
          <View style={styles.nativeRow}>
            <Text style={styles.fallbackScriptText}>{displayedText}</Text>
          </View>
        )}
      </View>

      {/* Góc bên phải: Action Group cân bằng, tinh tế */}
      <View style={styles.headerRightActions}>
        {onOpenIncome && (
          <TouchableOpacity
            style={styles.addIncomeBtn}
            onPress={onOpenIncome}
            activeOpacity={0.82}
          >
            <View style={styles.addIncomeIconCircle}>
              <Ionicons name="add" size={15} color="#064E3B" />
            </View>
            <Text style={styles.addIncomeText}>
              {isVi ? 'Thêm thu nhập' : 'Add Income'}
            </Text>
          </TouchableOpacity>
        )}

        {onQuickSave && (
          <TouchableOpacity
            style={styles.quickSaveBtn}
            onPress={onQuickSave}
            activeOpacity={0.82}
          >
            <View style={styles.quickSaveIconCircle}>
              <Ionicons name="flash" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.quickSaveText}>
              {isVi ? 'Lưu nhanh' : 'Quick Save'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 6,
    width: '100%',
    flexWrap: 'wrap',
    gap: 12,
  },
  greetingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    flexWrap: 'nowrap',
  },
  nativeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  fallbackScriptText: {
    fontSize: 44,
    fontWeight: '700',
    color: '#064E3B',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  addIncomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    cursor: 'pointer' as any,
  },
  addIncomeIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIncomeText: {
    fontFamily: Platform.OS === 'web' ? "'Plus Jakarta Sans', sans-serif" : undefined,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#064E3B',
    letterSpacing: 0.2,
  },
  quickSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#064E3B',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#34D399',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
    cursor: 'pointer' as any,
  },
  quickSaveIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickSaveText: {
    fontFamily: Platform.OS === 'web' ? "'Plus Jakarta Sans', sans-serif" : undefined,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
