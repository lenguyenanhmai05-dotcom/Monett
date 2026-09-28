import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

// Base64 encoded SVGs for 100% reliable rendering on React Native Web and all platforms
const VIETNAM_FLAG_BASE64 = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMCAyMCI+PHJlY3Qgd2lkdGg9IjMwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjREEyNTFEIi8+PHBvbHlnb24gcG9pbnRzPSIxNSw0IDE2LjUsOC44IDIxLjUsOC44IDE3LjUsMTEuOCAxOSwxNi41IDE1LDEzLjUgMTEsMTYuNSAxMi41LDExLjggOC41LDguOCAxMy41LDguOCIgZmlsbD0iI0ZGRkYwMCIvPjwvc3ZnPg==`;

const US_FLAG_BASE64 = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCAzMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjMwIj4KICA8cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iMzAiIGZpbGw9IiNCMjIyMzQiLz4KICA8cGF0aCBkPSJNMCwzLjQ2SDYwTTAsOC4wOEg2ME0wLDEyLjY5SDYwTTAsMTcuMzFINjBNMCwyMS45Mkg2ME0wLDI2LjU0SDYwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMi4zMSIvPgogIDxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIxNi4xNSIgZmlsbD0iIzNDM0I2RSIvPgogIDxnIGZpbGw9IiNGRkZGRkYiPgogICAgPHBvbHlnb24gcG9pbnRzPSI0LDIuNSA0LjUsNCA2LDQgNC44LDUgNS4yLDYuNSA0LDUuNSAyLjgsNi41IDMuMiw1IDIsNCAzLjUsNCIvPgogICAgPHBvbHlnb24gcG9pbnRzPSIxMiwyLjUgMTIuNSw0IDE0LDQgMTIuOCw1IDEzLjIsNi41IDEyLDUuNSAxMC44LDYuNSAxMS4yLDUgMTAsNCAxMS41LDQiLz4KICAgIDxwb2x5Z29uIHBvaW50cz0iMjAsMi41IDIwLjUsNCAyMiw0IDIwLjgsNSAyMS4yLDYuNSAyMCw1LjUgMTguOCw2LjUgMTkuMiw1IDE4LDQgMTkuNSw0Ii8+CiAgICA8cG9seWdvbiBwb2ludHM9IjgsNiA4LjUsNy41IDEwLDcuNSA4LjgsOC41IDkuMiwxMCA4LDkgNi44LDEwIDcuMiw4LjUgNiw3LjUgNy41LDcuNSIvPgogICAgPHBvbHlnb24gcG9pbnRzPSIxNiw2IDE2LjUsNy41IDE4LDcuNSAxNi44LDguNSAxNy4yLDEwIDE2LDkgMTQuOCwxMCAxNS4yLDguNSAxNCw3LjUgMTUuNSw3LjUiLz4KICAgIDxwb2x5Z29uIHBvaW50cz0iNCw5LjUgNC41LDExIDYsMTEgNC44LDEyIDUuMiwxMy41IDQsMTIuNSAyLjgsMTMuNSAzLjIsMTIgMiwxMSAzLjUsMTEiLz4KICAgIDxwb2x5Z29uIHBvaW50cz0iMTIsOS41IDEyLjUsMTEgMTQsMTEgMTIuOCwxMiAxMy4yLDEzLjUgMTIsMTIuNSAxMC44LDEzLjUgMTEuMiwxMiAxMCwxMSAxMS41LDExIi8+CiAgICA8cG9seWdvbiBwb2ludHM9IjIwLDkuNSAyMC41LDExIDIyLDExIDIwLjgsMTIgMjEuMiwxMy41IDIwLDEyLjUgMTguOCwxMy41IDE5LjIsMTIgMTgsMTEgMTkuNSwxMSIvPgogIDwvZz4KPC9zdmc+`;

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
          source={{ uri: US_FLAG_BASE64 }}
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
