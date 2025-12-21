import React, { useEffect, useState, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs } from 'firebase/firestore'; 
import { signOut, deleteUser } from 'firebase/auth';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import Swal from 'sweetalert2';

const ProtectedRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  // 🛡️ PREVENT DOUBLE-FIRING (Fixes double popup)
  const verificationRunning = useRef(false);

  useEffect(() => {
    // 1. Wait for Firebase
    if (loading) return;

    // 2. Not logged in? Stop checking.
    if (!user) {
      setIsChecking(false);
      return;
    }

    // 3. If already running a check, STOP here.
    if (verificationRunning.current) return;
    verificationRunning.current = true;

    const verifyUser = async () => {
      try {
        const usersRef = collection(db, 'users');
        let q;

        console.log("Verifying User:", user.email || user.phoneNumber);

        // Normalize inputs
        if (user.email) {
          q = query(usersRef, where('email', '==', user.email.toLowerCase().trim()));
        } else if (user.phoneNumber) {
          q = query(usersRef, where('phone', '==', user.phoneNumber));
        }

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // ✅ AUTHORIZED
          setIsAuthorized(true);
        } else {
          // ⛔ UNAUTHORIZED
          console.warn("User not found in DB. Access Revoked.");
          
          await Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'Your account is not whitelisted in the staff database.',
            confirmButtonColor: '#d33',
            allowOutsideClick: false,
            allowEscapeKey: false
          });

          // Cleanup
          await deleteUser(user).catch((e) => console.error("Cleanup warning:", e));
          await signOut(auth);
        }
      } catch (error) {
        console.error("Verification Error:", error);
        if (error.code === 'permission-denied') {
             await Swal.fire('System Error', 'Database permissions blocking access.', 'error');
        }
        await signOut(auth);
      } finally {
        setIsChecking(false);
        verificationRunning.current = false; // Reset for next login attempt
      }
    };

    verifyUser();
  }, [user, loading]);

  // --- 🎨 LOADING SPINNER ---
  if (loading || (user && isChecking)) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner}></div>
        <h3 style={styles.text}>Verifying Credentials...</h3>
      </div>
    );
  }

  // Redirect if failed
  if (!user || !isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  // Access Granted
  return children;
};

// --- STYLES ---
const styles = {
  container: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    zIndex: 9999,
    position: 'fixed',
    top: 0,
    left: 0
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #e0e0e0',
    borderTop: '5px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  text: {
    color: '#64748b',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '16px',
    fontWeight: '500'
  }
};

// Add animation
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default ProtectedRoute;