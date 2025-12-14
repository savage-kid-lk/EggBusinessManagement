import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { FcGoogle } from 'react-icons/fc';
import Swal from 'sweetalert2';
import { auth, googleProvider } from '../../firebase';
import '../../styles/Auth.css';

const GoogleAuth = () => {
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      Swal.fire({
        icon: 'success',
        title: 'Welcome!',
        text: `Signed in as ${user.email}`,
        timer: 2000
      });
      
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      let errorMessage = 'Failed to sign in with Google';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in popup was closed';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Check your connection.';
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Sign-in Failed',
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
        Recommended: Use your Google account for secure access
      </p>
    </div>
  );
};

export default GoogleAuth;