import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
        const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL || 'kekanaletago58@gmail.com';
        
        // 1. Check if it's the Master Admin (Always allow)
        if (user.email === ADMIN_EMAIL) {
          setCheckingAccess(false);
          return;
        }

        let isAuthorized = false;

        if (user.email) {
          // --- GOOGLE LOGIN CHECK ---
          // Look for this email in the 'users' collection
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            isAuthorized = true;
            // Optional: Check if disabled
            const userData = querySnapshot.docs[0].data();
            if (userData.status === 'disabled') throw new Error('Account disabled.');
          }
        } else if (user.phoneNumber) {
          // --- PHONE LOGIN CHECK ---
          // The PhoneAuth component does a pre-check, but we double-check here 
          // to be safe (e.g. if they were already logged in but removed from DB)
          const userDocRef = doc(db, 'allowed_numbers', user.phoneNumber);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            isAuthorized = true;
          }
        }

        if (!isAuthorized) {
          throw new Error('Access Denied. You are not on the authorized list.');
        }

        // Access Granted
        setCheckingAccess(false);

      } catch (error) {
        console.error("Access Check Failed:", error);
        
        // Force Logout immediately
        await signOut(auth);
        
        Swal.fire({
          icon: 'error',
          title: 'Access Denied',
          text: error.message,
          confirmButtonColor: '#d33'
        });
        setCheckingAccess(false);
      }
    };

    if (user && !loading) {
      checkUserAccess();
    }
  }, [user, loading]);

  // Loading State (while Redirecting or Verifying)
  if (loading || checkingAccess) {
    return (
      <div className="login-container">
        <div className="login-card" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'20px'}}>
          <div className="loading-spinner"></div>
          <p style={{color:'#666'}}>Verifying credentials...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and authorized, App.js handles the switch to Dashboard.
  // This component simply stops rendering to allow App.js to take over.
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