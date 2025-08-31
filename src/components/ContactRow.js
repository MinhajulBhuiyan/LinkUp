import React from 'react';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { colors } from '../config/constants';

const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('') || '•';

const ContactRow = ({
  name,
  subtitle,
  onPress,
  style,
  onLongPress,
  selected,
  showForwardIcon = true,
  subtitle2,
  newMessageCount,
}) => {
  const { colors: nav } = useTheme();

  const textColor = nav.text;                          // white in dark
  const subColor = (nav.text ?? '#000') + '99';        // ~60% opacity
  const borderColor = nav.border ?? '#565656';
  const chevronColor = subColor;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { borderColor, backgroundColor: nav.card },
        style,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarLabel}>{getInitials(name)}</Text>
      </View>

      <View style={styles.textsContainer}>
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
          {name}
        </Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: subColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightContainer}>
        {!!subtitle2 && (
          <Text style={[styles.subtitle2, { color: subColor }]} numberOfLines={1}>
            {subtitle2}
          </Text>
        )}

        {newMessageCount > 0 && (
          <View style={styles.newMessageBadge}>
            <Text style={styles.newMessageText}>{newMessageCount}</Text>
          </View>
        )}

        {selected && (
          <View style={styles.overlay}>
            <Ionicons name="checkmark-outline" size={16} color="white" />
          </View>
        )}

        {showForwardIcon && (
          <Ionicons name="chevron-forward-outline" size={20} color={chevronColor} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarLabel: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  textsContainer: {
    flex: 1,
    marginStart: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    maxWidth: 220,
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  subtitle2: {
    fontSize: 12,
    marginBottom: 4,
  },
  newMessageBadge: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 12,
    justifyContent: 'center',
    marginBottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-end',
  },
  newMessageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderColor: 'black',
    borderRadius: 11,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: 22,
  },
});

ContactRow.propTypes = {
  name: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,
  style: PropTypes.object,
  onLongPress: PropTypes.func,
  selected: PropTypes.bool,
  showForwardIcon: PropTypes.bool,
  subtitle2: PropTypes.string,
  newMessageCount: PropTypes.number,
};

export default ContactRow;
