import React, { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase'; // Adjust path if needed
import '../../styles/DailyReports.css';

const DailyReports = ({ isAdmin }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportData, setReportData] = useState({ 
    totalTrays: 0, 
    totalRevenue: 0, 
    totalProfit: 0,
    salesCount: 0, 
    breakdown: [] 
  });
  const [loading, setLoading] = useState(false);

  // COST CONFIGURATION
  const COST_PRICE_PER_TRAY = 40;

  useEffect(() => {
    setLoading(true);
    
    // Create date range for the selected date (00:00:00 to 23:59:59)
    const start = startOfDay(new Date(selectedDate));
    const end = endOfDay(new Date(selectedDate));

    // Listen to SALES collection directly for real-time updates
    const salesRef = collection(db, 'sales');
    const q = query(
      salesRef, 
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let trays = 0;
      let revenue = 0;
      let profit = 0;
      const salesList = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Calculate specifics for this sale
        const saleQuantity = data.quantity || 0;
        const saleRevenue = data.total || 0;
        const saleCost = saleQuantity * COST_PRICE_PER_TRAY;
        const saleProfit = saleRevenue - saleCost;

        // Add to running totals
        trays += saleQuantity;
        revenue += saleRevenue;
        profit += saleProfit;

        salesList.push({ 
          id: doc.id, 
          ...data,
          profit: saleProfit // Store individual profit for the table
        });
      });

      setReportData({
        totalTrays: trays,
        totalRevenue: revenue,
        totalProfit: profit,
        salesCount: snapshot.size,
        breakdown: salesList
      });
      setLoading(false);
    }, (error) => {
      console.error("Error fetching daily report:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  return (
    <div className="daily-reports">
      <div className="reports-header">
        <h2>📊 Daily Sales Reports</h2>
        <div className="date-selector">
          <label>Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
      </div>

      <div className="report-summary-cards">
        <div className="report-card">
          <h3>Total Revenue</h3>
          <div className="value">R {reportData.totalRevenue.toFixed(2)}</div>
        </div>
        
        <div className="report-card profit-card" style={{ backgroundColor: '#e8f5e9', borderColor: '#4CAF50' }}>
          <h3 style={{ color: '#2E7D32' }}>Net Profit</h3>
          <div className="value" style={{ color: '#2E7D32' }}>
            R {reportData.totalProfit.toFixed(2)}
          </div>
          <small style={{ color: '#666' }}>Margin: {reportData.totalRevenue > 0 ? ((reportData.totalProfit / reportData.totalRevenue) * 100).toFixed(1) : 0}%</small>
        </div>

        <div className="report-card">
          <h3>Trays Sold</h3>
          <div className="value">{reportData.totalTrays}</div>
        </div>
        
        <div className="report-card">
          <h3>Transactions</h3>
          <div className="value">{reportData.salesCount}</div>
        </div>
      </div>

      <div className="recent-reports">
        <h3>Detailed Breakdown ({selectedDate})</h3>
        {loading ? (
          <p>Loading data...</p>
        ) : reportData.breakdown.length === 0 ? (
          <div className="no-report">
            <p>No sales recorded for this date.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Staff</th>
                  <th>Qty (Trays)</th>
                  <th>Price Type</th>
                  <th>Revenue</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {reportData.breakdown.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      {sale.date?.toDate 
                        ? format(sale.date.toDate(), 'HH:mm') 
                        : 'N/A'}
                    </td>
                    <td>{sale.userName}</td>
                    <td>{sale.quantity}</td>
                    <td>
                      {sale.isBulk ? (
                        <span className="badge-bulk">Bulk (20+)</span>
                      ) : sale.isSpecialPrice ? (
                        <span className="badge-special">Special</span>
                      ) : (
                        <span className="badge-std">Standard</span>
                      )}
                    </td>
                    <td>R {sale.total.toFixed(2)}</td>
                    <td style={{ color: '#2E7D32', fontWeight: 'bold' }}>
                      R {sale.profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyReports;