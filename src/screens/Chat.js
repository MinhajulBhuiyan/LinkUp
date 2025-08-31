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
} from 'react-native';

import { colors } from '../config/constants';
import { auth, database } from '../config/firebase';
import { useThemeMode } from '../contexts/ThemeContext';

/** ---------- Avatar helpers ---------- **/
const getAvatarSeed = (name, email) => {
  const base = (name || '').trim() || (email || '').trim() || 'user';
  return encodeURIComponent(base.toLowerCase());
};

const getAvatarUrl = (name, email, size = 96) => {
  const seed = getAvatarSeed(name, email);
  return `https://api.dicebear.com/8.x/initials/png?seed=${seed}&radius=50&size=${size}&backgroundType=gradientLinear`;
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
          marginVertical: 2,
        },
        left: { 
          backgroundColor: palette.mode === 'dark' ? '#3d3d3dff' : '#25D366',
          marginVertical: 2,
        },
      }}
      textStyle={{
        right: { color: '#FFFFFF' },
        left: { 
          color: palette.mode === 'dark' ? '#FFFFFF' : '#000000'
        },
      }}
      timeTextStyle={{
        right: { color: '#FFFFFFAA' },
        left: { color: palette.subtitle },
      }}
      // Enhanced username styling for better visibility
      usernameStyle={{
        color: palette.mode === 'dark' ? '#E0E0E0' : '#333333', // Darker for light mode
        fontSize: 12,
        marginBottom: 3,
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
  const handleEmojiPanel = props.handleEmojiPanel;
  
  const RenderActions = () => (
    <TouchableOpacity style={styles.emojiIcon} onPress={handleEmojiPanel}>
      <Ionicons name="happy-outline" size={28} color={palette.teal} />
    </TouchableOpacity>
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        backgroundColor: palette.background,
        borderTopColor: palette.border,
        borderTopWidth: StyleSheet.hairlineWidth,
      }}
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
        placeholderTextColor={palette.subtitle}
      />
      <Send {...props}>
        <View style={[
          styles.sendIconContainer,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          }
        ]}>
          <Ionicons name="send" size={22} color={palette.teal} />
        </View>
      </Send>
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
      () => {},
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
    <>
      {uploading && <RenderLoadingUpload palette={palette} />}
      <GiftedChat
        messages={messages}
        showAvatarForEveryMessage={false}
        showUserAvatar={true}
        renderAvatar={(props) => <RenderAvatar {...props} />}
        onSend={(messagesArr) => onSend(messagesArr)}
        imageStyle={{ height: 212, width: 212, borderRadius: 12 }}
        messagesContainerStyle={{ backgroundColor: palette.background }}
        textInputStyle={{ 
          backgroundColor: palette.card,
          color: palette.text,
          borderRadius: 20,
          paddingHorizontal: 12,
        }}
        user={{
          _id: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          avatar: getAvatarUrl(auth?.currentUser?.displayName, auth?.currentUser?.email, 96),
        }}
        renderBubble={(props) => <RenderBubble {...props} />}
        renderSend={(props) => <RenderAttach {...props} onPress={pickImage} />}
        renderUsernameOnMessage
        renderAvatarOnTop
        renderInputToolbar={(props) => <RenderInputToolbar {...props} handleEmojiPanel={handleEmojiPanel} />}
        minInputToolbarHeight={56}
        scrollToBottom
        onPressActionButton={handleEmojiPanel}
        scrollToBottomStyle={[
          styles.scrollToBottomStyle,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          }
        ]}
        renderLoading={() => <RenderLoading palette={palette} />}
        placeholder="Type a message..."
        timeFormat="HH:mm"
        dateFormat="ll"
        listViewProps={{
          style: { backgroundColor: palette.background },
        }}
      />

      {modal && (
        <EmojiModal
          onPressOutside={handleEmojiPanel}
          modalStyle={[
            styles.emojiModal,
            {
              backgroundColor: palette.card,
            }
          ]}
          containerStyle={styles.emojiContainerModal}
          backgroundStyle={[
            styles.emojiBackgroundModal,
            {
              backgroundColor: palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
            }
          ]}
          columns={5}
          emojiSize={66}
          activeShortcutColor={palette.primary}
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
    </>
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
    height: 348,
    width: '100%',
  },
  emojiIcon: {
    borderRadius: 16,
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginRight: 4,
  },
  emojiModal: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  inputToolbar: {
    alignItems: 'center',
    borderRadius: 22,
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
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
    borderRadius: 28,
    bottom: 12,
    height: 56,
    position: 'absolute',
    right: 12,
    width: 56,
  },
  sendIconContainer: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginRight: 8,
    width: 44,
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