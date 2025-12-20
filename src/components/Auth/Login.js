import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import GoogleAuth from './GoogleAuth';
import PhoneAuth from './PhoneAuth';
import '../../styles/Auth.css';

const Login = () => {
  const [user, loading] = useAuthState(auth);
  const [authMethod, setAuthMethod] = useState('google');

  // Loading State
  if (loading) {
    return (
      <div className="login-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  // If user is authenticated, they shouldn't see this screen 
  // (App.js handles redirect to dashboard)
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