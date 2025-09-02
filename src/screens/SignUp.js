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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';

import { colors } from '../config/constants';
import backImage from '../assets/background.png';
import faviconImage from '../assets/favicon.png';
import { auth, database } from '../config/firebase';

export default function SignUp({ navigation }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { palette } = useThemeMode();

  const onHandleSignup = async () => {
    if (email !== '' && password !== '' && username !== '') {
      setLoading(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username });
        await setDoc(doc(database, 'users', cred.user.email), {
          id: cred.user.uid,
          email: cred.user.email,
          name: cred.user.displayName,
          about: 'Available',
        });
        console.log(`Signup success: ${cred.user.email}`);
      } catch (err) {
        Alert.alert('Signup error', err.message);
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert('Signup error', 'Please fill in all fields');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar barStyle={palette.mode === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Background Image */}
      <Image source={backImage} style={styles.backImage} />
      
      {/* Overlay */}
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
      
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={[styles.logoContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Image source={faviconImage} style={styles.logoImage} />
            </View>
            <Text style={[styles.appName, { color: '#FFFFFF' }]}>LinkUp</Text>
            <Text style={[styles.welcomeText, { color: '#FFFFFF' }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>Join the conversation</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Name Input */}
            <View style={styles.inputWrapper}>
              <View style={[styles.inputContainer, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.8)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: '#FFFFFF' }]}
                  placeholder="Full name"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  selectionColor="#000000" 
                  autoCapitalize="words"
                  textContentType="name"
                  autoFocus
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <View style={[styles.inputContainer, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.8)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: '#FFFFFF' }]}
                  placeholder="Email address"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  selectionColor="#000000"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <View style={[styles.inputContainer, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.8)" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: '#FFFFFF' }]}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  selectionColor="#000000"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                    size={20} 
                    color="rgba(255,255,255,0.8)" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity 
              style={[
                styles.signupButton, 
                { 
                  backgroundColor: '#0088cc',
                  opacity: loading ? 0.7 : 1 
                }
              ]} 
              onPress={onHandleSignup}
              disabled={loading}
            >
              <Text style={styles.signupButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: 'rgba(255,255,255,0.8)' }]}>
                Already have an account? 
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.loginLink, { color: '#FFFFFF' }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  keyboardContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  formSection: {
    gap: 16,
  },
  inputWrapper: {
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  signupButton: {
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 16,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
});

SignUp.propTypes = {
  navigation: PropTypes.object,
};