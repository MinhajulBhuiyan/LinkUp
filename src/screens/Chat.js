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
  Image, // <-- added for custom avatar
} from 'react-native';

import { colors } from '../config/constants';
import { auth, database } from '../config/firebase';

/** ---------- Avatar helpers (UI only, no logic change) ---------- **/
const getAvatarSeed = (name, email) => {
  const base = (name || '').trim() || (email || '').trim() || 'user';
  return encodeURIComponent(base.toLowerCase());
};

// Professional, consistent avatars via DiceBear (PNG)
const getAvatarUrl = (name, email, size = 96) => {
  const seed = getAvatarSeed(name, email);
  // You can switch styles here: "initials", "identicon", "shapes", "thumbs", "fun-emoji"
  // initials looks professional and clean for chat UIs
  return `https://api.dicebear.com/8.x/initials/png?seed=${seed}&radius=50&size=${size}&backgroundType=gradientLinear`;
};

const RenderLoadingUpload = () => (
  <View style={styles.loadingContainerUpload}>
    <ActivityIndicator size="large" color={colors.teal} />
  </View>
);

const RenderLoading = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.teal} />
  </View>
);

const RenderBubble = (props) => (
  <Bubble
    {...props}
    wrapperStyle={{
      right: { backgroundColor: colors.primary },
      left: { backgroundColor: '#EFEFEF' },
    }}
  />
);

const RenderAttach = (props) => (
  <TouchableOpacity {...props} style={styles.addImageIcon}>
    <View>
      <Ionicons name="attach-outline" size={28} color={colors.teal} />
    </View>
  </TouchableOpacity>
);

const RenderInputToolbar = (props, handleEmojiPanel) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      backgroundColor: 'white',
    }}
  >
    <InputToolbar
      {...props}
      renderActions={() => RenderActions(handleEmojiPanel)}
      containerStyle={styles.inputToolbar}
    />
    <Send {...props}>
      <View style={styles.sendIconContainer}>
        <Ionicons name="send" size={22} color={colors.teal} />
      </View>
    </Send>
  </View>
);

const RenderActions = (handleEmojiPanel) => (
  <TouchableOpacity style={styles.emojiIcon} onPress={handleEmojiPanel}>
    <View>
      <Ionicons name="happy-outline" size={28} color={colors.teal} />
    </View>
  </TouchableOpacity>
);

/** Custom avatar renderer with graceful fallback */
const RenderAvatar = (props) => {
  const name = props?.currentMessage?.user?.name;
  const id = props?.currentMessage?.user?._id;
  const provided = props?.currentMessage?.user?.avatar;
  const uri = provided || getAvatarUrl(name, id, 96);

  return (
    <View style={styles.avatarWrap}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImg} />
      ) : (
        <Ionicons name="person-circle-outline" size={36} color="#A7A7A7" />
      )}
    </View>
  );
};

function Chat({ route }) {
  const [messages, setMessages] = useState([]);
  const [modal, setModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(database, 'chats', route.params.id), (document) => {
      const raw = document.data()?.messages || [];
      // Ensure avatar is always present for clean UI
      const mapped = raw.map((message) => {
        const createdAt = message.createdAt?.toDate ? message.createdAt.toDate() : message.createdAt;
        const user = {
          ...message.user,
          avatar:
            message.user?.avatar ||
            getAvatarUrl(message.user?.name, message.user?._id, 96),
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
          avatar:
            message.user?.avatar ||
            getAvatarUrl(message.user?.name, message.user?._id, 96),
        },
      }));

      // Ensure our outgoing message also has a professional avatar
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
      {uploading && RenderLoadingUpload()}
      <GiftedChat
        messages={messages}
        showAvatarForEveryMessage={false}
        showUserAvatar={true}                 // show your avatar near your messages
        renderAvatar={RenderAvatar}           // custom avatar with fallback + circle mask
        onSend={(messagesArr) => onSend(messagesArr)}
        imageStyle={{ height: 212, width: 212, borderRadius: 12 }}
        messagesContainerStyle={{ backgroundColor: '#fff' }}
        textInputStyle={{ backgroundColor: '#fff', borderRadius: 20 }}
        user={{
          _id: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          avatar: getAvatarUrl(auth?.currentUser?.displayName, auth?.currentUser?.email, 96),
        }}
        renderBubble={(props) => RenderBubble(props)}
        renderSend={(props) => RenderAttach({ ...props, onPress: pickImage })}
        renderUsernameOnMessage
        renderAvatarOnTop
        renderInputToolbar={(props) => RenderInputToolbar(props, handleEmojiPanel)}
        minInputToolbarHeight={56}
        scrollToBottom
        onPressActionButton={handleEmojiPanel}
        scrollToBottomStyle={styles.scrollToBottomStyle}
        renderLoading={RenderLoading}
      />

      {modal && (
        <EmojiModal
          onPressOutside={handleEmojiPanel}
          modalStyle={styles.emojiModal}
          containerStyle={styles.emojiContainerModal}
          backgroundStyle={styles.emojiBackgroundModal}
          columns={5}
          emojiSize={66}
          activeShortcutColor={colors.primary}
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
    bottom: 8,
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBackgroundModal: {},
  emojiContainerModal: {
    height: 348,
    width: 396,
  },
  emojiIcon: {
    borderRadius: 16,
    bottom: 8,
    height: 32,
    marginLeft: 4,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiModal: {},
  inputToolbar: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: colors.grey,
    borderRadius: 22,
    borderWidth: 0.5,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 999,
  },
  scrollToBottomStyle: {
    borderColor: colors.grey,
    borderRadius: 28,
    borderWidth: 1,
    bottom: 12,
    height: 56,
    position: 'absolute',
    right: 12,
    width: 56,
  },
  sendIconContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: colors.grey,
    borderRadius: 22,
    borderWidth: 0.5,
    height: 44,
    justifyContent: 'center',
    marginRight: 8,
    width: 44,
  },
  /** Avatar styles */
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    backgroundColor: '#EAEAEA',
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
