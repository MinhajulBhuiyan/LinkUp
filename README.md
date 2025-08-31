# LinkUp – React Native Chat App  

A simple **real-time chat app** built with **React Native (Expo)** and **Firebase** for authentication, messaging, and storage.  

---

## ℹ️ Introduction  

**LinkUp** is a mobile chat application where users can:  
- Create an account & log in securely with Firebase  
- Chat in real time with friends  
- Send and receive messages instantly  
- Edit their profile (with picture)  
- Manage friend requests and suggestions  

---

## ⚡ Features  

| Feature             | Description                                                                 |
| :------------------ | :-------------------------------------------------------------------------- |
| **Signup/Login**    | Firebase email & password authentication                                    |
| **Real-Time Chat**  | Instant messaging with Firebase Firestore                                   |
| **Profile Update**  | Users can edit their name and profile picture                               |
| **Friend Requests** | Send, accept, and view friend suggestions                                   |
| **Light/Dark Mode** | Modern UI supporting both themes                                            |

---

## 💾 Installation Guide  

Make sure you have installed:  
- [Node.js](https://nodejs.org/)  
- [Git](https://git-scm.com/)  
- [Expo Go](https://expo.dev/go) on your mobile for testing  

### Steps  

```bash
# Clone this repository
git clone https://github.com/MinhajulBhuiyan/LinkUp.git
cd LinkUp

# Install dependencies
npm install

# Start Expo server
npx expo start


### 🔥 Firebase Setup  

1. Create a Firebase project on [Firebase Console](https://console.firebase.google.com/).  
2. Enable **Authentication (Email/Password)** and **Firestore Database**.  
3. Create a `.env` file in the root folder and add your Firebase config:  

```env
API_KEY=your_api_key_here  
AUTH_DOMAIN=your_auth_domain  
PROJECT_ID=your_project_id  
STORAGE_BUCKET=your_storage_bucket  
MESSAGING_SENDER_ID=your_sender_id  
APP_ID=your_app_id  
