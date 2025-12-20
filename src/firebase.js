import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  PhoneAuthProvider, 
  signInWithPopup,
  deleteUser, // Crucial for security cleanup
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

// --- 🛡️ SECURITY FUNCTION 1: Secure Google Login ---
// Checks DB immediately after Google returns. If not authorized, deletes the account.
const signInWithGoogleSecure = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // QUERY: Check if this email exists in 'users' collection
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", user.email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // 🚫 UNAUTHORIZED: Delete the user immediately from Firebase Auth
      await deleteUser(user).catch((err) => console.error("Cleanup error:", err));
      await signOut(auth); // Force sign out to be safe
      throw new Error("ACCESS DENIED: Your email is not registered in the staff database.");
    }

    // ✅ AUTHORIZED: Return user
    return user;

  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Login cancelled");
    }
    throw error;
  }
};

// --- 🛡️ SECURITY FUNCTION 2: Pre-SMS Phone Check ---
// Checks if the phone number is in the DB *BEFORE* sending the SMS.
const checkPhoneAllowed = async (phoneNumber) => {
  try {
    const usersRef = collection(db, "users");
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

// --- 🛡️ SECURITY FUNCTION 3: Post-SMS Verification Check ---
// A final safety check after they enter the code (in case they bypassed step 2)
const verifyOtpSecure = async (confirmationResult, otpCode) => {
  try {
    // 1. Confirm OTP with Firebase
    const result = await confirmationResult.confirm(otpCode);
    const user = result.user;

    // 2. Double-check Database
    const usersRef = collection(db, "users");
    // Note: Ensure your DB phone numbers match the format (e.g., +27...)
    const q = query(usersRef, where("phone", "==", user.phoneNumber));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // 🚫 UNAUTHORIZED: Delete user
      await deleteUser(user).catch(() => signOut(auth));
      throw new Error("ACCESS DENIED: Authorization check failed.");
    }

    return user;
  } catch (error) {
    console.error('Secure verify error:', error);
    throw error;
  }
}

export { 
  app, 
  auth, 
  db, 
  storage,
  googleProvider, 
  signInWithGoogleSecure, // Export secure google
  checkPhoneAllowed,      // Export secure phone check
  verifyOtpSecure         // Export secure verify
};