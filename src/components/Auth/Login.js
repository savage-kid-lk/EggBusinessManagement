import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import GoogleAuth from './GoogleAuth';
import PhoneAuth from './PhoneAuth';
import '../../styles/Auth.css';

const Login = () => {
  const [user] = useAuthState(auth);
  const [authMethod, setAuthMethod] = useState('google');

  if (user) {
    return null;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="app-logo">
          <span className="logo-icon">🥚</span>
          <h1>Egg Stock Control</h1>
        </div>
        
        <p className="app-description">
          Manage your egg sales, stock, and cash flow in real-time
        </p>

        <div className="auth-methods">
          <div className="auth-method-tabs">
            <button 
              className={`method-tab ${authMethod === 'google' ? 'active' : ''}`}
              onClick={() => setAuthMethod('google')}
            >
              <span className="tab-icon">G</span>
              Google Sign-in
            </button>
            <button 
              className={`method-tab ${authMethod === 'phone' ? 'active' : ''}`}
              onClick={() => setAuthMethod('phone')}
            >
              <span className="tab-icon">📱</span>
              Phone Sign-in
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

        <div className="app-features">
          <h3>Features:</h3>
          <ul>
            <li>✅ Real-time stock tracking</li>
            <li>✅ Special pricing with expiration dates</li>
            <li>✅ Daily automated reports at 23:59</li>
            <li>✅ Color-coded sales by user</li>
            <li>✅ Google & Phone authentication</li>
            <li>✅ Secure Firebase backend</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;