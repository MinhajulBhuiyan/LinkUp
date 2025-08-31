import React from 'react';
import { View, Alert, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { useThemeMode } from '../contexts/ThemeContext';

import Cell from '../components/Cell';
import { colors } from '../config/constants';
import { auth, database } from '../config/firebase';

const Account = () => {
  const { palette } = useThemeMode();

  const onSignOut = () => {
    signOut(auth).catch((error) => console.log('Error logging out: ', error));
  };

  const deleteAccount = () => {
    deleteUser(auth?.currentUser).catch((error) => console.log('Error deleting: ', error));
    deleteDoc(doc(database, 'users', auth?.currentUser?.email));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <Cell
            title="Blocked Users"
            icon="close-circle-outline"
            tintColor={colors.primary}
            iconColor={palette.text}
            onPress={() => {
              alert('Blocked users touched');
            }}
          />
        </View>

        <View style={[styles.section, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <Cell
            title="Logout"
            icon="log-out-outline"
            tintColor={colors.teal}
            iconColor={palette.text}
            onPress={() => {
              Alert.alert(
                'Logout?',
                'You will need to sign in again.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Logout', onPress: onSignOut },
                ],
                { cancelable: true }
              );
            }}
            showForwardIcon={false}
          />
        </View>

        <View style={[styles.section, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <Cell
            title="Delete my account"
            icon="trash-outline"
            tintColor={colors.red}
            iconColor={palette.text}
            onPress={() => {
              Alert.alert(
                'Delete account?',
                'This will permanently erase your message history.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete my account', style: 'destructive', onPress: deleteAccount },
                ],
                { cancelable: true }
              );
            }}
            showForwardIcon={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16 },
  section: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 16,
  },
});

export default Account;
