import React from 'react';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';

const Cell = ({
  title,
  icon,
  iconColor,              // optional override
  tintColor,               // optional background color behind left icon
  style,
  onPress,
  secondIcon,
  subtitle,
  showForwardIcon = true,
}) => {
  const { colors: nav } = useTheme();

  const textColor = nav.text;                     // white in dark, black in light
  const subColor = (nav.text ?? '#000') + '99';   // ~60% opacity
  const rightIconColor = (nav.text ?? '#000') + '99';
  const resolvedIconColor = iconColor ?? textColor;

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        { backgroundColor: nav.card, borderColor: nav.border ?? '#565656' },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: tintColor }]}>
        <Ionicons name={icon} size={20} color={resolvedIconColor} />
      </View>

      <View style={styles.textsContainer}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: subColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {showForwardIcon && (
        <Ionicons
          name={secondIcon ?? 'chevron-forward-outline'}
          size={18}
          color={rightIconColor}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 10,
  },
  textsContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },
});

Cell.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  iconColor: PropTypes.string,
  tintColor: PropTypes.string,
  style: PropTypes.object,
  onPress: PropTypes.func,
  secondIcon: PropTypes.string,
  subtitle: PropTypes.string,
  showForwardIcon: PropTypes.bool,
};

export default Cell;
