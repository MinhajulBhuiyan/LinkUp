import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  doc,
  where,
  query,
  setDoc,
  orderBy,
  deleteDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import {
  Text,
  View,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  ScrollView,
  BackHandler,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';

import { colors } from '../config/constants';
import ContactRow from '../components/ContactRow';
import { auth, database } from '../config/firebase';

const Chats = ({ setUnreadCount }) => {
  const navigation = useNavigation();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [newMessages, setNewMessages] = useState({});

  useEffect(() => {
    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (selectedItems.length > 0) {
          setSelectedItems([]);
          return true;
        }
        return false;
      });
      return () => subscription.remove();
    }
    return () => {};
  }, [selectedItems.length]);

  useFocusEffect(
    useCallback(() => {
      let unsubscribe = () => {};
      const loadNewMessages = async () => {
        try {
          const storedMessages = await AsyncStorage.getItem('newMessages');
          const parsed = storedMessages ? JSON.parse(storedMessages) : {};
          setNewMessages(parsed);
          setUnreadCount(Object.values(parsed).reduce((total, num) => total + num, 0));
        } catch (error) {
          console.log('Error loading new messages from storage', error);
        }
      };
      const chatsRef = collection(database, 'chats');
      const q = query(
        chatsRef,
        where('users', 'array-contains', {
          email: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          deletedFromChat: false,
        }),
        orderBy('lastUpdated', 'desc')
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        setChats(snapshot.docs);
        setLoading(false);
      });
      loadNewMessages();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [setUnreadCount])
  );

  const getChatName = useCallback((chat) => {
    const { users, groupName } = chat.data();
    const currentUser = auth?.currentUser;
    if (groupName) return groupName;
    if (Array.isArray(users) && users.length === 2) {
      if (currentUser?.displayName) {
        return users[0].name === currentUser.displayName ? users[1].name : users[0].name;
      }
      if (currentUser?.email) {
        return users[0].email === currentUser.email ? users[1].email : users[0].email;
      }
    }
    return '~ No Name or Email ~';
  }, []);

  const handleChatPress = async (chat) => {
    const chatId = chat.id;
    if (selectedItems.length) {
      selectItems(chat);
      return;
    }
    setNewMessages((prev) => {
      const updated = { ...prev, [chatId]: 0 };
      AsyncStorage.setItem('newMessages', JSON.stringify(updated));
      setUnreadCount(Object.values(updated).reduce((total, num) => total + num, 0));
      return updated;
    });
    navigation.navigate('Chat', { id: chatId, chatName: getChatName(chat) });
  };

  const handleChatLongPress = (chat) => selectItems(chat);

  const selectItems = (chat) => {
    setSelectedItems((prev) =>
      prev.includes(chat.id)
        ? prev.filter((id) => id !== chat.id)
        : [...prev, chat.id]
    );
  };

  const getSelected = (chat) => selectedItems.includes(chat.id);

  const deSelectItems = useCallback(() => setSelectedItems([]), []);

  const handleFabPress = () => navigation.navigate('Users');

  const handleDeleteChat = useCallback(() => {
    Alert.alert(
      selectedItems.length > 1 ? 'Delete selected chats?' : 'Delete this chat?',
      'Messages will be removed from this device.',
      [
        {
          text: 'Delete chat',
          style: 'destructive',
          onPress: async () => {
            const deletePromises = selectedItems.map((chatId) => {
              const chat = chats.find((c) => c.id === chatId);
              if (!chat) return Promise.resolve();
              const updatedUsers = chat
                .data()
                .users.map((user) =>
                  user.email === auth?.currentUser?.email
                    ? { ...user, deletedFromChat: true }
                    : user
                );
              return setDoc(doc(database, 'chats', chatId), { users: updatedUsers }, { merge: true }).then(() => {
                const deletedCount = updatedUsers.filter((u) => u.deletedFromChat).length;
                if (deletedCount === updatedUsers.length) {
                  return deleteDoc(doc(database, 'chats', chatId));
                }
                return Promise.resolve();
              });
            });
            Promise.all(deletePromises).then(() => {
              deSelectItems();
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [selectedItems, chats, deSelectItems]);

  useEffect(() => {
    navigation.setOptions({
      headerStyle: styles.header,
      headerTitle: 'Chats',
      headerTitleStyle: styles.headerTitle,
      headerRight:
        selectedItems.length > 0
          ? () => (
              <TouchableOpacity style={styles.headerIcon} onPress={handleDeleteChat}>
                <Ionicons name="trash-outline" size={22} color={colors.teal} />
              </TouchableOpacity>
            )
          : undefined,
      headerLeft:
        selectedItems.length > 0
          ? () => <Text style={styles.itemCount}>{selectedItems.length}</Text>
          : undefined,
    });
  }, [selectedItems, navigation, handleDeleteChat]);

  const getSubtitle = useCallback((chat) => {
    const { messages } = chat.data();
    if (!messages || messages.length === 0) return 'No messages yet';
    const message = messages[0];
    const isCurrentUser = auth?.currentUser?.email === message.user._id;
    const userName = isCurrentUser ? 'You' : (message.user.name || '').split(' ')[0];
    let messageText = '';
    if (message.image) messageText = 'sent an image';
    else if (message.text.length > 20) messageText = `${message.text.substring(0, 20)}...`;
    else messageText = message.text;
    return `${userName}: ${messageText}`;
  }, []);

  const getSubtitle2 = useCallback((chat) => {
    const { lastUpdated } = chat.data();
    if (!lastUpdated) return '';
    const options = { year: '2-digit', month: 'numeric', day: 'numeric' };
    return new Date(lastUpdated).toLocaleDateString(undefined, options);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable style={styles.container} onPress={deSelectItems}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.teal} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.teal} />
              <Text style={styles.sectionTitle}>Conversations</Text>
            </View>

            {chats.length === 0 ? (
              <View style={styles.blankContainer}>
                <Ionicons name="chatbox-outline" size={22} color="#999" />
                <Text style={styles.textMuted}>No conversations yet</Text>
              </View>
            ) : (
              chats.map((chat) => (
                <View
                  key={chat.id}
                  style={[styles.card, getSelected(chat) && styles.cardSelected]}
                >
                  <ContactRow
                    name={getChatName(chat)}
                    subtitle={getSubtitle(chat)}
                    subtitle2={getSubtitle2(chat)}
                    onPress={() => handleChatPress(chat)}
                    onLongPress={() => handleChatLongPress(chat)}
                    selected={getSelected(chat)}
                    showForwardIcon={false}
                    newMessageCount={newMessages[chat.id] || 0}
                  />
                </View>
              ))
            )}
          </ScrollView>
        )}

        <TouchableOpacity style={styles.fab} onPress={handleFabPress} activeOpacity={0.9}>
          <View style={styles.fabContainer}>
            <Ionicons name="person-add-outline" size={22} color="#fff" />
          </View>
        </TouchableOpacity>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff', // light mode background
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    color: '#222',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: '#444',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    marginVertical: 6,
    padding: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardSelected: {
    backgroundColor: '#eaf7f7',
    borderWidth: 1,
    borderColor: colors.teal,
  },
  blankContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  textMuted: {
    color: '#888',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  fabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.teal,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  itemCount: {
    color: colors.teal,
    fontSize: 18,
    fontWeight: '500',
    left: 100,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    right: 12,
  },
});

Chats.propTypes = {
  setUnreadCount: PropTypes.func,
};

export default Chats;
