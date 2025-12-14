import React, { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import database from './services/database';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import './App.css';

function App() {
  const [user, loading] = useAuthState(auth);

  // Setup daily report at 23:59
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

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading application...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {user ? <Dashboard /> : <Login />}
    </div>
  );
}

export default App;