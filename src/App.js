import { registerRootComponent } from 'expo';
import React, { useState, useEffect, useContext } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged } from 'firebase/auth';
import { MenuProvider } from 'react-native-popup-menu';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Chat from './screens/Chat';
import Help from './screens/Help';
import Chats from './screens/Chats';
import Login from './screens/Login';
import Users from './screens/Users';
import About from './screens/About';
import Group from './screens/Group';
import SignUp from './screens/SignUp';
import Profile from './screens/Profile';
import Account from './screens/Account';
import Settings from './screens/Settings';
import ChatInfo from './screens/ChatInfo';

import ChatMenu from './components/ChatMenu';
import ChatHeader from './components/ChatHeader';

import { colors } from './config/constants';
import { auth } from './config/firebase';

import {
  AuthenticatedUserContext,
  AuthenticatedUserProvider,
} from './contexts/AuthenticatedUserContext';

import {
  UnreadMessagesContext,
  UnreadMessagesProvider,
} from './contexts/UnreadMessagesContext';

import { ThemeProvider, useThemeMode } from './contexts/ThemeContext'; // <-- THEME

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { unreadCount, setUnreadCount } = useContext(UnreadMessagesContext);
  const { palette } = useThemeMode();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let icon;
          if (route.name === 'Chats') {
            icon = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'NewChat') {
            icon = focused ? 'person-add' : 'person-add-outline';
          } else if (route.name === 'Settings') {
            icon = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={icon} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        presentation: 'modal',
        tabBarStyle: { 
          backgroundColor: palette.card,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom + 4, 8), // Dynamic padding based on safe area
          height: Math.max(insets.bottom + 64, 74), // Dynamic height
          position: 'absolute',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        headerStyle: { backgroundColor: palette.card },
        headerTintColor: palette.text,
        headerTitleStyle: { color: palette.text },
      })}
    >
      <Tab.Screen
        name="Chats"
        options={{ tabBarBadge: unreadCount > 0 ? unreadCount : null }}
      >
        {() => <Chats setUnreadCount={setUnreadCount} />}
      </Tab.Screen>
      <Tab.Screen 
        name="NewChat" 
        component={Users} 
        options={{ 
          title: 'New Chat',
          tabBarLabel: 'New Chat' 
        }} 
      />
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  );
};

const MainStack = () => {
  const { palette } = useThemeMode();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: palette.card },
        headerTintColor: palette.text,
        headerTitleStyle: { color: palette.text },
      }}
    >
      <Stack.Screen name="Home" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="Chat"
        component={Chat}
        options={({ route }) => ({
          headerTitle: () => (
            <ChatHeader chatName={route.params.chatName} chatId={route.params.id} />
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ChatMenu chatName={route.params.chatName} chatId={route.params.id} />
            </View>
          ),
        })}
      />
      <Stack.Screen name="Users" component={Users} options={{ title: 'Select User' }} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="About" component={About} />
      <Stack.Screen name="Help" component={Help} />
      <Stack.Screen name="Account" component={Account} />
      <Stack.Screen name="Group" component={Group} options={{ title: 'New Group' }} />
      <Stack.Screen name="ChatInfo" component={ChatInfo} options={{ title: 'Chat Information' }} />
    </Stack.Navigator>
  );
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={Login} />
    <Stack.Screen name="SignUp" component={SignUp} />
  </Stack.Navigator>
);

const RootNavigator = () => {
  const { user, setUser } = useContext(AuthenticatedUserContext);
  const [isLoading, setIsLoading] = useState(true);
  const { navTheme } = useThemeMode(); // <-- inject theme into NavigationContainer

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authenticatedUser) => {
      setUser(authenticatedUser || null);
      setIsLoading(false);
    });
    return unsub;
  }, [setUser]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const App = () => (
  <MenuProvider>
    <AuthenticatedUserProvider>
      <UnreadMessagesProvider>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </UnreadMessagesProvider>
    </AuthenticatedUserProvider>
  </MenuProvider>
);

export default registerRootComponent(App);
