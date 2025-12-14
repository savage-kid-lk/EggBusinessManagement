import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import '../../styles/Header.css';

const Header = ({ user, userColor }) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserInitial = () => {
    if (user.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="dashboard-header">
      <div className="header-content">
        <div className="header-left">
          <div className="header-logo">
            <span className="logo-small">🥚</span>
            <h1>Egg Stock Control</h1>
          </div>
        </div>
        
        <div className="user-info">
          <div className="user-avatar">
            {getUserInitial()}
          </div>
          <div className="user-details">
            <h3>{user.displayName || user.email}</h3>
            <p style={{ color: userColor }}>
              {user.email === (process.env.REACT_APP_ADMIN_EMAIL || 'kekanaletago58@gmail.com') ? 'Admin' : 'Assistant'}
            </p>
          </div>
          <div 
            className="user-color" 
            style={{ backgroundColor: userColor }}
            title="Your sales color"
          ></div>
          <button 
            onClick={handleSignOut}
            className="signout-btn"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;