import React, { useState, useEffect } from 'react';
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore
import Swal from 'sweetalert2';
import { auth, db } from '../../firebase'; // Ensure db is imported
import '../../styles/Auth.css';

const PhoneAuth = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+27');

  // Cleanup Recaptcha on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (!document.getElementById('recaptcha-container')) return;
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    try {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          'size': 'normal',
          'callback': (response) => {
            console.log('reCAPTCHA solved');
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
          }
        }
      );
      window.recaptchaVerifier.render();
    } catch (err) {
      console.error('Recaptcha setup error:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!confirmationResult) setupRecaptcha();
    }, 500);
    return () => clearTimeout(timer);
  }, [confirmationResult]);

  const sendVerificationCode = async () => {
    if (!phoneNumber) {
      Swal.fire('Error', 'Please enter a phone number', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Clean and Format Number
      const cleanNumber = phoneNumber.replace(/^0+/, '').replace(/[^0-9]/g, '');
      const fullPhoneNumber = `${countryCode}${cleanNumber}`;
      console.log('Checking permission for:', fullPhoneNumber);

      // ---------------------------------------------------------
      // 🛡️ SECURITY CHECK: Check Database BEFORE sending SMS
      // ---------------------------------------------------------
      // Checks for document in 'allowed_numbers' collection with ID == Phone Number
      const userDocRef = doc(db, 'allowed_numbers', fullPhoneNumber);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        throw new Error('ACCESS DENIED: This number is not authorized.');
      }
      
      console.log('Number authorized. Sending SMS...');

      // 2. Initialize Recaptcha if needed
      if (!window.recaptchaVerifier) setupRecaptcha();

      // 3. Send SMS (Cost Incurred Here)
      const confirmation = await signInWithPhoneNumber(
        auth, 
        fullPhoneNumber, 
        window.recaptchaVerifier
      );
      
      setConfirmationResult(confirmation);
      Swal.fire('Code Sent', 'Check your messages', 'success');

    } catch (error) {
      console.error('Auth Error:', error);
      
      // Reset Recaptcha so they can try again
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
        setTimeout(() => setupRecaptcha(), 1000);
      }

      let msg = error.message; 
      
      if (error.code === 'auth/invalid-phone-number') msg = 'Invalid Phone Number format.';
      if (error.code === 'auth/too-many-requests') msg = 'Too many attempts. Try later.';
      if (error.code === 'auth/quota-exceeded') msg = 'SMS Quota exceeded.';
      
      Swal.fire({
        icon: 'error',
        title: 'Authentication Failed',
        text: msg
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode) return;
    setIsLoading(true);
    try {
      await confirmationResult.confirm(verificationCode);
      Swal.fire('Success', 'Phone Verified!', 'success');
    } catch (error) {
      Swal.fire('Error', 'Invalid Code', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setConfirmationResult(null);
    setVerificationCode('');
    setIsLoading(false);
  };

  return (
    <div className="phone-auth">
      <div className="country-selector">
        <select value={countryCode} onChange={e => setCountryCode(e.target.value)} className="country-select">
          <option value="+27">🇿🇦 South Africa (+27)</option>
          <option value="+263">🇿🇼 Zimbabwe (+263)</option>
        </select>
      </div>

      {!confirmationResult ? (
        <div className="phone-input-container">
          <input 
            type="tel" 
            placeholder="76 123 4567" 
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            className="phone-input"
            disabled={isLoading}
          />
        </div>
      ) : (
        <div className="verification-container">
          <input 
            type="text" 
            placeholder="123456" 
            value={verificationCode}
            onChange={e => setVerificationCode(e.target.value)}
            className="code-input" 
            maxLength={6}
          />
          <button onClick={verifyCode} className="verify-btn" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>
          <button onClick={reset} className="back-btn" disabled={isLoading}>
             Wrong Number?
          </button>
        </div>
      )}

      <div 
        id="recaptcha-container" 
        style={{ 
          margin: '20px auto', 
          display: confirmationResult ? 'none' : 'flex', 
          justifyContent: 'center' 
        }}
      ></div>

      {!confirmationResult && (
        <button 
          onClick={sendVerificationCode} 
          disabled={isLoading || !phoneNumber}
          className="send-code-btn"
        >
          {isLoading ? 'Checking Access...' : 'Send Verification Code'}
        </button>
      )}
    </div>
  );
};

export default PhoneAuth;