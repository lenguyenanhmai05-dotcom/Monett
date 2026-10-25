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

const STATS_DATA = [
  {
    icon: '👥',
    iconBg: '#FEF3C7',
    val: '12.000+',
    labelVi: 'Gia đình & nhóm tin dùng',
    labelEn: 'Families & teams trust',
  },
  {
    icon: '⚡',
    iconBg: '#E0F2FE',
    val: '< 1 giây',
    labelVi: 'Đồng bộ thời gian thực',
    labelEn: 'Real-time cloud sync',
  },
  {
    icon: '⭐',
    iconBg: '#FEF9C3',
    val: '4.9 / 5',
    labelVi: 'Điểm đánh giá người dùng',
    labelEn: 'Average user rating',
  },
];

const MARQUEE_ROW_1 = [
  { icon: '✈️', labelVi: 'Du lịch', labelEn: 'Travel' },
  { icon: '🐷', labelVi: 'Tiết kiệm chung', labelEn: 'Savings' },
  { icon: '🛒', labelVi: 'Đi chợ', labelEn: 'Groceries' },
  { icon: '🎁', labelVi: 'Quà tặng', labelEn: 'Gifts' },
  { icon: '🍽️', labelVi: 'Ăn uống', labelEn: 'Dining' },
  { icon: '🏠', labelVi: 'Tiền nhà', labelEn: 'Rent' },
  { icon: '⚡', labelVi: 'Hóa đơn điện nước', labelEn: 'Utilities' },
  { icon: '☕', labelVi: 'Cà phê', labelEn: 'Coffee' },
  { icon: '🛍️', labelVi: 'Mua sắm', labelEn: 'Shopping' },
  { icon: '⛽', labelVi: 'Xăng xe', labelEn: 'Fuel' },
  { icon: '📚', labelVi: 'Sách & Học tập', labelEn: 'Books' },
];

const MARQUEE_ROW_2 = [
  { icon: '🚗', labelVi: 'Đi lại', labelEn: 'Transport' },
  { icon: '🎓', labelVi: 'Học phí', labelEn: 'Tuition' },
  { icon: '💖', labelVi: 'Sức khỏe', labelEn: 'Health' },
  { icon: '🐶', labelVi: 'Thú cưng', labelEn: 'Pets' },
  { icon: '🎬', labelVi: 'Giải trí', labelEn: 'Entertainment' },
  { icon: '💵', labelVi: 'Lương & thưởng', labelEn: 'Income' },
  { icon: '📈', labelVi: 'Đầu tư', labelEn: 'Investment' },
  { icon: '🎉', labelVi: 'Tiệc tùng', labelEn: 'Parties' },
  { icon: '⚽', labelVi: 'Thể thao', labelEn: 'Sports' },
  { icon: '💄', labelVi: 'Làm đẹp', labelEn: 'Beauty' },
  { icon: '💻', labelVi: 'Công nghệ', labelEn: 'Gadgets' },
];

const NAV_ITEMS = [
  { id: 'features', labelVi: 'Tính năng', labelEn: 'Features', targetId: 'features-section' },
  { id: 'calendar', labelVi: 'Lịch chi tiêu', labelEn: 'Calendar', targetId: 'calendar-section' },
  { id: 'download', labelVi: 'Tải App Mobile', labelEn: 'Download App', targetId: 'download-section' },
  { id: 'reviews', labelVi: 'Đánh giá', labelEn: 'Reviews', targetId: 'reviews-section' },
];

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

  // Điều hướng Navbar: Active & Hover State
  const [activeNav, setActiveNav] = useState<string | null>(null);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleScroll = () => {
      const scrollPos = window.scrollY + 220;
      for (let i = NAV_ITEMS.length - 1; i >= 0; i--) {
        const el = document.getElementById(NAV_ITEMS[i].targetId);
        if (el && el.offsetTop <= scrollPos) {
          setActiveNav(NAV_ITEMS[i].id);
          return;
        }
      }
      setActiveNav(null);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hiệu ứng chữ động Canva (Kinetic Staggered Typography)
  const animTitleLine1 = useRef(new Animated.Value(0)).current;
  const animTitleLine2 = useRef(new Animated.Value(0)).current;
  const animTitleLine3 = useRef(new Animated.Value(0)).current;
  const animHeroContent = useRef(new Animated.Value(0)).current;
  const animPhoneEntrance = useRef(new Animated.Value(0)).current;
  const floatingBadgeY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Kích hoạt hiệu ứng Canva xếp chữ mượt mà khi vào trang
    Animated.stagger(130, [
      Animated.timing(animTitleLine1, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animTitleLine2, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animTitleLine3, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animHeroContent, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animPhoneEntrance, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    // Hiệu ứng nhấp nhô nhẹ nhàng cho các huy hiệu nổi trên mockup
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingBadgeY, {
          toValue: -6,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(floatingBadgeY, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [animTitleLine1, animTitleLine2, animTitleLine3, animHeroContent, animPhoneEntrance, floatingBadgeY]);

  return (
    <View style={styles.rootContainer}>
      {/* Dynamic Keyframes & Hover Rules for Web */}
      {Platform.OS === 'web' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes continuousTickerLeft {
                0% { transform: translate3d(0, 0, 0); }
                100% { transform: translate3d(-50%, 0, 0); }
              }
              @keyframes continuousTickerRight {
                0% { transform: translate3d(-50%, 0, 0); }
                100% { transform: translate3d(0, 0, 0); }
              }
              .monett-ticker-track-1 {
                display: flex !important;
                flex-direction: row !important;
                width: max-content !important;
                animation: continuousTickerLeft 26s linear infinite !important;
                will-change: transform;
              }
              .monett-ticker-track-2 {
                display: flex !important;
                flex-direction: row !important;
                width: max-content !important;
                animation: continuousTickerRight 26s linear infinite !important;
                will-change: transform;
              }
              .monett-nav-btn {
                position: relative !important;
                display: inline-flex !important;
                align-items: center !important;
                justifyContent: center !important;
                padding: 10px 6px !important;
                cursor: pointer !important;
                text-decoration: none !important;
              }
              .monett-nav-btn::after {
                content: '' !important;
                position: absolute !important;
                bottom: 0px !important;
                left: 4px !important;
                right: 4px !important;
                height: 3px !important;
                background-color: #059669 !important;
                border-radius: 3px !important;
                transform: scaleX(0) !important;
                transform-origin: center !important;
                transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease !important;
                opacity: 0 !important;
              }
              .monett-nav-btn:hover::after,
              .monett-nav-btn.active::after {
                transform: scaleX(1) !important;
                opacity: 1 !important;
              }
              .monett-nav-btn:hover *,
              .monett-nav-btn.active * {
                color: #047857 !important;
              }
              .monett-stat-card {
                transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.22s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.22s ease !important;
              }
              .monett-stat-card:hover {
                transform: translateY(-4px) !important;
                box-shadow: 0 12px 28px rgba(16, 185, 129, 0.16) !important;
                border-color: #059669 !important;
              }
            `,
          }}
        />
      )}

      {/* ============================================================ */}
      {/* 1. STICKY TOP NAVBAR (GLASSMORPHISM) */}
      {/* ============================================================ */}
      <View style={styles.navbarWrapper}>
        <View style={[styles.navbarInner, isDesktop ? styles.desktopNavInner : styles.mobileNavInner]}>
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

          {/* Center Navigation Links (Desktop) with Green Underline on Hover & Active */}
          {isDesktop && (
            Platform.OS === 'web' ? (
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 32 }}>
                {NAV_ITEMS.map((item) => {
                  const isHovered = hoveredNav === item.id;
                  const isActive = activeNav === item.id;
                  const isHighlighted = isActive || isHovered;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`monett-nav-btn ${isHighlighted ? 'active' : ''}`}
                      onMouseEnter={() => setHoveredNav(item.id)}
                      onMouseLeave={() => setHoveredNav(null)}
                      onClick={() => {
                        setActiveNav(item.id);
                        if (typeof document !== 'undefined') {
                          document.getElementById(item.targetId)?.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        padding: '10px 4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: isHighlighted ? 700 : 600,
                          color: isHighlighted ? '#047857' : '#475569',
                          transition: 'color 0.2s ease',
                          fontFamily: 'inherit',
                        }}
                      >
                        {isVi ? item.labelVi : item.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <View style={styles.navLinksRow}>
                {NAV_ITEMS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setActiveNav(item.id)}
                    style={styles.navLinkBtn}
                  >
                    <Text style={[styles.navLinkText, activeNav === item.id && styles.navLinkTextActive]}>
                      {isVi ? item.labelVi : item.labelEn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
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
        {/* HERO SECTION - BENTO STYLE 2026 WITH CANVA KINETIC TYPOGRAPHY */}
        <View style={styles.heroSection}>
          {/* Subtle soft emerald background glow on left */}
          <View style={styles.heroLeftEmeraldGlow} />

          <View style={[styles.heroContainer, isDesktop ? styles.heroDesktopRow : styles.heroMobileCol, { maxWidth: containerMaxWidth }]}>
            {/* Left Hero Text Column */}
            <View style={[styles.heroLeft, isDesktop ? styles.heroLeftDesktop : styles.heroLeftMobile]}>
              {/* Badge: Sổ Thu Chi & Nhật Ký Ảnh Thông Minh */}
              <View style={styles.pillBadge}>
                <View style={styles.pillBadgeDot} />
                <Text style={styles.pillBadgeText}>
                  {isVi ? '✨ Sổ Thu Chi & Nhật Ký Ảnh Thông Minh' : '✨ Smart Expense Tracker & Photo Diary'}
                </Text>
              </View>

              {/* Title with Canva-like kinetic staggered entrance */}
              <View style={styles.heroTitleWrap}>
                {/* Line 1: Ghi chép chi tiêu */}
                <Animated.View
                  style={[
                    styles.kineticLine,
                    {
                      opacity: animTitleLine1,
                      transform: [
                        {
                          translateY: animTitleLine1.interpolate({
                            inputRange: [0, 1],
                            outputRange: [28, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={[styles.heroTitleLine, isDesktop ? styles.heroTitleDesktop : styles.heroTitleMobile]}>
                    {isVi ? 'Ghi chép chi tiêu' : 'Capture daily spending'}
                  </Text>
                </Animated.View>

                {/* Line 2: bằng từng khoảnh khắc ảnh */}
                <Animated.View
                  style={[
                    styles.kineticLine,
                    {
                      opacity: animTitleLine2,
                      transform: [
                        {
                          translateY: animTitleLine2.interpolate({
                            inputRange: [0, 1],
                            outputRange: [28, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: isDesktop ? 'nowrap' : 'wrap' }}>
                    <Text style={[styles.heroTitleLine, isDesktop ? styles.heroTitleDesktop : styles.heroTitleMobile]}>
                      {isVi ? 'bằng ' : 'with '}
                    </Text>
                    <View style={styles.highlightWordWrap}>
                      <Text style={[styles.heroTitleGreen, isDesktop ? styles.heroTitleDesktop : styles.heroTitleMobile]}>
                        {isVi ? 'từng khoảnh khắc ảnh' : 'visual photo moments'}
                      </Text>
                      {/* Green brush underline */}
                      {Platform.OS === 'web' ? (
                        <svg
                          width="100%"
                          height="12"
                          viewBox="0 0 240 12"
                          fill="none"
                          preserveAspectRatio="none"
                          style={{ position: 'absolute', bottom: -3, left: 0 }}
                        >
                          <path
                            d="M3 9C65 2.5 160 11 237 5.5"
                            stroke="#059669"
                            strokeWidth="4"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        <View style={styles.nativeUnderline} />
                      )}
                    </View>
                  </View>
                </Animated.View>

                {/* Line 3: an vui mỗi ngày */}
                <Animated.View
                  style={[
                    styles.kineticLine,
                    {
                      opacity: animTitleLine3,
                      transform: [
                        {
                          translateY: animTitleLine3.interpolate({
                            inputRange: [0, 1],
                            outputRange: [28, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={[styles.heroTitleLine, isDesktop ? styles.heroTitleDesktop : styles.heroTitleMobile]}>
                    {isVi ? 'an vui mỗi ngày' : 'joyful every day'}
                  </Text>
                </Animated.View>
              </View>

              {/* Monett Subtitle Paragraph */}
              <Animated.View
                style={{
                  opacity: animHeroContent,
                  transform: [
                    {
                      translateY: animHeroContent.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                }}
              >
                <Text style={[styles.heroSubtitle, isDesktop ? styles.heroSubtitleDesktop : styles.heroSubtitleMobile]}>
                  {isVi
                    ? 'Tạm biệt những bảng tính khô khan và cảm giác tội lỗi khi chi tiêu. Monett biến từng cốc cà phê, bữa ăn ngon hay món quà tặng thành một ký ức đáng nhớ, giúp bạn xây dựng thói quen tài chính an vui mỗi ngày.'
                    : 'Say goodbye to boring spreadsheets and stressful expense tracking. Monett transforms every coffee cup, delicious meal, and memory into a vibrant keepsake while building joyful money habits.'}
                </Text>

                {/* Single Green CTA Button: Bắt đầu miễn phí */}
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
                </View>

                {/* Trust & Social Proof Row */}
                <View style={styles.heroTrustRow}>
                  {/* 4 Overlapping Avatar Circles (B, M, C, Y) */}
                  <View style={styles.heroAvatarStack}>
                    <View style={[styles.avatarCircle, { backgroundColor: '#F59E0B' }]}>
                      <Text style={styles.avatarText}>B</Text>
                    </View>
                    <View style={[styles.avatarCircle, { backgroundColor: '#F43F5E', marginLeft: -8 }]}>
                      <Text style={styles.avatarText}>M</Text>
                    </View>
                    <View style={[styles.avatarCircle, { backgroundColor: '#06B6D4', marginLeft: -8 }]}>
                      <Text style={styles.avatarText}>C</Text>
                    </View>
                    <View style={[styles.avatarCircle, { backgroundColor: '#10B981', marginLeft: -8 }]}>
                      <Text style={styles.avatarText}>Y</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'column' }}>
                    <Text style={styles.trustUserCount}>
                      {isVi ? '12.000+ gia đình' : '12,000+ families'}
                    </Text>
                    <Text style={styles.trustSubtext}>
                      {isVi ? '& nhóm tin dùng' : '& teams trust'}
                    </Text>
                  </View>

                  <View style={styles.trustDivider} />

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.trustStars}>★★★★★</Text>
                    <Text style={styles.trustRatingText}>4.9 / 5</Text>
                  </View>
                </View>
              </Animated.View>
            </View>

            {/* Right: Phone Bento Mockup with Emerald Green Accents */}
            <View style={[styles.heroRight, isDesktop ? styles.heroRightDesktop : styles.heroRightMobile]}>
              <Animated.View
                style={[
                  styles.bentoPhoneWrapper,
                  {
                    opacity: animPhoneEntrance,
                    transform: [
                      {
                        translateY: animPhoneEntrance.interpolate({
                          inputRange: [0, 1],
                          outputRange: [32, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Floating AI Badge (Top Left) */}
                <Animated.View
                  style={[
                    styles.floatingAiBadge,
                    {
                      transform: [{ translateY: floatingBadgeY }],
                    },
                  ]}
                >
                  <View style={styles.floatingAiIcon}>
                    <Text style={{ fontSize: 13 }}>⚡</Text>
                  </View>
                  <Text style={styles.floatingAiText}>
                    {isVi ? 'AI vừa quét hóa đơn' : 'AI receipt scanned'}
                  </Text>
                </Animated.View>

                {/* Floating Income Badge (Bottom Right - Converted from Yellow to Green) */}
                <Animated.View
                  style={[
                    styles.floatingIncomeBadge,
                    {
                      transform: [
                        {
                          translateY: floatingBadgeY.interpolate({
                            inputRange: [-6, 0],
                            outputRange: [0, -6],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.floatingIncomeIcon}>💵</Text>
                  <Text style={styles.floatingIncomeText}>
                    +15.000.000 đ · {isVi ? 'Lương' : 'Salary'}
                  </Text>
                </Animated.View>

                {/* Phone Outer Bezel */}
                <View style={styles.phoneOuterCard}>
                  {/* Dynamic Island */}
                  <View style={styles.phoneDynamicIsland} />

                  {/* Phone Screen Body */}
                  <View style={styles.phoneScreenBody}>
                    {/* 1. Header */}
                    <View style={styles.phoneHeader}>
                      <View>
                        <Text style={styles.phoneGreetSub}>
                          {isVi ? 'Xin chào' : 'Welcome'}
                        </Text>
                        <Text style={styles.phoneGreetName}>
                          {isVi ? 'Monett' : 'Monett'}
                        </Text>
                      </View>
                      <View style={styles.phoneHeaderRight}>
                        <View style={styles.phoneBellBtn}>
                          <Text style={{ fontSize: 13 }}>🔔</Text>
                          <View style={styles.phoneBellBadge}>
                            <Text style={styles.phoneBellBadgeText}>2</Text>
                          </View>
                        </View>
                        <View style={styles.phoneAvatarCircle}>
                          <Text style={styles.phoneAvatarLetter}>M</Text>
                        </View>
                      </View>
                    </View>

                    {/* 2. Bento Charcoal Card: SỐ DƯ THÁNG NÀY */}
                    <View style={styles.bentoHeroCard}>
                      <View style={styles.bentoHeroTop}>
                        <Text style={styles.bentoHeroLabel}>
                          {isVi ? 'SỐ DƯ THÁNG NÀY' : 'MONTHLY BALANCE'}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>👁</Text>
                      </View>
                      <Text style={styles.bentoHeroBalance}>13.430.000 đ</Text>
                      <View style={styles.bentoHeroGrowthPill}>
                        <Text style={styles.bentoHeroGrowthText}>
                          +12% {isVi ? 'so với thu nhập' : 'vs income'}
                        </Text>
                      </View>
                    </View>

                    {/* 3. Row of 2 Bento mini-cards: Thu nhập & Chi tiêu */}
                    <View style={styles.bentoSplitRow}>
                      {/* Thu nhập */}
                      <View style={styles.bentoIncomeCard}>
                        <View style={styles.bentoMiniCardTop}>
                          <Text style={styles.bentoMiniArrowGreen}>↙</Text>
                          <Text style={styles.bentoMiniLabelGreen}>
                            {isVi ? 'Thu nhập' : 'Income'}
                          </Text>
                        </View>
                        <Text style={styles.bentoMiniValGreen}>15.000.000</Text>
                      </View>

                      {/* Chi tiêu */}
                      <View style={styles.bentoExpenseCard}>
                        <View style={styles.bentoMiniCardTop}>
                          <Text style={styles.bentoMiniArrowRed}>↗</Text>
                          <Text style={styles.bentoMiniLabelRed}>
                            {isVi ? 'Chi tiêu' : 'Expense'}
                          </Text>
                        </View>
                        <Text style={styles.bentoMiniValRed}>1.570.000</Text>
                      </View>
                    </View>

                    {/* 4. Middle Bento Row: Chi tuần này (Green) & 18 ngày liên tục (Purple) */}
                    <View style={styles.bentoMiddleRow}>
                      {/* Chi tuần này - converted from yellow to emerald green */}
                      <View style={styles.bentoWeekCard}>
                        <View style={styles.bentoWeekHeader}>
                          <Text style={styles.bentoWeekTitle}>
                            {isVi ? 'Chi tuần này' : 'This week'}
                          </Text>
                          <Text style={styles.bentoWeekTotal}>1,2tr</Text>
                        </View>
                        {/* Mini 7-day Bar Chart */}
                        <View style={styles.bentoBarChart}>
                          <View style={[styles.bentoBar, { height: 10 }]} />
                          <View style={[styles.bentoBar, { height: 16 }]} />
                          <View style={[styles.bentoBar, { height: 12 }]} />
                          <View style={[styles.bentoBar, { height: 24 }]} />
                          <View style={[styles.bentoBar, { height: 20 }]} />
                          <View style={[styles.bentoBar, { height: 30 }]} />
                          <View style={[styles.bentoBarActive, { height: 36 }]} />
                        </View>
                      </View>

                      {/* 18 ngày liên tục (Streak card) */}
                      <View style={styles.bentoStreakCard}>
                        <View style={styles.bentoStreakIconWrap}>
                          <Text style={{ fontSize: 13 }}>🔥</Text>
                        </View>
                        <Text style={styles.bentoStreakDays}>
                          18 {isVi ? 'ngày' : 'days'}
                        </Text>
                        <Text style={styles.bentoStreakSub}>
                          {isVi ? 'liên tục' : 'streak'}
                        </Text>
                      </View>
                    </View>

                    {/* 5. Mini Navigation Pill Bar */}
                    <View style={styles.phoneMiniNavBar}>
                      <View style={styles.miniNavBtnActive}>
                        <Text style={{ fontSize: 13, color: '#FFFFFF', fontWeight: '800' }}>+</Text>
                      </View>
                      <Text style={styles.miniNavIcon}>📋</Text>
                      <Text style={styles.miniNavIcon}>⏱️</Text>
                      <Text style={styles.miniNavIcon}>💬</Text>
                      <Text style={styles.miniNavIcon}>🏠</Text>
                    </View>

                    {/* 6. Recent Transactions List */}
                    <View style={styles.phoneTxList}>
                      {/* Item 1 */}
                      <View style={styles.phoneTxItem}>
                        <View style={[styles.phoneTxIconCircle, { backgroundColor: '#DCFCE7' }]}>
                          <Text style={{ fontSize: 13 }}>☕</Text>
                        </View>
                        <View style={styles.phoneTxInfo}>
                          <Text style={styles.phoneTxTitle}>{isVi ? 'Cà phê sáng' : 'Morning Cafe'}</Text>
                          <Text style={styles.phoneTxSub}>{isVi ? 'Ăn uống · Khoảnh khắc' : 'Food & Drinks'}</Text>
                        </View>
                        <Text style={styles.phoneTxAmountExpense}>-45.000</Text>
                      </View>

                      {/* Item 2 */}
                      <View style={styles.phoneTxItem}>
                        <View style={[styles.phoneTxIconCircle, { backgroundColor: '#ECFDF5' }]}>
                          <Text style={{ fontSize: 13 }}>💼</Text>
                        </View>
                        <View style={styles.phoneTxInfo}>
                          <Text style={styles.phoneTxTitle}>{isVi ? 'Lương tháng' : 'Monthly Salary'}</Text>
                          <Text style={styles.phoneTxSub}>{isVi ? 'Thu nhập chính' : 'Main Income'}</Text>
                        </View>
                        <Text style={styles.phoneTxAmountIncome}>+15.000.000</Text>
                      </View>

                      {/* Item 3 */}
                      <View style={styles.phoneTxItem}>
                        <View style={[styles.phoneTxIconCircle, { backgroundColor: '#FEE2E2' }]}>
                          <Text style={{ fontSize: 13 }}>🎁</Text>
                        </View>
                        <View style={styles.phoneTxInfo}>
                          <Text style={styles.phoneTxTitle}>{isVi ? 'Món quà tặng' : 'Special Gift'}</Text>
                          <Text style={styles.phoneTxSub}>{isVi ? 'Kỷ niệm đáng nhớ' : 'Memories'}</Text>
                        </View>
                        <Text style={styles.phoneTxAmountExpense}>-320.000</Text>
                      </View>
                    </View>

                    {/* 7. Bottom Action Bar with Green Center Button */}
                    <View style={styles.phoneBottomBar}>
                      <Text style={{ fontSize: 13, color: '#9CA3AF' }}>🏠</Text>
                      <Text style={{ fontSize: 13, color: '#9CA3AF' }}>✉️</Text>
                      <View style={styles.phoneBottomCenterPlus}>
                        <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '900' }}>+</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: '#9CA3AF' }}>⏱️</Text>
                      <Text style={{ fontSize: 13, color: '#9CA3AF' }}>💬</Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 2. STATS CARDS & CONTINUOUS GREEN MARQUEE TICKER */}
        {/* ============================================================ */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            {STATS_DATA.map((item, idx) => (
              <View
                key={idx}
                // @ts-ignore
                className="monett-stat-card"
                style={styles.statCard}
              >
                <View style={[styles.statIconCircle, { backgroundColor: item.iconBg }]}>
                  <Text style={{ fontSize: 15 }}>{item.icon}</Text>
                </View>
                <Text style={styles.statNumber}>{item.val}</Text>
                <Text style={styles.statLabel}>{isVi ? item.labelVi : item.labelEn}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Green Continuous Marquee Strip (Converted from Yellow to Monett Emerald Green) */}
        <View style={styles.marqueeGreenStrip}>
          {/* Row 1: Continuous horizontal ticker running without stopping to the LEFT */}
          <div style={{ width: '100%', overflow: 'hidden' }}>
            <div
              className="monett-ticker-track-1"
              style={{
                display: 'flex',
                flexDirection: 'row',
                width: 'max-content',
                animation: 'continuousTickerLeft 26s linear infinite',
              }}
            >
              {[...MARQUEE_ROW_1, ...MARQUEE_ROW_1].map((chip, idx) => (
                <View key={`r1-${idx}`} style={styles.marqueePill}>
                  <Text style={styles.marqueePillIcon}>{chip.icon}</Text>
                  <Text style={styles.marqueePillText}>{isVi ? chip.labelVi : chip.labelEn}</Text>
                </View>
              ))}
            </div>
          </div>

          {/* Row 2: Continuous horizontal ticker running without stopping to the RIGHT */}
          <div style={{ width: '100%', overflow: 'hidden' }}>
            <div
              className="monett-ticker-track-2"
              style={{
                display: 'flex',
                flexDirection: 'row',
                width: 'max-content',
                animation: 'continuousTickerRight 26s linear infinite',
              }}
            >
              {[...MARQUEE_ROW_2, ...MARQUEE_ROW_2].map((chip, idx) => (
                <View key={`r2-${idx}`} style={styles.marqueePill}>
                  <Text style={styles.marqueePillIcon}>{chip.icon}</Text>
                  <Text style={styles.marqueePillText}>{isVi ? chip.labelVi : chip.labelEn}</Text>
                </View>
              ))}
            </div>
          </div>
        </View>

        {/* ============================================================ */}
        {/* 3. CALENDAR & EXPENSE TIMELINE SHOWCASE */}
        {/* ============================================================ */}
        <View
          // @ts-ignore
          nativeID="calendar-section"
          id="calendar-section"
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTagBadge}>
              <Text style={styles.sectionTagText}>
                {isVi ? '📅 LỊCH CHI TIÊU & DÒNG TIỀN' : '📅 EXPENSE CALENDAR & TIMELINE'}
              </Text>
            </View>
            <Text style={styles.sectionTitle}>
              {isVi
                ? 'Theo Dõi Dòng Tiền Từng Ngày — Trực Quan & Đầy Đủ'
                : 'Track Daily Cashflow at a Glance — Crystal Clear & Intuitive'}
            </Text>
            <Text style={styles.sectionDesc}>
              {isVi
                ? 'Không cần cộng trừ phức tạp. Lịch chi tiêu Monett giúp bạn nhìn thấu tổng thu, tổng chi và số dư của từng ngày trong tháng chỉ với một ánh nhìn.'
                : 'No complex accounting needed. Monett’s calendar visualizes your income, expenses, and daily balance effortlessly in a clean timeline.'}
            </Text>
          </View>

          <View style={[styles.photoboothRow, isDesktop ? styles.photoboothDesktop : styles.photoboothMobile, { maxWidth: containerMaxWidth }]}>
            {/* Left: Interactive Financial Calendar & Daily Logs Card */}
            <View style={styles.calendarWidgetCard}>
              {/* Card Header: Month Selector */}
              <View style={styles.calendarCardTop}>
                <View>
                  <Text style={styles.calendarMonthTitle}>
                    {isVi ? 'Tháng 10, 2026' : 'October 2026'}
                  </Text>
                  <Text style={styles.calendarMonthSub}>
                    {isVi ? 'Tổng chi: 1.570.000 đ' : 'Total spent: 1,570,000 đ'}
                  </Text>
                </View>
                <View style={styles.calendarMonthNav}>
                  <View style={styles.calendarNavBtn}>
                    <Text style={{ fontSize: 13, color: '#475569' }}>‹</Text>
                  </View>
                  <View style={styles.calendarActiveMonthPill}>
                    <Text style={styles.calendarActiveMonthPillText}>
                      {isVi ? 'Hôm nay' : 'Today'}
                    </Text>
                  </View>
                  <View style={styles.calendarNavBtn}>
                    <Text style={{ fontSize: 13, color: '#475569' }}>›</Text>
                  </View>
                </View>
              </View>

              {/* Weekday Names Row */}
              <View style={styles.calendarWeekdaysRow}>
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => (
                  <Text key={idx} style={styles.calendarWeekdayLabel}>{day}</Text>
                ))}
              </View>

              {/* Calendar Grid Sample Days (19 to 31) */}
              <View style={styles.calendarDaysGrid}>
                {[
                  { day: 19, status: 'normal' },
                  { day: 20, status: 'expense' },
                  { day: 21, status: 'normal' },
                  { day: 22, status: 'expense' },
                  { day: 23, status: 'income' },
                  { day: 24, status: 'expense' },
                  { day: 25, status: 'today' },
                  { day: 26, status: 'normal' },
                  { day: 27, status: 'normal' },
                  { day: 28, status: 'normal' },
                  { day: 29, status: 'normal' },
                  { day: 30, status: 'normal' },
                  { day: 31, status: 'normal' },
                  { day: 1, status: 'next' },
                ].map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.calendarDayCell,
                      item.status === 'today' && styles.calendarDayCellToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayNum,
                        item.status === 'today' && styles.calendarDayNumToday,
                        item.status === 'next' && { color: '#CBD5E1' },
                      ]}
                    >
                      {item.day}
                    </Text>
                    {item.status === 'today' && (
                      <View style={styles.calendarDotToday} />
                    )}
                    {item.status === 'expense' && (
                      <View style={styles.calendarDotExpense} />
                    )}
                    {item.status === 'income' && (
                      <View style={styles.calendarDotIncome} />
                    )}
                  </View>
                ))}
              </View>

              {/* Selected Day Transaction Breakdown Detail Card */}
              <View style={styles.calendarDayDetailBox}>
                <View style={styles.dayDetailHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13 }}>📌</Text>
                    <Text style={styles.dayDetailDateTitle}>
                      {isVi ? 'Chi tiết: 25 Tháng 10' : 'Details: Oct 25, 2026'}
                    </Text>
                  </View>
                  <View style={styles.dayDetailBadge}>
                    <Text style={styles.dayDetailBadgeText}>3 {isVi ? 'khoản chi' : 'records'}</Text>
                  </View>
                </View>

                {/* Day summary row */}
                <View style={styles.dayDetailTotalsRow}>
                  <View style={styles.dayTotalCol}>
                    <Text style={styles.dayTotalLabel}>{isVi ? 'Tổng chi hôm nay' : 'Daily Expense'}</Text>
                    <Text style={styles.dayTotalExpenseVal}>-165.000 đ</Text>
                  </View>
                  <View style={styles.dayTotalDivider} />
                  <View style={styles.dayTotalCol}>
                    <Text style={styles.dayTotalLabel}>{isVi ? 'Thu nhập' : 'Income'}</Text>
                    <Text style={styles.dayTotalIncomeVal}>+15.000.000 đ</Text>
                  </View>
                </View>

                {/* Day Mini Items */}
                <View style={styles.dayMiniItemsList}>
                  <View style={styles.dayMiniItem}>
                    <View style={[styles.dayMiniIconCircle, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={{ fontSize: 12 }}>☕</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayMiniItemTitle}>{isVi ? 'Cà phê sáng' : 'Morning Cafe'}</Text>
                      <Text style={styles.dayMiniItemSub}>{isVi ? '08:30 · Ăn uống' : '08:30 · Dining'}</Text>
                    </View>
                    <Text style={styles.dayMiniItemExpense}>-45.000 đ</Text>
                  </View>

                  <View style={styles.dayMiniItem}>
                    <View style={[styles.dayMiniIconCircle, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={{ fontSize: 12 }}>🍲</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayMiniItemTitle}>{isVi ? 'Bữa trưa văn phòng' : 'Office Lunch'}</Text>
                      <Text style={styles.dayMiniItemSub}>{isVi ? '12:15 · Ăn uống' : '12:15 · Dining'}</Text>
                    </View>
                    <Text style={styles.dayMiniItemExpense}>-75.000 đ</Text>
                  </View>

                  <View style={styles.dayMiniItem}>
                    <View style={[styles.dayMiniIconCircle, { backgroundColor: '#F3E8FF' }]}>
                      <Text style={{ fontSize: 12 }}>🛒</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayMiniItemTitle}>{isVi ? 'Mua sắm siêu thị' : 'Supermarket'}</Text>
                      <Text style={styles.dayMiniItemSub}>{isVi ? '18:40 · Tiêu dùng' : '18:40 · Groceries'}</Text>
                    </View>
                    <Text style={styles.dayMiniItemExpense}>-45.000 đ</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Right: Smart Spending Analytics & Budget Allocation Card */}
            <View style={styles.smartAnalyticsCard}>
              {/* Header Badge & Title */}
              <View style={styles.analyticsHeader}>
                <View style={styles.analyticsBadge}>
                  <Text style={{ fontSize: 13 }}>📊</Text>
                  <Text style={styles.analyticsBadgeText}>
                    {isVi ? 'PHÂN TÍCH & BÁO CÁO THU CHI' : 'SPENDING ANALYTICS & INSIGHTS'}
                  </Text>
                </View>
                <Text style={styles.analyticsTitle}>
                  {isVi
                    ? 'Tự Động Phân Nhóm — Nhìn Thấu Mọi Dòng Tiền'
                    : 'Auto-Categorized Breakdown — Total Peace of Mind'}
                </Text>
              </View>

              {/* 1. Monthly Budget Health Status Card */}
              <View style={styles.budgetHealthCard}>
                <View style={styles.budgetHealthTop}>
                  <View>
                    <Text style={styles.budgetHealthLabel}>
                      {isVi ? 'NGÂN SÁCH THÁNG 10' : 'OCTOBER BUDGET HEALTH'}
                    </Text>
                    <Text style={styles.budgetHealthAmount}>1.570.000 / 6.000.000 đ</Text>
                  </View>
                  <View style={styles.budgetHealthStatusPill}>
                    <Text style={styles.budgetHealthStatusText}>
                      {isVi ? '🛡️ An toàn (26%)' : '🛡️ Safe (26%)'}
                    </Text>
                  </View>
                </View>

                {/* Multi-segment Progress Bar (50/30/20 Rule) */}
                <View style={styles.budgetProgressBarTrack}>
                  <View style={[styles.budgetProgressSegment, { width: '42%', backgroundColor: '#F97316' }]} />
                  <View style={[styles.budgetProgressSegment, { width: '28%', backgroundColor: '#8B5CF6' }]} />
                  <View style={[styles.budgetProgressSegment, { width: '20%', backgroundColor: '#0284C7' }]} />
                  <View style={[styles.budgetProgressSegment, { width: '10%', backgroundColor: '#10B981' }]} />
                </View>
                <View style={styles.budgetLegendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
                    <Text style={styles.legendText}>{isVi ? 'Ăn uống (42%)' : 'Dining (42%)'}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={styles.legendText}>{isVi ? 'Mua sắm (28%)' : 'Shopping (28%)'}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#0284C7' }]} />
                    <Text style={styles.legendText}>{isVi ? 'Hóa đơn (20%)' : 'Bills (20%)'}</Text>
                  </View>
                </View>
              </View>

              {/* 2. Top Spending Categories List */}
              <View style={styles.topCategoriesList}>
                <Text style={styles.categoriesSectionLabel}>
                  {isVi ? 'CƠ CẤU CHI TIÊU HÀNG ĐẦU' : 'TOP EXPENSE CATEGORIES'}
                </Text>

                {/* Category 1: Ăn uống & Cà phê */}
                <View style={styles.categoryItemRow}>
                  <View style={[styles.categoryIconCircle, { backgroundColor: '#FFEDD5' }]}>
                    <Text style={{ fontSize: 13 }}>🍽️</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.categoryItemHeader}>
                      <Text style={styles.categoryItemName}>{isVi ? 'Ăn uống & Cà phê' : 'Food & Coffee'}</Text>
                      <Text style={styles.categoryItemVal}>659.000 đ</Text>
                    </View>
                    <View style={styles.categoryBarTrack}>
                      <View style={[styles.categoryBarFill, { width: '42%', backgroundColor: '#F97316' }]} />
                    </View>
                  </View>
                </View>

                {/* Category 2: Mua sắm & Tạp hóa */}
                <View style={styles.categoryItemRow}>
                  <View style={[styles.categoryIconCircle, { backgroundColor: '#F3E8FF' }]}>
                    <Text style={{ fontSize: 13 }}>🛍️</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.categoryItemHeader}>
                      <Text style={styles.categoryItemName}>{isVi ? 'Mua sắm & Tiêu dùng' : 'Shopping & Retail'}</Text>
                      <Text style={styles.categoryItemVal}>440.000 đ</Text>
                    </View>
                    <View style={styles.categoryBarTrack}>
                      <View style={[styles.categoryBarFill, { width: '28%', backgroundColor: '#8B5CF6' }]} />
                    </View>
                  </View>
                </View>

                {/* Category 3: Tiền điện nước & Dịch vụ */}
                <View style={styles.categoryItemRow}>
                  <View style={[styles.categoryIconCircle, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={{ fontSize: 13 }}>⚡</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.categoryItemHeader}>
                      <Text style={styles.categoryItemName}>{isVi ? 'Hóa đơn & Tiện ích' : 'Bills & Utilities'}</Text>
                      <Text style={styles.categoryItemVal}>314.000 đ</Text>
                    </View>
                    <View style={styles.categoryBarTrack}>
                      <View style={[styles.categoryBarFill, { width: '20%', backgroundColor: '#0284C7' }]} />
                    </View>
                  </View>
                </View>

                {/* Category 4: Di chuyển & Đi lại */}
                <View style={styles.categoryItemRow}>
                  <View style={[styles.categoryIconCircle, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={{ fontSize: 13 }}>🚗</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.categoryItemHeader}>
                      <Text style={styles.categoryItemName}>{isVi ? 'Di chuyển & Xăng xe' : 'Transportation'}</Text>
                      <Text style={styles.categoryItemVal}>157.000 đ</Text>
                    </View>
                    <View style={styles.categoryBarTrack}>
                      <View style={[styles.categoryBarFill, { width: '10%', backgroundColor: '#10B981' }]} />
                    </View>
                  </View>
                </View>
              </View>

              {/* 3. Monett Smart AI Coach Advice Box */}
              <View style={styles.smartCoachBox}>
                <View style={styles.smartCoachHeader}>
                  <Text style={{ fontSize: 16 }}>💡</Text>
                  <Text style={styles.smartCoachTitle}>
                    {isVi ? 'Gợi Ý Quản Lý Dòng Tiền Hôm Nay' : 'Daily Cash Flow Insight'}
                  </Text>
                </View>
                <Text style={styles.smartCoachDesc}>
                  {isVi
                    ? 'Bạn đang chi tiêu đúng tiến độ mục tiêu tháng 10. Tỷ lệ tiết kiệm duy trì ở mức 32%, cao hơn dự kiến 7%!'
                    : 'You are on track with your October budget goals. Savings rate maintained at 32%, 7% higher than projected!'}
                </Text>
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
              <Text style={{ fontSize: 36 }}>✨</Text>
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
                <Text style={styles.footerLinkItem}>{isVi ? 'Lịch Chi Tiêu' : 'Spending Calendar'}</Text>
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
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  desktopNavInner: {
    height: 72,
    paddingHorizontal: 36,
  },
  mobileNavInner: {
    height: 64,
    paddingHorizontal: 16,
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
    gap: 32,
  },
  navLinkBtn: {
    position: 'relative',
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    // @ts-ignore
    transition: 'color 0.2s ease',
  },
  navLinkTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  navUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 2,
    right: 2,
    height: 3,
    backgroundColor: '#059669',
    borderRadius: 2,
    opacity: 0,
    // @ts-ignore
    transform: [{ scaleX: 0 }],
    // @ts-ignore
    transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  navUnderlineActive: {
    opacity: 1,
    // @ts-ignore
    transform: [{ scaleX: 1 }],
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
    backgroundColor: '#FAFAF8',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 64,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  heroLeftEmeraldGlow: {
    position: 'absolute',
    top: -80,
    left: -120,
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    // @ts-ignore
    filter: 'blur(60px)',
  },
  heroContainer: {
    maxWidth: 1260,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroDesktopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 48,
    paddingVertical: 20,
    alignItems: 'center',
  },
  heroMobileCol: {
    flexDirection: 'column',
    gap: 36,
  },
  heroLeft: {
    alignItems: 'flex-start',
  },
  heroLeftDesktop: {
    flex: 1.35,
    maxWidth: 780,
  },
  heroLeftMobile: {
    width: '100%',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
    marginBottom: 22,
  },
  pillBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  pillBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  heroTitleWrap: {
    marginBottom: 24,
    gap: 6,
  },
  kineticLine: {
    overflow: 'visible',
  },
  heroTitleLine: {
    fontWeight: '900',
    color: '#0F172A',
  },
  heroTitleGreen: {
    fontWeight: '900',
    color: '#047857',
  },
  heroTitleDesktop: {
    fontSize: 52,
    lineHeight: 64,
    letterSpacing: -1,
  },
  heroTitleMobile: {
    fontSize: 36,
    lineHeight: 46,
    letterSpacing: -0.6,
  },
  highlightWordWrap: {
    position: 'relative',
    paddingBottom: 4,
  },
  nativeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  heroSubtitle: {
    color: '#475569',
  },
  heroSubtitleDesktop: {
    fontSize: 17.5,
    lineHeight: 29,
    marginBottom: 30,
    maxWidth: 640,
  },
  heroSubtitleMobile: {
    fontSize: 15,
    lineHeight: 25,
    marginBottom: 24,
    maxWidth: '100%',
  },
  heroCtaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroPrimaryCta: {
    backgroundColor: '#047857',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 16,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
    cursor: 'pointer' as any,
  },
  heroPrimaryCtaText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 26,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  heroAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trustUserCount: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  trustSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  trustDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
  },
  trustStars: {
    fontSize: 13,
    color: '#F59E0B',
    letterSpacing: 2,
  },
  trustRatingText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },

  // Bento Phone Mockup Styles
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRightDesktop: {
    flex: 0.95,
    maxWidth: 440,
  },
  heroRightMobile: {
    width: '100%',
    marginTop: 24,
  },
  bentoPhoneWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 420,
  },
  floatingAiBadge: {
    position: 'absolute',
    top: 60,
    left: -24,
    zIndex: 20,
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  floatingAiIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingAiText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  floatingIncomeBadge: {
    position: 'absolute',
    bottom: 84,
    right: -24,
    zIndex: 20,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#34D399',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
  },
  floatingIncomeIcon: {
    fontSize: 13,
  },
  floatingIncomeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  phoneOuterCard: {
    width: 380,
    maxWidth: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    padding: 16,
    borderWidth: 7,
    borderColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 34,
    elevation: 6,
  },
  phoneDynamicIsland: {
    width: 76,
    height: 16,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 10,
  },
  phoneScreenBody: {
    gap: 10,
  },
  phoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  phoneGreetSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  phoneGreetName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  phoneHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneBellBtn: {
    position: 'relative',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneBellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneBellBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  phoneAvatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneAvatarLetter: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bentoHeroCard: {
    backgroundColor: '#18181B',
    borderRadius: 18,
    padding: 16,
    gap: 4,
  },
  bentoHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoHeroLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  bentoHeroBalance: {
    fontSize: 23,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  bentoHeroGrowthPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 2,
  },
  bentoHeroGrowthText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
  },
  bentoSplitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bentoIncomeCard: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderRadius: 15,
    padding: 10,
    gap: 2,
  },
  bentoExpenseCard: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 15,
    padding: 10,
    gap: 2,
  },
  bentoMiniCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bentoMiniArrowGreen: {
    fontSize: 12,
    fontWeight: '900',
    color: '#16A34A',
  },
  bentoMiniLabelGreen: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#166534',
  },
  bentoMiniValGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: '#14532D',
  },
  bentoMiniArrowRed: {
    fontSize: 12,
    fontWeight: '900',
    color: '#DC2626',
  },
  bentoMiniLabelRed: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#991B1B',
  },
  bentoMiniValRed: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7F1D1D',
  },
  bentoMiddleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bentoWeekCard: {
    flex: 1.25,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 15,
    padding: 10,
    justifyContent: 'space-between',
  },
  bentoWeekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bentoWeekTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46',
  },
  bentoWeekTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  bentoBarChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 38,
    paddingHorizontal: 2,
  },
  bentoBar: {
    width: 7,
    backgroundColor: '#6EE7B7',
    borderRadius: 4,
  },
  bentoBarActive: {
    width: 7,
    backgroundColor: '#047857',
    borderRadius: 4,
  },
  bentoStreakCard: {
    flex: 0.95,
    backgroundColor: '#EDE9FE',
    borderRadius: 15,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  bentoStreakIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoStreakDays: {
    fontSize: 14,
    fontWeight: '900',
    color: '#6D28D9',
  },
  bentoStreakSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7C3AED',
  },
  phoneMiniNavBar: {
    backgroundColor: '#18181B',
    height: 36,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  miniNavBtnActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniNavIcon: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  phoneTxList: {
    gap: 5,
  },
  phoneTxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  phoneTxIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneTxIconLetter: {
    fontSize: 11,
    fontWeight: '800',
  },
  phoneTxInfo: {
    flex: 1,
  },
  phoneTxTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  phoneTxSub: {
    fontSize: 9.5,
    color: '#64748B',
  },
  phoneTxAmountExpense: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  phoneTxAmountIncome: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#047857',
  },
  phoneBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#18181B',
    borderRadius: 18,
    height: 40,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  phoneBottomCenterPlus: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // Stats Section (Centered, compact, emerald green borders)
  statsSection: {
    backgroundColor: '#FAFAF8',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statsRow: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    minWidth: 190,
    maxWidth: 255,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'flex-start',
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 16,
  },

  // Green Marquee Strip (Converted from Yellow to Monett Emerald Green)
  marqueeGreenStrip: {
    backgroundColor: '#059669',
    paddingVertical: 18,
    gap: 12,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: '#047857',
    borderBottomWidth: 1,
    borderBottomColor: '#047857',
    position: 'relative',
  },
  marqueeTrackWrapper: {
    width: '100%',
    overflow: 'hidden',
  },
  marqueeRowFlex: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marqueePill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 9,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  marqueePillIcon: {
    fontSize: 16,
  },
  marqueePillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
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

  // Calendar Section
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
  calendarWidgetCard: {
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
    flex: 1,
    width: '100%',
    maxWidth: 480,
    gap: 16,
  },
  calendarCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  calendarMonthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  calendarMonthSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  calendarMonthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarActiveMonthPill: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  calendarActiveMonthPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  calendarWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  calendarWeekdayLabel: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  calendarDayCell: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  calendarDayCellToday: {
    backgroundColor: '#047857',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  calendarDayNum: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  calendarDayNumToday: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calendarDotToday: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A7F3D0',
  },
  calendarDotExpense: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F87171',
  },
  calendarDotIncome: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
  },
  calendarDayDetailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayDetailDateTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  dayDetailBadge: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  dayDetailBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  dayDetailTotalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayTotalCol: {
    flex: 1,
  },
  dayTotalLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  dayTotalExpenseVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
    marginTop: 1,
  },
  dayTotalIncomeVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    marginTop: 1,
  },
  dayTotalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  dayMiniItemsList: {
    gap: 8,
  },
  dayMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dayMiniIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayMiniItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  dayMiniItemSub: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  dayMiniItemExpense: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },

  // Smart Spending Analytics & Breakdown Showcase (Section 3 Right Card)
  smartAnalyticsCard: {
    flex: 1.3,
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
    gap: 16,
  },
  analyticsHeader: {
    gap: 6,
  },
  analyticsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  analyticsBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.4,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 25,
  },

  // 1. Monthly Budget Health Status Card
  budgetHealthCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  budgetHealthTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetHealthLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  budgetHealthAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  budgetHealthStatusPill: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  budgetHealthStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  budgetProgressBarTrack: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  budgetProgressSegment: {
    height: '100%',
  },
  budgetLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  // 2. Top Spending Categories List
  topCategoriesList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  categoriesSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  categoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryItemName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  categoryItemVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  categoryBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // 3. Monett Smart AI Coach Advice Box
  smartCoachBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 6,
  },
  smartCoachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smartCoachTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#15803D',
  },
  smartCoachDesc: {
    fontSize: 11.5,
    lineHeight: 18,
    color: '#166534',
    fontWeight: '500',
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
