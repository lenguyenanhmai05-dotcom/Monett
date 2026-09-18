import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageToggle } from '../../components/LanguageToggle';
import {
  APPLE_LOGO_WHITE_URI,
  GOOGLE_PLAY_LOGO_URI,
} from '../../components/SocialLogos';

// Crisp App Store vector icon
const AppStoreIcon = () => {
  if (Platform.OS === 'web') {
    return (
      <svg width="24" height="24" viewBox="0 0 170 170" fill="none" style={{ flexShrink: 0 }}>
        <path
          fill="#FFFFFF"
          d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.78-11.72-14.2-6.1-9.58-10.95-20.2-14.54-31.86-3.6-11.66-5.4-22.37-5.4-32.14 0-14.35 3.6-26.24 10.8-35.67 7.2-9.43 16.5-14.26 27.9-14.49 5.86 0 12.16 1.63 18.9 4.88 6.74 3.25 10.97 4.93 12.7 5.04 1.48-.11 5.92-1.85 13.33-5.23 7.4-3.37 13.79-4.88 19.16-4.52 14.58.98 25.75 6.64 33.51 16.98-12.83 7.78-19.1 18.52-18.81 32.22.28 10.66 4.3 19.5 12.06 26.52 7.76 7.02 17.06 11.05 27.9 12.1-2.43 7.6-5.45 15.2-9.05 22.8zM119.22 33.02c0-7.39 2.65-14.35 7.95-20.88 5.3-6.53 11.96-10.67 19.98-12.42.32 1.09.48 2.18.48 3.26 0 7.39-2.76 14.56-8.28 21.52-5.52 6.96-12.24 11.09-20.13 12.4-.43-1.3-.65-2.6-.65-3.88z"
        />
      </svg>
    );
  }
  return <Image source={{ uri: APPLE_LOGO_WHITE_URI }} style={styles.storeIcon} resizeMode="contain" />;
};

// Crisp Google Play / CH Play vector icon
const GooglePlayIcon = () => {
  if (Platform.OS === 'web') {
    return (
      <svg width="24" height="24" viewBox="0 0 512 512" fill="none" style={{ flexShrink: 0 }}>
        <path fill="#4285F4" d="M325.3 234.3L104.6 13l280.8 161.2-60.1 59.9z" />
        <path fill="#EA4335" d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0z" />
        <path fill="#FBBC04" d="M405.4 337.8L104.6 499l220.7-221.3 80.1 60.1z" />
        <path fill="#34A853" d="M405.4 174.2l-80.1 60.1 80.1 60.1 79.9-46c19.1-11 19.1-28.8 0-39.8l-79.9-34.4z" />
      </svg>
    );
  }
  return <Image source={{ uri: GOOGLE_PLAY_LOGO_URI }} style={styles.storeIcon} resizeMode="contain" />;
};

