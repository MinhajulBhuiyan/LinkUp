import React, { useState, useEffect } from 'react';
import { 
  Ionicons, 
  MaterialCommunityIcons 
} from '@expo/vector-icons';
import { 
  Text, 
  View, 
  Alert, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView,
  Image,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

import Cell from '../components/Cell';
import { auth, database } from '../config/firebase';
import { colors } from '../config/constants';
import { useThemeMode } from '../contexts/ThemeContext';

const Profile = () => {
  const { palette } = useThemeMode();
  const [image, setImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [userStats, setUserStats] = useState({
    totalChats: 0,
    messagesSent: 0
  });

  // Get avatar color consistent with chat system
  const getAvatarColor = (name, email) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];
    const str = (name || email || '').toLowerCase();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Load user statistics
  useEffect(() => {
    const loadUserStats = async () => {
      try {
        const userEmail = auth?.currentUser?.email;
        if (!userEmail) return;

        // Count total chats
        const chatsQuery = query(
          collection(database, 'chats'),
          where('users', 'array-contains', {
            email: userEmail,
            name: auth?.currentUser?.displayName,
            deletedFromChat: false
          })
        );
        const chatsSnapshot = await getDocs(chatsQuery);
        
        // Count total messages (simplified)
        let totalMessages = 0;
        chatsSnapshot.docs.forEach(doc => {
          const chatData = doc.data();
          if (chatData.messages) {
            const userMessages = chatData.messages.filter(msg => 
              msg.user && msg.user._id === userEmail
            );
            totalMessages += userMessages.length;
          }
        });

        setUserStats({
          totalChats: chatsSnapshot.size,
          messagesSent: totalMessages
        });
      } catch (error) {
        console.error('Error loading user stats:', error);
      }
    };

    loadUserStats();
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error(error);
    }
  };

  const handleChangeName = () => {
    setNewName(auth?.currentUser?.displayName || '');
    setModalVisible(true);
  };

  const saveName = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: newName.trim()
      });

      // Update user document in Firestore
      const userDocRef = doc(database, 'users', auth.currentUser.email);
      await updateDoc(userDocRef, {
        name: newName.trim()
      });

      Alert.alert('Success', 'Name updated successfully!');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update name: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisplayEmail = () => {
    Alert.alert('Email', `Your email is: ${auth?.currentUser?.email}`);
  };

  const initials = auth?.currentUser?.displayName
    ? auth.currentUser.displayName
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : auth?.currentUser?.email?.charAt(0).toUpperCase();

  const avatarColor = getAvatarColor(
    auth?.currentUser?.displayName, 
    auth?.currentUser?.email
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            {image ? (
              <Image source={{ uri: image }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
                <Text style={styles.avatarLabel}>{initials}</Text>
              </View>
            )}
            <TouchableOpacity 
              style={[styles.cameraIcon, { backgroundColor: palette.teal }]} 
              onPress={pickImage}
            >
              <Ionicons name="camera-outline" size={18} color="white" />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.userName, { color: palette.text }]}>
            {auth?.currentUser?.displayName || 'No name set'}
          </Text>
          <Text style={[styles.userEmail, { color: palette.subtitle }]}>
            {auth?.currentUser?.email}
          </Text>
        </View>

        {/* User Info Cells */}
        <View style={styles.infoContainer}>
          <Cell
            title="Name"
            icon="person-outline"
            iconColor={palette.text}
            subtitle={auth?.currentUser?.displayName || 'No name set'}
            secondIcon="pencil-outline"
            onPress={handleChangeName}
            style={[styles.cell, { backgroundColor: palette.card }]}
            titleStyle={{ color: palette.text }}
            subtitleStyle={{ color: palette.subtitle }}
          />

          <Cell
            title="Email"
            subtitle={auth?.currentUser?.email}
            icon="mail-outline"
            iconColor={palette.text}
            onPress={handleDisplayEmail}
            style={[styles.cell, { backgroundColor: palette.card }]}
            titleStyle={{ color: palette.text }}
            subtitleStyle={{ color: palette.subtitle }}
          />

          <Cell
            title="About"
            subtitle="Hey there! I'm using LinkUp"
            icon="information-circle-outline"
            iconColor={palette.text}
            secondIcon="pencil-outline"
            onPress={() => Alert.alert('About', 'This feature is coming soon.')}
            style={[styles.cell, { backgroundColor: palette.card }]}
            titleStyle={{ color: palette.text }}
            subtitleStyle={{ color: palette.subtitle }}
          />
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: palette.card }]}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
              <MaterialCommunityIcons name="message-text" size={24} color="#2196F3" />
            </View>
            <Text style={[styles.statNumber, { color: palette.text }]}>{userStats.totalChats}</Text>
            <Text style={[styles.statLabel, { color: palette.subtitle }]}>Total Chats</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: palette.card }]}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E8' }]}>
              <MaterialCommunityIcons name="send" size={24} color="#4CAF50" />
            </View>
            <Text style={[styles.statNumber, { color: palette.text }]}>{userStats.messagesSent}</Text>
            <Text style={[styles.statLabel, { color: palette.subtitle }]}>Messages Sent</Text>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.accountInfoContainer}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Account Information</Text>
          
          <View style={[styles.infoCard, { backgroundColor: palette.card }]}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialCommunityIcons name="account-clock-outline" size={20} color="#FF9800" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: palette.text }]}>Member Since</Text>
                <Text style={[styles.infoValue, { color: palette.subtitle }]}>
                  {new Date(auth?.currentUser?.metadata.creationTime).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>
            
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="time-outline" size={20} color="#9C27B0" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: palette.text }]}>Last Active</Text>
                <Text style={[styles.infoValue, { color: palette.subtitle }]}>
                  {new Date(auth?.currentUser?.metadata.lastSignInTime).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Change Name Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.card }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Change Name</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: palette.background, 
                color: palette.text,
                borderColor: palette.border 
              }]}
              placeholder="Enter your name"
              placeholderTextColor={palette.subtitle}
              value={newName}
              onChangeText={setNewName}
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, { backgroundColor: palette.primary }]}
                onPress={saveName}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
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
  scrollContent: {
    paddingBottom: 10,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 15,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarLabel: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 3,
    textAlign: 'center',
  },
  infoContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  cell: {
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  
  // Statistics Cards
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  
  // Account Information
  accountInfoContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  infoCard: {
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginVertical: 8,
    marginLeft: 48,
  },
  
  additionalInfo: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 15,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default Profile;