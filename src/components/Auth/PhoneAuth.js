import React, { useState, useRef, useEffect } from 'react';
import { signInWithPhoneNumber } from 'firebase/auth';
import Swal from 'sweetalert2';
import { auth, RecaptchaVerifier } from '../../firebase';
import '../../styles/Auth.css';

const PhoneAuth = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+263');
  const recaptchaVerifierRef = useRef(null);

  useEffect(() => {
    recaptchaVerifierRef.current = new RecaptchaVerifier(
      'recaptcha-container',
      {
        size: 'normal',
        callback: (response) => {
          console.log('reCAPTCHA solved:', response);
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          if (window.grecaptcha && recaptchaVerifierRef.current) {
            window.grecaptcha.reset(recaptchaVerifierRef.current);
          }
        }
      },
      auth
    );
  }, []);

  const sendVerificationCode = async () => {
    if (!phoneNumber.trim()) {
      Swal.fire('Error', 'Please enter a phone number', 'error');
      return;
    }

    try {
      setIsLoading(true);
      
      const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
      
      const confirmation = await signInWithPhoneNumber(
        auth,
        fullPhoneNumber,
        recaptchaVerifierRef.current
      );
      
      setConfirmationResult(confirmation);
      
      Swal.fire({
        icon: 'success',
        title: 'Code Sent!',
        text: `Verification code sent to ${fullPhoneNumber}`,
        timer: 3000
      });
      
    } catch (error) {
      console.error('Error sending code:', error);
      
      let errorMessage = 'Failed to send verification code';
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format';
      }
      
      Swal.fire('Error', errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode.trim() || !confirmationResult) {
      Swal.fire('Error', 'Please enter verification code', 'error');
      return;
    }

    try {
      setIsLoading(true);
      await confirmationResult.confirm(verificationCode);
      
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Phone number verified',
        timer: 2000
      });
      
    } catch (error) {
      console.error('Error verifying code:', error);
      Swal.fire('Error', 'Invalid verification code', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="phone-auth">
      <div className="country-selector">
        <select 
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="country-select"
          disabled={isLoading}
        >
          <option value="+263">🇿🇼 Zimbabwe (+263)</option>
          <option value="+27">🇿🇦 South Africa (+27)</option>
          <option value="+254">🇰🇪 Kenya (+254)</option>
          <option value="+234">🇳🇬 Nigeria (+234)</option>
        </select>
      </div>

      {!confirmationResult ? (
        <>
          <input
            type="tel"
            placeholder="771234567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="phone-input"
            disabled={isLoading}
          />
          
          <div id="recaptcha-container"></div>
          
          <button 
            onClick={sendVerificationCode}
            disabled={isLoading || !phoneNumber.trim()}
            className="send-code-btn"
          >
            {isLoading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="code-input"
            disabled={isLoading}
            maxLength={6}
          />
          
          <button 
            onClick={verifyCode}
            disabled={isLoading || verificationCode.length !== 6}
            className="verify-btn"
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>
          
          <button 
            onClick={() => setConfirmationResult(null)}
            className="back-btn"
            disabled={isLoading}
          >
            Try different number
          </button>
        </>
      )}
    </div>
  );
};

export default PhoneAuth;