import { useNavigation } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
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
  const [existingChats, setExistingChats] = useState([]);

  useEffect(() => {
    const collectionUserRef = collection(database, 'users');
    const q = query(collectionUserRef, orderBy('name', 'asc'));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs);
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
    alert('Add new user feature coming soon');
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <Cell
  title="New group"
  icon="people"
  tintColor={palette.teal}
  iconColor={palette.primary}  // Changed from palette.text
  onPress={handleNewGroup}
  style={[styles.cell, { backgroundColor: palette.card }]}
/>
<Cell
  title="Add new user"
  icon="person-add"
  tintColor={palette.teal}
  iconColor={palette.primary}  // Changed from palette.text
  onPress={handleNewUser}
  style={[styles.cell, { backgroundColor: palette.card, marginBottom: 16 }]}
/>

      {users.length === 0 ? (
        <View style={styles.blankContainer}>
          <Text style={[styles.textMuted, { color: palette.subtitle }]}>
            No registered users yet
          </Text>
        </View>
      ) : (
        <ScrollView>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Registered users
            </Text>
          </View>
          {users.map((user) => (
            <React.Fragment key={user.id}>
              <ContactRow
                name={handleName(user)}
                subtitle={handleSubtitle(user)}
                onPress={() => handleNavigate(user)}
                showForwardIcon={false}
                style={{ backgroundColor: palette.card }}
              />
            </React.Fragment>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  blankContainer: { 
    alignItems: 'center', 
    flex: 1, 
    justifyContent: 'center',
    paddingVertical: 40,
  },
  container: { 
    flex: 1,
  },
  cell: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 0,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.8,
  },
  textMuted: {
    fontSize: 16,
    fontWeight: '400',
  },
});

export default Users;