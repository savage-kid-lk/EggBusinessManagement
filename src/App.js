import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import database from './services/database';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import ProtectedRoute from './components/Auth/ProtectedRoute'; // Your new Security Component
import './App.css';

function App() {
  const [user, loading] = useAuthState(auth);

  // --- DAILY REPORT SCHEDULING LOGIC (Preserved) ---
  useEffect(() => {
    const scheduleDailyReport = () => {
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(23, 59, 0, 0);
      
      let timeToTarget = targetTime.getTime() - now.getTime();
      
      if (timeToTarget < 0) {
        targetTime.setDate(targetTime.getDate() + 1);
        timeToTarget = targetTime.getTime() - now.getTime();
      }
      
      console.log(`Daily report scheduled in ${Math.round(timeToTarget / 60000)} minutes`);
      
      const timeout = setTimeout(async () => {
        try {
          console.log('Generating daily report...');
          // Note: This requires the user to be logged in/authorized 
          // if your database rules are strict.
          await database.generateDailyReport();
          scheduleDailyReport(); // Schedule next day
        } catch (error) {
          console.error('Error generating report:', error);
          setTimeout(scheduleDailyReport, 300000); // Retry in 5 minutes
        }
      }, timeToTarget);
      
      return timeout;
    };
    
    const timeoutId = scheduleDailyReport();
    
    // Cleanup on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading application...</p>
      </div>
    );
  }

  // --- SECURE ROUTING ---
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Route: Login 
             If user is already logged in, automatically send them to Dashboard (/)
          */}
          <Route 
            path="/login" 
            element={!user ? <Login /> : <Navigate to="/" />} 
          />

          {/* Protected Route: Dashboard 
             This is the secure area. ProtectedRoute checks the Database whitelist.
             If check fails, it kicks them back to login.
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