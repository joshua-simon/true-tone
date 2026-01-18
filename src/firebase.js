// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDYCXOBscbqnIhtBGuzzvUxPa2D8Sl-_F4",
  authDomain: "true-tone-842df.firebaseapp.com",
  projectId: "true-tone-842df",
  storageBucket: "true-tone-842df.firebasestorage.app",
  messagingSenderId: "804719541391",
  appId: "1:804719541391:web:35ef8df80a331cc8a384fa",
  measurementId: "G-8SCNKE6D43"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
const analytics = getAnalytics(app);
