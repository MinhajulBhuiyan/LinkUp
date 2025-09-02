import React from 'react';
import { View, Alert, Linking } from 'react-native';

import Cell from '../components/Cell';
import { colors } from '../config/constants';

const Help = () => (
  <View>
    <Cell
      title="Contact us"
      subtitle="Questions? Need help?"
      icon="people-outline"
      tintColor={colors.primary}
      onPress={() => {
        Alert.alert(
          'Contact Support',
          'How would you like to contact us?',
          [
            {
              text: 'Email',
              onPress: () => {
                Linking.openURL('mailto:minhajul@iut-dhaka.edu?subject=LinkUp Support&body=Hello, I need help with...');
              },
            },
            {
              text: 'Call',
              onPress: () => {
                Linking.openURL('tel:+8801747247276');
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ],
          { cancelable: true }
        );
      }}
      showForwardIcon={false}
      style={{ marginTop: 20 }}
    />
    <Cell
      title="App info"
      icon="information-circle-outline"
      tintColor={colors.pink}
      onPress={() => {
        Alert.alert(
          'LinkUp - React Native Chat App',
          'Version: 1.0.0\n\nA modern, real-time chat application built with React Native and Firebase. Connect with friends, share messages, images, and emojis in a beautiful and intuitive interface.\n\nKey Features:\n• Real-time messaging\n• Image sharing\n• Emoji support\n• Dark/Light theme\n• User avatars\n• Message timestamps\n• Secure authentication\n\nDeveloper: Minhajul Bhuiyan\nInstitution: Islamic University of Technology\nEmail: minhajul@iut-dhaka.edu\nPhone: +880 1747247276\n\nTechnology Stack:\n• React Native\n• Firebase Firestore\n• Firebase Storage\n• Firebase Authentication\n• Expo\n• React Native Gifted Chat',
          [
            {
              text: 'Ok',
              onPress: () => {},
            },
          ],
          { cancelable: true }
        );
      }}
      showForwardIcon={false}
    />
  </View>
);

export default Help;