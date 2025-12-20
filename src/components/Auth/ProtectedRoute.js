import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { signOut, deleteUser } from 'firebase/auth'; // Import deleteUser
import { auth, db } from '../../firebase';
import Swal from 'sweetalert2';

const ProtectedRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingDb, setCheckingDb] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (loading) return; // Wait for Firebase Auth to initialize

      if (!user) {
        // Not logged in at all
        setCheckingDb(false);
        return;
      }

      try {
        // 🛑 THE DB CHECK
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          // ✅ User is authorized
          setIsAuthorized(true);
        } else {
          // ⛔ User authenticated but NOT in database (Unauthorized)
          console.error("Unauthorized user detected. Revoking access.");
          
          // 1. Force Logout locally
          await signOut(auth);

          // 2. Alert User
          await Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'You are not a registered staff member.',
            confirmButtonColor: '#d33'
          });

          // 3. (Optional) Delete the "junk" account from Firebase Auth
          // Note: This might require re-authentication if the session is stale,
          // but works immediately after login.
          if (user) {
             try { await deleteUser(user); } catch (e) { console.error("Cleanup failed", e); }
          }
        }
      } catch (error) {
        console.error("Verification Error:", error);
        await signOut(auth);
      } finally {
        setCheckingDb(false);
      }
    };

    verifyUser();
  }, [user, loading]);

  // 1. Show Loading while Firebase connects OR while we check the DB
  if (loading || (user && checkingDb)) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner">Verifying Staff Credentials...</div>
      </div>
    );
  }

  // 2. If no user or verification failed, force back to Login
  // (The useEffect above handles the signOut/Alert)
  if (!user || !isAuthorized) {
    return null; // Or <Navigate to="/login" /> if using react-router-dom v6
  }

  // 3. Only show children (Dashboard) if fully authorized
  return children;
};

export default ProtectedRoute;