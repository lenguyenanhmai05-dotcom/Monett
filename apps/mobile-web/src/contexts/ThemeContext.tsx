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
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    header: '#FFFFFF',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
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
        bg: '#0F172A',
        surface: '#1E293B',
        card: '#1E293B',
        header: '#1E293B',
        border: '#334155',
        borderLight: '#334155',
        textPrimary: '#F1F5F9',
        textSecondary: '#CBD5E1',
        textMuted: '#94A3B8',
        statusBar: 'light-content',
      }
    : {
        bg: '#F8FAFC',
        surface: '#FFFFFF',
        card: '#FFFFFF',
        header: '#FFFFFF',
        border: '#E2E8F0',
        borderLight: '#F1F5F9',
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
