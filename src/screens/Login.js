import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
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

import { auth } from '../config/firebase';
import backImage from '../assets/background.png';
import faviconImage from '../assets/favicon.png';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { palette } = useThemeMode();

  const onHandleLogin = async () => {
    if (email !== '' && password !== '') {
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Login success');
      } catch (err) {
        Alert.alert('Login error', err.message);
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert('Login error', 'Please fill in all fields');
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
            <Text style={[styles.welcomeText, { color: '#FFFFFF' }]}>Welcome back!</Text>
            <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>Sign in to continue</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
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
                  autoFocus
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

            {/* Login Button */}
            <TouchableOpacity 
              style={[
                styles.loginButton, 
                { 
                  backgroundColor: '#0088cc',
                  opacity: loading ? 0.7 : 1 
                }
              ]} 
              onPress={onHandleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <Text style={[styles.signupText, { color: 'rgba(255,255,255,0.8)' }]}>
                Don't have an account? 
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={[styles.signupLink, { color: '#FFFFFF' }]}>Sign Up</Text>
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
    marginBottom: 48,
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
    gap: 20,
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
  loginButton: {
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    fontSize: 16,
  },
  signupLink: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
});

Login.propTypes = {
  navigation: PropTypes.object.isRequired,
};