import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { sendOtpApi, verifyOtpApi, forgotPasswordApi, resetPasswordApi } from '../../services/api';
import { requestGoogleLogin } from '../../services/googleAuth';

interface MobileAuthScreenProps {
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const MobileAuthScreen: React.FC<MobileAuthScreenProps> = ({
  initialMode = 'login',
  onSuccess,
}) => {
  const { login, register, googleLogin } = useAuth();
  const { language, setLanguage } = useLanguage();

  // Mode chính: 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  // Đăng nhập State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Đăng ký State
  const [fullName, setFullName] = useState('');
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
  const [registerOtp, setRegisterOtp] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Quên mật khẩu State: 'email' (bước 1) -> 'otp' (bước 2) -> 'new_password' (bước 3)
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'new_password'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotCountdown, setForgotCountdown] = useState(0);

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isVi = language === 'vi';

  // Countdown timer cho OTP đăng ký
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Countdown timer cho OTP quên mật khẩu
  useEffect(() => {
    if (forgotCountdown > 0) {
      const timer = setTimeout(() => setForgotCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [forgotCountdown]);

  const handleHelp = () => {
    Alert.alert(
      isVi ? 'Trợ giúp & Hỗ trợ' : 'Help & Support',
      isVi
        ? 'Nếu bạn gặp vấn đề khi đăng nhập hoặc nhận mã OTP, vui lòng liên hệ đội ngũ Monett qua email support@monett.vn để được hỗ trợ tức thì.'
        : 'If you have any login or OTP issues, please contact support@monett.vn for instant support.'
    );
  };

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // 1. XỬ LÝ ĐĂNG NHẬP
  const handleLoginSubmit = async () => {
    clearMessages();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMessage(isVi ? 'Vui lòng nhập địa chỉ email.' : 'Please enter your email.');
      return;
    }

    if (!password) {
      setErrorMessage(isVi ? 'Vui lòng nhập mật khẩu.' : 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await login({ email: cleanEmail, password });
      onSuccess?.();
    } catch (err: any) {
      const rawMsg = err.message || '';
      let displayMsg = rawMsg;
      if (rawMsg.includes('Invalid credentials') || rawMsg.includes('401') || rawMsg.includes('Unauthorized')) {
        displayMsg = isVi ? 'Email hoặc mật khẩu không chính xác.' : 'Invalid email or password.';
      } else if (rawMsg.includes('Network request failed')) {
        displayMsg = isVi ? 'Không thể kết nối máy chủ backend. Vui lòng kiểm tra Wifi.' : 'Cannot connect to backend server. Check your network.';
      }
      setErrorMessage(displayMsg);
    } finally {
      setLoading(false);
    }
  };

  // 2. XỬ LÝ GỬI MÃ OTP ĐĂNG KÝ
  const handleSendRegisterOtp = async () => {
    clearMessages();
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();

    if (!cleanName) {
      setErrorMessage(isVi ? 'Vui lòng nhập họ và tên của bạn.' : 'Please enter your full name.');
      return;
    }

    if (!cleanEmail) {
      setErrorMessage(isVi ? 'Vui lòng nhập địa chỉ email.' : 'Please enter your email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage(isVi ? 'Địa chỉ email không đúng định dạng.' : 'Invalid email address format.');
      return;
    }

    const isPassMinLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>~`]/.test(password);
    const isPasswordStrong = isPassMinLength && hasLetter && hasNumber && hasSpecialChar;

    if (!isPasswordStrong) {
      setErrorMessage(
        isVi
          ? 'Mật khẩu phải từ 8 ký tự, gồm chữ cái, chữ số và ký tự đặc biệt (@, $, !, %,...)'
          : 'Password must be at least 8 characters and include letters, numbers, and special characters.'
      );
      return;
    }

    setLoading(true);
    try {
      await sendOtpApi(cleanEmail);
      setRegisterStep('otp');
      setOtpCountdown(60);
      setRegisterOtp('');
      setSuccessMessage(
        isVi
          ? `Mã xác thực OTP đã được gửi tới email ${cleanEmail}. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam/Rác)!`
          : `Verification code sent to ${cleanEmail}. Please check your inbox or spam folder!`
      );
    } catch (err: any) {
      const rawMsg = err.message || '';
      let displayMsg = rawMsg;
      if (rawMsg.includes('already exists') || rawMsg.includes('400') || rawMsg.includes('đã được')) {
        displayMsg = isVi ? 'Email này đã có tài khoản Monett! Vui lòng chọn Đăng nhập.' : 'This email is already registered. Please sign in.';
      }
      setErrorMessage(displayMsg);
    } finally {
      setLoading(false);
    }
  };

  // 3. XỬ LÝ XÁC NHẬN OTP & HOÀN TẤT ĐĂNG KÝ
  const handleVerifyOtpAndRegister = async () => {
    clearMessages();
    const cleanOtp = registerOtp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage(isVi ? 'Vui lòng nhập đầy đủ 6 chữ số mã OTP.' : 'Please enter 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        otp: cleanOtp,
        currency: 'VND',
      });
      onSuccess?.();
    } catch (err: any) {
      setErrorMessage(err.message || (isVi ? 'Mã OTP không chính xác hoặc đã hết hạn.' : 'Invalid or expired OTP code.'));
    } finally {
      setLoading(false);
    }
  };

  // 4. XỬ LÝ QUÊN MẬT KHẨU - BƯỚC 1: GỬI OTP VỀ EMAIL
  const handleSendForgotOtp = async () => {
    clearMessages();
    const cleanEmail = forgotEmail.trim();

    if (!cleanEmail) {
      setErrorMessage(isVi ? 'Vui lòng nhập địa chỉ email của bạn.' : 'Please enter your email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage(isVi ? 'Địa chỉ email không đúng định dạng.' : 'Invalid email address format.');
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordApi(cleanEmail);
      setForgotStep('otp');
      setForgotCountdown(60);
      setForgotOtp('');
      setSuccessMessage(
        isVi
          ? `Mã xác thực đã được gửi tới email ${cleanEmail}. Vui lòng kiểm tra hộp thư đến (hoặc mục Spam/Rác)!`
          : `Verification code sent to ${cleanEmail}. Please check your inbox or spam folder!`
      );
    } catch (err: any) {
      setErrorMessage(err.message || (isVi ? 'Không thể gửi mã khôi phục, vui lòng kiểm tra email.' : 'Failed to send reset code.'));
    } finally {
      setLoading(false);
    }
  };

  // 5. XỬ LÝ QUÊN MẬT KHẨU - BƯỚC 2: XÁC THỰC MÃ OTP DUY NHẤT
  const handleVerifyForgotOtp = async () => {
    clearMessages();
    const cleanOtp = forgotOtp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage(isVi ? 'Vui lòng nhập đầy đủ 6 chữ số mã OTP.' : 'Please enter 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtpApi(forgotEmail.trim(), cleanOtp);
      setForgotStep('new_password');
      setSuccessMessage(
        isVi
          ? 'Mã OTP chính xác! Bây giờ bạn hãy thiết lập mật khẩu mới.'
          : 'OTP verified! Please set your new password.'
      );
    } catch (err: any) {
      setErrorMessage(err.message || (isVi ? 'Mã OTP không chính xác hoặc đã hết hạn.' : 'Invalid or expired OTP code.'));
    } finally {
      setLoading(false);
    }
  };

  // 6. XỬ LÝ QUÊN MẬT KHẨU - BƯỚC 3: THIẾT LẬP MẬT KHẨU MỚI
  const handleResetPasswordSubmit = async () => {
    clearMessages();
    const cleanOtp = forgotOtp.trim();

    const isNewPassMinLength = newPassword.length >= 8;
    const newHasLetter = /[a-zA-Z]/.test(newPassword);
    const newHasNumber = /\d/.test(newPassword);
    const newHasSpecialChar = /[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>~`]/.test(newPassword);
    const isNewPassStrong = isNewPassMinLength && newHasLetter && newHasNumber && newHasSpecialChar;

    if (!isNewPassStrong) {
      setErrorMessage(
        isVi
          ? 'Mật khẩu mới phải từ 8 ký tự, gồm chữ cái, chữ số và ký tự đặc biệt (@, $, !, %,...)'
          : 'New password must be at least 8 characters and include letters, numbers, and special characters.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(isVi ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi({
        email: forgotEmail.trim(),
        otp: cleanOtp,
        newPassword,
      });
      // Đổi mật khẩu thành công: Chuyển về tab Đăng nhập
      setEmail(forgotEmail.trim());
      setPassword('');
      setMode('login');
      setSuccessMessage(
        isVi
          ? 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.'
          : 'Password reset successfully! You can now log in.'
      );
    } catch (err: any) {
      setErrorMessage(err.message || (isVi ? 'Mã OTP không đúng hoặc đã hết hạn.' : 'Invalid or expired OTP.'));
    } finally {
      setLoading(false);
    }
  };

  // 7. XỬ LÝ ĐĂNG NHẬP GOOGLE TRỰC TIẾP (MỞ MÀN HÌNH CHỌN TÀI KHOẢN GOOGLE)
  const handleGoogleSignIn = async () => {
    clearMessages();
    setGoogleLoading(true);
    try {
      const googleUser = await requestGoogleLogin();
      await googleLogin(googleUser);
      onSuccess?.();
    } catch (err: any) {
      const msg = err.message || '';
      if (!msg.includes('hủy') && !msg.includes('cancel') && !msg.includes('dismiss')) {
        setErrorMessage(
          isVi
            ? `Đăng nhập Google thất bại: ${msg}`
            : `Google sign-in failed: ${msg}`
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={styles.fixedScreenContainer}>
          {/* TOP BAR: LANGUAGE TOGGLE & HELP BUTTON */}
          <View style={styles.topBar}>
            <View />
            <View style={styles.topRightActions}>
              <View style={styles.langToggleContainer}>
                <TouchableOpacity
                  style={[styles.langToggleBtn, isVi && styles.langToggleBtnActive]}
                  onPress={() => setLanguage('vi')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.flagEmoji}>🇻🇳</Text>
                  <Text style={[styles.langToggleText, isVi && styles.langToggleTextActive]}>
                    VI
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.langToggleBtn, !isVi && styles.langToggleBtnActive]}
                  onPress={() => setLanguage('en')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.flagEmoji}>🇺🇸</Text>
                  <Text style={[styles.langToggleText, !isVi && styles.langToggleTextActive]}>
                    EN
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.circleIconBtn}
                onPress={handleHelp}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.helpIcon}>?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BRAND & HEADER */}
          <View style={styles.brandSection}>
            <Image
              source={require('../../../assets/monett-brand-logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />

            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>
                🔥 {isVi ? 'Hơn 45.000+ khoảnh khắc đã lưu giữ' : 'Over 45,000+ moments saved'}
              </Text>
            </View>

            <Text style={styles.mainTitle}>
              {mode === 'login' && (isVi ? 'Chào mừng đến với Monett!' : 'Welcome to Monett!')}
              {mode === 'register' && (isVi ? 'Tạo tài khoản Monett mới' : 'Create a New Account')}
              {mode === 'forgot' && (isVi ? 'Khôi phục mật khẩu' : 'Reset Password')}
            </Text>

            <Text style={styles.mainSubtitle} numberOfLines={2}>
              {mode === 'forgot'
                ? (isVi
                    ? 'Nhận mã xác thực OTP qua email để thiết lập mật khẩu mới an toàn.'
                    : 'Receive an OTP code via email to set up your new password.')
                : (isVi
                    ? 'Ghi chép chi tiêu bằng hình ảnh khoảnh khắc • Nuôi dưỡng thói quen tài chính an vui mỗi ngày'
                    : 'Capture expenses with photo moments • Build peaceful daily financial habits')}
            </Text>
          </View>

          {/* TAB SWITCHER (HIỆN KHI Ở CHẾ ĐỘ LOGIN HOẶC REGISTER) */}
          {mode !== 'forgot' ? (
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                style={[styles.tabBtn, mode === 'login' && styles.tabBtnActive]}
                onPress={() => {
                  setMode('login');
                  setRegisterStep('form');
                  clearMessages();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                  {isVi ? 'Đăng nhập' : 'Sign in'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, mode === 'register' && styles.tabBtnActive]}
                onPress={() => {
                  setMode('register');
                  setRegisterStep('form');
                  clearMessages();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                  {isVi ? 'Đăng ký tài khoản' : 'Sign up'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* FEEDBACK BANNERS */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          ) : null}
          {successMessage ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✅ {successMessage}</Text>
            </View>
          ) : null}

          {/* ============================================================ */}
          {/* TRƯỜNG HỢP 1: FORM ĐĂNG NHẬP                                */}
          {/* ============================================================ */}
          {mode === 'login' && (
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{isVi ? 'Email' : 'Email'}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.fieldIcon}>✉️</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="mai.linh@example.com"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{isVi ? 'Mật khẩu' : 'Password'}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.fieldIcon}>🔒</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="••••••••••••"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.eyeToggle}>{showPassword ? '🐵' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberWrap}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkboxBox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.rememberText}>
                    {isVi ? 'Ghi nhớ đăng nhập' : 'Remember me'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setForgotEmail(email);
                    setForgotStep('email');
                    clearMessages();
                    setMode('forgot');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>
                    {isVi ? 'Quên mật khẩu?' : 'Forgot password?'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleLoginSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {isVi ? 'Đăng nhập vào Monett →' : 'Sign in to Monett →'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================ */}
          {/* TRƯỜNG HỢP 2: ĐĂNG KÝ BƯỚC 1 (NHẬP THÔNG TIN)                */}
          {/* ============================================================ */}
          {mode === 'register' && registerStep === 'form' && (
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{isVi ? 'Họ và tên' : 'Full name'}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.fieldIcon}>👤</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={isVi ? 'Mai Linh' : 'John Doe'}
                    placeholderTextColor="#94A3B8"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{isVi ? 'Email' : 'Email'}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.fieldIcon}>✉️</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="mai.linh@example.com"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{isVi ? 'Mật khẩu' : 'Password'}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.fieldIcon}>🔒</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={isVi ? 'Tối thiểu 8 ký tự (chữ, số, ký tự đặc biệt)' : 'At least 8 chars (letters, numbers, special)'}
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.eyeToggle}>{showPassword ? '🐵' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleSendRegisterOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {isVi ? 'Nhận mã OTP qua Email →' : 'Send OTP via Email →'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================ */}
          {/* TRƯỜNG HỢP 3: ĐĂNG KÝ BƯỚC 2 (NHẬP MÃ OTP QUA EMAIL)         */}
          {/* ============================================================ */}
          {mode === 'register' && registerStep === 'otp' && (
            <View style={styles.formSection}>
              <View style={styles.otpNoticeBox}>
                <Text style={styles.otpNoticeText}>
                  {isVi
                    ? `Mã 6 chữ số đã được gửi qua email tới: ${email}\nVui lòng kiểm tra Hộp thư đến (hoặc Thư mục Spam/Rác).`
                    : `6-digit code has been sent to: ${email}\nPlease check your Inbox (or Spam/Junk folder).`}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {isVi ? 'Nhập mã xác thực OTP' : 'Enter 6-digit OTP'}
                </Text>
                <View style={[styles.inputBox, { justifyContent: 'center' }]}>
                  <TextInput
                    style={[styles.textInput, styles.otpInput]}
                    placeholder="123456"
                    placeholderTextColor="#94A3B8"
                    value={registerOtp}
                    onChangeText={setRegisterOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.resendRow}>
                {otpCountdown > 0 ? (
                  <Text style={styles.resendTimerText}>
                    {isVi ? `Gửi lại mã sau ${otpCountdown}s` : `Resend code in ${otpCountdown}s`}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleSendRegisterOtp} disabled={loading}>
                    <Text style={styles.resendBtnText}>
                      {isVi ? '🔄 Gửi lại mã OTP mới' : '🔄 Resend new OTP'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleVerifyOtpAndRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {isVi ? 'Xác nhận & Tạo tài khoản →' : 'Confirm & Create Account →'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backLinkWrap}
                onPress={() => {
                  setRegisterStep('form');
                  clearMessages();
                }}
              >
                <Text style={styles.backLinkText}>
                  {isVi ? '← Thay đổi thông tin đăng ký' : '← Edit registration details'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================ */}
          {/* TRƯỜNG HỢP 4: QUÊN MẬT KHẨU - BƯỚC 1 (NHẬP EMAIL)            */}
          {/* ============================================================ */}
          {mode === 'forgot' && forgotStep === 'email' && (
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {isVi ? 'Email tài khoản cần khôi phục' : 'Account Email to reset'}
                </Text>
                <View style={styles.inputBox}>
                  <Text style={styles.fieldIcon}>✉️</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="mai.linh@example.com"
                    placeholderTextColor="#94A3B8"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled, { marginTop: 12 }]}
                onPress={handleSendForgotOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {isVi ? 'Gửi mã xác thực OTP →' : 'Send Reset OTP →'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backLinkWrap}
                onPress={() => {
                  setMode('login');
                  clearMessages();
                }}
              >
                <Text style={styles.backLinkText}>
                  {isVi ? '← Quay lại Đăng nhập' : '← Back to Sign in'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================ */}
          {/* TRƯỜNG HỢP 5: QUÊN MẬT KHẨU - BƯỚC 2 (CHỈ NHẬP MÃ OTP)        */}
          {/* ============================================================ */}
          {mode === 'forgot' && forgotStep === 'otp' && (
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {isVi ? 'Mã xác thực OTP (6 chữ số)' : '6-digit OTP code'}
                </Text>
                <Text style={styles.inputHintText}>
                  {isVi
                    ? `Mã đã gửi đến: ${forgotEmail}. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam/Rác).`
                    : `Code sent to: ${forgotEmail}. Please check your inbox or spam folder.`}
                </Text>
                <View style={styles.inputBox}>
                  <Text style={styles.fieldIcon}>🔑</Text>
                  <TextInput
                    style={[styles.textInput, styles.otpInput]}
                    placeholder="000000"
                    placeholderTextColor="#94A3B8"
                    value={forgotOtp}
                    onChangeText={setForgotOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus={true}
                  />
                </View>
              </View>

              {/* Dòng gửi lại mã OTP */}
              <View style={styles.resendOtpRow}>
                <Text style={styles.resendOtpLabel}>
                  {isVi ? 'Chưa nhận được mã?' : "Didn't receive code?"}{' '}
                </Text>
                {forgotCountdown > 0 ? (
                  <Text style={styles.countdownText}>
                    {isVi ? `Gửi lại sau (${forgotCountdown}s)` : `Resend in (${forgotCountdown}s)`}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleSendForgotOtp} disabled={loading}>
                    <Text style={styles.resendBtnText}>
                      {isVi ? 'Gửi lại mã OTP' : 'Resend OTP'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled, { marginTop: 16 }]}
                onPress={handleVerifyForgotOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {isVi ? 'Tiếp tục →' : 'Continue →'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backLinkWrap}
                onPress={() => {
                  setForgotStep('email');
                  clearMessages();
                }}
              >
                <Text style={styles.backLinkText}>
                  {isVi ? '← Đổi địa chỉ Email' : '← Change Email'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================ */}
          {/* TRƯỜNG HỢP 6: QUÊN MẬT KHẨU - BƯỚC 3 (NHẬP MẬT KHẨU MỚI)     */}
          {/* ============================================================ */}
          {mode === 'forgot' && forgotStep === 'new_password' && (
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {isVi ? 'Mật khẩu mới' : 'New password'}
                </Text>
                <View style={styles.inputBox}>
                  <Text style={styles.fieldIcon}>🔒</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={isVi ? 'Tối thiểu 8 ký tự (chữ, số, ký tự đặc biệt)' : 'At least 8 chars (letters, numbers, special)'}
                    placeholderTextColor="#94A3B8"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.eyeToggle}>{showNewPassword ? '🐵' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldHintSmall}>
                  {isVi
                    ? '* Mật khẩu tối thiểu 8 ký tự gồm chữ cái, chữ số và ký tự đặc biệt'
                    : '* Minimum 8 characters including letters, numbers & special characters'}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {isVi ? 'Xác nhận mật khẩu mới' : 'Confirm new password'}
                </Text>
                <View style={styles.inputBox}>
                  <Text style={styles.fieldIcon}>🔒</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={isVi ? 'Nhập lại mật khẩu mới' : 'Re-enter new password'}
                    placeholderTextColor="#94A3B8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled, { marginTop: 12 }]}
                onPress={handleResetPasswordSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {isVi ? 'Đặt lại mật khẩu & Đăng nhập →' : 'Reset Password & Sign in →'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backLinkWrap}
                onPress={() => {
                  setForgotStep('otp');
                  clearMessages();
                }}
              >
                <Text style={styles.backLinkText}>
                  {isVi ? '← Quay lại nhập OTP' : '← Back to OTP step'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* NÚT GOOGLE (CHỈ HIỆN KHI Ở FORM ĐĂNG NHẬP / ĐĂNG KÝ BƯỚC 1) */}
          {mode !== 'forgot' && registerStep === 'form' ? (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>
                  {isVi ? 'HOẶC TIẾP TỤC VỚI' : 'OR CONTINUE WITH'}
                </Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading || loading}
                activeOpacity={0.85}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#10B981" size="small" style={{ marginRight: 8 }} />
                ) : (
                  <Image
                    source={require('../../../assets/google-logo.png')}
                    style={styles.googleLogoImg}
                    resizeMode="contain"
                  />
                )}
                <Text style={styles.googleBtnText}>
                  {googleLoading
                    ? (isVi ? 'Đang kết nối Google...' : 'Connecting Google...')
                    : (isVi ? 'Tiếp tục với Google' : 'Continue with Google')}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          {/* FOOTER LEGAL */}
          <View style={styles.footerSection}>
            <Text style={styles.legalNotice}>
              {isVi ? 'Bằng việc tiếp tục, bạn đồng ý với ' : 'By continuing, you agree to Monett\'s '}
              <Text style={styles.legalLink}>{isVi ? 'Điều khoản sử dụng' : 'Terms of Service'}</Text>
              {isVi ? ' và ' : ' and '}
              <Text style={styles.legalLink}>{isVi ? 'Chính sách bảo mật' : 'Privacy Policy'}</Text>
              {isVi ? ' của Monett.' : '.'}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  // MÀN HÌNH CỐ ĐỊNH 1 TRANG KHÔNG CUỘN
  fixedScreenContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },

  // 1. TOP BAR
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    padding: 3,
  },
  langToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 16,
    gap: 5,
  },
  langToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  flagEmoji: {
    fontSize: 14,
  },
  langToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  langToggleTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  circleIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpIcon: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },

  // 2. BRAND & HERO
  brandSection: {
    alignItems: 'center',
    marginTop: 2,
  },
  brandLogo: {
    width: 185,
    height: 48,
  },
  badgePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B45309',
  },
  mainTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  mainSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 3,
    paddingHorizontal: 16,
  },

  // 3. TAB SWITCHER
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginTop: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#059669',
    fontWeight: '800',
  },

  // FEEDBACK BANNERS
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  errorText: {
    fontSize: 11.5,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  successText: {
    fontSize: 11.5,
    color: '#15803D',
    fontWeight: '600',
    textAlign: 'center',
  },

  // 4. FORM SECTION
  formSection: {
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 7,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  fieldIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    height: '100%',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 8,
  },
  eyeToggle: {
    fontSize: 16,
    padding: 4,
  },

  // REMEMBER & FORGOT
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  rememberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkboxBox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  rememberText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },

  // PRIMARY BUTTON
  primaryBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // OTP NOTICE & RESEND
  otpNoticeBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  otpNoticeText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
    textAlign: 'center',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  resendTimerText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  resendBtnText: {
    fontSize: 12.5,
    color: '#059669',
    fontWeight: '700',
  },
  resendOtpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  resendOtpLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  countdownText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  inputHintText: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 16,
  },
  fieldHintSmall: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  backLinkWrap: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 4,
  },
  backLinkText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },

  // 5. DIVIDER
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
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

  // 6. GOOGLE BUTTON
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 12,
    height: 44,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  googleLogoImg: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },

  // 7. FOOTER
  footerSection: {
    alignItems: 'center',
    marginTop: 6,
  },
  legalNotice: {
    fontSize: 10.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 16,
  },
  legalLink: {
    color: '#059669',
    fontWeight: '600',
  },
});
