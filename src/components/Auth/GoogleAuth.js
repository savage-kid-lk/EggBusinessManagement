import React from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore'; // Firestore imports
import { FcGoogle } from 'react-icons/fc';
import Swal from 'sweetalert2';
import { auth, googleProvider, db } from '../../firebase';
import '../../styles/Auth.css';

const GoogleAuth = () => {
  const handleGoogleSignIn = async () => {
    try {
      // 1. Perform Google Login
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // 2. 🛡️ SECURITY CHECK: Verify Email in Database
      const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL || 'kekanaletago58@gmail.com';
      
      // Allow Admin to bypass check
      if (user.email !== ADMIN_EMAIL) {
        // Search 'users' collection for this email
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // USER NOT FOUND IN DATABASE
          await signOut(auth); // Kick them out immediately
          throw new Error('Access Denied: Your email is not whitelisted.');
        }
      }
      
      // 3. Success Message (Only if they passed the check)
      Swal.fire({
        icon: 'success',
        title: 'Welcome!',
        text: `Signed in as ${user.email}`,
        timer: 2000
      });
      
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      let errorMessage = 'Failed to sign in';
      if (error.message.includes('Access Denied')) {
        errorMessage = error.message;
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in cancelled';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Check connection.';
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: errorMessage
      });
    }
  };

  return (
    <div className="google-auth">
      <button 
        onClick={handleGoogleSignIn}
        className="google-signin-btn"
      >
        <FcGoogle size={24} />
        <span>Sign in with Google</span>
      </button>
      
      <p className="auth-note">
        Only authorized staff emails can access the dashboard.
      </p>
    </div>
  );
};

export default GoogleAuth;