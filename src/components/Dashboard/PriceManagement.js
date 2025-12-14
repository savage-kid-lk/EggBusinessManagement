import React, { useState, useEffect } from 'react';
import database from '../../services/database';
import Swal from 'sweetalert2';
import '../../styles/PriceManagement.css';

const PriceManagement = () => {
  const [standardPrice, setStandardPrice] = useState('');
  const [specialPrice, setSpecialPrice] = useState('');
  const [specialName, setSpecialName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPriceInfo, setCurrentPriceInfo] = useState(null);

  useEffect(() => { loadCurrentPrice(); }, []);

  const loadCurrentPrice = async () => {
    const priceInfo = await database.getCurrentBasePrice();
    setCurrentPriceInfo(priceInfo);
    setStandardPrice(priceInfo.price.toString());
  };

  const handleSetStandardPrice = async () => {
    try {
      setLoading(true);
      await database.setStandardPrice(standardPrice);
      Swal.fire('Success', `Standard price set to R ${parseFloat(standardPrice).toFixed(2)}`, 'success');
      await loadCurrentPrice();
    } catch (error) {
      Swal.fire('Error', 'Failed', 'error');
    } finally { setLoading(false); }
  };

  const handleCreateSpecialPrice = async () => {
    if (new Date(endDate) <= new Date(startDate)) {
      Swal.fire('Error', 'End date must be after start date', 'error');
      return;
    }
    try {
      setLoading(true);
      await database.createSpecialPrice({
        price: parseFloat(specialPrice),
        name: specialName,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });
      Swal.fire('Success', 'Special price created', 'success');
      setSpecialPrice(''); setSpecialName(''); setStartDate(''); setEndDate('');
      await loadCurrentPrice();
    } catch (error) {
      Swal.fire('Error', 'Failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="price-management">
      <h2>Price Settings (Per Tray)</h2>
      
      <div className="current-price-info">
        <h3>System Pricing Status</h3>
        {currentPriceInfo && (
          <div className={`price-display-card ${currentPriceInfo.isSpecial ? 'special' : 'standard'}`}>
            <div className="price-type">
              {currentPriceInfo.isSpecial ? '🎯 Special Active' : '📌 Standard Active'}
            </div>
            <div className="price-details">
              <span className="price-name">{currentPriceInfo.name}</span>
              <span className="price-value">R {currentPriceInfo.price.toFixed(2)}</span>
            </div>
            <div className="bulk-note" style={{marginTop:'10px', fontSize:'0.9rem', color:'#555'}}>
              <em>Note: Bulk price (20+ trays) is fixed at R 55.00</em>
            </div>
          </div>
        )}
      </div>
      
      <div className="price-forms">
        <div className="standard-price-form">
          <h3>Set Standard Price</h3>
          <div className="form-group">
            <label>Price per Tray (R)</label>
            <input type="number" value={standardPrice} onChange={(e) => setStandardPrice(e.target.value)} placeholder="60.00" />
          </div>
          <button onClick={handleSetStandardPrice} disabled={loading} className="set-price-btn">Update Standard</button>
        </div>
        
        <div className="special-price-form">
          <h3>Schedule Special Price</h3>
          <input type="text" placeholder="Promo Name" value={specialName} onChange={(e) => setSpecialName(e.target.value)} className="name-input" />
          <input type="number" placeholder="Price (R)" value={specialPrice} onChange={(e) => setSpecialPrice(e.target.value)} className="price-input" />
          <div className="date-group">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button onClick={handleCreateSpecialPrice} disabled={loading} className="create-special-btn">Create Promo</button>
        </div>
      </div>
    </div>
  );
};

export default PriceManagement;