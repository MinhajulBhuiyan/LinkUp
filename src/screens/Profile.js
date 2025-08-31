import React, { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';

import Cell from '../components/Cell';
import { auth, updateUserProfile } from '../config/firebase';
import { colors } from '../config/constants';
import { useThemeMode } from '../contexts/ThemeContext';

const Profile = () => {
  const { palette } = useThemeMode();
  const [image, setImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

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
      await updateUserProfile({ displayName: newName.trim() });
      Alert.alert('Success', 'Name updated successfully!');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update name');
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
              <Ionicons name="camera-outline" size={20} color="white" />
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

          <Cell
            title="Phone"
            subtitle="+88 017 123 4567"
            icon="call-outline"
            iconColor={palette.text}
            secondIcon="pencil-outline"
            onPress={() => Alert.alert('Phone', 'This feature is coming soon.')}
            style={[styles.cell, { backgroundColor: palette.card }]}
            titleStyle={{ color: palette.text }}
            subtitleStyle={{ color: palette.subtitle }}
          />
        </View>

        {/* Additional Info */}
        <View style={[styles.additionalInfo, { backgroundColor: palette.card }]}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="account-clock-outline" size={20} color={palette.subtitle} />
            <Text style={[styles.infoText, { color: palette.subtitle }]}>
              Joined {new Date(auth?.currentUser?.metadata.creationTime).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={20} color={palette.subtitle} />
            <Text style={[styles.infoText, { color: palette.subtitle }]}>
              Last signed in {new Date(auth?.currentUser?.metadata.lastSignInTime).toLocaleDateString()}
            </Text>
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
    paddingBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarLabel: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    marginTop: 5,
    textAlign: 'center',
  },
  infoContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  cell: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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