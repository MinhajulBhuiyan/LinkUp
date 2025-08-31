import React from 'react';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  View,
  Linking,
  StyleSheet,
  TouchableOpacity,
  Share,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from 'react-native';

import Cell from '../components/Cell';
import ContactRow from '../components/ContactRow';
import { auth } from '../config/firebase';
import { colors } from '../config/constants';
import { useThemeMode } from '../contexts/ThemeContext';

const Settings = ({ navigation }) => {
  const { mode, toggle, palette } = useThemeMode(); // Use your custom theme context

  const openGithub = async (url) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error('URL not supported');
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Unable to open link', 'Please try again later.');
      console.warn('Failed to open URL:', e?.message);
    }
  };

  const inviteFriend = async () => {
    try {
      await Share.share({
        message:
          'Hey! Try LinkUp — a fast React Native chat app.\nGitHub: https://github.com/MinhajulBhuiyan/LinkUp',
        title: 'Invite to LinkUp',
        url: Platform.select({
          ios: 'https://github.com/MinhajulBhuiyan/LinkUp',
          android: 'https://github.com/MinhajulBhuiyan/LinkUp',
          default: 'https://github.com/MinhajulBhuiyan/LinkUp',
        }),
      });
    } catch {
      // user dismissed share sheet — no-op
    }
  };

  const displayName = auth?.currentUser?.displayName || 'No name';
  const email = auth?.currentUser?.email || 'No email';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={[
          styles.card,
          { backgroundColor: palette.card, borderColor: palette.border }
        ]}>
          <ContactRow
            name={displayName}
            subtitle={email}
            style={styles.contactRow}
            onPress={() => navigation.navigate('Profile')}
          />
        </View>

        {/* Navigation cells */}
        <View style={[
          styles.card,
          { backgroundColor: palette.card, borderColor: palette.border }
        ]}>
          <Cell
            title="Account"
            subtitle="Privacy, logout, delete account"
            icon="key-outline"
            onPress={() => navigation.navigate('Account')}
          />

          <Cell
            title="Help"
            subtitle="Contact us, app info"
            icon="help-circle-outline"
            onPress={() => navigation.navigate('Help')}
          />
        </View>

        {/* Dark mode toggle */}
        <View style={[
          styles.toggleRow,
          { borderColor: palette.border, backgroundColor: palette.card }
        ]}>
          <View style={styles.toggleLeft}>
            <Ionicons name="moon-outline" size={18} color={palette.text} style={{ marginRight: 10 }} />
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.toggleTitle, { color: palette.text }]}>Dark mode</Text>
              <Text style={[styles.toggleSubtitle, { color: palette.subtitle }]}>
                Switch between light and dark themes
              </Text>
            </View>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={toggle}
            accessibilityRole="switch"
            thumbColor={mode === 'dark' ? colors.primary : '#f4f3f4'}
            trackColor={{ false: '#767577', true: colors.primary }}
            ios_backgroundColor="#3e3e3e"
          />
        </View>

        {/* Invite friend */}
        <View style={[
          styles.card,
          { backgroundColor: palette.card, borderColor: palette.border }
        ]}>
          <Cell
            title="Invite a friend"
            icon="people-outline"
            onPress={inviteFriend}
            showForwardIcon={false}
          />
        </View>

        {/* GitHub link */}
        <TouchableOpacity
          style={styles.githubLink}
          onPress={() => openGithub('https://github.com/MinhajulBhuiyan/LinkUp')}
        >
          <View style={styles.githubContainer}>
            <Ionicons name="logo-github" size={12} style={{ color: colors.teal }} />
            <Text style={[styles.githubText, { color: palette.text }]}>App&apos;s GitHub</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

Settings.propTypes = {
  navigation: PropTypes.object.isRequired,
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },

  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },

  contactRow: {
    borderTopWidth: 0, // already wrapped in a card
  },

  // Dark mode toggle row
  toggleRow: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleSubtitle: {
    marginTop: 2,
    fontSize: 12,
  },

  githubContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  githubLink: {
    alignItems: 'center',
    alignSelf: 'center',
    height: 24,
    justifyContent: 'center',
    marginTop: 4,
    width: 140,
  },
  githubText: { fontSize: 12, fontWeight: '400', marginLeft: 6 },
});

export default Settings;