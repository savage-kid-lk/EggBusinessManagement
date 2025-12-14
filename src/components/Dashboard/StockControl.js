import React, { useState } from 'react';
import database from '../../services/database';
import Swal from 'sweetalert2';
import '../../styles/StockControl.css';

const StockControl = ({ currentStock, onStockUpdate }) => {
  const [newStock, setNewStock] = useState(currentStock);
  const [loading, setLoading] = useState(false);

  const handleUpdateStock = async () => {
    if (newStock < 0) {
      Swal.fire('Error', 'Stock cannot be negative', 'error');
      return;
    }
    try {
      setLoading(true);
      await database.updateStock(newStock);
      Swal.fire({
        icon: 'success',
        title: 'Stock Updated!',
        text: `Stock has been updated to ${newStock} Trays`,
        timer: 1500
      });
      if (onStockUpdate) onStockUpdate(newStock);
    } catch (error) {
      Swal.fire('Error', 'Failed to update stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stock-control">
      <h2>Stock Management</h2>
      <div className="stock-info">
        <div className="current-stock">
          <span className="label">Current Stock:</span>
          <span className="value">{currentStock} Trays</span>
        </div>
      </div>
      
      <div className="stock-form">
        <div className="form-group">
          <label>Set Total Trays in Stock</label>
          <div className="stock-input-group">
            <button className="stock-btn minus" onClick={() => setNewStock(p => Math.max(0, p - 1))}>-</button>
            <input
              type="number"
              min="0"
              value={newStock}
              onChange={(e) => setNewStock(Math.max(0, parseInt(e.target.value) || 0))}
              className="stock-input"
            />
            <button className="stock-btn plus" onClick={() => setNewStock(p => p + 1)}>+</button>
          </div>
        </div>
        <button onClick={handleUpdateStock} disabled={loading} className="update-stock-btn">
          {loading ? 'Updating...' : 'Update Stock'}
        </button>
      </div>
    </div>
  );
};

export default StockControl;