import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Swal from 'sweetalert2';
import { auth, db } from '../../firebase';
import GoogleAuth from './GoogleAuth';
import PhoneAuth from './PhoneAuth';
import '../../styles/Auth.css';

const Login = () => {
  const [user, loading] = useAuthState(auth);
  const [authMethod, setAuthMethod] = useState('google');
  const [checkingAccess, setCheckingAccess] = useState(false);

  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user) return;

      setCheckingAccess(true);

      try {
        // 1. Check if user exists in the 'users' collection (Whitelist)
        // We assume you have manually added your staff here previously
        // or the Admin adds them.
        
        // Strategy: We check if a doc exists with their Email or Phone
        // Note: For this to work, your database must have a 'users' collection
        // where the document ID is the email or phone, OR a field matches.
        
        // Simple approach: Check if their UID is known, or just allow Admin for now
        // For a simple whitelist, let's look for their email/phone in a 'allowed_users' collection
        // OR simpler: Check if they have a 'role' assigned in your main user database.

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        // CHECK 1: If user does not exist in DB at all -> DENY
        // (This means the Admin hasn't created their profile yet)
        if (!userSnap.exists()) {
           // EXCEPTION: Allow the main Admin Email to get in to set things up
           const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL || 'kekanaletago58@gmail.com';
           if (user.email === ADMIN_EMAIL) {
             // Allow admin, logic continues...
           } else {
             throw new Error('Access Denied. You are not a registered staff member.');
           }
        } else {
            // CHECK 2: Check if account is active/enabled (optional extra security)
            const userData = userSnap.data();
            if (userData.status === 'disabled') {
                throw new Error('Your account has been disabled by the Administrator.');
            }
        }
        
        // If we get here, they are allowed.
        setCheckingAccess(false);

      } catch (error) {
        console.error("Access Check Failed:", error);
        
        // Force Logout
        await signOut(auth);
        
        Swal.fire({
          icon: 'error',
          title: 'Access Denied',
          text: error.message || 'You are not authorized to use this app.',
          confirmButtonColor: '#d33'
        });
        setCheckingAccess(false);
      }
    };

    if (user && !loading) {
      checkUserAccess();
    }
  }, [user, loading]);

  // Loading State
  if (loading || checkingAccess) {
    return (
      <div className="login-container">
        <div className="loading-spinner">Verifying Access...</div>
      </div>
    );
  }

  // If user is authenticated and authorized, App.js handles the redirect to Dashboard
  // This component only renders if NO user is logged in.
  if (user) return null; 

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="app-logo">
          <span className="logo-icon">🥚</span>
          <h1>Egg Stock Control</h1>
        </div>
        
        <p className="app-description">
          Authorized Staff Access Only
        </p>

        <div className="auth-methods">
          <div className="auth-method-tabs">
            <button 
              className={`method-tab ${authMethod === 'google' ? 'active' : ''}`}
              onClick={() => setAuthMethod('google')}
            >
              <span className="tab-icon">G</span>
              Google
            </button>
            <button 
              className={`method-tab ${authMethod === 'phone' ? 'active' : ''}`}
              onClick={() => setAuthMethod('phone')}
            >
              <span className="tab-icon">📱</span>
              Phone
            </button>
          </div>

          <div className="auth-content">
            {authMethod === 'google' ? (
              <GoogleAuth />
            ) : (
              <PhoneAuth />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;