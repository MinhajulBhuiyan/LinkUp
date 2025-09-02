import PropTypes from 'prop-types';
import uuid from 'react-native-uuid';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import EmojiModal from 'react-native-emoji-modal';
import React, { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Send, Bubble, GiftedChat, InputToolbar } from 'react-native-gifted-chat';
import { ref, getStorage, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import {
  View,
  Keyboard,
  StyleSheet,
  BackHandler,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../config/constants';
import { auth, database } from '../config/firebase';
import { useThemeMode } from '../contexts/ThemeContext';

/** ---------- Avatar helpers ---------- **/
const getAvatarSeed = (name, email) => {
  const base = (name || '').trim() || (email || '').trim() || 'user';
  return encodeURIComponent(base.toLowerCase());
};

const getAvatarColor = (name, email) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];
  const str = (name || email || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getAvatarUrl = (name, email, size = 96) => {
  const seed = getAvatarSeed(name, email);
  const bgColor = getAvatarColor(name, email).replace('#', '');
  return `https://api.dicebear.com/8.x/initials/png?seed=${seed}&radius=50&size=${size}&backgroundColor=${bgColor}&textColor=ffffff`;
};

const RenderLoadingUpload = ({ palette }) => (
  <View style={[styles.loadingContainerUpload, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
    <ActivityIndicator size="large" color={palette.teal} />
  </View>
);

const RenderLoading = ({ palette }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={palette.teal} />
  </View>
);

const RenderBubble = (props) => {
  const { palette } = useThemeMode();
  return (
    <Bubble
      {...props}
      wrapperStyle={{
        right: {
          backgroundColor: palette.primary,
          marginVertical: 3,
          borderRadius: 20,
          paddingHorizontal: 6,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
        },
        left: {
          backgroundColor: palette.mode === 'dark' ? '#404040' : '#25D366',
          marginVertical: 3,
          borderRadius: 20,
          paddingHorizontal: 6,
          elevation: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 1,
        },
      }}
      textStyle={{
        right: {
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: '500',
        },
        left: {
          color: palette.mode === 'dark' ? '#FFFFFF' : '#333333',
          fontSize: 16,
          fontWeight: '500',
        },
      }}
      timeTextStyle={{
        right: { color: '#333333', fontSize: 12 },
        left: { color: '#333333', fontSize: 12 },
      }}
      usernameStyle={{
        color: palette.mode === 'dark' ? '#E0E0E0' : '#333333',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
      }}
    />
  );
};

const RenderAttach = (props) => {
  const { palette } = useThemeMode();
  return (
    <TouchableOpacity {...props} style={[styles.addImageIcon, { marginLeft: 8 }]}>
      <Ionicons name="attach-outline" size={28} color={palette.teal} />
    </TouchableOpacity>
  );
};

const RenderInputToolbar = (props) => {
  const { palette } = useThemeMode();
  const insets = useSafeAreaInsets();
  const handleEmojiPanel = props.handleEmojiPanel;
  const handleImagePicker = props.handleImagePicker;

  const RenderActions = () => (
    <View style={styles.actionsContainer}>
      <TouchableOpacity style={styles.actionButton} onPress={handleEmojiPanel}>
        <Ionicons name="happy-outline" size={24} color={palette.teal} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={handleImagePicker}>
        <Ionicons name="image-outline" size={24} color={palette.teal} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View
      style={[
        styles.inputToolbarContainer,
        {
          backgroundColor: palette.background,
          borderTopColor: palette.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
        }
      ]}
    >
      <InputToolbar
        {...props}
        renderActions={RenderActions}
        containerStyle={[
          styles.inputToolbar,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          }
        ]}
        primaryStyle={{ alignItems: 'center' }}
        placeholderTextColor={palette.subtitle}
        renderSend={() => null}
      />
      <TouchableOpacity
        style={[
          styles.sendIconContainer,
          {
            backgroundColor: palette.teal,
          }
        ]}
        onPress={() => {
          if (props.text && props.text.trim().length > 0) {
            props.onSend({ text: props.text.trim() }, true);
          }
        }}
      >
        <Ionicons name="send" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

/** Custom avatar renderer */
const RenderAvatar = (props) => {
  const { palette } = useThemeMode();
  const name = props?.currentMessage?.user?.name;
  const id = props?.currentMessage?.user?._id;
  const provided = props?.currentMessage?.user?.avatar;
  const uri = provided || getAvatarUrl(name, id, 96);

  return (
    <View style={[
      styles.avatarWrap,
      { backgroundColor: palette.mode === 'dark' ? '#3A3A3A' : '#EAEAEA' }
    ]}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImg} />
      ) : (
        <Ionicons name="person-circle-outline" size={36} color={palette.subtitle} />
      )}
    </View>
  );
};

function Chat({ route }) {
  const { palette } = useThemeMode();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [modal, setModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(database, 'chats', route.params.id), (document) => {
      const raw = document.data()?.messages || [];
      const mapped = raw.map((message) => {
        const createdAt = message.createdAt?.toDate ? message.createdAt.toDate() : message.createdAt;
        const user = {
          ...message.user,
          avatar: message.user?.avatar || getAvatarUrl(message.user?.name, message.user?._id, 96),
        };
        return {
          ...message,
          createdAt,
          image: message.image ?? '',
          user,
        };
      });
      setMessages(mapped);
    });

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Keyboard.dismiss();
      if (modal) {
        setModal(false);
        return true;
      }
      return false;
    });

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      if (modal) setModal(false);
    });

    return () => {
      unsubscribe();
      backHandler.remove();
      keyboardDidShowListener.remove();
    };
  }, [route.params.id, modal]);

  const onSend = useCallback(
    async (m = []) => {
      const chatDocRef = doc(database, 'chats', route.params.id);
      const chatDocSnap = await getDoc(chatDocRef);
      const chatData = chatDocSnap.data();

      const data = (chatData?.messages || []).map((message) => ({
        ...message,
        createdAt: message.createdAt?.toDate ? message.createdAt.toDate() : message.createdAt,
        image: message.image ?? '',
        user: {
          ...message.user,
          avatar: message.user?.avatar || getAvatarUrl(message.user?.name, message.user?._id, 96),
        },
      }));

      const meEmail = auth?.currentUser?.email;
      const meName = auth?.currentUser?.displayName;
      const myAvatar = getAvatarUrl(meName, meEmail, 96);

      const messagesWillSend = [
        {
          ...m[0],
          sent: true,
          received: false,
          user: {
            ...(m[0]?.user || {}),
            _id: meEmail,
            name: meName,
            avatar: myAvatar,
          },
        },
      ];

      const chatMessages = GiftedChat.append(data, messagesWillSend);

      setDoc(
        chatDocRef,
        {
          messages: chatMessages,
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    },
    [route.params.id]
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      await uploadImageAsync(result.assets[0].uri);
    }
  };

  const uploadImageAsync = async (uri) => {
    setUploading(true);
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new TypeError('Network request failed'));
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });

    const randomString = uuid.v4();
    const fileRef = ref(getStorage(), randomString);
    const uploadTask = uploadBytesResumable(fileRef, blob);

    uploadTask.on(
      'state_changed',
      () => { },
      (error) => {
        console.log(error);
        setUploading(false);
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        setUploading(false);

        const meEmail = auth?.currentUser?.email;
        const meName = auth?.currentUser?.displayName;
        const myAvatar = getAvatarUrl(meName, meEmail, 96);

        onSend([
          {
            _id: randomString,
            createdAt: new Date(),
            text: '',
            image: downloadUrl,
            user: {
              _id: meEmail,
              name: meName,
              avatar: myAvatar,
            },
          },
        ]);
      }
    );
  };

  const handleEmojiPanel = useCallback(() => {
    setModal((prevModal) => {
      Keyboard.dismiss();
      return !prevModal;
    });
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : -164}
    >
      {uploading && <RenderLoadingUpload palette={palette} />}
      <GiftedChat
        messages={messages}
        showAvatarForEveryMessage={false}
        showUserAvatar={true}
        renderAvatar={(props) => <RenderAvatar {...props} />}
        onSend={(messagesArr) => onSend(messagesArr)}
        imageStyle={{ height: 200, width: 200, borderRadius: 16, margin: 4 }}
        messagesContainerStyle={{
          backgroundColor: palette.background,
          paddingHorizontal: 8,
          paddingBottom: insets.bottom > 0 ? 0 : 10,
        }}
        textInputStyle={{
          backgroundColor: 'transparent',
          color: palette.text,
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 10,
          fontSize: 16,
          marginHorizontal: 4,
          marginVertical: 4,
          maxHeight: 100,
          minHeight: 40,
        }}
        user={{
          _id: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          avatar: getAvatarUrl(auth?.currentUser?.displayName, auth?.currentUser?.email, 96),
        }}
        renderBubble={(props) => <RenderBubble {...props} />}
        renderUsernameOnMessage={false}
        renderAvatarOnTop
        renderInputToolbar={(props) => <RenderInputToolbar {...props} handleEmojiPanel={handleEmojiPanel} handleImagePicker={pickImage} />}
        renderSend={() => null}
        minInputToolbarHeight={50}
        scrollToBottom={true}
        alwaysShowSend={false}
        sendLabel=""
        disableComposer={false}
        onPressActionButton={handleEmojiPanel}
        scrollToBottomStyle={[
          styles.scrollToBottomStyle,
          {
            backgroundColor: palette.primary,
            bottom: insets.bottom + 80,
          }
        ]}
        renderLoading={() => <RenderLoading palette={palette} />}
        placeholder="Type a message..."
        timeFormat="HH:mm"
        dateFormat="ll"
        listViewProps={{
          style: { backgroundColor: palette.background },
          keyboardShouldPersistTaps: 'handled',
        }}
        maxComposerHeight={100}
        multiline={true}
        infiniteScroll={true}
        keyboardShouldPersistTaps="handled"
        bottomOffset={insets.bottom}
      />

      {modal && (
        <EmojiModal
          onPressOutside={handleEmojiPanel}
          modalStyle={[
            styles.emojiModal,
            {
              backgroundColor: palette.mode === 'dark' ? '#2C2C2C' : '#FFFFFF',  // Change this line
              borderRadius: 20,
              overflow: 'hidden',
            }
          ]}
          containerStyle={styles.emojiContainerModal}
          backgroundStyle={[
            styles.emojiBackgroundModal,
            {
              backgroundColor: palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
            }
          ]}
          columns={8}
          emojiSize={32}
          activeShortcutColor={palette.primary}
          shortcutColor={palette.mode === 'dark' ? '#FFFFFF' : '#666666'}  
          headerStyle={{                    
            backgroundColor: palette.mode === 'dark' ? '#2C2C2C' : '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: palette.mode === 'dark' ? '#404040' : '#E0E0E0',
            paddingVertical: 12,
          }}
          categoryLabelStyle={{             
            color: palette.mode === 'dark' ? '#FFFFFF' : '#000000',
            fontWeight: '600',
          }}
          onEmojiSelected={(emoji) => {
            const meEmail = auth?.currentUser?.email;
            const meName = auth?.currentUser?.displayName;
            const myAvatar = getAvatarUrl(meName, meEmail, 96);

            onSend([
              {
                _id: uuid.v4(),
                createdAt: new Date(),
                text: emoji,
                user: {
                  _id: meEmail,
                  name: meName,
                  avatar: myAvatar,
                },
              },
            ]);
            setModal(false);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const AVATAR = 36;

const styles = StyleSheet.create({
  addImageIcon: {
    borderRadius: 16,
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  emojiBackgroundModal: {
    flex: 1,
  },
  emojiContainerModal: {
    height: 400,
    width: '100%',
  },
  emojiModal: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    maxHeight: 400,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  actionButton: {
    padding: 8,
    marginHorizontal: 2,
    borderRadius: 20,
  },
  inputToolbarContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 2,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputToolbar: {
    alignItems: 'center',
    borderRadius: 25,
    flex: 1,
    flexDirection: 'row',
    marginRight: 8,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainerUpload: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 999,
  },
  scrollToBottomStyle: {
    borderRadius: 25,
    bottom: 20,
    height: 50,
    position: 'absolute',
    right: 20,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sendIconContainer: {
    alignItems: 'center',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    width: 50,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    marginBottom: 4,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR / 2,
  },
});

Chat.propTypes = {
  route: PropTypes.object.isRequired,
};

export default Chat;