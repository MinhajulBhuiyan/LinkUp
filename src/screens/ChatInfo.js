import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Alert, FlatList, StyleSheet, TouchableOpacity } from 'react-native';

import Cell from '../components/Cell';
import { colors } from '../config/constants';
import { database } from '../config/firebase';

const ChatInfo = ({ route }) => {
  const { chatId, chatName } = route.params;
  const [users, setUsers] = useState([]);
  const [groupName, setGroupName] = useState('');

  // Generate beautiful avatar color
  const generateAvatarColor = (name) => {
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const hue = Math.abs(hash) % 360;
    const saturation = 75 + (Math.abs(hash) % 15);
    const lightness = 50 + (Math.abs(hash) % 15);
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        const chatRef = doc(database, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);

        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          if (chatData) {
            if (Array.isArray(chatData.users)) {
              setUsers(chatData.users);
            }
            if (chatData.groupName) {
              setGroupName(chatData.groupName);
            }
          } else {
            setUsers([]);
          }
        } else {
          Alert.alert('Error', 'Chat does not exist');
        }
      } catch (error) {
        Alert.alert('Error', 'An error occurred while fetching chat info');
        console.error('Error fetching chat info: ', error);
      }
    };

    fetchChatInfo();
  }, [chatId]);

  const renderUser = ({ item }) => (
    <View style={styles.userContainer}>
      <View style={[styles.userAvatar, { backgroundColor: generateAvatarColor(item.name) }]}>
        <View style={styles.userAvatarInner}>
          <Text style={styles.userAvatarLabel}>
            {item.name.split(' ').reduce((prev, current) => `${prev}${current[0]}`, '')}
          </Text>
        </View>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
    </View>
  );

  const uniqueUsers = Array.from(new Map(users.map((user) => [user.email, user])).values());

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.avatarContainer}>
        <TouchableOpacity style={[styles.avatar, { backgroundColor: generateAvatarColor(chatName) }]}>
          <View style={styles.avatarInner}>
            <Text style={styles.avatarLabel}>
              {chatName.split(' ').reduce((prev, current) => `${prev}${current[0]}`, '')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.chatHeader}>
        {groupName ? (
          <>
            <Text style={styles.groupLabel}>Group</Text>
            <Text style={styles.chatTitle}>{chatName}</Text>
          </>
        ) : (
          <Text style={styles.chatTitle}>{chatName}</Text>
        )}
      </View>

      <Cell
        title="About"
        subtitle="Available"
        icon="information-circle-outline"
        iconColor={colors.primary}
        style={styles.cell}
      />

      <Text style={styles.usersTitle}>Members</Text>
      <FlatList
        data={uniqueUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.email}
        contentContainerStyle={styles.usersList}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 60,
    height: 120,
    justifyContent: 'center',
    width: 120,
  },
  avatarInner: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarLabel: {
    color: 'white',
    fontSize: 36,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cell: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 1,
    marginBottom: 15,
    marginHorizontal: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  chatHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  chatTitle: {
    color: '#333',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  container: {
    backgroundColor: '#f9f9f9',
    flex: 1,
  },
  groupLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  userContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userAvatar: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  userAvatarInner: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  userAvatarLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  userEmail: {
    color: '#666',
    fontSize: 14,
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  usersList: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 1,
    marginHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  usersTitle: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginHorizontal: 16,
    marginTop: 20,
  },
});

ChatInfo.propTypes = {
  route: PropTypes.object.isRequired,
};

export default ChatInfo;