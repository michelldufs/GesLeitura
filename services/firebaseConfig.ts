import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQwWOT8h-NJN4C_3j93otxpUGDLLPPLjY",
  authDomain: "gesleitura.firebaseapp.com",
  projectId: "gesleitura",
  storageBucket: "gesleitura.firebasestorage.app",
  messagingSenderId: "369503909416",
  appId: "1:369503909416:web:f4165398ff62b92a5f271d",
  measurementId: "G-KW1Y4MPF8R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);