import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  isDark: boolean;
  colors: {
    // Backgrounds
    bg: string;
    surface: string;
    card: string;
    header: string;
    // Borders
    border: string;
    borderLight: string;
    // Text
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    // Misc
    statusBar: 'dark-content' | 'light-content';
  };
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: {
    bg: '#F5F0E8',
    surface: '#F5F0E8',
    card: '#F5F0E8',
    header: '#F5F0E8',
    border: '#E8E0D5',
    borderLight: '#EEE7DC',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    statusBar: 'dark-content',
  },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isDark = (user as any)?.theme === 'dark';

  const colors: ThemeContextType['colors'] = isDark
    ? {
        bg: '#0B0F17',
        surface: '#121A27',
        card: '#121A27',
        header: '#0E1524',
        border: 'rgba(255, 255, 255, 0.08)',
        borderLight: 'rgba(255, 255, 255, 0.05)',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        statusBar: 'light-content',
      }
    : {
        bg: '#F5F0E8',
        surface: '#F5F0E8',
        card: '#F5F0E8',
        header: '#F5F0E8',
        border: '#E8E0D5',
        borderLight: '#EEE7DC',
        textPrimary: '#0F172A',
        textSecondary: '#334155',
        textMuted: '#64748B',
        statusBar: 'dark-content',
      };

  return (
    <ThemeContext.Provider value={{ isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
