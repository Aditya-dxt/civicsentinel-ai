import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA7oK3FFKuRzs-NVTqd5Tfrfaj8WPy20qw",
  authDomain: "civicsentinel-5f761.firebaseapp.com",
  projectId: "civicsentinel-5f761",
  storageBucket: "civicsentinel-5f761.firebasestorage.app",
  messagingSenderId: "1021671389716",
  appId: "1:1021671389716:web:93f85498e9724cac708501",
  measurementId: "G-594J7ZJK4K"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();