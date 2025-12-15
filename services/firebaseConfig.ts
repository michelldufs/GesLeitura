// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const storage = getStorage(app);

// Helper for secondary auth (used by adminService for user creation)
const getSecondaryAuth = () => {
  const secondaryAppName = "SecondaryApp";
  let secondaryApp = getApps().find(app => app.name === secondaryAppName);
  if (!secondaryApp) {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  }
  return getAuth(secondaryApp);
};

export { app, auth, db, functions, storage, getSecondaryAuth };