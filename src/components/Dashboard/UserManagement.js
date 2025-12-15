import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';
import Swal from 'sweetalert2';
import '../../styles/UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff'
  });
  const [loading, setLoading] = useState(false);

  // Load users in real-time
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    });

    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!formData.name || (!formData.email && !formData.phone)) {
      Swal.fire('Error', 'Name and at least one contact method (Email or Phone) are required', 'error');
      return;
    }

    try {
      setLoading(true);

      // 1. Format Phone (Remove spaces, ensure +27/International format)
      let cleanPhone = '';
      if (formData.phone) {
        cleanPhone = formData.phone.replace(/\s/g, '');
        // Default to SA +27 if starting with 0
        if (cleanPhone.startsWith('0')) {
          cleanPhone = '+27' + cleanPhone.substring(1);
        }
      }

      // 2. Add to main 'users' collection (Used for Google Auth & Dashboard Display)
      const userDocRef = await addDoc(collection(db, 'users'), {
        name: formData.name,
        email: formData.email.toLowerCase(),
        phone: cleanPhone,
        role: formData.role,
        createdAt: serverTimestamp(),
        status: 'active'
      });

      // 3. CRITICAL: Add to 'allowed_numbers' collection for Phone Auth Cost-Saving Check
      if (cleanPhone) {
        await setDoc(doc(db, 'allowed_numbers', cleanPhone), {
          uid: userDocRef.id,
          name: formData.name,
          role: formData.role
        });
      }

      Swal.fire('Success', `${formData.name} has been added to the whitelist.`, 'success');
      
      // Reset form
      setFormData({ name: '', email: '', phone: '', role: 'staff' });

    } catch (error) {
      console.error("Error adding user: ", error);
      Swal.fire('Error', 'Failed to add user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userPhone, userName) => {
    const result = await Swal.fire({
      title: 'Remove Access?',
      text: `Are you sure you want to remove ${userName}? They will no longer be able to log in.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, remove them'
    });

    if (result.isConfirmed) {
      try {
        // 1. Remove from main list
        await deleteDoc(doc(db, 'users', userId));

        // 2. Remove from allowed_numbers (Stop SMS costs)
        if (userPhone) {
          await deleteDoc(doc(db, 'allowed_numbers', userPhone));
        }

        Swal.fire('Deleted!', `${userName} has been removed.`, 'success');
      } catch (error) {
        Swal.fire('Error', 'Failed to remove user', 'error');
      }
    }
  };

  return (
    <div className="user-management">
      <div className="um-header">
        <h2>👥 Staff Access Control</h2>
        <p>Only users listed here can log in to the application.</p>
      </div>

      <div className="um-grid">
        {/* ADD USER FORM */}
        <div className="um-card add-user-section">
          <h3>Add New User</h3>
          <form onSubmit={handleAddUser}>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Email Address (For Google Login)</label>
              <input 
                type="email" 
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Phone Number (For SMS Login)</label>
              <input 
                type="tel" 
                placeholder="e.g. 076 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
              <small className="hint">The number will be authorized for SMS login.</small>
            </div>

            <div className="form-group">
              <label>Role</label>
              <select 
                value={formData.role} 
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="staff">Staff (Sales Entry Only)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
            </div>

            <button type="submit" className="add-btn" disabled={loading}>
              {loading ? 'Adding...' : 'Authorize User'}
            </button>
          </form>
        </div>

        {/* USER LIST */}
        <div className="um-card list-user-section">
          <h3>Authorized Users ({users.length})</h3>
          <div className="user-list">
            {users.length === 0 ? (
              <p className="no-users">No users added yet.</p>
            ) : (
              users.map(user => (
                <div key={user.id} className="user-item">
                  <div className="user-avatar-small">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info-text">
                    <h4>{user.name} <span className={`badge ${user.role}`}>{user.role}</span></h4>
                    <div className="contact-details">
                      {user.email && <span>📧 {user.email}</span>}
                      {user.phone && <span>📱 {user.phone}</span>}
                    </div>
                  </div>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteUser(user.id, user.phone, user.name)}
                    title="Remove Access"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;