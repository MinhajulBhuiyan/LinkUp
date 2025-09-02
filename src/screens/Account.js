import React, { useState, useEffect } from 'react';
import { View, Alert, SafeAreaView, ScrollView, StyleSheet, TextInput, Modal, Text, TouchableOpacity } from 'react-native';
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useThemeMode } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

import Cell from '../components/Cell';
import { colors } from '../config/constants';
import { auth, database } from '../config/firebase';

const Account = () => {
  const { palette } = useThemeMode();
  const [privacySettings, setPrivacySettings] = useState({
    whoCanMessage: 'everyone', // 'everyone' or 'contacts'
    showOnlineStatus: true,
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const userEmail = auth?.currentUser?.email;
      if (userEmail) {
        const userDoc = await getDoc(doc(database, 'users', userEmail));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setPrivacySettings({
            whoCanMessage: userData.whoCanMessage || 'everyone',
            showOnlineStatus: userData.showOnlineStatus !== undefined ? userData.showOnlineStatus : true,
          });
        }
      }
    } catch (error) {
      console.log('Error loading privacy settings:', error);
    }
  };

  const onSignOut = () => {
    signOut(auth).catch((error) => console.log('Error logging out: ', error));
  };

  const handlePrivacySettings = () => {
    Alert.alert(
      'Privacy Settings',
      'Choose your privacy preferences',
      [
        {
          text: 'Message Settings',
          onPress: () => showMessageSettings(),
        },
        {
          text: 'Online Status',
          onPress: () => toggleOnlineStatus(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const showMessageSettings = () => {
    Alert.alert(
      'Who can message you?',
      'Choose who can send you messages',
      [
        {
          text: 'Everyone',
          onPress: () => updatePrivacySetting('whoCanMessage', 'everyone'),
        },
        {
          text: 'Contacts Only',
          onPress: () => updatePrivacySetting('whoCanMessage', 'contacts'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const toggleOnlineStatus = () => {
    const newStatus = !privacySettings.showOnlineStatus;
    Alert.alert(
      'Online Status',
      `${newStatus ? 'Show' : 'Hide'} your online status to other users?`,
      [
        {
          text: 'Yes',
          onPress: () => updatePrivacySetting('showOnlineStatus', newStatus),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const updatePrivacySetting = async (setting, value) => {
    try {
      const userEmail = auth?.currentUser?.email;
      if (userEmail) {
        await updateDoc(doc(database, 'users', userEmail), {
          [setting]: value,
        });
        setPrivacySettings(prev => ({
          ...prev,
          [setting]: value,
        }));
        Alert.alert('Success', 'Privacy settings updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update privacy settings');
      console.log('Error updating privacy settings:', error);
    }
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
    setPasswords({ current: '', new: '', confirm: '' });
    // Reset visibility states
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const changePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (passwords.new !== passwords.confirm) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwords.new.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, passwords.current);
      
      // Re-authenticate user
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, passwords.new);
      
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordModal(false);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error) {
      let errorMessage = 'Failed to change password';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPrivacyStatusText = () => {
    const messageText = privacySettings.whoCanMessage === 'everyone' ? 'Everyone' : 'Contacts only';
    const statusText = privacySettings.showOnlineStatus ? 'Visible' : 'Hidden';
    return `Messages: ${messageText} • Status: ${statusText}`;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <Cell
            title="Privacy Settings"
            subtitle={getPrivacyStatusText()}
            icon="shield-checkmark-outline"
            tintColor={colors.primary}
            iconColor={palette.text}
            onPress={handlePrivacySettings}
          />
        </View>

        <View style={[styles.section, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <Cell
            title="Change Password"
            subtitle="Update your account password"
            icon="key-outline"
            tintColor={colors.teal}
            iconColor={palette.text}
            onPress={handleChangePassword}
            showForwardIcon={false}
          />
        </View>

        <View style={[styles.section, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <Cell
            title="Logout"
            icon="log-out-outline"
            tintColor={colors.pink}
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
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={palette.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: palette.text }]}>Current Password</Text>
              <View style={[
                styles.passwordInputContainer,
                {
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                }
              ]}>
                <TextInput
                  style={[styles.passwordInput, { color: palette.text }]}
                  secureTextEntry={!showCurrentPassword}
                  value={passwords.current}
                  onChangeText={(text) => setPasswords(prev => ({ ...prev, current: text }))}
                  placeholder="Enter current password"
                  placeholderTextColor={palette.subtitle}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Ionicons 
                    name={showCurrentPassword ? 'eye-outline' : 'eye-off-outline'} 
                    size={20} 
                    color={palette.subtitle}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: palette.text }]}>New Password</Text>
              <View style={[
                styles.passwordInputContainer,
                {
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                }
              ]}>
                <TextInput
                  style={[styles.passwordInput, { color: palette.text }]}
                  secureTextEntry={!showNewPassword}
                  value={passwords.new}
                  onChangeText={(text) => setPasswords(prev => ({ ...prev, new: text }))}
                  placeholder="Enter new password"
                  placeholderTextColor={palette.subtitle}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons 
                    name={showNewPassword ? 'eye-outline' : 'eye-off-outline'} 
                    size={20} 
                    color={palette.subtitle}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: palette.text }]}>Confirm New Password</Text>
              <View style={[
                styles.passwordInputContainer,
                {
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                }
              ]}>
                <TextInput
                  style={[styles.passwordInput, { color: palette.text }]}
                  secureTextEntry={!showConfirmPassword}
                  value={passwords.confirm}
                  onChangeText={(text) => setPasswords(prev => ({ ...prev, confirm: text }))}
                  placeholder="Confirm new password"
                  placeholderTextColor={palette.subtitle}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} 
                    size={20} 
                    color={palette.subtitle}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: palette.border }]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: palette.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { 
                    backgroundColor: colors.primary,
                    opacity: loading ? 0.7 : 1
                  }
                ]}
                onPress={changePassword}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Updating...' : 'Update Password'}
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
  safe: { flex: 1 },
  content: { padding: 16 },
  section: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 16,
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
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Account;