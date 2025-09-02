import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  TextInput,
  FlatList,
} from 'react-native';

import { colors } from '../config/constants';
import ContactRow from '../components/ContactRow';
import { auth, database } from '../config/firebase';
import { useThemeMode } from '../contexts/ThemeContext';

const Chats = ({ setUnreadCount }) => {
  const navigation = useNavigation();
  const { palette } = useThemeMode();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [newMessages, setNewMessages] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

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
        const allChats = snapshot.docs;
        // Filter chats that have messages
        const chatsWithMessages = allChats.filter(chat => {
          const chatData = chat.data();
          return chatData.messages && chatData.messages.length > 0;
        });
        setChats(chatsWithMessages);
        setFilteredChats(chatsWithMessages);
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

  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter(chat => {
        const chatName = getChatName(chat).toLowerCase();
        return chatName.includes(text.toLowerCase());
      });
      setFilteredChats(filtered);
    }
  }, [chats, getChatName]);

  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible) {
      setSearchQuery('');
      setFilteredChats(chats);
    }
  };

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
      headerStyle: { backgroundColor: palette.card },
      headerTitle: 'Chats',
      headerTitleStyle: { color: palette.text },
      headerRight: selectedItems.length > 0
        ? () => (
            <TouchableOpacity style={styles.headerIcon} onPress={handleDeleteChat}>
              <Ionicons name="trash-outline" size={22} color={palette.teal} />
            </TouchableOpacity>
          )
        : () => (
            <TouchableOpacity style={styles.headerIcon} onPress={toggleSearch}>
              <Ionicons name="search-outline" size={22} color={palette.text} />
            </TouchableOpacity>
          ),
      headerLeft:
        selectedItems.length > 0
          ? () => <Text style={[styles.itemCount, { color: palette.teal }]}>{selectedItems.length}</Text>
          : undefined,
    });
  }, [selectedItems, navigation, handleDeleteChat, palette, toggleSearch]);

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
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      {isSearchVisible && (
        <View style={[styles.searchContainer, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Ionicons name="search-outline" size={20} color={palette.subtitle} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Search chats..."
            placeholderTextColor={palette.subtitle}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={palette.subtitle} />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      <Pressable style={styles.container} onPress={deSelectItems}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={palette.teal} />
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={palette.teal} />
              <Text style={[styles.sectionTitle, { color: palette.subtitle }]}>Conversations</Text>
            </View>

            {filteredChats.length === 0 ? (
              <View style={styles.blankContainer}>
                <Ionicons name={searchQuery ? "search-outline" : "chatbox-outline"} size={48} color={palette.subtitle} />
                <Text style={[styles.textMuted, { color: palette.subtitle }]}>
                  {searchQuery ? 'No chats found' : 'No conversations yet'}
                </Text>
                {!searchQuery && (
                  <Text style={[styles.textMutedSub, { color: palette.subtitle }]}>
                    Tap the + button to start a new chat
                  </Text>
                )}
              </View>
            ) : (
              <FlatList
                data={filteredChats}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.listContainer,
                  { paddingBottom: Math.max(100, insets.bottom + 90) } // Dynamic padding based on safe area
                ]}
                renderItem={({ item: chat }) => (
                  <View
                    style={[
                      styles.card, 
                      { backgroundColor: palette.card },
                      getSelected(chat) && { 
                        backgroundColor: palette.mode === 'dark' ? '#2a3b4d' : '#eaf7f7',
                        borderWidth: 1,
                        borderColor: palette.teal
                      }
                    ]}
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
                )}
              />
            )}
          </>
        )}
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingBottom: 0, // Remove extra padding since we handle it in list
  },
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 100, // Extra padding to avoid tab bar overlap
  },
  card: {
    borderRadius: 16,
    marginVertical: 4,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  blankContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  textMuted: {
    fontSize: 16,
    fontWeight: '500',
  },
  textMutedSub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  loadingWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerIcon: {
    padding: 8,
    marginRight: 4,
  },
  itemCount: {
    fontSize: 18,
    fontWeight: '600',
    paddingLeft: 16,
  },
});

Chats.propTypes = {
  setUnreadCount: PropTypes.func,
};

export default Chats;