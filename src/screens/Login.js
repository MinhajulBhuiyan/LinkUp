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
} from 'react-native';
import { useThemeMode } from '../contexts/ThemeContext';

import { auth } from '../config/firebase';
import backImage from '../assets/background.png';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { palette } = useThemeMode();

  const onHandleLogin = () => {
    if (email !== '' && password !== '') {
      signInWithEmailAndPassword(auth, email, password)
        .then(() => console.log('Login success'))
        .catch((err) => Alert.alert('Login error', err.message));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Image source={backImage} style={styles.backImage} />
      <SafeAreaView style={styles.form}>
        <Text style={[styles.title, { color: palette.text }]}>
          Log In
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: '#000000', // Black background
              color: '#FFFFFF', // White text
              borderColor: palette.border,
            }
          ]}
          placeholder="Enter email"
          placeholderTextColor="#888888" // Light gray placeholder
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoFocus
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
          onPress={onHandleLogin}
        >
          <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 18 }}>Log In</Text>
        </TouchableOpacity>
        <View
          style={{ marginTop: 30, flexDirection: 'row', alignItems: 'center', alignSelf: 'center' }}
        >
          <Text style={{ 
            color: palette.subtitle, 
            fontWeight: '600', 
            fontSize: 14 
          }}>
            Don&apos;t have an account? &nbsp;
          </Text>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('SignUp');
            }}
          >
            <Text style={{ color: palette.primary, fontWeight: '600', fontSize: 14 }}>Sign Up</Text>
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
    borderWidth: 1,
  },
  title: {
    alignSelf: 'center',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 30,
  },
});

Login.propTypes = {
  navigation: PropTypes.object.isRequired,
};