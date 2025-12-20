import React, { useState } from 'react';
import { signInWithGoogleSecure } from '../../firebase'; // Keep using the secure function from before
import GoogleAuth from './GoogleAuth';
import PhoneAuth from './PhoneAuth';
import '../../styles/Auth.css';

const Login = () => {
  const [authMethod, setAuthMethod] = useState('google');

  // The ProtectedRoute in App.js will handle the redirect logic.
  // This component just displays the buttons.

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="app-logo">
          <span className="logo-icon">🥚</span>
          <h1>Egg Stock Control</h1>
        </div>
        <p className="app-description">Authorized Staff Access Only</p>

        <div className="auth-methods">
          <div className="auth-method-tabs">
            <button 
              className={`method-tab ${authMethod === 'google' ? 'active' : ''}`}
              onClick={() => setAuthMethod('google')}
            >
              Google
            </button>
            <button 
              className={`method-tab ${authMethod === 'phone' ? 'active' : ''}`}
              onClick={() => setAuthMethod('phone')}
            >
              Phone
            </button>
          </div>

          <div className="auth-content">
            {authMethod === 'google' ? <GoogleAuth /> : <PhoneAuth />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;