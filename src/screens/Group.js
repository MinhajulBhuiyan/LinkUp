import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { doc, query, setDoc, orderBy, collection, onSnapshot } from 'firebase/firestore';
import {
  Text,
  View,
  Modal,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';

import { colors } from '../config/constants';
import { auth, database } from '../config/firebase';
import { useThemeMode } from '../contexts/ThemeContext';

const Group = () => {
  const navigation = useNavigation();
  const { palette } = useThemeMode();
  const [selectedItems, setSelectedItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  useEffect(() => {
    const collectionUserRef = collection(database, 'users');
    const q = query(collectionUserRef, orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userDocs = snapshot.docs.filter(doc => 
        doc.data().email !== auth?.currentUser?.email
      );
      setUsers(userDocs);
      setFilteredUsers(userDocs);
    });

    return () => unsubscribe();
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

  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: palette.card },
      headerTintColor: palette.text,
      headerTitleStyle: { color: palette.text, fontWeight: '600' },
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={toggleSearch}>
            <Ionicons name="search-outline" size={22} color={palette.text} />
          </TouchableOpacity>
          {selectedItems.length > 0 && (
            <View style={[styles.selectedCount, { backgroundColor: palette.primary }]}>
              <Text style={styles.selectedCountText}>{selectedItems.length}</Text>
            </View>
          )}
        </View>
      ),
    });
  }, [navigation, selectedItems, palette, toggleSearch]);

  const handleName = (user) => {
    const userData = user.data();
    if (userData.name) {
      return userData.name;
    }
    return userData.email || '~ No Name or Email ~';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const handleOnPress = (user) => {
    setSelectedItems((prevItems) => {
      if (prevItems.includes(user.id)) {
        return prevItems.filter((item) => item !== user.id);
      }
      return [...prevItems, user.id];
    });
  };

  const getSelected = (user) => selectedItems.includes(user.id);

  const deSelectItems = () => {
    setSelectedItems([]);
  };

  const handleFabPress = () => {
    if (selectedItems.length === 0) {
      Alert.alert('No Users Selected', 'Please select at least one user to create a group.');
      return;
    }
    setModalVisible(true);
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      Alert.alert('Invalid Group Name', 'Group name cannot be empty');
      return;
    }

    const usersToAdd = users
      .filter((user) => selectedItems.includes(user.id))
      .map((user) => ({
        email: user.data().email,
        name: user.data().name,
        deletedFromChat: false,
      }));

    usersToAdd.unshift({
      email: auth?.currentUser?.email,
      name: auth?.currentUser?.displayName,
      deletedFromChat: false,
    });

    const newRef = doc(collection(database, 'chats'));
    setDoc(newRef, {
      lastUpdated: Date.now(),
      users: usersToAdd,
      messages: [],
      groupName: groupName.trim(),
      groupAdmins: [auth?.currentUser?.email],
    }).then(() => {
      navigation.navigate('Chat', { id: newRef.id, chatName: groupName.trim() });
      deSelectItems();
      setModalVisible(false);
      setGroupName('');
    }).catch((error) => {
      Alert.alert('Error', 'Failed to create group. Please try again.');
      console.error('Error creating group:', error);
    });
  };

  const renderUserItem = ({ item: user }) => {
    const isSelected = getSelected(user);
    const userName = handleName(user);
    const userEmail = user.data().email;

    return (
      <TouchableOpacity
        style={[
          styles.userCard,
          { 
            backgroundColor: isSelected ? palette.primary + '15' : palette.card,
            borderColor: isSelected ? palette.primary : palette.border,
          }
        ]}
        onPress={() => handleOnPress(user)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.userAvatar,
          { 
            backgroundColor: isSelected ? palette.primary : palette.primary + '80'
          }
        ]}>
          <Text style={styles.userAvatarText}>
            {getInitials(userName)}
          </Text>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: palette.text }]} numberOfLines={1}>
            {userName}
          </Text>
          <Text style={[styles.userEmail, { color: palette.subtitle }]} numberOfLines={1}>
            {userEmail}
          </Text>
        </View>
        
        <View style={[
          styles.checkbox,
          {
            backgroundColor: isSelected ? palette.primary : 'transparent',
            borderColor: isSelected ? palette.primary : palette.border,
          }
        ]}>
          {isSelected && (
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar backgroundColor={palette.card} barStyle={palette.mode === 'dark' ? 'light-content' : 'dark-content'} />
      
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

      {/* Header Info */}
      <View style={[styles.headerInfo, { backgroundColor: palette.card }]}>
        <Ionicons name="people" size={24} color={palette.primary} />
        <Text style={[styles.headerTitle, { color: palette.text }]}>
          Create New Group
        </Text>
        <Text style={[styles.headerSubtitle, { color: palette.subtitle }]}>
          Select friends to add to your group
        </Text>
      </View>

      {/* Selected Users Summary */}
      {selectedItems.length > 0 && (
        <View style={[styles.selectedSummary, { backgroundColor: palette.primary + '10', borderColor: palette.primary + '30' }]}>
          <View style={styles.selectedInfo}>
            <Text style={[styles.selectedText, { color: palette.primary }]}>
              {selectedItems.length} {selectedItems.length === 1 ? 'user' : 'users'} selected
            </Text>
            <TouchableOpacity onPress={deSelectItems}>
              <Text style={[styles.clearText, { color: palette.primary }]}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons 
            name={searchQuery ? "search-outline" : "people-outline"} 
            size={64} 
            color={palette.subtitle + '60'} 
          />
          <Text style={[styles.emptyTitle, { color: palette.text }]}>
            {searchQuery ? 'No users found' : 'No users available'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: palette.subtitle }]}>
            {searchQuery ? 'Try a different search term' : 'No registered users to add to groups'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.usersList}
          style={{ flex: 1 }}
        />
      )}

      {/* Floating Action Button */}
      {selectedItems.length > 0 && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: palette.primary }]} onPress={handleFabPress}>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Group Name Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)}
          />
          <View style={[styles.modalContainer, { backgroundColor: palette.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Create Group</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={palette.subtitle} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={[styles.modalLabel, { color: palette.text }]}>Group Name</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { 
                    backgroundColor: palette.background,
                    borderColor: palette.border,
                    color: palette.text 
                  }
                ]}
                onChangeText={setGroupName}
                value={groupName}
                placeholder="Enter group name..."
                placeholderTextColor={palette.subtitle}
                maxLength={50}
                onSubmitEditing={handleCreateGroup}
                autoFocus
              />
              
              <View style={styles.selectedUsersPreview}>
                <Text style={[styles.previewLabel, { color: palette.subtitle }]}>
                  Selected Members ({selectedItems.length})
                </Text>
                <View style={styles.membersRow}>
                  {users
                    .filter(user => selectedItems.includes(user.id))
                    .slice(0, 4)
                    .map(user => (
                      <View key={user.id} style={[styles.memberPreview, { backgroundColor: palette.primary }]}>
                        <Text style={styles.memberInitial}>
                          {getInitials(handleName(user))}
                        </Text>
                      </View>
                    ))
                  }
                  {selectedItems.length > 4 && (
                    <View style={[styles.memberPreview, { backgroundColor: palette.subtitle }]}>
                      <Text style={styles.memberInitial}>+{selectedItems.length - 4}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: palette.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: palette.subtitle }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, { backgroundColor: palette.primary }]}
                onPress={handleCreateGroup}
                disabled={!groupName.trim()}
              >
                <Text style={styles.createButtonText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  headerIcon: {
    padding: 8,
  },
  selectedCount: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  selectedCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
  headerInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  selectedSummary: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
  },
  usersList: {
    padding: 16,
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
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
  userEmail: {
    fontSize: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  selectedUsersPreview: {
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  membersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  memberPreview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    // backgroundColor set dynamically
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Group;
