import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import Swal from 'sweetalert2';
import { signInWithGoogleSecure } from '../../firebase'; // Import our new secure function
import '../../styles/Auth.css';

const GoogleAuth = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // This single line handles the Popup, DB Check, and Auto-Delete if unauthorized
      await signInWithGoogleSecure();
      
      Swal.fire({
        icon: 'success',
        title: 'Welcome!',
        text: 'Access Granted',
        timer: 1500,
        showConfirmButton: false
      });
      
    } catch (error) {
      console.error('Login Error:', error);
      
      let errorMessage = error.message;
      // Make Firebase errors user-friendly
      if (error.message.includes('ACCESS DENIED')) {
        errorMessage = "You are not authorized to access this application.";
      }

      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="google-auth">
      <button 
        onClick={handleGoogleSignIn}
        className="google-signin-btn"
        disabled={loading}
      >
        <FcGoogle size={24} />
        <span>{loading ? 'Verifying Access...' : 'Sign in with Google'}</span>
      </button>
      
      <p className="auth-note">
        Only authorized staff emails can access the dashboard.
      </p>
    </div>
  );
};

export default GoogleAuth;