import React from 'react';
import PropTypes from 'prop-types';
import { useNavigation } from '@react-navigation/native';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';

import { colors } from '../config/constants';

const ChatHeader = ({ chatName, chatId }) => {
  const navigation = useNavigation();

  // Generate consistent color based on chat name
  const generateAvatarColor = (name) => {
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const hue = Math.abs(hash) % 360;
    const saturation = 75 + (Math.abs(hash) % 15); // 75-90%
    const lightness = 50 + (Math.abs(hash) % 15); // 50-65%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const avatarColor = generateAvatarColor(chatName);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('ChatInfo', { chatId, chatName })}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        style={[styles.avatarContainer, { backgroundColor: avatarColor }]}
        onPress={() => navigation.navigate('ChatInfo', { chatId, chatName })}
        activeOpacity={0.8}
      >
        <View style={styles.avatarInner}>
          <Text style={styles.avatarLabel}>
            {chatName.split(' ').reduce((prev, current) => `${prev}${current[0]}`, '')}
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.chatName}>{chatName}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    marginLeft: -30,
    marginRight: 10,
    borderRadius: 20,
    height: 40,
    width: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  avatarInner: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  chatName: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
});

ChatHeader.propTypes = {
  chatName: PropTypes.string.isRequired,
  chatId: PropTypes.string.isRequired,
};

export default ChatHeader;