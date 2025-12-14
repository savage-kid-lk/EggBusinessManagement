import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, 
  query, where, orderBy, serverTimestamp, Timestamp, onSnapshot, runTransaction 
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
      USERS: 'users'
    };
  }

  // Get current base price info (Standard vs Special)
  // Does not calculate Bulk here, as Bulk depends on Quantity
  async getCurrentBasePrice() {
    try {
      const today = new Date();
      
      // 1. Check for Active Specials
      const pricesRef = collection(db, this.COLLECTIONS.PRICES);
      const activeQuery = query(pricesRef, where('isActive', '==', true));
      const snapshot = await getDocs(activeQuery);
      
      let activeSpecialPrice = null;
      
      snapshot.docs.forEach(doc => {
        const priceData = doc.data();
        const startDate = priceData.startDate?.toDate();
        const endDate = priceData.endDate?.toDate();
        
        // STRICT DATE CHECK: Price only valid if today is within range
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
      
      // 2. Fallback to Standard Price
      const standardRef = doc(db, this.COLLECTIONS.SETTINGS, 'standard_price');
      const standardDoc = await getDoc(standardRef);
      
      if (standardDoc.exists()) {
        return {
          price: standardDoc.data().value,
          name: 'Standard Price',
          isSpecial: false
        };
      }
      
      return { price: 60, name: 'Standard Price', isSpecial: false }; // Default R60
      
    } catch (error) {
      console.error('Error getting price:', error);
      return { price: 60, name: 'Standard Price', isSpecial: false };
    }
  }

  // Record a sale with BULK LOGIC
  async recordSale(saleData, user) {
    try {
      return await runTransaction(db, async (transaction) => {
        const quantity = saleData.quantity;
        
        // 1. Determine Price Logic
        let finalPricePerTray;
        let priceName;
        let isSpecial = false;
        let isBulk = false;

        // BULK RULE: If 20 or more trays, price is R55
        if (quantity >= 20) {
          finalPricePerTray = 55.00;
          priceName = 'Bulk Discount (20+)';
          isBulk = true;
        } else {
          // Otherwise, fetch Standard or Special
          const basePriceInfo = await this.getCurrentBasePrice();
          finalPricePerTray = basePriceInfo.price;
          priceName = basePriceInfo.name;
          isSpecial = basePriceInfo.isSpecial;
        }
        
        const total = quantity * finalPricePerTray;
        
        // 2. Check Inventory
        const inventoryRef = doc(db, this.COLLECTIONS.INVENTORY, 'current');
        const inventoryDoc = await transaction.get(inventoryRef);
        
        if (!inventoryDoc.exists()) {
          throw new Error('Inventory system not initialized.');
        }
        
        const inventory = inventoryDoc.data();
        const newStock = inventory.stock - quantity;
        
        if (newStock < 0) {
          throw new Error(`Insufficient stock. Only ${inventory.stock} trays available.`);
        }
        
        // 3. Update Inventory
        transaction.update(inventoryRef, {
          stock: newStock,
          totalSales: (inventory.totalSales || 0) + quantity,
          totalRevenue: (inventory.totalRevenue || 0) + total,
          lastUpdated: serverTimestamp()
        });
        
        // 4. Create Sale Record
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

  // Other helper methods remain similar but ensuring consistency...
  
  async setStandardPrice(price) {
    const standardRef = doc(db, this.COLLECTIONS.SETTINGS, 'standard_price');
    await setDoc(standardRef, { value: parseFloat(price), updatedAt: serverTimestamp() }, { merge: true });
  }

  async createSpecialPrice(priceData) {
    await addDoc(collection(db, this.COLLECTIONS.PRICES), {
      ...priceData, isActive: true, createdAt: serverTimestamp()
    });
  }

  async getCurrentStock() {
    const docSnap = await getDoc(doc(db, this.COLLECTIONS.INVENTORY, 'current'));
    return docSnap.exists() ? (docSnap.data().stock || 0) : 0;
  }

  async updateStock(newStock) {
    await updateDoc(doc(db, this.COLLECTIONS.INVENTORY, 'current'), {
      stock: parseFloat(newStock), lastUpdated: serverTimestamp()
    });
  }

  listenToInventory(callback) {
    return onSnapshot(doc(db, this.COLLECTIONS.INVENTORY, 'current'), (doc) => {
      if (doc.exists()) callback({ stock: doc.data().stock || 0 });
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