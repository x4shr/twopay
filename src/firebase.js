
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlCWHXHa04L3dY-hivvGMjr6HuJPfVPho",
  authDomain: "twopay-2ae0a.firebaseapp.com",
  projectId: "twopay-2ae0a",
  storageBucket: "twopay-2ae0a.firebasestorage.app",
  messagingSenderId: "956160907678",
  appId: "1:956160907678:web:e12dddeeb7ba23442c9e8f"
};

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)