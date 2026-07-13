import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBU0vnY8f8yALba0Na4ZQnQAfya4zeitRI",
  authDomain: "cleanmax-dashboard.firebaseapp.com",
  projectId: "cleanmax-dashboard",
  storageBucket: "cleanmax-dashboard.firebasestorage.app",
  messagingSenderId: "274045208324",
  appId: "1:274045208324:web:05539f3f109400ea91b251"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
