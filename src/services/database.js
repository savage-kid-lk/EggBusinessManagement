import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc, // Changed from updateDoc to setDoc for safety
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

class DatabaseService {
  constructor() {
    this.COLLECTIONS = {
      SETTINGS: 'settings',
      INVENTORY: 'inventory',
      SALES: 'sales',
      PRICES: 'prices',
      REPORTS: 'daily_reports',
      USERS: 'users',
      ALLOWED_NUMBERS: 'allowed_numbers'
    };
  }

  // 1. Get Current Price (Standard vs Special)
  async getCurrentBasePrice() {
    try {
      const today = new Date();
      
      // Check active specials
      const pricesRef = collection(db, this.COLLECTIONS.PRICES);
      const activeQuery = query(pricesRef, where('isActive', '==', true));
      const snapshot = await getDocs(activeQuery);
      
      let activeSpecialPrice = null;
      
      snapshot.docs.forEach(doc => {
        const priceData = doc.data();
        const startDate = priceData.startDate?.toDate();
        const endDate = priceData.endDate?.toDate();
        
        if (startDate && endDate && isWithinInterval(today, { start: startDate, end: endDate })) {
          activeSpecialPrice = { ...priceData, id: doc.id };
        }
      });
      
      if (activeSpecialPrice) {
        return {
          price: activeSpecialPrice.price,
          name: activeSpecialPrice.name,
          isSpecial: true,
          endDate: activeSpecialPrice.endDate.toDate()
        };
      }
      
      // Fallback to Standard
      const standardRef = doc(db, this.COLLECTIONS.SETTINGS, 'standard_price');
      const standardDoc = await getDoc(standardRef);
      
      if (standardDoc.exists()) {
        return {
          price: standardDoc.data().value,
          name: 'Standard Price',
          isSpecial: false
        };
      }
      
      // Default if nothing exists
      return { price: 60, name: 'Standard Price', isSpecial: false };
      
    } catch (error) {
      console.error('Error getting price:', error);
      return { price: 60, name: 'Standard Price', isSpecial: false };
    }
  }

  // 2. Record Sale (Auto-creates inventory if missing)
  async recordSale(saleData, user) {
    try {
      return await runTransaction(db, async (transaction) => {
        const quantity = saleData.quantity;
        
        // Price Logic
        let finalPricePerTray;
        let priceName;
        let isSpecial = false;
        let isBulk = false;

        if (quantity >= 20) {
          finalPricePerTray = 55.00;
          priceName = 'Bulk Discount (20+)';
          isBulk = true;
        } else {
          const basePriceInfo = await this.getCurrentBasePrice();
          finalPricePerTray = basePriceInfo.price;
          priceName = basePriceInfo.name;
          isSpecial = basePriceInfo.isSpecial;
        }
        
        const total = quantity * finalPricePerTray;
        
        // Inventory Check
        const inventoryRef = doc(db, this.COLLECTIONS.INVENTORY, 'current');
        const inventoryDoc = await transaction.get(inventoryRef);
        
        // FIX: Handle missing inventory document
        let currentStock = 0;
        let currentTotalSales = 0;
        let currentTotalRevenue = 0;

        if (inventoryDoc.exists()) {
          const data = inventoryDoc.data();
          currentStock = data.stock || 0;
          currentTotalSales = data.totalSales || 0;
          currentTotalRevenue = data.totalRevenue || 0;
        } else {
          // If doc doesn't exist, we assume 0 stock (or we could start at 0 and go negative if you prefer)
          console.warn("Inventory doc missing. Re-initializing.");
        }
        
        const newStock = currentStock - quantity;
        
        if (newStock < 0) {
          throw new Error(`Insufficient stock. Only ${currentStock} trays available.`);
        }
        
        // Update Inventory (Using set with merge to fix missing docs)
        transaction.set(inventoryRef, {
          stock: newStock,
          totalSales: currentTotalSales + quantity,
          totalRevenue: currentTotalRevenue + total,
          lastUpdated: serverTimestamp()
        }, { merge: true });
        
        // Create Sale Record
        const salesRef = collection(db, this.COLLECTIONS.SALES);
        const newSaleRef = doc(salesRef);
        
        const saleRecord = {
          quantity: quantity,
          price: finalPricePerTray,
          total: total,
          userId: user.uid,
          userEmail: user.email || '',
          userName: user.displayName || user.email?.split('@')[0] || 'Staff',
          date: serverTimestamp(),
          isSpecialPrice: isSpecial,
          isBulk: isBulk,
          priceName: priceName,
          userColor: user.email === process.env.REACT_APP_ADMIN_EMAIL ? '#4CAF50' : '#FF9800'
        };
        
        transaction.set(newSaleRef, saleRecord);
        
        return { ...saleRecord, id: newSaleRef.id, newStock };
      });
    } catch (error) {
      console.error('Error recording sale:', error);
      throw error;
    }
  }

  // 3. Set Standard Price
  async setStandardPrice(price) {
    const standardRef = doc(db, this.COLLECTIONS.SETTINGS, 'standard_price');
    await setDoc(standardRef, { 
      value: parseFloat(price), 
      updatedAt: serverTimestamp() 
    }, { merge: true });
  }

  // 4. Create Special Price
  async createSpecialPrice(priceData) {
    await addDoc(collection(db, this.COLLECTIONS.PRICES), {
      ...priceData, 
      isActive: true, 
      createdAt: serverTimestamp()
    });
  }

  // 5. Get Current Stock (Initializes if missing)
  async getCurrentStock() {
    try {
      const inventoryRef = doc(db, this.COLLECTIONS.INVENTORY, 'current');
      const inventoryDoc = await getDoc(inventoryRef);
      
      if (inventoryDoc.exists()) {
        return inventoryDoc.data().stock || 0;
      }
      
      // FIX: If deleted, recreate it immediately
      await setDoc(inventoryRef, {
        stock: 0,
        totalSales: 0,
        totalRevenue: 0,
        lastUpdated: serverTimestamp()
      });
      return 0;
    } catch (error) {
      console.error('Error getting stock:', error);
      return 0;
    }
  }

  // 6. Update Stock (FIXED: Uses setDoc instead of updateDoc)
  async updateStock(newStock) {
    try {
      const inventoryRef = doc(db, this.COLLECTIONS.INVENTORY, 'current');
      
      // Using setDoc with { merge: true } ensures that if the document
      // was deleted, it will be recreated with this new stock value.
      await setDoc(inventoryRef, {
        stock: parseFloat(newStock),
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      console.log('Stock updated/restored to:', newStock);
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }

  // 7. Listeners
  listenToInventory(callback) {
    return onSnapshot(doc(db, this.COLLECTIONS.INVENTORY, 'current'), (doc) => {
      if (doc.exists()) {
        callback({ stock: doc.data().stock || 0 });
      } else {
        callback({ stock: 0 });
      }
    });
  }

  listenToTodaySales(callback) {
    const start = startOfDay(new Date());
    const q = query(collection(db, this.COLLECTIONS.SALES), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const sales = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => {
          const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
          return d >= start;
        });
      callback(sales);
    });
  }
}

const databaseService = new DatabaseService();
export default databaseService;