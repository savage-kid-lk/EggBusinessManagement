import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '../../firebase'; // Import auth and db
import database from '../../services/database';
import SalesEntry from './SalesEntry';
import StockControl from './StockControl';
import PriceManagement from './PriceManagement';
import DailyReports from './DailyReports';
import UserManagement from './UserManagement';
import Header from '../Layout/Header';
import '../../styles/Dashboard.css';

const Dashboard = () => {
  const [user] = useAuthState(auth);
  const [inventory, setInventory] = useState({ stock: 0 });
  const [todaySales, setTodaySales] = useState([]);
  const [activeTab, setActiveTab] = useState('sales');
  
  // NEW: State to hold admin status fetched from DB
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  // Determine color based on the state
  const userColor = isAdmin ? '#4CAF50' : '#FF9800';

  // 1. NEW EFFECT: Check User Role in Database
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) return;

      try {
        // Keep hardcoded access for the main dev email as a fallback/super-admin
        if (user.email === 'kekanaletago58@gmail.com') {
          setIsAdmin(true);
        }

        // Query the database for the user's role
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', user.email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          // If database says admin, grant access
          if (userData.role === 'admin') {
            setIsAdmin(true);
          }
        }
      } catch (error) {
        console.error("Error verifying admin role:", error);
      } finally {
        setIsRoleLoading(false);
      }
    };

    checkUserRole();
  }, [user]);

  // 2. Existing Data Loading
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const stock = await database.getCurrentStock();
        setInventory({ stock });
      } catch (error) {
        console.error('Error:', error);
      }
    };
    loadData();
    const unsubInv = database.listenToInventory(setInventory);
    const unsubSales = database.listenToTodaySales(setTodaySales);
    return () => { unsubInv(); unsubSales(); };
  }, [user]);

  if (!user) { window.location.href = '/'; return null; }
  
  // Optional: Show simple loading while checking role to prevent flickering
  if (isRoleLoading) return <div className="loading-screen">Loading...</div>;

  const todayTotalRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="dashboard">
      {/* Pass isAdmin to Header */}
      <Header user={user} userColor={userColor} isAdmin={isAdmin} />
      
      <div className="dashboard-container">
        {/* STATS AREA */}
        <div className="stats-overview">
          <div className="stat-card" style={{borderColor: userColor}}>
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <h3>Stock</h3>
              <p className="stat-value">{inventory.stock}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🇿🇦</div>
            <div className="stat-info">
              <h3>Revenue</h3>
              <p className="stat-value">R {todayTotalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <div className="dashboard-nav">
          <button className={`nav-btn ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
            💳 Sales
          </button>
          
          <button className={`nav-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            📊 Reports
          </button>

          {/* DYNAMIC ADMIN TABS: Shows if database role is admin */}
          {isAdmin && (
            <>
              <button className={`nav-btn ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>
                📦 Stock
              </button>
              <button className={`nav-btn ${activeTab === 'prices' ? 'active' : ''}`} onClick={() => setActiveTab('prices')}>
                🏷️ Prices
              </button>
              <button className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                👥 Users
              </button>
            </>
          )}
        </div>

        {/* CONTENT AREA */}
        <div className="tab-content">
          {activeTab === 'sales' && <SalesEntry user={user} currentStock={inventory.stock} userColor={userColor} />}
          {activeTab === 'reports' && <DailyReports isAdmin={isAdmin} />}
          
          {isAdmin && activeTab === 'stock' && (
            <StockControl currentStock={inventory.stock} onStockUpdate={(newStock) => setInventory({ ...inventory, stock: newStock })} />
          )}
          {isAdmin && activeTab === 'prices' && <PriceManagement />}
          {isAdmin && activeTab === 'users' && <UserManagement />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;