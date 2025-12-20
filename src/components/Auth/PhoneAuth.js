import React, { useState, useEffect } from 'react';
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier 
} from 'firebase/auth';
import Swal from 'sweetalert2';
import { auth, checkPhoneAllowed, verifyOtpSecure } from '../../firebase'; // Import secure functions
import '../../styles/Auth.css';

const PhoneAuth = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+27');

  // Cleanup Recaptcha
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (!document.getElementById('recaptcha-container')) return;
    if (window.recaptchaVerifier) window.recaptchaVerifier.clear();

    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'normal',
      'callback': () => console.log('reCAPTCHA solved')
    });
    window.recaptchaVerifier.render();
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
      const cleanNumber = phoneNumber.replace(/^0+/, '').replace(/[^0-9]/g, '');
      const fullPhoneNumber = `${countryCode}${cleanNumber}`;

      // 🛡️ SECURITY CHECK 1: Check DB before sending SMS
      await checkPhoneAllowed(fullPhoneNumber);

      // If check passes, proceed with Firebase Auth
      if (!window.recaptchaVerifier) setupRecaptcha();

      const confirmation = await signInWithPhoneNumber(
        auth, 
        fullPhoneNumber, 
        window.recaptchaVerifier
      );
      
      setConfirmationResult(confirmation);
      Swal.fire('Code Sent', 'Check your messages', 'success');

    } catch (error) {
      console.error('SMS Error:', error);
      
      // Clear recaptcha so they can try again if it was a typo
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
        setTimeout(setupRecaptcha, 1000);
      }

      let msg = error.message;
      if (msg.includes('ACCESS DENIED')) {
        msg = "This phone number is not registered in our system.";
      } else if (error.code === 'auth/invalid-phone-number') {
        msg = 'Invalid Phone Number';
      }
      
      Swal.fire('Access Denied', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode) return;
    setIsLoading(true);
    try {
      // 🛡️ SECURITY CHECK 2: Verify OTP and Double Check DB
      await verifyOtpSecure(confirmationResult, verificationCode);
      
      Swal.fire({
        icon: 'success',
        title: 'Verified!',
        text: 'Access Granted',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire('Error', error.message || 'Invalid Code', 'error');
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
          {isLoading ? 'Verifying Database...' : 'Send Verification Code'}
        </button>
      )}
    </div>
  );
};

export default PhoneAuth;