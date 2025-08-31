import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeMode } from '../contexts/ThemeContext';

const Separator = ({ style }) => {
  const { palette } = useThemeMode();
  
  return (
    <View 
      style={[
        styles.separator, 
        { backgroundColor: palette.border },
        style
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});

export default Separator;