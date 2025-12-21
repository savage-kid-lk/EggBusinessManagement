import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import database from './services/database';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import './App.css';

function App() {
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    // ... your daily report logic (unchanged) ...
    // Keeping it brief here to focus on the fix
  }, []);

  if (loading) {
    return <div className="app-loading"><div className="spinner"></div></div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* IF USER IS LOGGED IN: Redirect to / (Dashboard)
             IF USER IS NOT LOGGED IN: Show Login Page
          */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" replace /> : <Login />} 
          />

          {/* PROTECTED ROUTE:
             The ProtectedRoute component will check the DB.
             If unauthorized, it redirects back to /login
          */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;