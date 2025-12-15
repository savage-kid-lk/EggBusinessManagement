import React, { useEffect, useState } from 'react';
import { 
  signInWithRedirect, 
  getRedirectResult 
} from 'firebase/auth';
import { FcGoogle } from 'react-icons/fc';
import Swal from 'sweetalert2';
import { auth, googleProvider } from '../../firebase';
import '../../styles/Auth.css';

const GoogleAuth = () => {
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Check for errors when the user returns from Google
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        await getRedirectResult(auth);
        // Note: We don't need to handle success here explicitly 
        // because Login.js detects the 'user' state change 
        // and runs the security whitelist check automatically.
      } catch (error) {
        console.error('Redirect Login Error:', error);
        setIsRedirecting(false);
        
        let msg = 'Login Failed';
        if (error.code === 'auth/network-request-failed') msg = 'Network Error. Check your connection.';
        if (error.code === 'auth/user-disabled') msg = 'This account has been disabled.';
        
        Swal.fire({
          icon: 'error',
          title: 'Login Error',
          text: msg
        });
      }
    };

    handleRedirectResult();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsRedirecting(true);
    try {
      // This will navigate away from your page to Google
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      console.error("Redirect Init Error:", error);
      setIsRedirecting(false);
      Swal.fire('Error', 'Could not connect to Google', 'error');
    }
  };

  return (
    <div className="google-auth">
      <button 
        onClick={handleGoogleSignIn}
        className="google-signin-btn"
        disabled={isRedirecting}
      >
        <FcGoogle size={24} />
        <span>
          {isRedirecting ? 'Redirecting to Google...' : 'Sign in with Google'}
        </span>
      </button>
      
      <p className="auth-note">
        Only authorized staff emails can access the dashboard.
      </p>
    </div>
  );
};

export default GoogleAuth;