import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import database from '../../services/database';
import SalesEntry from './SalesEntry';
import StockControl from './StockControl';
import PriceManagement from './PriceManagement';
import DailyReports from './DailyReports';
import Header from '../Layout/Header';
import '../../styles/Dashboard.css';

const Dashboard = () => {
  const [user] = useAuthState(auth);
  const [inventory, setInventory] = useState({ stock: 0 });
  const [todaySales, setTodaySales] = useState([]);
  const [activeTab, setActiveTab] = useState('sales');
  const [loading, setLoading] = useState(true);

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
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const unsubscribeInventory = database.listenToInventory(setInventory);
    const unsubscribeSales = database.listenToTodaySales(setTodaySales);

    return () => {
      unsubscribeInventory();
      unsubscribeSales();
    };
  }, [user]);

  if (!user) {
    window.location.href = '/';
    return null;
  }

  if (loading) return <div className="loading-screen">Loading...</div>;

  const todayTotalSales = todaySales.reduce((sum, sale) => sum + sale.quantity, 0);
  const todayTotalRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="dashboard">
      <Header user={user} userColor={userColor} />
      
      <div className="dashboard-container">
        <div className="stats-overview">
          <div className="stat-card" style={{ borderColor: userColor }}>
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <h3>Stock</h3>
              <p className="stat-value">{inventory.stock}</p>
              <p className="stat-label">Trays available</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🇿🇦</div>
            <div className="stat-info">
              <h3>Revenue</h3>
              <p className="stat-value">R {todayTotalRevenue.toFixed(2)}</p>
              <p className="stat-label">Today's Income</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <h3>Sales</h3>
              <p className="stat-value">{todayTotalSales}</p>
              <p className="stat-label">Trays sold</p>
            </div>
          </div>
        </div>

        <div className="dashboard-nav">
          <button className={`nav-btn ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
            💳 Sell Trays
          </button>
          
          {isAdmin && (
            <>
              <button className={`nav-btn ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>
                📦 Stock
              </button>
              <button className={`nav-btn ${activeTab === 'prices' ? 'active' : ''}`} onClick={() => setActiveTab('prices')}>
                🏷️ Prices
              </button>
            </>
          )}
          
          <button className={`nav-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            📊 Reports
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'sales' && (
            <SalesEntry user={user} currentStock={inventory.stock} userColor={userColor} />
          )}
          
          {activeTab === 'stock' && isAdmin && (
            <StockControl 
              currentStock={inventory.stock} 
              onStockUpdate={(newStock) => setInventory({ ...inventory, stock: newStock })} 
            />
          )}
          
          {activeTab === 'prices' && isAdmin && <PriceManagement />}
          
          {activeTab === 'reports' && <DailyReports isAdmin={isAdmin} />}
        </div>

        <div className="recent-activity">
          <h3>Today's Activity Feed</h3>
          <div className="activity-list">
            {todaySales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="activity-item" style={{ borderLeftColor: sale.userColor || '#666' }}>
                <div className="activity-header">
                  <span className="activity-user">{sale.userName}</span>
                  <span className="activity-time">
                    {sale.date?.toDate ? sale.date.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="activity-details">
                  <span>{sale.quantity} trays × R {sale.price?.toFixed(2)}</span>
                  <span className="activity-total">R {sale.total?.toFixed(2)}</span>
                </div>
                {sale.isBulk && <span className="special-badge" style={{background:'#2196F3'}}>Bulk</span>}
                {sale.isSpecialPrice && !sale.isBulk && <span className="special-badge">Special</span>}
              </div>
            ))}
             {todaySales.length === 0 && <p className="no-activity">No sales today yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;