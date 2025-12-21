import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  deleteUser, 
  signOut
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// 1. SECURE GOOGLE LOGIN
const signInWithGoogleSecure = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", user.email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      await deleteUser(user).catch((err) => console.error("Cleanup error:", err));
      await signOut(auth);
      throw new Error("ACCESS DENIED: Your email is not registered in the database.");
    }

    return user;
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Login cancelled");
    }
    throw error;
  }
};

// 2. CHECK PHONE NUMBER (Pre-SMS Check)
// 🛡️ This function is critical. It normalizes the input and checks the DB.
const checkPhoneAllowed = async (phoneNumber) => {
  try {
    const usersRef = collection(db, "users");
    
    // Query the 'phone' field (matches your screenshot)
    const q = query(usersRef, where("phone", "==", phoneNumber));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("ACCESS DENIED: This phone number is not authorized.");
    }
    return true;
  } catch (error) {
    throw error;
  }
};

// 3. POST-SMS SECURITY
const verifyOtpSecure = async (confirmationResult, otpCode) => {
  try {
    const result = await confirmationResult.confirm(otpCode);
    const user = result.user;

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("phone", "==", user.phoneNumber));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      await deleteUser(user).catch(() => signOut(auth));
      throw new Error("ACCESS DENIED: Authorization check failed.");
    }
    return user;
  } catch (error) {
    throw error;
  }
}

export { 
  app, 
  auth, 
  db, 
  storage,
  googleProvider, 
  signInWithGoogleSecure, 
  checkPhoneAllowed, 
  verifyOtpSecure 
};