interface LandingScreenProps {
  onNavigateToAuth: (mode: 'login' | 'register') => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onNavigateToAuth }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const isLarge = width >= 1536;
  const containerMaxWidth = isLarge ? 1380 : 1200;
  const { language, setLanguage } = useLanguage();

  const isVi = language === 'vi';

  // Hiệu ứng chú ếch chạy lon ton từ dưới lên trên (Vertical Streak Runway)
  const frogRunY = useRef(new Animated.Value(0)).current; // 0 (bước 1 ở dưới) -> 1 (bước 3 ở trên)
  const frogHopX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const runAnim = Animated.loop(
      Animated.sequence([
        // Chú ếch chạy vọt từ dưới lên trên
        Animated.parallel([
          Animated.timing(frogRunY, {
            toValue: 1,
            duration: 3400,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false,
          }),
          // Nhảy nhót nhịp nhàng khi chạy
          Animated.loop(
            Animated.sequence([
              Animated.timing(frogHopX, { toValue: -4, duration: 170, useNativeDriver: false }),
              Animated.timing(frogHopX, { toValue: 4, duration: 170, useNativeDriver: false }),
              Animated.timing(frogHopX, { toValue: 0, duration: 170, useNativeDriver: false }),
            ]),
            { iterations: 7 }
          ),
        ]),
        // Dừng lại ở đỉnh ăn mừng, đạt mốc Vương Miện Cấp 12
        Animated.delay(1000),
        // Lướt nhanh về vạch xuất phát dưới chân
        Animated.timing(frogRunY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: false,
        }),
        Animated.delay(400),
      ])
    );

    runAnim.start();
    return () => runAnim.stop();
  }, [frogRunY, frogHopX]);

  return (
    <View style={styles.rootContainer}>
      {/* ============================================================ */}
      {/* 1. STICKY TOP NAVBAR (GLASSMORPHISM) */}
      {/* ============================================================ */}
      <View style={styles.navbarWrapper}>
        <View style={[styles.navbarInner, isDesktop ? styles.desktopNavInner : styles.mobileNavInner, { maxWidth: containerMaxWidth }]}>
          {/* Brand Logo */}
          <TouchableOpacity
            style={styles.logoBtn}
            activeOpacity={0.8}
            onPress={() => {
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <Image
              source={require('../../../assets/monett-brand-logo.png')}
              style={styles.navLogo}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Center Navigation Links (Desktop) */}
          {isDesktop && (
            <View style={styles.navLinksRow}>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <Text style={styles.navLinkText}>{isVi ? 'Tính năng' : 'Features'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    document.getElementById('photobooth-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <Text style={styles.navLinkText}>{isVi ? 'Photobooth 📸' : 'Photobooth 📸'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    document.getElementById('download-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <Text style={styles.navLinkText}>{isVi ? 'Tải App Mobile' : 'Download App'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <Text style={styles.navLinkText}>{isVi ? 'Đánh giá' : 'Reviews'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Right Controls: Language & Auth CTAs */}
          <View style={styles.navRightGroup}>
            {/* Language Switcher (Lá cờ Việt Nam & Lá cờ Mỹ) */}
            <LanguageToggle />

            {/* Sign In Button */}
            <TouchableOpacity
              style={styles.signInBtn}
              activeOpacity={0.8}
              onPress={() => onNavigateToAuth('login')}
            >
              <Text style={styles.signInBtnText}>{isVi ? 'Đăng nhập' : 'Sign In'}</Text>
            </TouchableOpacity>

            {/* Get Started Button */}
            <TouchableOpacity
              style={styles.getStartedBtn}
              activeOpacity={0.85}
              onPress={() => onNavigateToAuth('register')}
            >
              <Text style={styles.getStartedBtnText}>
                {isVi ? 'Bắt đầu ngay ➔' : 'Get Started ➔'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 2. MAIN SCROLLABLE CONTENT */}
      {/* ============================================================ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <View style={[styles.heroContainer, isDesktop ? styles.heroDesktopRow : styles.heroMobileCol, { maxWidth: containerMaxWidth }, isLarge && { gap: 48 }]}>
            {/* Left Hero Text */}
            <View style={[styles.heroLeft, isDesktop ? { flex: 1.1 } : { width: '100%' }]}>
              <View style={styles.pillBadge}>
                <Text style={styles.pillBadgeEmoji}>✨</Text>
                <Text style={styles.pillBadgeText}>
                  {isVi
                    ? 'Fintech × Nhật Ký Ảnh Đầu Tiên'
                    : 'The First Visual Photo Diary Fintech'}
                </Text>
              </View>

              <Text style={styles.heroTitle}>
                {isVi ? (
                  <>
                    Ghi chép chi tiêu bằng{' '}
                    <Text style={styles.heroTitleHighlight}>hình ảnh khoảnh khắc</Text>
                  </>
                ) : (
                  <>
                    Capture daily spending with{' '}
                    <Text style={styles.heroTitleHighlight}>visual money moments</Text>
                  </>
                )}
              </Text>

              <Text style={styles.heroSubtitle}>
                {isVi
                  ? 'Tạm biệt những bảng tính khô khan và cảm giác tội lỗi khi chi tiêu. Monett biến từng cốc cà phê, bữa ăn ngon hay món quà tặng thành một ký ức đáng nhớ, giúp bạn xây dựng thói quen tài chính an vui mỗi ngày.'
                  : 'Say goodbye to boring spreadsheets and stressful expense tracking. Monett transforms every coffee cup, delicious meal, and memory into a vibrant keepsake while building joyful money habits.'}
              </Text>

              {/* Dual CTAs */}
              <View style={styles.heroCtaGroup}>
                <TouchableOpacity
                  style={styles.heroPrimaryCta}
                  activeOpacity={0.85}
                  onPress={() => onNavigateToAuth('register')}
                >
                  <Text style={styles.heroPrimaryCtaText}>
                    {isVi ? 'Bắt đầu miễn phí ➔' : 'Start for Free ➔'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.heroSecondaryCta}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      document.getElementById('download-section')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  <Text style={styles.heroSecondaryCtaText}>
                    {isVi ? '📱 Tải App Mobile' : '📱 Download Mobile App'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Trust & Social Proof Badges */}
              <View style={styles.heroTrustRow}>
                <View style={styles.trustItem}>
                  <Text style={styles.trustStars}>⭐️⭐️⭐️⭐️⭐️</Text>
                  <Text style={styles.trustText}>
                    <Text style={{ fontWeight: '700', color: '#0F172A' }}>4.9/5</Text>{' '}
                    {isVi ? 'xếp hạng yêu thích' : 'user rating'}
                  </Text>
                </View>
                <View style={styles.trustDivider} />
                <View style={styles.trustItem}>
                  <Text style={styles.trustNumber}>45.000+</Text>
                  <Text style={styles.trustText}>
                    {isVi ? 'khoảnh khắc đã lưu' : 'moments captured'}
                  </Text>
                </View>
                <View style={styles.trustDivider} />
                <View style={styles.trustItem}>
                  <Text style={styles.trustNumber}>18 ngày</Text>
                  <Text style={styles.trustText}>
                    {isVi ? 'chuỗi giữ lửa trung bình' : 'avg streak'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Hero Artwork with Mascot & Floating Badges */}
            <View style={[styles.heroRight, isDesktop ? { flex: 0.9 } : { width: '100%', marginTop: 36 }]}>
              <View style={styles.heroArtBackdrop}>
                {/* Glow halos */}
                <View style={styles.heroArtGlow} />

                {/* Central Frog Mascot with Conical Hat & "M" Coin */}
                <Image
                  source={require('../../../assets/frogs/frog-mascot-m.png')}
                  style={styles.heroMascotImage}
                  resizeMode="contain"
                />

                {/* Floating Card 1: Coffee Moment */}
                <View style={[styles.floatingCard, styles.floatingCardTopRight]}>
                  <View style={styles.floatingCardIconBox}>
                    <Text style={{ fontSize: 20 }}>☕</Text>
                  </View>
                  <View>
                    <Text style={styles.floatingCardTitle}>
                      {isVi ? 'Cà phê sáng với bạn' : 'Morning Cafe'}
                    </Text>
                    <Text style={styles.floatingCardAmount}>-45.000 đ</Text>
                  </View>
                </View>

                {/* Floating Card 2: Streak Level */}
                <View style={[styles.floatingCard, styles.floatingCardBottomLeft]}>
                  <View style={[styles.floatingCardIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={{ fontSize: 20 }}>🔥</Text>
                  </View>
                  <View>
                    <Text style={styles.floatingCardTitle}>
                      {isVi ? 'Chuỗi 18 Ngày Giữ Lửa' : '18-Day Streak Active'}
                    </Text>
                    <Text style={[styles.floatingCardSub, { color: '#D97706' }]}>
                      {isVi ? 'Bé Ếch Lên Cấp 12 ✨' : 'Level 12 Explorer ✨'}
                    </Text>
                  </View>
                </View>

                {/* Floating Card 3: Safe Budget Shield */}
                <View style={[styles.floatingCard, styles.floatingCardBottomRight]}>
                  <View style={[styles.floatingCardIconBox, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={{ fontSize: 20 }}>🛡️</Text>
                  </View>
                  <View>
                    <Text style={styles.floatingCardTitle}>
                      {isVi ? 'Hạn Mức An Toàn' : 'Safe Spending'}
                    </Text>
                    <Text style={[styles.floatingCardSub, { color: '#059669' }]}>
                      {isVi ? 'Còn lại 68% tháng' : '68% left this month'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 3. PHOTOBOOTH & CAMERA MOMENTS SHOWCASE */}
        {/* ============================================================ */}
        <View
          // @ts-ignore
          nativeID="photobooth-section"
          id="photobooth-section"
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTagBadge}>
              <Text style={styles.sectionTagText}>
                {isVi ? '🎞️ PHOTOBOOTH & CAMERA' : '🎞️ PHOTOBOOTH & CAMERA'}
              </Text>
            </View>
            <Text style={styles.sectionTitle}>
              {isVi
                ? 'Không chỉ là những con số — Mỗi hóa đơn là một mẩu chuyện đời!'
                : 'Not just plain numbers — Every receipt is a joyful memory!'}
            </Text>
            <Text style={styles.sectionDesc}>
              {isVi
                ? 'Lấy cảm hứng từ những dải ảnh Photobooth Life4Cuts thịnh hành của giới trẻ, Monett mang đến trải nghiệm lưu trữ tài chính chân thực, sinh động và đầy ắp kỷ niệm.'
                : 'Inspired by beloved Life4Cuts photostrips, Monett makes your financial records tangible, stylish, and full of heartfelt stories.'}
            </Text>
          </View>

          <View style={[styles.photoboothRow, isDesktop ? styles.photoboothDesktop : styles.photoboothMobile, { maxWidth: containerMaxWidth }]}>
            {/* Left: The Photobooth Strip (Authentic 4-cut photostrip with pin badge & tilt) */}
            <View style={styles.photoboothStripCard}>
              <View style={styles.photoboothPinBadge}>
                <Text style={{ fontSize: 16 }}>📌</Text>
                <Text style={styles.photoboothPinText}>
                  {isVi ? 'Dải Ảnh Photobooth Độc Quyền' : 'Exclusive Photostrip'}
                </Text>
              </View>

              <View style={styles.photoboothImageFrame}>
                <Image
                  source={require('../../../assets/frogs/frog-photobooth-strip.png')}
                  style={styles.photoboothStripImg}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.photoboothCaption}>
                <Text style={styles.photoboothDate}>
                  {isVi ? 'Monett Life4Cuts • 4 Khoảnh Khắc Vui Tươi' : 'Monett Life4Cuts • 4 Happy Moments'}
                </Text>
                <Text style={styles.photoboothSub}>
                  {isVi
                    ? 'Chụp ảnh cùng bé ếch để ghi dấu từng cột mốc chi tiêu!'
                    : 'Smile with your companion frog as you manage your money!'}
                </Text>
              </View>
            </View>

            {/* Right: Big Phone Mockup & Vertical Frog Runway */}
            <View style={styles.cameraFlowCard}>
              {/* Header Badge & Title */}
              <View style={styles.cameraFlowHeader}>
                <View style={styles.flowHeaderBadge}>
                  <Text style={{ fontSize: 13 }}>🏃‍♂️</Text>
                  <Text style={styles.flowHeaderBadgeText}>
                    {isVi ? 'ĐƯỜNG CHẠY KỶ LUẬT • NUÔI ẾCH TỪNG NGÀY' : 'STREAK RUNWAY • DAILY COMPANION'}
                  </Text>
                </View>
                <Text style={styles.cameraFlowTitle}>
                  {isVi
                    ? 'Chạm điện thoại là ếch chạy — Càng chi tiêu càng vui!'
                    : 'Snap on mobile, watch your companion frog level up!'}
                </Text>
              </View>

              {/* Two-Column Layout: Big Phone (Left) + Vertical Runway & Steps (Right) */}
              <View style={[styles.showcaseTwoCol, isDesktop ? styles.showcaseDesktopRow : styles.showcaseMobileCol]}>
                {/* 1. BIG PHONE MOCKUP (TO RÕ NHƯ ĐIỆN THOẠI THẬT) */}
                <View style={styles.bigPhoneCol}>
                  <View style={styles.bigPhoneFrame}>
                    <Image
                      source={require('../../../assets/monett-phone-mockup.png')}
                      style={styles.bigPhoneImg}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.phoneStorePill}>
                    <Text style={styles.phoneStorePillText}>
                      {isVi ? '📱 Giao diện App Mobile Monett' : '📱 Monett Mobile App'}
                    </Text>
                  </View>
                </View>

                {/* 2. ĐƯỜNG CHẠY BÊN CẠNH ĐIỆN THOẠI: BÉ ẾCH CHẠY TỪ DƯỚI LÊN TRÊN */}
                <View style={styles.verticalRunwayCol}>
                  {/* Cột Vạch Đường Chạy & Chú Ếch Chạy Nhảy */}
                  <View style={styles.trackLane}>
                    {/* Vạch nền mờ */}
                    <View style={styles.trackLineBg} />

                    {/* Vạch tiến độ xanh ngọc chạy từ dưới lên trên */}
                    <Animated.View
                      style={[
                        styles.trackLineFill,
                        {
                          height: frogRunY.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '88%'],
                          }),
                        },
                      ]}
                    />

                    {/* Điểm mốc 1 (Dưới cùng - Xuất phát) */}
                    <View style={[styles.trackMilestoneDot, styles.dotBottom]}>
                      <Text style={{ fontSize: 11 }}>📸</Text>
                    </View>

                    {/* Điểm mốc 2 (Ở giữa) */}
                    <View style={[styles.trackMilestoneDot, styles.dotMiddle]}>
                      <Text style={{ fontSize: 11 }}>🏷️</Text>
                    </View>

                    {/* Điểm mốc 3 (Trên cùng - Đích đến) */}
                    <View style={[styles.trackMilestoneDot, styles.dotTop]}>
                      <Text style={{ fontSize: 11 }}>👑</Text>
                    </View>

                    {/* Chú ếch đang chạy lon ton TỪ DƯỚI LÊN TRÊN */}
                    <Animated.View
                      style={[
                        styles.animatedRunnerFrogBox,
                        {
                          bottom: frogRunY.interpolate({
                            inputRange: [0, 1],
                            outputRange: [6, 360],
                          }),
                          transform: [{ translateX: frogHopX }],
                        },
                      ]}
                    >
                      <Image
                        source={require('../../../assets/frogs/frog-snap.png')}
                        style={styles.runnerFrogSprite}
                        resizeMode="contain"
                      />
                      <View style={styles.runnerDustBox}>
                        <Text style={{ fontSize: 9 }}>💨</Text>
                      </View>
                    </Animated.View>
                  </View>

                  {/* 3 Thẻ Bước Tương Ứng Với 3 Mốc Đường Chạy */}
                  <View style={styles.verticalStepsColumn}>
                    {/* Bước 3 (Trên cùng - Đích vương miện) */}
                    <View style={[styles.verticalStepCard, styles.stepCardTarget]}>
                      <View style={styles.stepCardHeader}>
                        <Text style={styles.stepNumBadgeTarget}>3</Text>
                        <Text style={styles.stepCardName}>
                          {isVi ? 'Nuôi Ếch Giữ Lửa Tài Chính' : 'Fuel Your Streak & Frog Level'}
                        </Text>
                        <View style={styles.rewardTagTarget}>
                          <Text style={styles.rewardTagTextTarget}>👑 Cấp 12 • 18N</Text>
                        </View>
                      </View>
                      <Text style={styles.stepCardDescription}>
                        {isVi
                          ? 'Khoản chi tự động gom vào album cuộc đời và tích lũy điểm streak nuôi bé ếch.'
                          : 'Expenses saved into your life moments, unlocking crowns and companion streak.'}
                      </Text>
                    </View>

                    {/* Bước 2 (Ở giữa) */}
                    <View style={styles.verticalStepCard}>
                      <View style={styles.stepCardHeader}>
                        <Text style={styles.stepNumBadgeMid}>2</Text>
                        <Text style={styles.stepCardName}>
                          {isVi ? 'Gắn Số Tiền & Cảm Xúc' : 'Tag Amount & Feelings'}
                        </Text>
                        <View style={styles.rewardTagMid}>
                          <Text style={styles.rewardTagTextMid}>🪙 +20 Coin</Text>
                        </View>
                      </View>
                      <Text style={styles.stepCardDescription}>
                        {isVi
                          ? 'Nhập nhanh số tiền, chọn icon cảm xúc (Tự thưởng, Thư giãn, Cần thiết) trong 3 giây.'
                          : 'Quickly set price and emotional tag (Treat Yourself, Work, Fun) in 3 seconds.'}
                      </Text>
                    </View>

                    {/* Bước 1 (Dưới cùng - Điểm xuất phát) */}
                    <View style={styles.verticalStepCard}>
                      <View style={styles.stepCardHeader}>
                        <Text style={styles.stepNumBadgeBot}>1</Text>
                        <Text style={styles.stepCardName}>
                          {isVi ? 'Chụp 1 Tấm Ảnh Bất Kỳ' : 'Snap Any Photo in 1 Second'}
                        </Text>
                        <View style={styles.rewardTagBot}>
                          <Text style={styles.rewardTagTextBot}>✨ Bắt đầu</Text>
                        </View>
                      </View>
                      <Text style={styles.stepCardDescription}>
                        {isVi
                          ? 'Bát phở sáng, cốc trà sữa hay chiếc áo mới — giơ máy lên và chụp trong tích tắc.'
                          : 'A morning coffee, dinner receipt, or shopping cart — snap instantly in 1 tap.'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 4. BENTO GRID TÍNH NĂNG ĐỘT PHÁ VỚI BỘ ẾCH MỚI */}
        {/* ============================================================ */}
        <View
          // @ts-ignore
          nativeID="features-section"
          id="features-section"
          style={[styles.sectionContainer, { backgroundColor: '#F1F5F9' }]}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionTagBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Text style={[styles.sectionTagText, { color: '#B45309' }]}>
                {isVi ? '🌟 TÍNH NĂNG VƯỢT TRỘI' : '🌟 KEY FEATURES'}
              </Text>
            </View>
            <Text style={styles.sectionTitle}>
              {isVi
                ? 'Trợ Lý Tài Chính Thông Minh Đồng Hành Cùng Bạn'
                : 'Your Smart Financial Companion Every Step'}
            </Text>
            <Text style={styles.sectionDesc}>
              {isVi
                ? 'Thiết kế trực quan, dễ dùng cho tất cả mọi người — từ học sinh, sinh viên đến người đi làm bận rộn.'
                : 'Intuitive, beautiful, and effortless for students, creators, and busy professionals.'}
            </Text>
          </View>

          {/* 4 Feature Bento Cards */}
          <View style={[styles.bentoGrid, { maxWidth: containerMaxWidth }]}>
            {/* Card 1: Frog Selfie (Visual Diary) */}
            <View style={[styles.bentoCard, isDesktop ? styles.bentoCardHalf : styles.bentoCardFull]}>
              <View style={styles.bentoCardHeader}>
                <View style={styles.bentoIconBadge}>
                  <Text style={{ fontSize: 22 }}>📸</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bentoCardTitle}>
                    {isVi ? 'Nhật Ký Ảnh Money Moments' : 'Visual Photo Diary'}
                  </Text>
                  <Text style={styles.bentoCardSubtitle}>
                    {isVi ? 'Lịch ảnh chi tiêu sinh động' : 'Daily timeline of memory keepsakes'}
                  </Text>
                </View>
              </View>
              <Text style={styles.bentoCardBody}>
                {isVi
                  ? 'Xem lại chi tiêu như đang lướt mạng xã hội! Cuối tháng bạn có thể mở album để nhìn ngắm những quán ngon đã đi, những trải nghiệm quý giá đã đầu tư cho bản thân.'
                  : 'Review spending like browsing a curated social feed. Relive every memorable cafe visit, delicious dinner, and personal investment without spreadsheet anxiety.'}
              </Text>
              <View style={styles.bentoFrogArtBox}>
                <Image
                  source={require('../../../assets/frogs/frog-selfie.png')}
                  style={styles.bentoFrogImg}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Card 2: Frog Shopping (Categories & Limits) */}
            <View style={[styles.bentoCard, isDesktop ? styles.bentoCardHalf : styles.bentoCardFull]}>
              <View style={styles.bentoCardHeader}>
                <View style={[styles.bentoIconBadge, { backgroundColor: '#E0E7FF' }]}>
                  <Text style={{ fontSize: 22 }}>🛒</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bentoCardTitle}>
                    {isVi ? 'Tự Động Phân Loại Danh Mục' : 'Smart Category Allocations'}
                  </Text>
                  <Text style={styles.bentoCardSubtitle}>
                    {isVi ? 'Ăn uống, Chợ búa, Mua sắm, Du lịch' : 'Groceries, Dining, Shopping & Travel'}
                  </Text>
                </View>
              </View>
              <Text style={styles.bentoCardBody}>
                {isVi
                  ? 'Bé ếch thông minh tự động phân bổ tiền vào các hũ ngân sách thiết yếu. Khi bạn sắp chạm trần ngân sách cho phép, hệ thống sẽ nhắc nhở dịu dàng để bạn an tâm chi tiêu.'
                  : 'Automatic categorization allocates your money into smart buckets. Get gentle, positive reminders before you overspend so you always stay financially at peace.'}
              </Text>
              <View style={styles.bentoFrogArtBox}>
                <Image
                  source={require('../../../assets/frogs/frog-shopping.png')}
                  style={styles.bentoFrogImg}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Card 3: Frog Tracking (Quick Logging & Streaks) */}
            <View style={[styles.bentoCard, isDesktop ? styles.bentoCardHalf : styles.bentoCardFull]}>
              <View style={styles.bentoCardHeader}>
                <View style={[styles.bentoIconBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={{ fontSize: 22 }}>📱</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bentoCardTitle}>
                    {isVi ? 'Nhập Chi Tiêu 1 Chạm Siêu Nhanh' : '3-Second Quick Logging'}
                  </Text>
                  <Text style={styles.bentoCardSubtitle}>
                    {isVi ? 'Nuôi ếch lên cấp và giữ lửa kỷ luật' : 'Level up your frog with mindful streaks'}
                  </Text>
                </View>
              </View>
              <Text style={styles.bentoCardBody}>
                {isVi
                  ? 'Giao diện tối giản chỉ mất đúng 3 giây để lưu khoản chi. Không còn cảnh nản lòng vì phải gõ quá nhiều ô thông tin rắc rối như các app kế toán truyền thống.'
                  : 'Record expenses in just 3 seconds flat. No overwhelming forms, no complicated accounting jargon — pure simplicity designed for real human daily life.'}
              </Text>
              <View style={styles.bentoFrogArtBox}>
                <Image
                  source={require('../../../assets/frogs/frog-tracking.png')}
                  style={styles.bentoFrogImg}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Card 4: Security & Real Email OTP */}
            <View style={[styles.bentoCard, isDesktop ? styles.bentoCardHalf : styles.bentoCardFull]}>
              <View style={styles.bentoCardHeader}>
                <View style={[styles.bentoIconBadge, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={{ fontSize: 22 }}>🔒</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bentoCardTitle}>
                    {isVi ? 'Bảo Mật OTP & Đồng Bộ Đám Mây' : 'Real Email OTP & Cloud Sync'}
                  </Text>
                  <Text style={styles.bentoCardSubtitle}>
                    {isVi ? 'Gmail SMTP bảo mật + MongoDB Atlas' : 'Gmail SMTP Security + MongoDB Atlas'}
                  </Text>
                </View>
              </View>
              <Text style={styles.bentoCardBody}>
                {isVi
                  ? 'Đăng ký và khôi phục mật khẩu bảo mật qua mã OTP 6 số gửi thẳng vào hộp thư Gmail thật của bạn. Mọi dữ liệu tài chính được mã hóa bảo mật chuẩn ngân hàng số.'
                  : 'Fast and secure account access with 6-digit OTP codes delivered directly to your verified Gmail inbox. Encrypted cloud storage keeps your financial data safe 24/7.'}
              </Text>
              <View style={styles.bentoFrogArtBox}>
                <Image
                  source={require('../../../assets/frogs/frog-payday.png')}
                  style={styles.bentoFrogImg}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 5. DOWNLOAD MOBILE APP SECTION */}
        {/* ============================================================ */}
        <View
          // @ts-ignore
          nativeID="download-section"
          id="download-section"
          style={styles.downloadSection}
        >
          <View style={[styles.downloadInnerCard, isDesktop ? styles.downloadDesktop : styles.downloadMobile, { maxWidth: containerMaxWidth }]}>
            {/* Left Info & Badges */}
            <View style={[styles.downloadLeft, isDesktop ? { flex: 1.2 } : { width: '100%' }]}>
              <View style={styles.downloadTagPill}>
                <Text style={styles.downloadTagText}>
                  {isVi ? '📲 TRẢI NGHIỆM ĐỒNG BỘ TOÀN DIỆN' : '📲 SEAMLESS CROSS-PLATFORM'}
                </Text>
              </View>

              <Text style={styles.downloadTitle}>
                {isVi
                  ? 'Tải Monett Cho Điện Thoại Của Bạn'
                  : 'Get Monett on Your Mobile Device'}
              </Text>

              <Text style={styles.downloadDesc}>
                {isVi
                  ? 'Mang theo trợ lý bé ếch thông minh mọi lúc, mọi nơi. Chụp ảnh chi tiêu ngay tại quầy thanh toán chỉ với một cú chạm. Đồng bộ tức thì với phiên bản máy tính.'
                  : 'Take your friendly companion frog wherever life takes you. Capture bills on the go with zero delay, seamlessly synced across Web and Mobile.'}
              </Text>

              {/* App Store & Google Play (CH Play) Buttons */}
              <View style={styles.storeButtonsRow}>
                {/* App Store Button */}
                <TouchableOpacity
                  style={styles.storeButton}
                  activeOpacity={0.8}
                  onPress={() => onNavigateToAuth('register')}
                >
                  <AppStoreIcon />
                  <View style={styles.storeButtonTextCol}>
                    <Text style={styles.storeButtonSubtitle}>
                      {isVi ? 'TẢI VỀ TRÊN' : 'DOWNLOAD ON THE'}
                    </Text>
                    <Text style={styles.storeButtonTitle}>App Store</Text>
                  </View>
                </TouchableOpacity>

                {/* Google Play (CH Play) Button */}
                <TouchableOpacity
                  style={styles.storeButton}
                  activeOpacity={0.8}
                  onPress={() => onNavigateToAuth('register')}
                >
                  <GooglePlayIcon />
                  <View style={styles.storeButtonTextCol}>
                    <Text style={styles.storeButtonSubtitle}>
                      {isVi ? 'TẢI VỀ TRÊN' : 'GET IT ON'}
                    </Text>
                    <Text style={styles.storeButtonTitle}>Google Play (CH Play)</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.downloadNotice}>
                {isVi
                  ? '* Dự án học tập & nghiên cứu sáng tạo • Hỗ trợ trải nghiệm trực tiếp trên trình duyệt Web & Mobile WebApp.'
                  : '* University Capstone Project • Fully responsive and accessible directly via Web & Mobile WebApp.'}
              </Text>
            </View>

            {/* Right: Mockup Phone & QR Code Preview */}
            <View style={[styles.downloadRight, isDesktop ? { flex: 0.8 } : { width: '100%', marginTop: 30 }]}>
              <View style={styles.qrCard}>
                <View style={styles.qrHeader}>
                  <Text style={styles.qrTitle}>
                    {isVi ? 'Quét mã để mở ngay' : 'Scan to Open WebApp'}
                  </Text>
                  <Text style={styles.qrSub}>
                    {isVi ? 'Dùng camera điện thoại quét mã' : 'Use phone camera to scan'}
                  </Text>
                </View>

                {/* QR Code Visual Graphic */}
                <View style={styles.qrGraphicFrame}>
                  {/* Decorative QR Pattern */}
                  <View style={styles.qrPatternBox}>
                    <Text style={{ fontSize: 72 }}>📱</Text>
                    <Text style={styles.qrPillLabel}>Monett WebApp</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.qrActionBtn}
                  activeOpacity={0.85}
                  onPress={() => onNavigateToAuth('register')}
                >
                  <Text style={styles.qrActionBtnText}>
                    {isVi ? 'Mở Trải Nghiệm Ngay ➔' : 'Open Experience Now ➔'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 6. USER REVIEWS & SOCIAL PROOF */}
        {/* ============================================================ */}
        <View
          // @ts-ignore
          nativeID="reviews-section"
          id="reviews-section"
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionTagBadge, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
              <Text style={[styles.sectionTagText, { color: '#B91C1C' }]}>
                {isVi ? '💬 CẢM NHẬN NGƯỜI DÙNG' : '💬 COMMUNITY LOVE'}
              </Text>
            </View>
            <Text style={styles.sectionTitle}>
              {isVi ? 'Được Yêu Thích Bởi Hơn 10.000+ Bạn Trẻ' : 'Loved by Over 10,000+ Young Creators'}
            </Text>
            <Text style={styles.sectionDesc}>
              {isVi
                ? 'Lắng nghe những chia sẻ chân thực từ những người đã biến việc theo dõi chi tiêu thành niềm vui mỗi ngày.'
                : 'Hear genuine thoughts from users who turned daily expense tracking into a peaceful habit.'}
            </Text>
          </View>

          <View style={[styles.reviewRow, isDesktop ? styles.reviewRowDesktop : styles.reviewRowMobile, { maxWidth: containerMaxWidth }]}>
            {/* Review 1 */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewStars}>⭐️⭐️⭐️⭐️⭐️</Text>
              <Text style={styles.reviewQuote}>
                {isVi
                  ? '“Từ ngày dùng Monett, chụp ảnh ly cà phê rồi ghi giá tiền đã thành niềm vui chứ không còn áp lực như trước nữa. Giao diện bé ếch dễ thương xỉu!”'
                  : '“Snapping my coffee and tagging the expense is so fun now! No more spreadsheet stress. The frog mascot makes budgeting genuinely joyful!”'}
              </Text>
              <View style={styles.reviewerInfo}>
                <View style={[styles.reviewerAvatar, { backgroundColor: '#D1FAE5' }]}>
                  <Text style={{ fontSize: 18 }}>🌸</Text>
                </View>
                <View>
                  <Text style={styles.reviewerName}>Mai Linh</Text>
                  <Text style={styles.reviewerRole}>
                    {isVi ? 'Sinh viên ĐH Ngoại Thương' : 'University Student'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Review 2 */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewStars}>⭐️⭐️⭐️⭐️⭐️</Text>
              <Text style={styles.reviewQuote}>
                {isVi
                  ? '“Bé ếch nhắc nhở rất tinh tế, không phán xét khi mình lỡ tay mua sắm. Chuỗi 18 ngày giữ lửa làm mình có động lực tiết kiệm hẳn.”'
                  : '“The daily streak keeps me motivated. It encourages you positively rather than shaming you for spending. Best financial app I’ve used.”'}
              </Text>
              <View style={styles.reviewerInfo}>
                <View style={[styles.reviewerAvatar, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={{ fontSize: 18 }}>🚀</Text>
                </View>
                <View>
                  <Text style={styles.reviewerName}>Hoàng Nam</Text>
                  <Text style={styles.reviewerRole}>
                    {isVi ? 'UI/UX Designer • TP.HCM' : 'Product Designer • HCMC'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Review 3 */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewStars}>⭐️⭐️⭐️⭐️⭐️</Text>
              <Text style={styles.reviewQuote}>
                {isVi
                  ? '“Dải ảnh Photobooth Life4Cuts và giao diện xanh ngọc dịu mắt thực sự đem lại cảm xúc khác biệt. Một dự án fintech cực kỳ chỉn chu!”'
                  : '“The Life4Cuts Photobooth moments and soothing emerald green palette feel so premium. Truly an outstanding fintech design!”'}
              </Text>
              <View style={styles.reviewerInfo}>
                <View style={[styles.reviewerAvatar, { backgroundColor: '#E0E7FF' }]}>
                  <Text style={{ fontSize: 18 }}>✨</Text>
                </View>
                <View>
                  <Text style={styles.reviewerName}>Minh Thư</Text>
                  <Text style={styles.reviewerRole}>
                    {isVi ? 'Content Creator • Hà Nội' : 'Content Creator • Hanoi'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 7. BOTTOM CTA BANNER */}
        {/* ============================================================ */}
        <View style={styles.bottomCtaSection}>
          <View style={[styles.bottomCtaCard, isLarge && { maxWidth: 1100 }]}>
            <View style={styles.bottomCtaFrogBadge}>
              <Text style={{ fontSize: 36 }}>🐸</Text>
            </View>

            <Text style={styles.bottomCtaTitle}>
              {isVi
                ? 'Sẵn sàng biến việc quản lý chi tiêu thành niềm vui?'
                : 'Ready to Turn Mindful Spending Into Daily Joy?'}
            </Text>

            <Text style={styles.bottomCtaDesc}>
              {isVi
                ? 'Tham gia cùng hàng nghìn bạn trẻ ngay hôm nay. Tạo tài khoản hoàn toàn miễn phí chỉ trong 30 giây.'
                : 'Join thousands of mindful spenders today. Set up your free account in less than 30 seconds.'}
            </Text>

            <TouchableOpacity
              style={styles.bottomCtaButton}
              activeOpacity={0.88}
              onPress={() => onNavigateToAuth('register')}
            >
              <Text style={styles.bottomCtaButtonText}>
                {isVi ? 'Tạo tài khoản miễn phí ngay ➔' : 'Create Free Account Now ➔'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.bottomCtaNote}>
              {isVi
                ? 'Không cần thẻ tín dụng • Xác thực OTP an toàn qua Email'
                : 'No credit card required • Secure real-time email verification'}
            </Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 8. FOOTER */}
        {/* ============================================================ */}
        <View style={styles.footerContainer}>
          <View style={[styles.footerInner, isDesktop ? styles.footerDesktopRow : styles.footerMobileCol, { maxWidth: containerMaxWidth }]}>
            {/* Left Brand Col */}
            <View style={styles.footerBrandCol}>
              <View style={styles.footerLogoBadge}>
                <Image
                  source={require('../../../assets/monett-brand-logo.png')}
                  style={styles.footerLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.footerSlogan}>
                {isVi
                  ? 'Ghi chép chi tiêu bằng hình ảnh khoảnh khắc — Xây dựng thói quen tài chính an vui mỗi ngày.'
                  : 'Capture daily spending with visual money moments — Mindful, joyful financial habits.'}
              </Text>
              <Text style={styles.footerCopyright}>
                © 2026 Monett Finance Moments. All rights reserved.
              </Text>
            </View>

            {/* Right Links Col */}
            <View style={styles.footerLinksGrid}>
              <View style={styles.footerLinkCol}>
                <Text style={styles.footerLinkHeader}>{isVi ? 'Sản Phẩm' : 'Product'}</Text>
                <Text style={styles.footerLinkItem}>{isVi ? 'Nhật Ký Ảnh' : 'Photo Moments'}</Text>
                <Text style={styles.footerLinkItem}>{isVi ? 'Photobooth 4-Cut' : 'Life4Cuts'}</Text>
                <Text style={styles.footerLinkItem}>{isVi ? 'Chuỗi Streaks' : 'Mindful Streaks'}</Text>
                <Text style={styles.footerLinkItem}>{isVi ? 'Bản Đồ Dòng Tiền' : 'Cashflow Blueprint'}</Text>
              </View>

              <View style={styles.footerLinkCol}>
                <Text style={styles.footerLinkHeader}>{isVi ? 'Ứng Dụng' : 'Applications'}</Text>
                <Text style={styles.footerLinkItem}>App Store (iOS)</Text>
                <Text style={styles.footerLinkItem}>Google Play (Android)</Text>
                <Text style={styles.footerLinkItem}>Monett Web App</Text>
                <Text style={styles.footerLinkItem}>TestFlight Beta</Text>
              </View>

              <View style={styles.footerLinkCol}>
                <Text style={styles.footerLinkHeader}>{isVi ? 'Dự Án' : 'Project'}</Text>
                <Text style={styles.footerLinkItem}>{isVi ? 'Về Chúng Tôi' : 'About Us'}</Text>
                <Text style={styles.footerLinkItem}>{isVi ? 'Điều Khoản Dịch Vụ' : 'Terms of Service'}</Text>
                <Text style={styles.footerLinkItem}>{isVi ? 'Chính Sách Bảo Mật' : 'Privacy Policy'}</Text>
                <Text style={styles.footerLinkItem}>{isVi ? 'Đồ Án Môn Học' : 'University Project'}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

/* ============================================================ */
/* STYLESHEET */
/* ============================================================ */
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Navbar
  navbarWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 100,
    // @ts-ignore
    backdropFilter: 'blur(12px)',
  },
  navbarInner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  desktopNavInner: {
    height: 72,
  },
  mobileNavInner: {
    height: 64,
  },
  logoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navLogo: {
    width: 140,
    height: 52,
  },
  navLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  navLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    // @ts-ignore
    transition: 'color 0.2s',
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langSwitch: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 2,
  },
  langBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  langBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  langTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  signInBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  signInBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  getStartedBtn: {
    backgroundColor: '#047857',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  getStartedBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Hero Section
  heroSection: {
    backgroundColor: '#F8FAFD',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  heroContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroDesktopRow: {
    flexDirection: 'row',
    gap: 40,
    paddingVertical: 20,
  },
  heroMobileCol: {
    flexDirection: 'column',
  },
  heroLeft: {
    alignItems: 'flex-start',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
    marginBottom: 20,
  },
  pillBadgeEmoji: {
    fontSize: 14,
  },
  pillBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  heroTitle: {
    fontSize: 42,
    lineHeight: 52,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 18,
    letterSpacing: -0.5,
  },
  heroTitleHighlight: {
    color: '#047857',
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: '#475569',
    marginBottom: 28,
    maxWidth: 560,
  },
  heroCtaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 36,
  },
  heroPrimaryCta: {
    backgroundColor: '#047857',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 14,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  heroPrimaryCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSecondaryCta: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  heroSecondaryCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  heroTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    width: '100%',
  },
  trustItem: {
    flexDirection: 'column',
  },
  trustStars: {
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 2,
  },
  trustNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#047857',
  },
  trustText: {
    fontSize: 13,
    color: '#64748B',
  },
  trustDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },

  // Hero Artwork
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArtBackdrop: {
    width: '100%',
    maxWidth: 460,
    height: 440,
    backgroundColor: '#ECFDF5',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 3,
  },
  heroArtGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(52, 211, 153, 0.25)',
  },
  heroMascotImage: {
    width: 280,
    height: 280,
    zIndex: 2,
  },
  floatingCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 10,
  },
  floatingCardTopRight: {
    top: 24,
    right: -10,
  },
  floatingCardBottomLeft: {
    bottom: 24,
    left: -12,
  },
  floatingCardBottomRight: {
    bottom: 90,
    right: -16,
  },
  floatingCardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  floatingCardAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  floatingCardSub: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Section Common
  sectionContainer: {
    paddingVertical: 64,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    maxWidth: 780,
    alignSelf: 'center',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 44,
  },
  sectionTagBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 12,
  },
  sectionTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 15,
    lineHeight: 24,
    color: '#64748B',
    textAlign: 'center',
  },

  // Photobooth Section
  photoboothRow: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    gap: 36,
  },
  photoboothDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoboothMobile: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  photoboothStripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
    alignItems: 'center',
    flex: 0.75,
    width: '100%',
    maxWidth: 380,
  },
  photoboothPinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  photoboothPinText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  photoboothImageFrame: {
    width: '100%',
    height: 480,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAF9',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F5F5F4',
  },
  photoboothStripImg: {
    width: '100%',
    height: '100%',
    // @ts-ignore
    transform: 'rotate(-1.5deg)',
  },
  photoboothCaption: {
    marginTop: 16,
    alignItems: 'center',
  },
  photoboothDate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  photoboothSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },

  // Big Phone & Vertical Frog Runway Showcase
  cameraFlowCard: {
    flex: 1.35,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
    width: '100%',
  },
  cameraFlowHeader: {
    marginBottom: 16,
  },
  flowHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  flowHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.4,
  },
  cameraFlowTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
  },

  // Two columns: Big Phone & Vertical Runway
  showcaseTwoCol: {
    width: '100%',
    gap: 20,
    alignItems: 'center',
  },
  showcaseDesktopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  showcaseMobileCol: {
    flexDirection: 'column',
  },

  // 1. Big Phone Col
  bigPhoneCol: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bigPhoneFrame: {
    width: 260,
    height: 510,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPhoneImg: {
    width: '100%',
    height: '100%',
    // @ts-ignore
    filter: 'drop-shadow(0px 16px 28px rgba(15, 23, 42, 0.16))',
  },
  phoneStorePill: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  phoneStorePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  // 2. Vertical Runway Col
  verticalRunwayCol: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
    paddingVertical: 4,
  },
  trackLane: {
    width: 44,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackLineBg: {
    position: 'absolute',
    top: 24,
    bottom: 24,
    width: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
  },
  trackLineFill: {
    position: 'absolute',
    bottom: 24,
    width: 6,
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  trackMilestoneDot: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  dotBottom: {
    bottom: 16,
    backgroundColor: '#047857',
  },
  dotMiddle: {
    top: '48%',
    marginTop: -13,
    backgroundColor: '#10B981',
  },
  dotTop: {
    top: 16,
    backgroundColor: '#F59E0B',
  },
  animatedRunnerFrogBox: {
    position: 'absolute',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  runnerFrogSprite: {
    width: 42,
    height: 42,
  },
  runnerDustBox: {
    position: 'absolute',
    bottom: -2,
    right: -4,
  },

  // 3 Vertical Step Cards
  verticalStepsColumn: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 10,
  },
  verticalStepCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepCardTarget: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  stepCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  stepNumBadgeBot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#047857',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 20,
  },
  stepNumBadgeMid: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 20,
  },
  stepNumBadgeTarget: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 20,
  },
  stepCardName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  rewardTagBot: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  rewardTagTextBot: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  rewardTagMid: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rewardTagTextMid: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  rewardTagTarget: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  rewardTagTextTarget: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  stepCardDescription: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 17,
  },

  // Bento Grid
  bentoGrid: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
    justifyContent: 'space-between',
  },
  bentoCardHalf: {
    width: 'calc(50% - 12px)' as any,
  },
  bentoCardFull: {
    width: '100%',
  },
  bentoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  bentoIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  bentoCardSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  bentoCardBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    marginBottom: 18,
  },
  bentoFrogArtBox: {
    width: '100%',
    height: 180,
    backgroundColor: '#F8FAFD',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bentoFrogImg: {
    width: 150,
    height: 150,
  },
  bentoSecurityArtBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  securityBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  secBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  // Download App Section
  downloadSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 64,
    paddingHorizontal: 20,
  },
  downloadInnerCard: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#064E3B',
    borderRadius: 32,
    padding: 40,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 6,
    gap: 32,
  },
  downloadDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 56,
  },
  downloadMobile: {
    flexDirection: 'column',
    padding: 28,
  },
  downloadLeft: {
    alignItems: 'flex-start',
  },
  downloadTagPill: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    marginBottom: 16,
  },
  downloadTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 0.5,
  },
  downloadTitle: {
    fontSize: 34,
    lineHeight: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  downloadDesc: {
    fontSize: 15,
    lineHeight: 24,
    color: '#D1FAE5',
    marginBottom: 32,
    maxWidth: 540,
  },
  storeButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 20,
  },
  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  storeIcon: {
    width: 28,
    height: 28,
  },
  storeButtonTextCol: {
    flexDirection: 'column',
  },
  storeButtonSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  storeButtonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  downloadNotice: {
    fontSize: 12,
    color: '#A7F3D0',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  downloadRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  qrHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  qrSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  qrGraphicFrame: {
    width: 180,
    height: 180,
    backgroundColor: '#F8FAFD',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  qrPatternBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPillLabel: {
    backgroundColor: '#047857',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  qrActionBtn: {
    backgroundColor: '#047857',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  qrActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Reviews Section
  reviewRow: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    gap: 24,
  },
  reviewRowDesktop: {
    flexDirection: 'row',
  },
  reviewRowMobile: {
    flexDirection: 'column',
  },
  reviewCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
    justifyContent: 'space-between',
  },
  reviewStars: {
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: 14,
  },
  reviewQuote: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewerRole: {
    fontSize: 12,
    color: '#64748B',
  },

  // Bottom CTA
  bottomCtaSection: {
    backgroundColor: '#F8FAFD',
    paddingVertical: 64,
    paddingHorizontal: 20,
  },
  bottomCtaCard: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 44,
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 4,
  },
  bottomCtaFrogBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bottomCtaTitle: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
  },
  bottomCtaDesc: {
    fontSize: 15,
    lineHeight: 24,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 580,
    marginBottom: 28,
  },
  bottomCtaButton: {
    backgroundColor: '#047857',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 16,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
    marginBottom: 14,
  },
  bottomCtaButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomCtaNote: {
    fontSize: 13,
    color: '#64748B',
  },

  // Footer
  footerContainer: {
    backgroundColor: '#0F172A',
    paddingVertical: 48,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  footerInner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    gap: 36,
  },
  footerDesktopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerMobileCol: {
    flexDirection: 'column',
  },
  footerBrandCol: {
    maxWidth: 360,
  },
  footerLogoBadge: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  footerLogo: {
    width: 130,
    height: 44,
  },
  footerSlogan: {
    fontSize: 13,
    lineHeight: 20,
    color: '#94A3B8',
    marginBottom: 16,
  },
  footerCopyright: {
    fontSize: 12,
    color: '#64748B',
  },
  footerLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 40,
  },
  footerLinkCol: {
    minWidth: 130,
  },
  footerLinkHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerLinkItem: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 10,
  },
});
