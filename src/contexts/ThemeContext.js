import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme as NavLight, DarkTheme as NavDark } from '@react-navigation/native';
import { colors } from '../config/constants';

const STORAGE_KEY = '@linkup:theme-mode'; // 'light' | 'dark'

const ThemeContext = createContext({
  mode: 'light',
  toggle: () => {},
  navTheme: NavLight,
  palette: {},
});

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('light'); // 'light' | 'dark'

  // Load persisted mode once
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') setMode(saved);
      } catch {}
    })();
  }, []);

  const toggle = async () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  // App palette (non-navigation places)
  const palette = useMemo(() => {
    if (mode === 'dark') {
      return {
        background: colors.darkBg,
        card: colors.darkCard,
        text: colors.darkText,
        subtitle: colors.darkSubtitle,
        border: colors.border,
        primary: colors.primary,
        teal: colors.teal,
        danger: colors.red,
        muted: colors.grey,
      };
    }
    return {
      background: colors.lightBg,
      card: colors.lightCard,
      text: colors.lightText,
      subtitle: colors.lightSubtitle,
      border: colors.border,
      primary: colors.primary,
      teal: colors.teal,
      danger: colors.red,
      muted: colors.grey,
    };
  }, [mode]);

  // React Navigation theme colors
  const navTheme = useMemo(() => {
    if (mode === 'dark') {
      return {
        ...NavDark,
        colors: {
          ...NavDark.colors,
          primary: colors.primary,
          background: colors.darkBg,
          card: colors.darkCard,
          text: colors.darkText,
          border: colors.border,
          notification: colors.teal,
        },
      };
    }
    return {
      ...NavLight,
      colors: {
        ...NavLight.colors,
        primary: colors.primary,
        background: colors.lightBg,
        card: colors.lightCard,
        text: colors.lightText,
        border: colors.border,
        notification: colors.teal,
      },
    };
  }, [mode]);

  const value = useMemo(() => ({ mode, toggle, navTheme, palette }), [mode, navTheme, palette]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeMode = () => useContext(ThemeContext);
