import React, { useState, useEffect } from 'react';
import database from '../../services/database';
import Swal from 'sweetalert2';
import '../../styles/SalesEntry.css';

const SalesEntry = ({ user, currentStock, userColor }) => {
  const [quantity, setQuantity] = useState(1);
  const [basePrice, setBasePrice] = useState(60); // Default standard
  const [priceInfo, setPriceInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [recentSales, setRecentSales] = useState([]);

  useEffect(() => {
    loadPriceData();
  }, []);

  const loadPriceData = async () => {
    const info = await database.getCurrentBasePrice();
    setBasePrice(info.price);
    setPriceInfo(info);
  };

  // Calculate price dynamically based on quantity
  const calculateTotal = () => {
    const pricePerTray = quantity >= 20 ? 55.00 : basePrice;
    return quantity * pricePerTray;
  };

  const currentEffectivePrice = quantity >= 20 ? 55.00 : basePrice;

  const handleSale = async () => {
    if (quantity < 1) {
      Swal.fire('Error', 'Please enter a valid quantity', 'error');
      return;
    }
    if (quantity > currentStock) {
      Swal.fire('Stock Error', `Only ${currentStock} trays available`, 'error');
      return;
    }

    try {
      setLoading(true);
      const result = await database.recordSale({ quantity }, user);
      
      setRecentSales(prev => [{
        ...result,
        timestamp: new Date()
      }, ...prev.slice(0, 4)]);
      
      Swal.fire({
        icon: 'success',
        title: 'Sale Recorded!',
        html: `
          <div style="text-align: center;">
            <p><strong>${quantity} Trays Sold</strong></p>
            <p>Price: R ${result.price.toFixed(2)} / tray</p>
            <p>Total: R ${result.total.toFixed(2)}</p>
            <p style="font-size: 0.9em; color: #666;">New stock: ${result.newStock} trays</p>
          </div>
        `,
        timer: 2500
      });
      
      setQuantity(1);
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const quickQuantities = [1, 2, 3, 4, 5, 20];

  return (
    <div className="sales-entry">
      <div className="sales-card">
        <h2>Record Sales (Trays)</h2>
        
        {/* Price Indicator */}
        <div className={`price-banner ${quantity >= 20 ? 'bulk-active' : ''}`}>
          {quantity >= 20 ? (
            <>
              <span className="tag bulk">⚡ BULK PRICE APPLIED</span>
              <span className="price">R 55.00 <small>/ tray</small></span>
            </>
          ) : (
            <>
              <span className="tag standard">
                {priceInfo.isSpecial ? '🎯 SPECIAL PRICE' : '📌 STANDARD PRICE'}
              </span>
              <span className="price">R {basePrice.toFixed(2)} <small>/ tray</small></span>
            </>
          )}
        </div>
        
        <div className="stock-warning">
          <span>In Stock: </span>
          <span className={`stock-count ${currentStock < 10 ? 'low' : ''}`}>
            {currentStock} Trays
          </span>
        </div>
        
        <div className="quantity-section">
          <label>Number of Trays</label>
          <div className="quick-buttons">
            {quickQuantities.map(qty => (
              <button
                key={qty}
                className={`quick-btn ${quantity === qty ? 'active' : ''} ${qty === 20 ? 'bulk-btn' : ''}`}
                onClick={() => setQuantity(qty)}
                disabled={qty > currentStock}
              >
                {qty} {qty === 20 ? '(Bulk)' : ''}
              </button>
            ))}
          </div>
          
          <div className="quantity-control">
            <button className="qty-btn" onClick={() => setQuantity(p => Math.max(1, p - 1))}>-</button>
            <input
              type="number"
              min="1"
              max={currentStock}
              value={quantity}
              onChange={(e) => setQuantity(Math.min(currentStock, Math.max(1, parseInt(e.target.value) || 1)))}
              className="quantity-input"
            />
            <button className="qty-btn" onClick={() => setQuantity(p => Math.min(currentStock, p + 1))}>+</button>
          </div>
        </div>
        
        <div className="sale-summary">
          <div className="summary-row">
            <span>Rate Applied:</span>
            <span>R {currentEffectivePrice.toFixed(2)}</span>
          </div>
          <div className="summary-row total">
            <span>Total to Pay:</span>
            <span className="total-amount">R {calculateTotal().toFixed(2)}</span>
          </div>
        </div>
        
        <button 
          onClick={handleSale}
          disabled={loading || currentStock === 0}
          className="sale-btn"
          style={{ backgroundColor: userColor }}
        >
          {loading ? 'Processing...' : `Confirm Sale (R ${calculateTotal().toFixed(2)})`}
        </button>
      </div>
      
      <div className="recent-sales">
        <h3>Session History</h3>
        {recentSales.map((sale, index) => (
          <div key={index} className="recent-sale" style={{ borderLeftColor: userColor }}>
            <div className="sale-info">
              <span className="sale-quantity">{sale.quantity} Trays</span>
              <span className="sale-time">
                {sale.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="sale-amount">
              R {sale.total.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesEntry;