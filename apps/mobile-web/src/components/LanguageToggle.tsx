import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

// Base64 encoded SVGs for 100% reliable rendering on React Native Web and all platforms
const VIETNAM_FLAG_BASE64 = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHJlY3Qgd2lkdGg9IjMwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjREEyNTFEIi8+PHBvbHlnb24gcG9pbnRzPSIxNSw0IDE2LjUsOC44IDIxLjUsOC44IDE3LjUsMTEuOCAxOSwxNi41IDE1LDEzLjUgMTEsMTYuNSAxMi41LDExLjggOC41LDguOCAxMy41LDguOCIgZmlsbD0iI0ZGRkYwMCIvPjwvc3ZnPg==`;

const UK_FLAG_BASE64 = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCAzMCI+PGNsaXBQYXRoIGlkPSJzIj48cGF0aCBkPSJNMCAwdjMwaDYwVjB6Ii8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9InQiPjxwYXRoIGQ9Ik0zMCAxNWgzMHYxNXp2MTVIMzB6SDB2LTE1enYtMTVoMzB6Ii8+PC9jbGlwUGF0aD48ZyBjbGlwLXBhdGg9InVybCgjcykiPjxwYXRoIGQ9Ik0wIDB2MzBoNjBWMHoiIGZpbGw9IiMwMTIxNjkiLz48cGF0aCBkPSJNMCAwbDYwIDMwbTAtMzBMMCAzMCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjYiLz48cGF0aCBkPSJNMCAwbDYwIDMwbTAtMzBMMCAzMCIgY2xpcC1wYXRoPSJ1cmwoI3QpIiBzdHJva2U9IiNDODEwMkUiIHN0cm9rZS13aWR0aD0iNCIvPjxwYXRoIGQ9Ik0zMCAwdjMwTTAgMTVoNjAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxMCIvPjxwYXRoIGQ9Ik0zMCAwdjMwTTAgMTVoNjAiIHN0cm9rZT0iI0M4MTAyRSIgc3Ryb2tlLXdpZHRoPSI2Ii8+PC9nPjwvc3ZnPg==`;

interface LanguageToggleProps {
  style?: object;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ style }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <View style={[styles.container, style]}>
      {/* VI Button */}
      <TouchableOpacity
        style={[styles.toggleBtn, language === 'vi' && styles.toggleBtnActive]}
        onPress={() => setLanguage('vi')}
        activeOpacity={0.8}
        accessibilityLabel="Chuyển sang Tiếng Việt"
      >
        <Text style={[styles.langText, language === 'vi' && styles.langTextActive]}>
          VI
        </Text>
        <Image
          source={{ uri: VIETNAM_FLAG_BASE64 }}
          style={styles.flagIcon}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* EN Button */}
      <TouchableOpacity
        style={[styles.toggleBtn, language === 'en' && styles.toggleBtnActive]}
        onPress={() => setLanguage('en')}
        activeOpacity={0.8}
        accessibilityLabel="Switch to English"
      >
        <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
          EN
        </Text>
        <Image
          source={{ uri: UK_FLAG_BASE64 }}
          style={styles.flagIcon}
          resizeMode="cover"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 24,
    padding: 3,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  langTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  flagIcon: {
    width: 20,
    height: 14,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
});
