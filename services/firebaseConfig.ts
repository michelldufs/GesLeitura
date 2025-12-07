import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQwWOT8h-NJN4C_3j93otxpUGDLLPPLjY",
  authDomain: "gesleitura.firebaseapp.com",
  projectId: "gesleitura",
  storageBucket: "gesleitura.appspot.com",
  messagingSenderId: "369503909416",
  appId: "1:369503909416:web:f4165398ff62b92a5f271d",
  measurementId: "G-KW1Y4MPF8R"
};

// Initialize Firebase (primary app for user sessions)
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Secondary app for admin operations (creating users without affecting primary session)
let secondaryApp: FirebaseApp | null = null;
let secondaryAuth: Auth | null = null;

export function getSecondaryAuth(): Auth {
  if (!secondaryAuth) {
    secondaryApp = initializeApp(firebaseConfig, "Secondary");
    secondaryAuth = getAuth(secondaryApp);
  }
  return secondaryAuth;
}