// === FIREBASE CONFIGURATION ===
// ⚠️ ЗАМЕНИТЕ ЭТОТ КОНФИГ НА ВАШ ИЗ FIREBASE CONSOLE!

// === FIREBASE CONFIGURATION ===
const firebaseConfig = {
  apiKey: "AIzaSyClcTY01yj5ee7NPKkUOfTZcOaZkdUHwds",
  authDomain: "setup2-45d1d.firebaseapp.com",
  projectId: "setup2-45d1d",
  storageBucket: "setup2-45d1d.firebasestorage.app",
  messagingSenderId: "929341044877",
  appId: "1:929341044877:web:02989d00b72713359b8ac4",
  measurementId: "G-3YPTDLJ6LL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence с синхронизацией между вкладками (как в Telegram!)
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.log('⚠️ Offline mode: multiple tabs open, persistence limited');
  } else if (err.code === 'unimplemented') {
    console.log('⚠️ Offline mode: browser not fully supported');
  } else {
    console.error('❌ Persistence error:', err);
  }
});