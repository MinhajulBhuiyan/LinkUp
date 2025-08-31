import React from 'react';
import PropTypes from 'prop-types';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeMode } from '../contexts/ThemeContext';

const Button = ({ title, variant = 'primary', onPress, style, disabled }) => {
  const { palette } = useThemeMode();
  
  const getBackgroundColor = () => {
    if (disabled) return palette.muted;
    return variant === 'primary' ? palette.primary : 'transparent';
  };
  
  const getTextColor = () => {
    if (disabled) return palette.text + '80'; // 50% opacity for disabled text
    return variant === 'primary' ? '#FFFFFF' : palette.primary;
  };
  
  const getBorderColor = () => {
    if (variant === 'secondary') {
      return disabled ? palette.muted : palette.primary;
    }
    return 'transparent';
  };

  return (
    <TouchableOpacity
      style={[
        styles.buttonContainer,
        { 
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'secondary' ? 1 : 0,
          paddingHorizontal: variant === 'primary' ? 24 : 16,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.buttonLabel, 
        { 
          color: getTextColor(),
          opacity: disabled ? 0.7 : 1,
        }
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

Button.propTypes = {
  title: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary']),
  onPress: PropTypes.func,
  style: PropTypes.object,
  disabled: PropTypes.bool,
};

Button.defaultProps = {
  variant: 'primary',
  disabled: false,
};

export default Button;