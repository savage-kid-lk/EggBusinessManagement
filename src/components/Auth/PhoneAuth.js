import React, { useState, useEffect } from 'react';
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier 
} from 'firebase/auth';
import Swal from 'sweetalert2';
import { auth } from '../../firebase';
import '../../styles/Auth.css';

const PhoneAuth = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+27');

  // CLEANUP: properly remove recaptcha when leaving the page
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
    // 1. Check if element exists
    if (!document.getElementById('recaptcha-container')) return;

    // 2. Clear existing verifier if any
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    // 3. Create new verifier
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          'size': 'normal', // Visible checkbox is most reliable for real SMS
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

  // Initialize on mount
  useEffect(() => {
    // Slight delay to ensure DOM is ready
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
      console.log('Sending real SMS to:', fullPhoneNumber);

      // Ensure verifier exists
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
      
      // Reset logic on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
        setTimeout(() => setupRecaptcha(), 1000);
      }

      let msg = 'Failed to send code.';
      if (error.code === 'auth/invalid-phone-number') msg = 'Invalid Phone Number';
      if (error.code === 'auth/too-many-requests') msg = 'Too many attempts. Try later.';
      if (error.code === 'auth/quota-exceeded') msg = 'SMS Quota exceeded.';
      
      Swal.fire('Error', msg, 'error');
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

      {/* CRITICAL FIX: 
         This container is OUTSIDE the conditional rendering above.
         It stays in the DOM but is hidden via CSS when not needed.
      */}
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
          {isLoading ? 'Sending...' : 'Send Verification Code'}
        </button>
      )}
    </div>
  );
};

export default PhoneAuth;