import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  Text,
  View,
  Image,
  Alert,
  TextInput,
  StatusBar,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useThemeMode } from '../contexts/ThemeContext';

import { colors } from '../config/constants';
import backImage from '../assets/background.png';
import { auth, database } from '../config/firebase';

export default function SignUp({ navigation }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { palette } = useThemeMode();

  const onHandleSignup = () => {
    if (email !== '' && password !== '') {
      createUserWithEmailAndPassword(auth, email, password)
        .then((cred) => {
          updateProfile(cred.user, { displayName: username }).then(() => {
            setDoc(doc(database, 'users', cred.user.email), {
              id: cred.user.uid,
              email: cred.user.email,
              name: cred.user.displayName,
              about: 'Available',
            });
          });
          console.log(`Signup success: ${cred.user.email}`);
        })
        .catch((err) => Alert.alert('Signup error', err.message));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Image source={backImage} style={styles.backImage} />
      <SafeAreaView style={styles.form}>
        <Text style={[styles.title, { color: palette.text }]}>Sign Up</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: '#000000', // Black background
              color: '#FFFFFF', // White text
              borderColor: palette.border,
              borderWidth: 1,
            }
          ]}
          placeholder="Enter name"
          placeholderTextColor="#888888" // Light gray placeholder
          autoCapitalize="none"
          keyboardType="name-phone-pad"
          textContentType="name"
          autoFocus
          value={username}
          onChangeText={(text) => setUsername(text)}
        />
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: '#000000', // Black background
              color: '#FFFFFF', // White text
              borderColor: palette.border,
              borderWidth: 1,
            }
          ]}
          placeholder="Enter email"
          placeholderTextColor="#888888" // Light gray placeholder
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={(text) => setEmail(text)}
        />
        <View style={{ position: 'relative' }}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: '#000000', // Black background
                color: '#FFFFFF', // White text
                borderColor: palette.border,
                borderWidth: 1,
              }
            ]}
            placeholder="Enter password"
            placeholderTextColor="#888888" // Light gray placeholder
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!showPassword}
            textContentType="password"
            value={password}
            onChangeText={(text) => setPassword(text)}
          />
          <TouchableOpacity
            style={{ position: 'absolute', right: 16, top: 18 }}
            onPress={() => setShowPassword((prev) => !prev)}
          >
            <Text style={{ color: palette.primary, fontWeight: 'bold' }}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: palette.primary }]} 
          onPress={onHandleSignup}
        >
          <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 18 }}>Sign Up</Text>
        </TouchableOpacity>
        <View
          style={{ marginTop: 30, flexDirection: 'row', alignItems: 'center', alignSelf: 'center' }}
        >
          <Text style={{ color: palette.subtitle, fontWeight: '600', fontSize: 14 }}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: palette.primary, fontWeight: '600', fontSize: 14 }}>Log In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <StatusBar barStyle={palette.mode === 'dark' ? 'light-content' : 'dark-content'} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backImage: {
    height: 340,
    position: 'absolute',
    resizeMode: 'cover',
    top: 0,
    width: '100%',
  },
  button: {
    alignItems: 'center',
    borderRadius: 12,
    height: 58,
    justifyContent: 'center',
    marginTop: 40,
  },
  container: {
    flex: 1,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 30,
  },
  input: {
    borderRadius: 12,
    fontSize: 16,
    height: 58,
    marginBottom: 20,
    padding: 16,
  },
  title: {
    alignSelf: 'center',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 30,
  },
});

SignUp.propTypes = {
  navigation: PropTypes.object,
};