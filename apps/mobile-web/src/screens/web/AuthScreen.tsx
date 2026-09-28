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
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageToggle } from '../../components/LanguageToggle';
import { GOOGLE_LOGO_URI } from '../../components/SocialLogos';
import { requestGoogleLogin } from '../../services/googleAuth';
import { sendOtpApi, verifyOtpApi, forgotPasswordApi, resetPasswordApi } from '../../services/api';

export interface AuthScreenProps {
  initialMode?: 'login' | 'register';
  onBackToHome?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'login',
  onBackToHome,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;
  const isCompact = width >= 980 && width < 1280;
  const isLarge = width >= 1536;

  const { login, register, googleLogin } = useAuth();
  const { language, t } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>(initialMode);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP State cho quy trình đăng ký bằng Email
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);

  // Quên mật khẩu State: 'request' (nhập email) -> 'otp' (chỉ nhập OTP) -> 'new_password' (mật khẩu mới)
  const [forgotStep, setForgotStep] = useState<'request' | 'otp' | 'new_password'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotCountdown, setForgotCountdown] = useState(0);
  const [sendingForgotOtp, setSendingForgotOtp] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);

  // Focus & Hover state cho các khung nhập liệu (Hiệu ứng viền xanh phát sáng, triệt tiêu viền đen)
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hoveredField, setHoveredField] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Kiểm tra độ mạnh mật khẩu chuẩn: 8 ký tự, gồm chữ cái, chữ số, ký tự đặc biệt
  const isPassMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>~`]/.test(password);
  const isPasswordStrong = isPassMinLength && hasLetter && hasNumber && hasSpecialChar;

  // Đếm ngược 60 giây khi gửi mã OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Đếm ngược cho Quên mật khẩu
  useEffect(() => {
    if (forgotCountdown > 0) {
      const timer = setTimeout(() => setForgotCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [forgotCountdown]);


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

  // Bước 1 Đăng ký: Kiểm tra thông tin & Gửi mã OTP, chuyển sang Bước 2
  const handleProceedToOtp = async () => {
    setErrorMsg(null);
    setOtpSuccessMsg(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setErrorMsg(
        language === 'vi'
          ? 'Vui lòng nhập họ và tên của bạn'
          : 'Please enter your full name',
      );
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg(
        language === 'vi'
          ? 'Vui lòng nhập địa chỉ Email'
          : 'Please enter your Email address',
      );
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg(
        language === 'vi'
          ? 'Địa chỉ email không đúng định dạng'
          : 'Invalid email address format',
      );
      return;
    }

    if (!password.trim()) {
      setErrorMsg(
        language === 'vi'
          ? 'Vui lòng nhập mật khẩu'
          : 'Please enter a password',
      );
      return;
    }

    if (!isPasswordStrong) {
      setErrorMsg(
        language === 'vi'
          ? 'Mật khẩu cần tối thiểu 8 ký tự, gồm cả chữ cái, chữ số và ký tự đặc biệt (@, #, $, %, ...)'
          : 'Password must be at least 8 characters and include letters, numbers, and special characters',
      );
      return;
    }

    setLoading(true);
    try {
      await sendOtpApi(trimmedEmail);
      setOtpSent(true);
      setCountdown(60);
      setRegisterStep('otp');
      setOtp('');
      setOtpSuccessMsg(
        language === 'vi'
          ? `Mã xác thực OTP đã được gửi tới ${trimmedEmail}. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam/Rác)!`
          : `Verification code sent to ${trimmedEmail}. Please check your inbox or spam folder!`,
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gửi mã xác thực, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP từ màn hình Bước 2
  const handleResendOtp = async () => {
    if (countdown > 0 || sendingOtp) return;
    setErrorMsg(null);
    setOtpSuccessMsg(null);
    setSendingOtp(true);
    try {
      await sendOtpApi(email.trim());
      setCountdown(60);
      setOtp('');
      setOtpSuccessMsg(
        language === 'vi'
          ? `Đã gửi lại mã OTP tới ${email.trim()}. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam/Rác)!`
          : `OTP has been resent to ${email.trim()}. Please check your inbox or spam folder!`,
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gửi lại mã, vui lòng thử lại sau');
    } finally {
      setSendingOtp(false);
    }
  };

  // Bước 2 Đăng ký: Xác thực OTP và Hoàn tất đăng ký
  const handleVerifyOtpAndRegister = async () => {
    setErrorMsg(null);
    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setErrorMsg(
        language === 'vi'
          ? 'Vui lòng nhập đủ 6 chữ số mã xác thực OTP'
          : 'Please enter all 6 digits of the OTP code',
      );
      return;
    }

    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        otp: trimmedOtp,
        currency: 'VND',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Xác thực không thành công, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  // Mở màn hình Quên mật khẩu
  const handleOpenForgotPassword = () => {
    setMode('forgot_password');
    setForgotStep('request');
    setForgotEmail(email.trim());
    setErrorMsg(null);
    setForgotSuccessMsg(null);
    setForgotOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Gửi OTP đặt lại mật khẩu
  const handleSendForgotOtp = async () => {
    setErrorMsg(null);
    setForgotSuccessMsg(null);

    const trimmedEmail = forgotEmail.trim();
    if (!trimmedEmail) {
      setErrorMsg(
        language === 'vi'
          ? 'Vui lòng nhập địa chỉ Email của bạn'
          : 'Please enter your Email address',
      );
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg(
        language === 'vi'
          ? 'Địa chỉ email không đúng định dạng'
          : 'Invalid email address format',
      );
      return;
    }

    setSendingForgotOtp(true);
    try {
      await forgotPasswordApi(trimmedEmail);
      setForgotStep('otp');
      setForgotCountdown(60);
      setForgotOtp('');
      setForgotSuccessMsg(
        language === 'vi'
          ? `Mã xác thực đã được gửi tới ${trimmedEmail}. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam/Rác)!`
          : `Verification code sent to ${trimmedEmail}. Please check your inbox or spam folder!`,
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gửi mã xác thực, vui lòng thử lại');
    } finally {
      setSendingForgotOtp(false);
    }
  };

  // Bước 2: Xác nhận OTP duy nhất trước khi nhập mật khẩu mới
  const handleVerifyForgotOtp = async () => {
    setErrorMsg(null);
    setForgotSuccessMsg(null);
    const cleanOtp = forgotOtp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg(
        language === 'vi'
          ? 'Vui lòng nhập đầy đủ 6 chữ số mã OTP'
          : 'Please enter 6-digit OTP code',
      );
      return;
    }

    setLoading(true);
    try {
      await verifyOtpApi(forgotEmail.trim(), cleanOtp);
      setForgotStep('new_password');
      setForgotSuccessMsg(
        language === 'vi'
          ? 'Mã OTP chính xác! Bây giờ bạn hãy thiết lập mật khẩu mới.'
          : 'OTP verified! Please set your new password.',
      );
    } catch (err: any) {
      setErrorMsg(err.message || (language === 'vi' ? 'Mã OTP không chính xác hoặc đã hết hạn.' : 'Invalid or expired OTP code.'));
    } finally {
      setLoading(false);
    }
  };

  // Bước 3: Xác nhận OTP và đặt lại mật khẩu mới
  const handleResetPassword = async () => {
    setErrorMsg(null);
    setForgotSuccessMsg(null);

    const isNewPassMinLength = newPassword.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>~`]/.test(newPassword);
    const isNewPassStrong = isNewPassMinLength && hasLetter && hasNumber && hasSpecialChar;

    if (!isNewPassStrong) {
      setErrorMsg(
        language === 'vi'
          ? 'Mật khẩu mới cần tối thiểu 8 ký tự, gồm cả chữ cái, chữ số và ký tự đặc biệt (@, #, $, %, ...)'
          : 'New password must be at least 8 characters and include letters, numbers, and special characters',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(
        language === 'vi'
          ? 'Mật khẩu xác nhận không trùng khớp với mật khẩu mới'
          : 'Confirm password does not match new password',
      );
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi({
        email: forgotEmail.trim(),
        otp: forgotOtp.trim(),
        newPassword,
      });
      // Đổi mật khẩu thành công: Chuyển về tab Login và điền sẵn email
      setEmail(forgotEmail.trim());
      setPassword('');
      setMode('login');
      setOtpSuccessMsg(
        language === 'vi'
          ? 'Đổi mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.'
          : 'Password reset successfully! You can now log in with your new password.',
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể đặt lại mật khẩu, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý nút chính (Đăng nhập cho Login, hoặc Chuyển tiếp cho Register)
  const handleSubmit = async () => {
    if (mode === 'login') {
      setErrorMsg(null);
      if (!email.trim() || !password.trim()) {
        setErrorMsg(
          language === 'vi'
            ? 'Vui lòng nhập đầy đủ Email và Mật khẩu'
            : 'Please enter both Email and Password',
        );
        return;
      }
      setLoading(true);
      try {
        await login({ email: email.trim(), password });
      } catch (err: any) {
        setErrorMsg(err.message || 'Đăng nhập không thành công, vui lòng kiểm tra lại');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'register') {
      if (registerStep === 'form') {
        handleProceedToOtp();
      } else {
        handleVerifyOtpAndRegister();
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      const googleUser = await requestGoogleLogin();
      await googleLogin(googleUser);
    } catch (err: any) {
      const msg = err?.message || '';
      console.warn('Google Auth notice:', msg);
      if (
        !msg.includes('popup_closed') &&
        !msg.includes('user_cancel') &&
        !msg.includes('closed_by_user')
      ) {
        if (msg.includes('access_denied') || msg.includes('restricted')) {
          setErrorMsg(
            language === 'vi'
              ? 'Tài khoản chưa được thêm vào Test Users trên Google Console. Vui lòng đăng nhập bằng tài khoản chủ dự án hoặc thêm email vào mục Audience/Test Users.'
              : 'Google account is not in the Test Users list on Google Console.',
          );
        } else {
          setErrorMsg(
            language === 'vi'
              ? `Đăng nhập Google không thành công: ${msg}`
              : `Google Sign-in failed: ${msg}`,
          );
        }
      }
    } finally {
      setGoogleLoading(false);
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
          isLarge && styles.largeMainLayout,
          isCompact && styles.compactMainLayout,
        ]}
      >
        {/* ===================== KHU VỰC BÊN TRÁI: SHOWCASE TINH GỌN, HOVER XEM CHI TIẾT ===================== */}
        <View
          style={[
            styles.leftShowcase,
            isDesktop ? styles.desktopLeft : styles.mobileLeft,
            isLarge && styles.largeLeft,
            isCompact && styles.compactLeft,
          ]}
        >
          {/* CỤM PHÍA TRÊN: LOGO & 2 CÂU GIỚI THIỆU THEO YÊU CẦU */}
          <View style={styles.leftTopGroup}>
            {/* Top Bar: Brand Logo & Tag */}
            <View style={styles.leftTopBar}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require('../../../assets/monett-brand-logo.png')}
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
              <Text
                style={[
                  styles.headlineTitle,
                  isLarge && styles.largeHeadlineTitle,
                  isCompact && styles.compactHeadlineTitle,
                ]}
              >
                {t.heroTitle1}{' '}
                <Text style={styles.headlineHighlight}>{t.heroTitleHighlight}</Text>
              </Text>
              <Text
                style={[
                  styles.headlineDesc,
                  isLarge && styles.largeHeadlineDesc,
                  isCompact && styles.compactHeadlineDesc,
                ]}
              >
                {t.heroSubtitle}
              </Text>
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
                isLarge && styles.largeFrogBox,
                isCompact && styles.compactFrogBox,
                {
                  transform: [
                    { translateY: frogFloatY },
                    { scale: isFrogHovered ? 1.04 : 1 },
                  ],
                },
              ]}
            >
              <Image
                source={require('../../../assets/frog-hat-coin.png')}
                style={styles.bigFrogMascotImage as any}
                resizeMode="contain"
              />
            </Animated.View>

            {/* BÓNG ĐỔ DƯỚI CHÂN CHÚ ẾCH */}
            <Animated.View
              style={[
                styles.frogGroundShadow,
                isLarge && styles.largeFrogShadow,
                isCompact && styles.compactFrogShadow,
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
            isLarge && styles.largeRightSection,
            isCompact && styles.compactRightSection,
          ]}
        >
          {/* Bảng Đăng Ký / Đăng Nhập Màu Xanh Rừng Ngọc Lục Bảo (Deep Emerald) Sang Trọng */}
          <View
            style={[
              styles.authCard,
              isLarge && styles.largeAuthCard,
              isCompact && styles.compactAuthCard,
            ]}
          >
            {/* Top Bar Right: Nút quay lại trang chủ & Bộ chuyển đổi ngôn ngữ */}
            <View style={styles.rightTopBar}>
              {onBackToHome ? (
                <TouchableOpacity
                  style={styles.backHomeBtn}
                  onPress={onBackToHome}
                  activeOpacity={0.8}
                >
                  <Text style={styles.backHomeBtnText}>
                    {language === 'vi' ? '← Trang chủ' : '← Home'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}
              <LanguageToggle />
            </View>

            {/* TRƯỜNG HỢP 1: QUÊN MẬT KHẨU (FORGOT PASSWORD FLOW) */}
            {mode === 'forgot_password' ? (
              <View style={styles.otpStepContainer}>
                {forgotStep === 'request' ? (
                  <>
                    {/* Nút quay lại màn hình Đăng nhập */}
                    <TouchableOpacity
                      style={styles.backBtn}
                      onPress={() => {
                        setMode('login');
                        setErrorMsg(null);
                        setForgotSuccessMsg(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.backBtnText}>
                        ← {language === 'vi' ? 'Quay lại đăng nhập' : 'Back to login'}
                      </Text>
                    </TouchableOpacity>

                    {/* Header Khôi phục mật khẩu */}
                    <View style={styles.otpHeaderBox}>
                      <View style={styles.otpIconBadge}>
                        <Text style={styles.otpIconText}>🔑</Text>
                      </View>
                      <Text style={styles.otpTitle}>
                        {language === 'vi' ? 'Khôi phục mật khẩu' : 'Reset Password'}
                      </Text>
                      <Text style={styles.otpSubTitle}>
                        {language === 'vi'
                          ? 'Nhập địa chỉ Email của bạn để nhận mã xác thực OTP'
                          : 'Enter your Email to receive a verification OTP code'}
                      </Text>
                    </View>

                    {/* Thông báo lỗi nếu có */}
                    {errorMsg && (
                      <View style={styles.errorBox}>
                        <Text style={styles.errorIcon}>⚠️</Text>
                        <Text style={styles.errorText}>{errorMsg}</Text>
                      </View>
                    )}

                    {/* Ô nhập Email */}
                    <View style={styles.inputsGroup}>
                      <View style={styles.fieldItem}>
                        <Text style={styles.fieldLabel}>{t.emailLabel}</Text>
                        <View
                          style={[
                            styles.inputWrapper,
                            focusedField === 'forgotEmail' && styles.inputWrapperFocused,
                            hoveredField === 'forgotEmail' &&
                              focusedField !== 'forgotEmail' &&
                              styles.inputWrapperHovered,
                          ]}
                          {...({
                            onMouseEnter: () => setHoveredField('forgotEmail'),
                            onMouseLeave: () => setHoveredField(null),
                          } as any)}
                        >
                          <Text style={styles.inputLeadingIcon}>✉️</Text>
                          <TextInput
                            style={styles.textInput as any}
                            placeholder={t.emailPlaceholder}
                            placeholderTextColor="#94A3B8"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={forgotEmail}
                            onChangeText={setForgotEmail}
                            onFocus={() => setFocusedField('forgotEmail')}
                            onBlur={() => setFocusedField(null)}
                            onSubmitEditing={handleSendForgotOtp}
                            onKeyPress={(e: any) => {
                              if (e.nativeEvent?.key === 'Enter') {
                                handleSendForgotOtp();
                              }
                            }}
                          />
                        </View>
                      </View>

                      {/* Nút Gửi mã xác thực */}
                      <TouchableOpacity
                        style={[styles.submitBtn, sendingForgotOtp && styles.submitBtnDisabled]}
                        onPress={handleSendForgotOtp}
                        disabled={sendingForgotOtp}
                        activeOpacity={0.88}
                      >
                        {sendingForgotOtp ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <View style={styles.btnContentRow}>
                            <Text style={styles.submitBtnText}>
                              {language === 'vi' ? 'Gửi mã xác thực' : 'Send OTP Code'}
                            </Text>
                            <Text style={styles.arrowIcon}>➔</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                ) : forgotStep === 'otp' ? (
                  <>
                    {/* Nút quay lại bước nhập email */}
                    <TouchableOpacity
                      style={styles.backBtn}
                      onPress={() => {
                        setForgotStep('request');
                        setErrorMsg(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.backBtnText}>
                        ← {language === 'vi' ? 'Đổi địa chỉ Email' : 'Change Email'}
                      </Text>
                    </TouchableOpacity>

                    {/* Header Xác thực mã OTP */}
                    <View style={styles.otpHeaderBox}>
                      <View style={styles.otpIconBadge}>
                        <Text style={styles.otpIconText}>🔑</Text>
                      </View>
                      <Text style={styles.otpTitle}>
                        {language === 'vi' ? 'Xác thực mã OTP 🔐' : 'Verify OTP Code 🔐'}
                      </Text>
                      <Text style={styles.otpSubTitle}>
                        {language === 'vi'
                          ? 'Mã xác thực gồm 6 chữ số đã được gửi tới:'
                          : 'A 6-digit OTP code was sent to:'}
                      </Text>
                      <View style={styles.otpEmailPill}>
                        <Text style={styles.otpEmailText}>{forgotEmail.trim()}</Text>
                      </View>
                      <Text style={styles.otpHelperText}>
                        {language === 'vi'
                          ? 'Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam/Rác) và nhập mã để tiếp tục.'
                          : 'Please check your inbox or spam folder and enter the code to continue.'}
                      </Text>
                    </View>

                    {/* Thông báo lỗi nếu có */}
                    {errorMsg && (
                      <View style={styles.errorBox}>
                        <Text style={styles.errorIcon}>⚠️</Text>
                        <Text style={styles.errorText}>{errorMsg}</Text>
                      </View>
                    )}

                    {/* Thông báo thành công */}
                    {forgotSuccessMsg && (
                      <View style={styles.successBox}>
                        <Text style={styles.successIcon}>✨</Text>
                        <Text style={styles.successText}>{forgotSuccessMsg}</Text>
                      </View>
                    )}

                    {/* Ô nhập OTP 6 chữ số */}
                    <View style={styles.inputsGroup}>
                      <View style={styles.fieldItem}>
                        <Text style={styles.fieldLabel}>
                          {language === 'vi' ? 'Nhập mã 6 chữ số (OTP)' : 'Enter 6-digit OTP'}
                        </Text>
                        <View
                          style={[
                            styles.otpInputWrapper,
                            focusedField === 'forgotOtp' && styles.inputWrapperFocused,
                            hoveredField === 'forgotOtp' &&
                              focusedField !== 'forgotOtp' &&
                              styles.inputWrapperHovered,
                          ]}
                          {...({
                            onMouseEnter: () => setHoveredField('forgotOtp'),
                            onMouseLeave: () => setHoveredField(null),
                          } as any)}
                        >
                          <TextInput
                            style={styles.otpTextInput as any}
                            placeholder="000000"
                            placeholderTextColor="#CBD5E1"
                            keyboardType="number-pad"
                            maxLength={6}
                            value={forgotOtp}
                            onChangeText={setForgotOtp}
                            onFocus={() => setFocusedField('forgotOtp')}
                            onBlur={() => setFocusedField(null)}
                            onSubmitEditing={handleVerifyForgotOtp}
                            autoFocus={true}
                          />
                        </View>
                      </View>

                      {/* Dòng gửi lại mã OTP */}
                      <View style={styles.resendOtpRow}>
                        <Text style={styles.resendOtpLabel}>
                          {language === 'vi' ? 'Chưa nhận được mã?' : "Didn't get the code?"}{' '}
                        </Text>
                        <TouchableOpacity
                          onPress={handleSendForgotOtp}
                          disabled={forgotCountdown > 0 || sendingForgotOtp}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.resendOtpAction,
                              (forgotCountdown > 0 || sendingForgotOtp) && styles.resendOtpActionDisabled,
                            ]}
                          >
                            {sendingForgotOtp
                              ? (language === 'vi' ? 'Đang gửi...' : 'Sending...')
                              : forgotCountdown > 0
                              ? (language === 'vi' ? `Gửi lại sau (${forgotCountdown}s)` : `Resend in (${forgotCountdown}s)`)
                              : (language === 'vi' ? 'Gửi lại mã OTP' : 'Resend code')}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Nút Tiếp tục */}
                      <TouchableOpacity
                        style={[
                          styles.submitBtn,
                          (loading || forgotOtp.trim().length !== 6) && styles.submitBtnDisabled,
                        ]}
                        onPress={handleVerifyForgotOtp}
                        disabled={loading || forgotOtp.trim().length !== 6}
                        activeOpacity={0.88}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <View style={styles.btnContentRow}>
                            <Text style={styles.submitBtnText}>
                              {language === 'vi' ? 'Tiếp tục' : 'Continue'}
                            </Text>
                            <Text style={styles.arrowIcon}>➔</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    {/* Nút quay lại bước nhập OTP */}
                    <TouchableOpacity
                      style={styles.backBtn}
                      onPress={() => {
                        setForgotStep('otp');
                        setErrorMsg(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.backBtnText}>
                        ← {language === 'vi' ? 'Quay lại nhập OTP' : 'Back to OTP step'}
                      </Text>
                    </TouchableOpacity>

                    {/* Header Đặt lại mật khẩu mới */}
                    <View style={styles.otpHeaderBox}>
                      <View style={styles.otpIconBadge}>
                        <Text style={styles.otpIconText}>🔒</Text>
                      </View>
                      <Text style={styles.otpTitle}>
                        {language === 'vi' ? 'Thiết lập mật khẩu mới ✨' : 'Set New Password ✨'}
                      </Text>
                      <Text style={styles.otpSubTitle}>
                        {language === 'vi'
                          ? `Tạo mật khẩu mới cho tài khoản: ${forgotEmail.trim()}`
                          : `Create new password for: ${forgotEmail.trim()}`}
                      </Text>
                    </View>

                    {/* Thông báo lỗi nếu có */}
                    {errorMsg && (
                      <View style={styles.errorBox}>
                        <Text style={styles.errorIcon}>⚠️</Text>
                        <Text style={styles.errorText}>{errorMsg}</Text>
                      </View>
                    )}

                    {/* Thông báo thành công */}
                    {forgotSuccessMsg && (
                      <View style={styles.successBox}>
                        <Text style={styles.successIcon}>✨</Text>
                        <Text style={styles.successText}>{forgotSuccessMsg}</Text>
                      </View>
                    )}

                    {/* Ô nhập Mật khẩu mới */}
                    <View style={styles.inputsGroup}>
                      <View style={styles.fieldItem}>
                        <Text style={styles.fieldLabel}>
                          {language === 'vi' ? 'Mật khẩu mới' : 'New password'}
                        </Text>
                        <View
                          style={[
                            styles.inputWrapper,
                            focusedField === 'newPassword' && styles.inputWrapperFocused,
                            hoveredField === 'newPassword' &&
                              focusedField !== 'newPassword' &&
                              styles.inputWrapperHovered,
                          ]}
                          {...({
                            onMouseEnter: () => setHoveredField('newPassword'),
                            onMouseLeave: () => setHoveredField(null),
                          } as any)}
                        >
                          <Text style={styles.inputLeadingIcon}>🔒</Text>
                          <TextInput
                            style={styles.textInput as any}
                            placeholder={language === 'vi' ? 'Tối thiểu 8 ký tự' : 'At least 8 characters'}
                            placeholderTextColor="#94A3B8"
                            secureTextEntry={!showNewPassword}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            onFocus={() => setFocusedField('newPassword')}
                            onBlur={() => setFocusedField(null)}
                            autoFocus={true}
                          />
                          <TouchableOpacity
                            style={styles.eyeBtn}
                            onPress={() => setShowNewPassword(!showNewPassword)}
                          >
                            <Text style={styles.eyeIcon}>{showNewPassword ? '👁️' : '👁️‍🗨️'}</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.passwordSingleNote}>
                          {language === 'vi'
                            ? '* Mật khẩu tối thiểu 8 ký tự, gồm cả chữ cái, chữ số và ký tự đặc biệt'
                            : '* Minimum 8 characters, including letters, numbers & special characters'}
                        </Text>
                      </View>

                      {/* Ô nhập Xác nhận mật khẩu mới */}
                      <View style={styles.fieldItem}>
                        <Text style={styles.fieldLabel}>
                          {language === 'vi' ? 'Xác nhận mật khẩu mới' : 'Confirm new password'}
                        </Text>
                        <View
                          style={[
                            styles.inputWrapper,
                            focusedField === 'confirmPassword' && styles.inputWrapperFocused,
                            hoveredField === 'confirmPassword' &&
                              focusedField !== 'confirmPassword' &&
                              styles.inputWrapperHovered,
                          ]}
                          {...({
                            onMouseEnter: () => setHoveredField('confirmPassword'),
                            onMouseLeave: () => setHoveredField(null),
                          } as any)}
                        >
                          <Text style={styles.inputLeadingIcon}>🔒</Text>
                          <TextInput
                            style={styles.textInput as any}
                            placeholder={language === 'vi' ? 'Nhập lại mật khẩu mới' : 'Re-enter new password'}
                            placeholderTextColor="#94A3B8"
                            secureTextEntry={!showConfirmPassword}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            onFocus={() => setFocusedField('confirmPassword')}
                            onBlur={() => setFocusedField(null)}
                            onSubmitEditing={handleResetPassword}
                            onKeyPress={(e: any) => {
                              if (e.nativeEvent?.key === 'Enter') {
                                handleResetPassword();
                              }
                            }}
                          />
                          <TouchableOpacity
                            style={styles.eyeBtn}
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Nút Cập nhật mật khẩu */}
                      <TouchableOpacity
                        style={[
                          styles.submitBtn,
                          (loading || !newPassword.trim() || !confirmPassword.trim()) &&
                            styles.submitBtnDisabled,
                        ]}
                        onPress={handleResetPassword}
                        disabled={loading || !newPassword.trim() || !confirmPassword.trim()}
                        activeOpacity={0.88}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <View style={styles.btnContentRow}>
                            <Text style={styles.submitBtnText}>
                              {language === 'vi' ? 'Đặt lại mật khẩu & Đăng nhập' : 'Reset Password & Log In'}
                            </Text>
                            <Text style={styles.arrowIcon}>➔</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ) : mode === 'register' && registerStep === 'otp' ? (
              <View style={styles.otpStepContainer}>
                {/* Nút quay lại bước 1 để chỉnh sửa thông tin */}
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => {
                    setRegisterStep('form');
                    setErrorMsg(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backBtnText}>
                    ← {language === 'vi' ? 'Quay lại chỉnh sửa' : 'Back to edit'}
                  </Text>
                </TouchableOpacity>


                {/* Header Xác thực OTP */}
                <View style={styles.otpHeaderBox}>
                  <View style={styles.otpIconBadge}>
                    <Text style={styles.otpIconText}>✉️</Text>
                  </View>
                  <Text style={styles.otpTitle}>
                    {language === 'vi' ? 'Xác thực Email của bạn' : 'Verify Your Email'}
                  </Text>
                  <Text style={styles.otpSubTitle}>
                    {language === 'vi'
                      ? 'Mã xác thực gồm 6 chữ số đã được gửi tới:'
                      : 'A 6-digit OTP code was sent to:'}
                  </Text>
                  <View style={styles.otpEmailPill}>
                    <Text style={styles.otpEmailText}>{email.trim()}</Text>
                  </View>
                </View>

                {/* Thông báo lỗi nếu có */}
                {errorMsg && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}

                {/* Thông báo thành công / Mã thử nghiệm */}
                {otpSuccessMsg && (
                  <View style={styles.successBox}>
                    <Text style={styles.successIcon}>✨</Text>
                    <Text style={styles.successText}>{otpSuccessMsg}</Text>
                  </View>
                )}

                {/* Ô nhập OTP 6 chữ số to, căn giữa */}
                <View style={styles.fieldItem}>
                  <Text style={styles.fieldLabel}>
                    {language === 'vi' ? 'Nhập mã 6 chữ số (OTP)' : 'Enter 6-digit OTP'}
                  </Text>
                  <View
                    style={[
                      styles.otpInputWrapper,
                      focusedField === 'otp' && styles.inputWrapperFocused,
                      hoveredField === 'otp' &&
                        focusedField !== 'otp' &&
                        styles.inputWrapperHovered,
                    ]}
                    {...({
                      onMouseEnter: () => setHoveredField('otp'),
                      onMouseLeave: () => setHoveredField(null),
                    } as any)}
                  >
                    <TextInput
                      style={styles.otpTextInput as any}
                      placeholder="000000"
                      placeholderTextColor="#CBD5E1"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={setOtp}
                      autoFocus
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                      onSubmitEditing={handleVerifyOtpAndRegister}
                      onKeyPress={(e: any) => {
                        if (e.nativeEvent?.key === 'Enter') {
                          handleVerifyOtpAndRegister();
                        }
                      }}
                    />
                  </View>
                </View>

                {/* Dòng gửi lại mã OTP kèm đếm ngược */}
                <View style={styles.resendOtpRow}>
                  <Text style={styles.resendOtpLabel}>
                    {language === 'vi' ? 'Chưa nhận được mã?' : "Didn't get the code?"}{' '}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={countdown > 0 || sendingOtp}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.resendOtpAction,
                        (countdown > 0 || sendingOtp) && styles.resendOtpActionDisabled,
                      ]}
                    >
                      {sendingOtp
                        ? (language === 'vi' ? 'Đang gửi...' : 'Sending...')
                        : countdown > 0
                        ? (language === 'vi' ? `Gửi lại sau (${countdown}s)` : `Resend in (${countdown}s)`)
                        : (language === 'vi' ? 'Gửi lại mã OTP' : 'Resend code')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Nút Xác nhận & Hoàn tất */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (loading || otp.trim().length !== 6) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleVerifyOtpAndRegister}
                  disabled={loading || otp.trim().length !== 6}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={styles.btnContentRow}>
                      <Text style={styles.submitBtnText}>
                        {language === 'vi' ? 'Xác nhận & Hoàn tất' : 'Verify & Complete'}
                      </Text>
                      <Text style={styles.arrowIcon}>➔</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Bước thông thường (Login hoặc Bước 1 Register) */
              <>
                {/* Tabs Chuyển đổi Đăng nhập / Đăng ký */}
                <View style={styles.segmentContainer}>
                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      mode === 'login' && styles.segmentBtnActive,
                    ]}
                    onPress={() => {
                      setMode('login');
                      setRegisterStep('form');
                      setErrorMsg(null);
                      setOtpSuccessMsg(null);
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
                      setRegisterStep('form');
                      setErrorMsg(null);
                      setOtpSuccessMsg(null);
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
                      <View
                        style={[
                          styles.inputWrapper,
                          focusedField === 'fullName' && styles.inputWrapperFocused,
                          hoveredField === 'fullName' &&
                            focusedField !== 'fullName' &&
                            styles.inputWrapperHovered,
                        ]}
                        {...({
                          onMouseEnter: () => setHoveredField('fullName'),
                          onMouseLeave: () => setHoveredField(null),
                        } as any)}
                      >
                        <Text style={styles.inputLeadingIcon}>👤</Text>
                        <TextInput
                          style={styles.textInput as any}
                          placeholder={t.fullNamePlaceholder}
                          placeholderTextColor="#94A3B8"
                          value={fullName}
                          onChangeText={setFullName}
                          onFocus={() => setFocusedField('fullName')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>
                    </View>
                  )}

                  {/* Email Field */}
                  <View style={styles.fieldItem}>
                    <Text style={styles.fieldLabel}>{t.emailLabel}</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedField === 'email' && styles.inputWrapperFocused,
                        hoveredField === 'email' &&
                          focusedField !== 'email' &&
                          styles.inputWrapperHovered,
                      ]}
                      {...({
                        onMouseEnter: () => setHoveredField('email'),
                        onMouseLeave: () => setHoveredField(null),
                      } as any)}
                    >
                      <Text style={styles.inputLeadingIcon}>✉️</Text>
                      <TextInput
                        style={styles.textInput as any}
                        placeholder={t.emailPlaceholder}
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                        returnKeyType="next"
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
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
                        <TouchableOpacity onPress={handleOpenForgotPassword} activeOpacity={0.7}>
                          <Text style={styles.forgotPasswordText}>
                            {t.forgotPassword}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View
                      style={[
                        styles.inputWrapper,
                        focusedField === 'password' && styles.inputWrapperFocused,
                        hoveredField === 'password' &&
                          focusedField !== 'password' &&
                          styles.inputWrapperHovered,
                      ]}
                      {...({
                        onMouseEnter: () => setHoveredField('password'),
                        onMouseLeave: () => setHoveredField(null),
                      } as any)}
                    >
                      <Text style={styles.inputLeadingIcon}>🔒</Text>
                      <TextInput
                        ref={passwordInputRef}
                        style={styles.textInput as any}
                        placeholder={
                          mode === 'register'
                            ? (language === 'vi' ? 'Nhập mật khẩu' : 'Enter password')
                            : t.passwordPlaceholder
                        }
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                        returnKeyType="go"
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
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

                    {/* Chỉ 1 dòng note nhỏ nhắn bên dưới ô mật khẩu theo đúng yêu cầu */}
                    {mode === 'register' && (
                      <Text style={styles.passwordSingleNote}>
                        {language === 'vi'
                          ? '* Mật khẩu tối thiểu 8 ký tự, gồm cả chữ cái, chữ số và ký tự đặc biệt'
                          : '* Minimum 8 characters, including letters, numbers & special characters'}
                      </Text>
                    )}
                  </View>

                  {/* Checkbox Ghi nhớ đăng nhập / Đồng ý điều khoản */}
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

                  {/* Nút CTA Chính */}
                  <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.88}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <View style={styles.btnContentRow}>
                        <Text style={styles.submitBtnText}>
                          {mode === 'login'
                            ? t.ctaLogin
                            : (language === 'vi' ? 'Tiếp tục' : 'Continue')}
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

                  {/* Nút Đăng nhập Google 1 hàng duy nhất */}
                  <View style={styles.socialButtonsRow}>
                    <TouchableOpacity
                      style={[styles.socialBtn, googleLoading && { opacity: 0.7 }]}
                      activeOpacity={0.8}
                      onPress={handleGoogleSignIn}
                      disabled={googleLoading || loading}
                    >
                      {googleLoading ? (
                        <ActivityIndicator size="small" color="#1B7A6E" style={{ marginRight: 8 }} />
                      ) : (
                        <Image
                          source={{ uri: GOOGLE_LOGO_URI }}
                          style={styles.socialSvgIcon as any}
                          resizeMode="contain"
                        />
                      )}
                      <Text style={styles.socialBtnText}>
                        {googleLoading
                          ? (language === 'vi' ? 'Đang kết nối Google...' : 'Connecting Google...')
                          : t.continueWithGoogle}
                      </Text>
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
              </>
            )}
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
    gap: 40,
    minHeight: '88vh' as any,
    paddingTop: 24,
  },
  largeMainLayout: {
    maxWidth: 1440,
    paddingHorizontal: 40,
    paddingVertical: 36,
    gap: 60,
  },
  compactMainLayout: {
    maxWidth: 1160,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 20,
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
    flex: 1.15,
    maxWidth: 620,
  },
  largeLeft: {
    flex: 1.25,
    maxWidth: 740,
  },
  compactLeft: {
    flex: 1,
    maxWidth: 480,
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
  largeHeadlineTitle: {
    fontSize: 32,
    lineHeight: 42,
    marginBottom: 8,
  },
  compactHeadlineTitle: {
    fontSize: 23,
    lineHeight: 31,
    marginBottom: 4,
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
  largeHeadlineDesc: {
    fontSize: 15,
    lineHeight: 23,
  },
  compactHeadlineDesc: {
    fontSize: 12.5,
    lineHeight: 18,
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

  // Bé Ếch to nón lá (Phóng to hoành tráng & lấp đầy không gian)
  bigFrogMascotBox: {
    width: 450,
    height: 450,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    // @ts-ignore
    transition: 'transform 0.25s ease',
  },
  largeFrogBox: {
    width: 520,
    height: 520,
  },
  compactFrogBox: {
    width: 360,
    height: 360,
  },
  bigFrogMascotImage: {
    width: '100%',
    height: '100%',
  },
  frogGroundShadow: {
    width: 280,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(5, 150, 105, 0.16)',
    marginTop: -90, // Kéo bóng sát chân chú ếch
    zIndex: 5,
  },
  largeFrogShadow: {
    width: 330,
    marginTop: -105,
  },
  compactFrogShadow: {
    width: 220,
    marginTop: -72,
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
  },
  largeRightSection: {
    width: 490,
    maxWidth: 500,
  },
  compactRightSection: {
    width: 390,
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
  largeAuthCard: {
    padding: 36,
    borderRadius: 28,
  },
  compactAuthCard: {
    padding: 22,
    borderRadius: 20,
  },
  rightTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  backHomeBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backHomeBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#047857',
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

  // Success Box (OTP thông báo)
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  successIcon: {
    fontSize: 15,
  },
  successText: {
    flex: 1,
    fontSize: 12.5,
    color: '#065F46',
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

  // OTP Header & Button
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sendOtpBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  sendOtpBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    opacity: 0.8,
  },
  sendOtpBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  otpValidPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  otpValidText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
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

  // Khung viền xanh ngọc sang trọng kèm hiệu ứng Hover / Focus phát sáng tinh tế
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#10B981', // Viền xanh lá nổi bật cho các ô nhập liệu
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 46,
    // Hiệu ứng mượt mà trên Web
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  } as any,
  inputWrapperHovered: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
    boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.15)',
  } as any,
  inputWrapperFocused: {
    borderColor: '#047857',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 0 0 3.5px rgba(16, 185, 129, 0.25)',
  } as any,

  inputLeadingIcon: {
    fontSize: 14,
    marginRight: 8,
    color: '#059669',
  },

  // Ô TextInput: TRIỆT TIÊU HOÀN TOÀN VIỀN ĐEN MẶC ĐỊNH CỦA TRÌNH DUYỆT (outline: none)
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 13.5,
    color: '#0F172A',
    outlineStyle: 'none',
    outlineWidth: 0,
    outlineColor: 'transparent',
  } as any,
  eyeBtn: {
    padding: 6,
  },
  eyeIcon: {
    fontSize: 15,
  },

  // Dòng note nhỏ nhắn duy nhất cho mật khẩu
  passwordSingleNote: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
    marginTop: 5,
    paddingLeft: 4,
    letterSpacing: 0.1,
  },

  // ==================== GIAO DIỆN BƯỚC 2: NHẬP MÃ OTP ====================
  otpStepContainer: {
    width: '100%',
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  backBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  otpHeaderBox: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  otpIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  otpIconText: {
    fontSize: 24,
  },
  otpTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  otpSubTitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  otpEmailPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  otpEmailText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  otpHelperText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  otpInputWrapper: {
    height: 56,
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  } as any,
  otpTextInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 10,
    color: '#0F172A',
    outlineStyle: 'none',
    outlineWidth: 0,
    outlineColor: 'transparent',
  } as any,
  resendOtpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  resendOtpLabel: {
    fontSize: 12.5,
    color: '#64748B',
  },
  resendOtpAction: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
    textDecorationLine: 'underline',
  },
  resendOtpActionDisabled: {
    color: '#94A3B8',
    textDecorationLine: 'none',
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
