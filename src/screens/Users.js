import { useNavigation } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity, 
  FlatList,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, query, where, setDoc, orderBy, collection, onSnapshot } from 'firebase/firestore';

import Cell from '../components/Cell';
import { colors } from '../config/constants';
import ContactRow from '../components/ContactRow';
import { auth, database } from '../config/firebase';
import { useThemeMode } from '../contexts/ThemeContext';

const Users = () => {
  const navigation = useNavigation();
  const { palette } = useThemeMode();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [existingChats, setExistingChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    const collectionUserRef = collection(database, 'users');
    const q = query(collectionUserRef, orderBy('name', 'asc'));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const userDocs = snapshot.docs;
      setUsers(userDocs);
      setFilteredUsers(userDocs);
    });

    const collectionChatsRef = collection(database, 'chats');
    const q2 = query(
      collectionChatsRef,
      where('users', 'array-contains', {
        email: auth?.currentUser?.email,
        name: auth?.currentUser?.displayName,
        deletedFromChat: false,
      }),
      where('groupName', '==', '')
    );
    const unsubscribeChats = onSnapshot(q2, (snapshot) => {
      const existing = snapshot.docs.map((existingChat) => ({
        chatId: existingChat.id,
        userEmails: existingChat.data().users,
      }));
      setExistingChats(existing);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeChats();
    };
  }, []);

  // Search functionality
  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => {
        const userData = user.data();
        const name = userData.name?.toLowerCase() || '';
        const email = userData.email?.toLowerCase() || '';
        return name.includes(text.toLowerCase()) || email.includes(text.toLowerCase());
      });
      setFilteredUsers(filtered);
    }
  }, [users]);

  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible) {
      setSearchQuery('');
      setFilteredUsers(users);
    }
  };

  // Update header with search option
  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: palette.card },
      headerTintColor: palette.text,
      headerTitleStyle: { color: palette.text },
      headerRight: () => (
        <TouchableOpacity style={styles.headerIcon} onPress={toggleSearch}>
          <Ionicons name="search-outline" size={22} color={palette.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, palette, toggleSearch]);

  function handleName(user) {
    const { name, email } = user.data();
    if (name) {
      return email === auth?.currentUser?.email ? `${name} (You)` : name;
    }
    return email || '~ No Name or Email ~';
  }

  const handleSubtitle = useCallback(
    (user) => (user.data().email === auth?.currentUser?.email ? 'Message yourself' : 'Tap to start chat'),
    []
  );

  const handleNewGroup = useCallback(() => {
    navigation.navigate('Group');
  }, [navigation]);

  const handleNewUser = useCallback(() => {
    setShowAddUserModal(true);
  }, []);

  const handleNavigate = useCallback(
    (user) => {
      let navigationChatID = '';
      let messageYourselfChatID = '';

      existingChats.forEach((existingChat) => {
        const isCurrentUserInTheChat = existingChat.userEmails.some(
          (e) => e.email === auth?.currentUser?.email
        );
        const isMessageYourselfExists = existingChat.userEmails.filter(
          (e) => e.email === user.data().email
        ).length;

        if (
          isCurrentUserInTheChat &&
          existingChat.userEmails.some((e) => e.email === user.data().email)
        ) {
          navigationChatID = existingChat.chatId;
        }

        if (isMessageYourselfExists === 2) {
          messageYourselfChatID = existingChat.chatId;
        }

        if (auth?.currentUser?.email === user.data().email) {
          navigationChatID = '';
        }
      });

      if (messageYourselfChatID) {
        navigation.navigate('Chat', { id: messageYourselfChatID, chatName: handleName(user) });
      } else if (navigationChatID) {
        navigation.navigate('Chat', { id: navigationChatID, chatName: handleName(user) });
      } else {
        const newRef = doc(collection(database, 'chats'));
        setDoc(newRef, {
          lastUpdated: Date.now(),
          groupName: '',
          users: [
            {
              email: auth?.currentUser?.email,
              name: auth?.currentUser?.displayName,
              deletedFromChat: false,
            },
            { email: user.data().email, name: user.data().name, deletedFromChat: false },
          ],
          lastAccess: [
            { email: auth?.currentUser?.email, date: Date.now() },
            { email: user.data().email, date: '' },
          ],
          messages: [],
        }).then(() => {
          navigation.navigate('Chat', { id: newRef.id, chatName: handleName(user) });
        });
      }
    },
    [existingChats, navigation]
  );

  // Modal functions
  const closeAddUserModal = () => {
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
    setIsCreatingUser(false);
  };

  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsCreatingUser(true);

    try {
      // Create a new user document in Firestore
      const newUserRef = doc(database, 'users', newUserEmail);
      await setDoc(newUserRef, {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        createdAt: Date.now(),
      });

      // Create a new chat with this user
      const newChatRef = doc(collection(database, 'chats'));
      await setDoc(newChatRef, {
        lastUpdated: Date.now(),
        groupName: '',
        users: [
          {
            email: auth?.currentUser?.email,
            name: auth?.currentUser?.displayName,
            deletedFromChat: false,
          },
          { 
            email: newUserEmail.trim(), 
            name: newUserName.trim(), 
            deletedFromChat: false 
          },
        ],
        lastAccess: [
          { email: auth?.currentUser?.email, date: Date.now() },
          { email: newUserEmail.trim(), date: '' },
        ],
        messages: [],
      });

      closeAddUserModal();
      
      // Navigate to the new chat
      navigation.navigate('Chat', { 
        id: newChatRef.id, 
        chatName: newUserName.trim() 
      });
      
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to add user. Please try again.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Search Bar */}
      {isSearchVisible && (
        <View style={[styles.searchContainer, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Ionicons name="search-outline" size={20} color={palette.subtitle} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Search users..."
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

      {/* Header Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: palette.card }]} 
          onPress={handleNewGroup}
        >
          <View style={[styles.actionIcon, { backgroundColor: palette.teal + '20' }]}>
            <Ionicons name="people" size={24} color={palette.teal} />
          </View>
          <Text style={[styles.actionTitle, { color: palette.text }]}>New Group</Text>
          <Text style={[styles.actionSubtitle, { color: palette.subtitle }]}>Create a group chat</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: palette.card }]} 
          onPress={handleNewUser}
        >
          <View style={[styles.actionIcon, { backgroundColor: palette.primary + '20' }]}>
            <Ionicons name="person-add" size={24} color={palette.primary} />
          </View>
          <Text style={[styles.actionTitle, { color: palette.text }]}>Add User</Text>
          <Text style={[styles.actionSubtitle, { color: palette.subtitle }]}>Invite someone new</Text>
        </TouchableOpacity>
      </View>

      {/* Users List */}
      <View style={styles.usersSection}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          {searchQuery ? `Search Results (${filteredUsers.length})` : 'Registered Users'}
        </Text>

        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={searchQuery ? "search-outline" : "people-outline"} 
              size={48} 
              color={palette.subtitle} 
            />
            <Text style={[styles.emptyText, { color: palette.subtitle }]}>
              {searchQuery ? 'No users found' : 'No users available'}
            </Text>
            {searchQuery && (
              <Text style={[styles.emptySubtext, { color: palette.subtitle }]}>
                Try a different search term
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.usersList}
            renderItem={({ item: user }) => (
              <TouchableOpacity
                style={[styles.userCard, { backgroundColor: palette.card }]}
                onPress={() => handleNavigate(user)}
                activeOpacity={0.7}
              >
                <View style={[styles.userAvatar, { backgroundColor: palette.primary }]}>
                  <Text style={styles.userAvatarText}>
                    {handleName(user).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: palette.text }]}>
                    {handleName(user)}
                  </Text>
                  <Text style={[styles.userSubtitle, { color: palette.subtitle }]}>
                    {handleSubtitle(user)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={18} color={palette.subtitle} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Add User Modal */}
      <Modal
        visible={showAddUserModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeAddUserModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                Invite New User
              </Text>
              <TouchableOpacity onPress={closeAddUserModal}>
                <Ionicons name="close" size={24} color={palette.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, { color: palette.subtitle }]}>
              Add someone new to LinkUp by providing their details
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: palette.text }]}>
                Full Name *
              </Text>
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: palette.background, 
                  color: palette.text,
                  borderColor: palette.border 
                }]}
                placeholder="Enter their full name"
                placeholderTextColor={palette.subtitle}
                value={newUserName}
                onChangeText={setNewUserName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: palette.text }]}>
                Email Address *
              </Text>
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: palette.background, 
                  color: palette.text,
                  borderColor: palette.border 
                }]}
                placeholder="Enter their email address"
                placeholderTextColor={palette.subtitle}
                value={newUserEmail}
                onChangeText={setNewUserEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: palette.border }]}
                onPress={closeAddUserModal}
              >
                <Text style={[styles.cancelButtonText, { color: palette.subtitle }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.addButton, { 
                  backgroundColor: palette.primary,
                  opacity: (!newUserEmail.trim() || !newUserName.trim() || isCreatingUser) ? 0.5 : 1 
                }]}
                onPress={handleAddUser}
                disabled={!newUserEmail.trim() || !newUserName.trim() || isCreatingUser}
              >
                <Text style={styles.addButtonText}>
                  {isCreatingUser ? 'Adding...' : 'Add User'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  usersSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  usersList: {
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userSubtitle: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  headerIcon: {
    padding: 8,
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Users;