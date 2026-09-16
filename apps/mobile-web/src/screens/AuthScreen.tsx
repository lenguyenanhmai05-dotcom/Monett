import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { GOOGLE_LOGO_URI } from '../components/SocialLogos';

export const AuthScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;

  const { login, register } = useAuth();
  const { language, t } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hover state cho chú ếch to & badge nổi
  const [isFrogHovered, setIsFrogHovered] = useState(false);
  const [hoveredBadge, setHoveredBadge] = useState<number | null>(null);

  const passwordInputRef = useRef<any>(null);

  // Hiệu ứng bập bềnh nổi êm dịu cho Bé Ếch to (Gentle Float & Ground Shadow)
  const frogFloatY = useRef(new Animated.Value(0)).current;
  const shadowScale = useRef(new Animated.Value(1)).current;

  // Hiệu ứng hiện badge nổi trên đầu khi rê chuột
  const hoverAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(hoverAnim, {
      toValue: isFrogHovered ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isFrogHovered, hoverAnim]);

  useEffect(() => {
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(frogFloatY, {
            toValue: -9,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(shadowScale, {
            toValue: 0.85,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(frogFloatY, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(shadowScale, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      ]),
    );

    floatAnimation.start();
    return () => floatAnimation.stop();
  }, [frogFloatY, shadowScale]);



  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg(
        language === 'vi'
          ? 'Vui lòng nhập đầy đủ Email và Mật khẩu'
          : 'Please enter both Email and Password',
      );
      return;
    }
    if (mode === 'register' && !fullName.trim()) {
      setErrorMsg(
        language === 'vi'
          ? 'Vui lòng nhập họ và tên của bạn'
          : 'Please enter your full name',
      );
      return;
    }

    try {
      setLoading(true);
      if (mode === 'login') {
        await login({ email: email.trim(), password });
      } else {
        await register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          currency: 'VND',
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ===================== TOÀN BỘ MÀN HÌNH MÀU XANH TRẢI RỘNG ===================== */}
      <View
        style={[
          styles.mainLayout,
          isDesktop ? styles.desktopLayout : styles.mobileLayout,
        ]}
      >
        {/* ===================== KHU VỰC BÊN TRÁI: SHOWCASE TINH GỌN, HOVER XEM CHI TIẾT ===================== */}
        <View
          style={[
            styles.leftShowcase,
            isDesktop ? styles.desktopLeft : styles.mobileLeft,
          ]}
        >
          {/* CỤM PHÍA TRÊN: LOGO & 2 CÂU GIỚI THIỆU THEO YÊU CẦU */}
          <View style={styles.leftTopGroup}>
            {/* Top Bar: Brand Logo & Tag */}
            <View style={styles.leftTopBar}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require('../../assets/monett-logo.png')}
                  style={styles.logoImage as any}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandBadge}>
                <View style={styles.greenPulseDot} />
                <Text style={styles.brandBadgeText}>{t.brandTag}</Text>
              </View>
            </View>

            {/* 2 CÂU TIÊU ĐỀ & GIỚI THIỆU CHUẨN XÁC THEO HÌNH ẢNH */}
            <View style={styles.headlineBox}>
              <Text style={styles.headlineTitle}>
                {t.heroTitle1}{' '}
                <Text style={styles.headlineHighlight}>{t.heroTitleHighlight}</Text>
              </Text>
              <Text style={styles.headlineDesc}>{t.heroSubtitle}</Text>
            </View>
          </View>

          {/* KHU VỰC BÉ ẾCH TO NÓN LÁ CẦM ĐỒNG XU & BADGES NỔI TRÊN ĐẦU KHI RƠ CHUỘT */}
          <View
            style={styles.mascotStage}
            // @ts-ignore
            onMouseEnter={() => setIsFrogHovered(true)}
            // @ts-ignore
            onMouseLeave={() => {
              setIsFrogHovered(false);
              setHoveredBadge(null);
            }}
          >
            {/* CỤM BADGES NỔI TRÊN ĐẦU CHÚ ẾCH: 1-CHẠM, LỊCH ẢNH TRỰC QUAN, CHUỖI STREAK */}
            <Animated.View
              pointerEvents={isFrogHovered ? 'auto' : 'none'}
              style={[
                styles.floatingHeaderContainer,
                {
                  opacity: hoverAnim,
                  transform: [
                    {
                      translateY: hoverAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 0],
                      }),
                    },
                    {
                      scale: hoverAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.93, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.floatingBadgesBubble}>
                <View style={styles.floatingBadgesRow}>
                  {/* Badge 1: 1-Chạm Ghi Nhận */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    // @ts-ignore
                    onMouseEnter={() => setHoveredBadge(0)}
                    // @ts-ignore
                    onMouseLeave={() => setHoveredBadge(null)}
                    style={[
                      styles.floatingBadgeItem,
                      styles.badgeMint,
                      hoveredBadge === 0 && styles.badgeItemActive,
                    ]}
                  >
                    <Text style={styles.badgeEmoji}>📸</Text>
                    <View style={styles.badgeTextBox}>
                      <Text style={styles.badgeTitle}>
                        {language === 'vi' ? '1-Chạm Ghi Nhận' : '1-Tap Snap'}
                      </Text>
                      <Text style={styles.badgeSub}>
                        {hoveredBadge === 0
                          ? (language === 'vi' ? 'Lưu ảnh hóa đơn tức thì' : 'Instant receipt photo')
                          : (language === 'vi' ? 'Chụp ảnh tức thì' : 'Instant capture')}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Badge 2: Lịch Ảnh Trực Quan */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    // @ts-ignore
                    onMouseEnter={() => setHoveredBadge(1)}
                    // @ts-ignore
                    onMouseLeave={() => setHoveredBadge(null)}
                    style={[
                      styles.floatingBadgeItem,
                      styles.badgeAmber,
                      hoveredBadge === 1 && styles.badgeItemActive,
                    ]}
                  >
                    <Text style={styles.badgeEmoji}>📅</Text>
                    <View style={styles.badgeTextBox}>
                      <Text style={styles.badgeTitle}>
                        {language === 'vi' ? 'Lịch Ảnh Trực Quan' : 'Visual Diary'}
                      </Text>
                      <Text style={styles.badgeSub}>
                        {hoveredBadge === 1
                          ? (language === 'vi' ? 'Dòng thời gian sống động' : 'Vibrant photo timeline')
                          : (language === 'vi' ? 'Album chi tiêu' : 'Photo album')}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Badge 3: Chuỗi Streak */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    // @ts-ignore
                    onMouseEnter={() => setHoveredBadge(2)}
                    // @ts-ignore
                    onMouseLeave={() => setHoveredBadge(null)}
                    style={[
                      styles.floatingBadgeItem,
                      styles.badgeCoral,
                      hoveredBadge === 2 && styles.badgeItemActive,
                    ]}
                  >
                    <Text style={styles.badgeEmoji}>🔥</Text>
                    <View style={styles.badgeTextBox}>
                      <Text style={styles.badgeTitle}>
                        {language === 'vi' ? 'Chuỗi Kỷ Luật' : 'Streak Habit'}
                      </Text>
                      <Text style={styles.badgeSub}>
                        {hoveredBadge === 2
                          ? (language === 'vi' ? 'Giữ lửa tài chính 18 ngày' : '18-day active streak')
                          : (language === 'vi' ? 'Duy trì thói quen' : 'Mindful habit')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Mũi tên chỉ xuống nón lá của Bé Ếch */}
                <View style={styles.bubbleArrowDown} />
              </View>
            </Animated.View>

            {/* HÌNH ẢNH BÉ ẾCH TO NÓN LÁ CẦM ĐỒNG TIỀN VÀNG */}
            <Animated.View
              style={[
                styles.bigFrogMascotBox,
                {
                  transform: [
                    { translateY: frogFloatY },
                    { scale: isFrogHovered ? 1.04 : 1 },
                  ],
                },
              ]}
            >
              <Image
                source={require('../../assets/frog-hat-coin.png')}
                style={styles.bigFrogMascotImage as any}
                resizeMode="contain"
              />
            </Animated.View>

            {/* BÓNG ĐỔ DƯỚI CHÂN CHÚ ẾCH */}
            <Animated.View
              style={[
                styles.frogGroundShadow,
                {
                  transform: [{ scaleX: shadowScale }, { scaleY: shadowScale }],
                },
              ]}
            />

            {/* HUY HIỆU CHUỖI KỶ LUẬT TINH TẾ DƯỚI CHÂN BÉ ẾCH (ĐÃ BỎ 180 COINS THEO YÊU CẦU) */}
            <View style={styles.mascotStreakPill}>
              <Text style={styles.mascotStreakFire}>🔥</Text>
              <Text style={styles.mascotStreakTitle}>
                {language === 'vi'
                  ? 'Chuỗi 18 ngày giữ lửa chi tiêu'
                  : '18-Day Mindful Spending Streak'}
              </Text>
            </View>
          </View>
        </View>

        {/* ===================== KHU VỰC BÊN PHẢI: BẢNG ĐĂNG KÝ / ĐĂNG NHẬP MÀU XANH EMERALD NỔI BẬT ===================== */}
        <View
          style={[
            styles.rightSection,
            isDesktop ? styles.desktopRightSection : styles.mobileRightSection,
          ]}
        >
          {/* Bảng Đăng Ký / Đăng Nhập Màu Xanh Rừng Ngọc Lục Bảo (Deep Emerald) Sang Trọng */}
          <View style={styles.authCard}>
            {/* Top Bar Right: Bộ chuyển đổi ngôn ngữ Việt - Anh */}
            <View style={styles.rightTopBar}>
              <LanguageToggle />
            </View>

            {/* Tabs Chuyển đổi Đăng nhập / Đăng ký */}
            <View style={styles.segmentContainer}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  mode === 'login' && styles.segmentBtnActive,
                ]}
                onPress={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    mode === 'login' && styles.segmentTextActive,
                  ]}
                >
                  {t.tabLogin}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  mode === 'register' && styles.segmentBtnActive,
                ]}
                onPress={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    mode === 'register' && styles.segmentTextActive,
                  ]}
                >
                  {t.tabRegister}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Header Form: Tinh gọn, không còn chữ rườm rà gây rối */}
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {mode === 'login' ? `${t.welcomeBack} 👋` : `${t.getStarted} ✨`}
              </Text>
            </View>

            {/* Thông báo lỗi nếu có */}
            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.inputsGroup}>
              {/* Trường Họ tên khi đăng ký */}
              {mode === 'register' && (
                <View style={styles.fieldItem}>
                  <Text style={styles.fieldLabel}>{t.fullNameLabel}</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLeadingIcon}>👤</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder={t.fullNamePlaceholder}
                      placeholderTextColor="#94A3B8"
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>
                </View>
              )}

              {/* Email Field */}
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>{t.emailLabel}</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLeadingIcon}>✉️</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t.emailPlaceholder}
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    returnKeyType="next"
                    onSubmitEditing={() => {
                      if (password.trim()) {
                        handleSubmit();
                      } else {
                        passwordInputRef.current?.focus();
                      }
                    }}
                    onKeyPress={(e: any) => {
                      if (e.nativeEvent?.key === 'Enter') {
                        if (password.trim()) {
                          handleSubmit();
                        } else {
                          passwordInputRef.current?.focus();
                        }
                      }
                    }}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.fieldItem}>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.fieldLabel}>{t.passwordLabel}</Text>
                  {mode === 'login' && (
                    <TouchableOpacity>
                      <Text style={styles.forgotPasswordText}>
                        {t.forgotPassword}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLeadingIcon}>🔒</Text>
                  <TextInput
                    ref={passwordInputRef}
                    style={styles.textInput}
                    placeholder={t.passwordPlaceholder}
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
                    onKeyPress={(e: any) => {
                      if (e.nativeEvent?.key === 'Enter') {
                        handleSubmit();
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Checkbox Ghi nhớ đăng nhập */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    rememberMe && styles.checkboxBoxChecked,
                  ]}
                >
                  {rememberMe && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  {mode === 'login' ? t.rememberMe : t.agreeTerms}
                </Text>
              </TouchableOpacity>

              {/* Nút CTA Chính (Nổi bật, Trắng sáng tương phản cao trên nền Emerald) */}
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#064E3B" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.submitBtnText}>
                      {mode === 'login' ? t.ctaLogin : t.ctaRegister}
                    </Text>
                    <Text style={styles.arrowIcon}>➔</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Đường phân cách chuẩn web chuyên nghiệp */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>
                  {language === 'vi' ? 'HOẶC' : 'OR'}
                </Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Nút Đăng nhập Google 1 hàng duy nhất (Bỏ Apple ID theo yêu cầu) */}
              <View style={styles.socialButtonsRow}>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
                  <Image
                    source={{ uri: GOOGLE_LOGO_URI }}
                    style={styles.socialSvgIcon as any}
                    resizeMode="contain"
                  />
                  <Text style={styles.socialBtnText}>{t.continueWithGoogle}</Text>
                </TouchableOpacity>
              </View>

              {/* Điều khoản & Quy định */}
              <View style={styles.termsFooter}>
                <Text style={styles.termsText}>
                  {t.termsNoticePrefix}{' '}
                  <Text style={styles.termsLink}>{t.termsLink}</Text>{' '}
                  {t.termsNoticeAnd}{' '}
                  <Text style={styles.termsLink}>{t.privacyLink}</Text>{' '}
                  {t.termsNoticeSuffix}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#EAF8F0', // Màn hình màu xanh trải rộng toàn màn hình
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Main Layout
  mainLayout: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  desktopLayout: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 48,
    minHeight: '88vh' as any,
    paddingTop: 24,
  },
  mobileLayout: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  // ==================== KHU VỰC BÊN TRÁI ====================
  leftShowcase: {
    justifyContent: 'center',
    flexDirection: 'column',
  },
  desktopLeft: {
    width: 610,
  },
  mobileLeft: {
    width: '100%',
    marginBottom: 32,
  },
  leftTopGroup: {
    width: '100%',
  },
  leftTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  logoWrapper: {
    height: 64,
    width: 164,
    justifyContent: 'center',
  },
  logoImage: {
    height: '100%',
    width: '100%',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 7,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  brandBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.2,
  },

  // Tiêu đề & Giới thiệu 2 câu theo yêu cầu
  headlineBox: {
    marginBottom: 4,
    width: '100%',
  },
  headlineTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 36,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  headlineHighlight: {
    color: '#059669',
  },
  headlineDesc: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 21,
    width: '100%',
  },

  // Sân khấu tương tác của Bé Ếch to (Kéo lên lấp đầy khoảng trống)
  mascotStage: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 12,
    paddingBottom: 4,
    marginTop: -14, // Kéo chú ếch to lên lấp đầy khoảng trống phía trên
    width: '100%',
    // @ts-ignore
    cursor: 'pointer',
  },

  // Cụm badge nổi trên đầu chú ếch (Đè nhẹ lên phần chữ phía trên khi hover theo yêu cầu)
  floatingHeaderContainer: {
    position: 'absolute',
    top: -46, // Đặt nổi lên trên đỉnh nón lá, đè nhẹ lên dòng chữ
    zIndex: 50,
    alignItems: 'center',
    width: '100%',
  },
  floatingBadgesBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
    alignItems: 'center',
    position: 'relative',
  },
  floatingBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  bubbleArrowDown: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  floatingBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  badgeItemActive: {
    transform: [{ scale: 1.05 }],
    borderColor: '#059669',
  },
  badgeMint: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  badgeAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  badgeCoral: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  badgeEmoji: {
    fontSize: 16,
  },
  badgeTextBox: {
    justifyContent: 'center',
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 15,
  },
  badgeSub: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 13,
  },

  // Bé Ếch to nón lá (Phóng to 470px cực kỳ hoành tráng & lấp đầy không gian)
  bigFrogMascotBox: {
    width: 470,
    height: 470,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    // @ts-ignore
    transition: 'transform 0.25s ease',
  },
  bigFrogMascotImage: {
    width: '100%',
    height: '100%',
  },
  frogGroundShadow: {
    width: 290,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(5, 150, 105, 0.16)',
    marginTop: -94, // Kéo bóng sát rạt chân chú ếch 470px
    zIndex: 5,
  },

  // Huy hiệu Chuỗi Kỷ Luật Tinh Tế Dưới Chân Bé Ếch (Chỉ giữ chuỗi 18 ngày, bỏ 180 coins)
  mascotStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#10B981',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 14,
    gap: 7,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  mascotStreakFire: {
    fontSize: 14,
  },
  mascotStreakTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.2,
  },

  // ==================== KHU VỰC BÊN PHẢI: BẢNG FORM MÀU XANH EMERALD NỔI BẬT ====================
  rightSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopRightSection: {
    width: 440,
    marginLeft: 28,
  },
  mobileRightSection: {
    width: '100%',
  },

  // Bảng Đăng Ký / Đăng Nhập Màu Trắng Tinh Khôi Sang Trọng (Pure White Luxury Card) với Viền Xanh Lá Nổi Bật
  authCard: {
    width: '100%',
    backgroundColor: '#FFFFFF', // Bảng trắng tinh khôi sang trọng, sáng sủa
    borderRadius: 24,
    padding: 30,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 36,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#10B981', // Viền xanh lá emerald nổi bật, sắc nét
  },
  rightTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
  },

  // Segment Tabs
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#A7F3D0', // Viền xanh mint hài hòa
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#059669', // Nút tab ngọc lục bảo nổi bật
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Form Header
  formHeader: {
    marginBottom: 18,
  },
  formTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0F172A', // Chữ đen xám sang trọng
    letterSpacing: -0.3,
  },

  // Error Box
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorIcon: {
    fontSize: 15,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    color: '#DC2626',
    fontWeight: '600',
  },

  // Inputs Group
  inputsGroup: {
    gap: 12,
  },
  fieldItem: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B', // Chữ nhãn rõ nét
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 11.5,
    color: '#059669',
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#10B981', // Viền xanh lá nổi bật cho các ô nhập liệu
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 46,
  },
  inputLeadingIcon: {
    fontSize: 14,
    marginRight: 8,
    color: '#059669',
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 13.5,
    color: '#0F172A',
  },
  eyeBtn: {
    padding: 6,
  },
  eyeIcon: {
    fontSize: 15,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  checkboxBox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '900',
  },
  checkboxLabel: {
    fontSize: 12.5,
    color: '#475569',
  },

  // Nút CTA Chính (Nút Xanh Ngọc Lục Bảo Sang Trọng)
  submitBtn: {
    backgroundColor: '#059669', // Nút xanh ngọc bích rực rỡ, uy tín và hiện đại
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 6,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  arrowIcon: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },

  // Nút Đăng nhập Google 1 Hàng Duy Nhất - Viền Xanh Lá Nổi Bật Theo Yêu Cầu
  socialButtonsRow: {
    marginBottom: 8,
  },
  socialBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#10B981', // Viền xanh lá nổi bật theo đúng yêu cầu
    backgroundColor: '#FFFFFF',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  socialSvgIcon: {
    width: 20,
    height: 20,
  },
  socialBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Terms Footer
  termsFooter: {
    marginTop: 6,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 10.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
  },
  termsLink: {
    color: '#059669',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
