// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBsfdf718XTD-mzVJck-llwnO6nWtvntHg",
  authDomain: "glass-16d5b.firebaseapp.com",
  projectId: "glass-16d5b",
  storageBucket: "glass-16d5b.firebasestorage.app",
  messagingSenderId: "1008700581149",
  appId: "1:1008700581149:web:cc2d81873e5b5d677eedf4",
  measurementId: "G-89T6F1FZRT"
};

console.log(firebaseConfig);
// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);
// const analytics = getAnalytics(app);

export { app, auth, firestore }; 