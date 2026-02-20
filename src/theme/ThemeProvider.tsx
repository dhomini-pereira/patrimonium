import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, ThemeColors } from './colors';
import { useAuthStore } from '@/store/useAuthStore';

const ThemeContext = createContext<{ colors: ThemeColors; dark: boolean }>({
  colors: Colors.light,
  dark: false,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const { darkMode } = useAuthStore();
  const dark = darkMode ?? systemScheme === 'dark';
  const colors = dark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ colors, dark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
