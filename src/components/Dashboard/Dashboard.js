import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import database from '../../services/database';
import SalesEntry from './SalesEntry';
import StockControl from './StockControl';
import PriceManagement from './PriceManagement';
import DailyReports from './DailyReports';
import UserManagement from './UserManagement'; // <--- IMPORT THIS
import Header from '../Layout/Header';
import '../../styles/Dashboard.css';

const Dashboard = () => {
  const [user] = useAuthState(auth);
  const [inventory, setInventory] = useState({ stock: 0 });
  const [todaySales, setTodaySales] = useState([]);
  const [activeTab, setActiveTab] = useState('sales');
  const [loading, setLoading] = useState(true);

  // You can set multiple admins here or fetch from DB role
  const ADMIN_EMAIL = process.env.REACT_APP_ADMIN_EMAIL || 'kekanaletago58@gmail.com';
  const isAdmin = user?.email === ADMIN_EMAIL;
  const userColor = isAdmin ? '#4CAF50' : '#FF9800';

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        setLoading(true);
        const stock = await database.getCurrentStock();
        setInventory({ stock });
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    const unsubInv = database.listenToInventory(setInventory);
    const unsubSales = database.listenToTodaySales(setTodaySales);
    return () => { unsubInv(); unsubSales(); };
  }, [user]);

  if (!user) { window.location.href = '/'; return null; }
  if (loading) return <div className="loading-screen">Loading...</div>;

  const todayTotalRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="dashboard">
      <Header user={user} userColor={userColor} />
      
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

          {isAdmin && (
            <>
              <button className={`nav-btn ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>
                📦 Stock
              </button>
              <button className={`nav-btn ${activeTab === 'prices' ? 'active' : ''}`} onClick={() => setActiveTab('prices')}>
                🏷️ Prices
              </button>
              {/* NEW TAB FOR USERS */}
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
          
          {/* NEW USER MANAGEMENT COMPONENT */}
          {isAdmin && activeTab === 'users' && <UserManagement />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;