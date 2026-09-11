import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useUserProfile } from '../Contexts/UserProfileContext';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import signinbcg from './signinbcg.webp';

const BackendUrl = import.meta.env.VITE_BackendUrl;
const GOOGLE_CLIENT_ID = "968411834049-8rs8qrt46mnkggi27b8mqfq46dqth8jp.apps.googleusercontent.com";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useUserProfile();

  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showPasswordResetForm, setShowPasswordResetForm] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // OTP Timer state
  const [resendTimer, setResendTimer] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState({});
  const [loginTouched, setLoginTouched] = useState({});

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetErrors, setResetErrors] = useState({});

  // Timer effect for resend OTP
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Validation functions
  const validateEmail = (email) => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email address';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    return '';
  };

  const validateOtp = (otp) => {
    if (!otp) return 'OTP is required';
    if (!/^\d{7}$/.test(otp)) return 'OTP must be 7 digits';
    return '';
  };

  const validateConfirmPassword = (confirmPwd, newPwd) => {
    if (!confirmPwd) return 'Please confirm your password';
    if (confirmPwd !== newPwd) return 'Passwords do not match';
    return '';
  };

  // Login handlers
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));

    if (loginTouched[name]) {
      const error = name === 'email' ? validateEmail(value) : validatePassword(value);
      setLoginErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleLoginBlur = (e) => {
    const { name, value } = e.target;
    setLoginTouched(prev => ({ ...prev, [name]: true }));
    const error = name === 'email' ? validateEmail(value) : validatePassword(value);
    setLoginErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    const emailError = validateEmail(loginData.email);
    const passwordError = validatePassword(loginData.password);

    setLoginErrors({ email: emailError, password: passwordError });
    setLoginTouched({ email: true, password: true });

    if (emailError || passwordError) {
      toast.error('Please fix all errors before submitting');
      return;
    }

    setIsLoggingIn(true);

    try {
      const response = await axios.post(
        `${BackendUrl}/api/user/login`,
        {
          email: loginData.email,
          password: loginData.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        const userData = {
          id: response.data.data.user.id,
          userId: response.data.data.user.userId,
          SfId: response.data.data.user.SfId,
          name: response.data.data.user.name,
          email: response.data.data.user.email,
          mobile: response.data.data.user.mobile,
          dob: response.data.data.user.dob,
          gender: response.data.data.user.gender,
          Bio: response.data.data.user.Bio || '',
          profilePhoto: response.data.data.user.profilePhoto || [],
          rollNo: response.data.data.user.rollNo || '', // NEW: Add Roll Number
          profileCompletion: response.data.data.user.profileCompletion || 0
        };

        toast.success(response.data.message || 'Login successful!');

        setTimeout(() => {
          navigate('/home');
          login(userData, response.data.data.token);
        }, 1500);
      } else {
        toast.error(response.data.message || 'Login failed. Please try again.');
        console.error('Login Error:', response.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(errorMessage);
      console.error('API Error:', error.response?.data || error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };


  // Google Sign-In handlers
  const handleGoogleSuccess = async (response) => {
    setIsLoggingIn(true);
    const token = response.credential;

    try {
      const apiResponse = await axios.post(
        `${BackendUrl}/api/user/login/google_login`,
        { token },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (apiResponse.data.code === 0 || apiResponse.data.code === "0") {
        const userDataFromAPI = apiResponse.data.data.data;

        const userData = {
          id: userDataFromAPI.id,
          userId: userDataFromAPI.userId,
          SfId: userDataFromAPI.SfId,
          name: userDataFromAPI.name,
          email: userDataFromAPI.email,
          mobile: userDataFromAPI.mobile,
          dob: userDataFromAPI.dob,
          gender: userDataFromAPI.gender,
          Bio: userDataFromAPI.Bio || '',
          profilePhoto: userDataFromAPI.profilePhoto || [],
          rollNo: userDataFromAPI.rollNo || '', // NEW: Add Roll Number
          profileCompletion: userDataFromAPI.profileCompletion || 0
        };

        toast.success(apiResponse.data.message || 'Google Sign-In successful!');

        login(userData, apiResponse.data.data.token);

        setTimeout(() => {
          navigate('/home');
        }, 1500);
      } else {
        toast.error(apiResponse.data.message || 'Google Sign-In failed.');
        console.error('Google Login Error:', apiResponse.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Google Sign-In failed. Please try again.';
      toast.error(errorMessage);
      console.error('Google API Error:', error.response?.data || error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };


  const handleGoogleFailure = (error) => {
    console.error('Google Sign-In failed:', error);
    toast.error('Google Sign-In was unsuccessful. Please try again.');
  };

  // Forgot password handlers
  const handleSendOtp = async () => {
    const emailError = validateEmail(resetEmail);
    setResetErrors({ email: emailError });

    if (emailError) return;

    try {
      const response = await axios.post(
        `${BackendUrl}/api/user/requestOtp`,
        { email: resetEmail },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        toast.success(response.data.message || 'OTP sent to your email!');
        setOtpSent(true);
        setResetErrors({});

        const timerDuration = 60;
        setResendTimer(timerDuration);
        setCanResend(false);
        setResendAttempts(prev => prev + 1);
      } else {
        toast.error(response.data.message || 'Failed to send OTP. Please try again.');
        console.error('Send OTP Error:', response.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send OTP. Please try again.';
      toast.error(errorMessage);
      console.error('API Error:', error.response?.data || error.message);
    }
  };

  const handleVerifyOtp = async () => {
    const otpError = validateOtp(otp);
    setResetErrors({ otp: otpError });

    if (otpError) return;

    setIsVerifyingOtp(true);

    try {
      const response = await axios.post(
        `${BackendUrl}/api/user/verifyOtp`,
        {
          email: resetEmail,
          otp: otp
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        toast.success(response.data.message || 'OTP verified successfully!');
        setTimeout(() => {
          setShowPasswordResetForm(true);
          setShowForgotPasswordModal(false);
        }, 1000);
      } else {
        toast.error(response.data.message || 'Invalid OTP. Please try again.');
        console.error('Verify OTP Error:', response.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Invalid OTP. Please try again.';
      toast.error(errorMessage);
      console.error('API Error:', error.response?.data || error.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleUpdatePassword = async () => {
    const passwordError = validatePassword(newPassword);
    const confirmError = validateConfirmPassword(confirmPassword, newPassword);

    setResetErrors({
      newPassword: passwordError,
      confirmPassword: confirmError
    });

    if (passwordError || confirmError) return;

    try {
      const response = await axios.post(
        `${BackendUrl}/api/user/reset-password`,
        {
          email: resetEmail,
          newPassword: newPassword
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        toast.success(response.data.message || 'Password updated successfully!');
        setTimeout(() => {
          handleCloseModals();
        }, 1500);
      } else {
        toast.error(response.data.message || 'Failed to update password. Please try again.');
        console.error('Update Password Error:', response.data);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update password. Please try again.';
      toast.error(errorMessage);
      console.error('API Error:', error.response?.data || error.message);
    }
  };

  const handleCloseModals = () => {
    setShowForgotPasswordModal(false);
    setShowPasswordResetForm(false);
    setOtpSent(false);
    setResetEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetErrors({});
    setResendTimer(0);
    setResendAttempts(0);
    setCanResend(false);
  };

  const handleResendOtp = () => {
    setOtp('');
    handleSendOtp();
  };

  const handleEditEmail = () => {
    setOtpSent(false);
    setOtp('');
    setResendTimer(0);
    setCanResend(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <style>{`
        /* Import Pacifico font for brand name */
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');

        /* Disable autofill background color change */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(255, 255, 255, 0.9) inset !important;
          -webkit-text-fill-color: #000 !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        
        /* For password fields */
        input[type="password"]:-webkit-autofill,
        input[type="password"]:-webkit-autofill:hover,
        input[type="password"]:-webkit-autofill:focus,
        input[type="password"]:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(255, 255, 255, 0.9) inset !important;
          -webkit-text-fill-color: #000 !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .custom-google-login-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border: 2px solid rgba(169, 24, 81, 0.3);
          border-radius: 8px;
          font-weight: 600;
          color: #a91851;
          cursor: pointer;
          transition: all 0.2s;
        }

        .custom-google-login-button:hover {
          background: rgba(169, 24, 81, 0.05);
          border-color: #a91851;
          box-shadow: 0 4px 12px rgba(169, 24, 81, 0.2);
        }

        .custom-google-login-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .google-logo-svg {
          width: 20px;
          height: 20px;
        }

        /* Background image styling */
        .login-background {
          background-image: url(${signinbcg});
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
        }

        /* Mobile responsive background */
        @media (max-width: 640px) {
          .login-background {
            background-position: 50% 35%;
          }
        }

        /* Glassmorphism effect */
        .glass-modal {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px 0 rgba(169, 24, 81, 0.15);
        }

        /* Input glassmorphism */
        .glass-input {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        /* Brand name cursive font */
        .brand-name {
          font-family: 'Pacifico', cursive;
        }
      `}</style>

      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div className="min-h-screen login-background flex items-center justify-center p-4 sm:p-6">
          <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            toastOptions={{
              duration: 2000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#a91851',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />

          {/* Forgot Password Modal */}
          {showForgotPasswordModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
                <h2 className="text-2xl font-bold text-[#a91851] mb-4 text-center">
                  {otpSent ? 'Verify OTP' : 'Forgot Password?'}
                </h2>
                <p className="text-gray-600 text-center mb-6 text-sm">
                  {otpSent
                    ? 'Enter the 7-digit OTP sent to your email address.'
                    : "Enter your email address and we'll send you an OTP to reset your password."}
                </p>

                <div>
                  {!otpSent && (
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-[#a91851] mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a91851]" />
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => {
                            setResetEmail(e.target.value);
                            if (resetErrors.email) setResetErrors({});
                          }}
                          placeholder="Enter your email"
                          className="w-full pl-11 pr-4 py-3 bg-white border-2 border-[#d4758f] rounded-lg focus:ring-2 focus:ring-[#a91851] focus:border-[#a91851] outline-none transition"
                        />
                      </div>
                      {resetErrors.email && (
                        <p className="text-red-600 text-xs mt-1 font-medium">
                          {resetErrors.email}
                        </p>
                      )}
                    </div>
                  )}

                  {otpSent && (
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-semibold text-[#a91851]">
                          Enter OTP
                        </label>
                        <button
                          type="button"
                          onClick={handleEditEmail}
                          className="text-xs text-[#a91851] hover:text-[#8e1645] font-semibold"
                        >
                          Edit Email
                        </button>
                      </div>
                      <input
                        type="text"
                        maxLength="7"
                        value={otp}
                        onChange={(e) => {
                          setOtp(e.target.value.replace(/\D/g, ''));
                          if (resetErrors.otp) setResetErrors({});
                        }}
                        placeholder="Enter 7-digit OTP"
                        className="w-full px-4 py-3 bg-white border-2 border-[#d4758f] rounded-lg focus:ring-2 focus:ring-[#a91851] focus:border-[#a91851] outline-none transition text-center text-2xl tracking-widest font-semibold"
                      />
                      {resetErrors.otp && (
                        <p className="text-red-600 text-xs mt-1 font-medium text-center">
                          {resetErrors.otp}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-2 text-center">
                        Sent to: <span className="font-semibold">{resetEmail}</span>
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModals}
                      className="flex-1 bg-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={otpSent ? handleVerifyOtp : handleSendOtp}
                      disabled={isVerifyingOtp}
                      className="flex-1 bg-[#a91851] text-white font-semibold py-2.5 rounded-lg hover:bg-[#8e1645] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isVerifyingOtp ? 'Verifying...' : (otpSent ? 'Verify OTP' : 'Send OTP')}
                    </button>
                  </div>

                  {otpSent && (
                    <div className="mt-3">
                      {resendTimer > 0 && (
                        <p className="text-sm text-center text-gray-600">
                          Resend OTP in <span className="font-bold text-[#a91851]">{formatTime(resendTimer)}</span>
                        </p>
                      )}
                      {canResend && (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          className="w-full text-sm text-[#a91851] hover:text-[#8e1645] font-semibold transition-colors"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Password Reset Form Modal */}
          {showPasswordResetForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
                <h2 className="text-2xl font-bold text-[#a91851] mb-4 text-center">
                  Reset Password
                </h2>
                <p className="text-gray-600 text-center mb-6 text-sm">
                  Enter your new password below.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#a91851] mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a91851]" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (resetErrors.newPassword) setResetErrors(prev => ({ ...prev, newPassword: '' }));
                        }}
                        placeholder="Enter new password"
                        className="w-full pl-11 pr-12 py-3 bg-white border-2 border-[#d4758f] rounded-lg focus:ring-2 focus:ring-[#a91851] focus:border-[#a91851] outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a91851]"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {resetErrors.newPassword && (
                      <p className="text-red-600 text-xs mt-1 font-medium">
                        {resetErrors.newPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#a91851] mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a91851]" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (resetErrors.confirmPassword) setResetErrors(prev => ({ ...prev, confirmPassword: '' }));
                        }}
                        placeholder="Confirm new password"
                        className="w-full pl-11 pr-12 py-3 bg-white border-2 border-[#d4758f] rounded-lg focus:ring-2 focus:ring-[#a91851] focus:border-[#a91851] outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a91851]"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {resetErrors.confirmPassword && (
                      <p className="text-red-600 text-xs mt-1 font-medium">
                        {resetErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseModals}
                      className="flex-1 bg-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdatePassword}
                      className="flex-1 bg-[#a91851] text-white font-semibold py-2.5 rounded-lg hover:bg-[#8e1645] transition-colors"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Login Card with Glassmorphism */}
          <div className="w-full max-w-md">
            <div className="glass-modal rounded-3xl p-8 sm:p-10">
              {/* Sign in heading */}
              <div className="text-center mb-4">
                <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-lg">
                  Sign in
                </h1>
              </div>

              {/* Brand Name - Lumière Lore */}
              <div className="text-center mb-4">
                <h2 className="brand-name text-3xl sm:text-4xl text-[#a91851] drop-shadow-lg">
                  Lumière Lore
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      className="w-full px-4 py-3.5 glass-input border-0 rounded-full focus:ring-2 focus:ring-white/50 outline-none transition text-gray-800 placeholder-gray-500"
                      onChange={handleLoginChange}
                      onBlur={handleLoginBlur}
                      value={loginData.email}
                    />
                  </div>
                  {loginTouched.email && loginErrors.email && (
                    <p className="text-white text-xs mt-1 font-medium ml-4 drop-shadow">{loginErrors.email}</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      className="w-full px-4 py-3.5 glass-input border-0 rounded-full focus:ring-2 focus:ring-white/50 outline-none transition text-gray-800 placeholder-gray-500"
                      onChange={handleLoginChange}
                      onBlur={handleLoginBlur}
                      value={loginData.password}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {loginTouched.password && loginErrors.password && (
                    <p className="text-white text-xs mt-1 font-medium ml-4 drop-shadow">{loginErrors.password}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLoginSubmit}
                  disabled={isLoggingIn}
                  className="w-full bg-white/90 text-[#a91851] font-bold py-3.5 rounded-full hover:bg-white hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <LogIn className="w-5 h-5" />
                  {isLoggingIn ? 'Signing In...' : 'Sign In'}
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/40"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 glass-modal text-white font-semibold drop-shadow">
                      OR
                    </span>
                  </div>
                </div>

                {/* Google Sign-In Button */}
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleFailure}
                    useOneTap={false}
                    theme="filled_white"
                    size="large"
                    width="320"
                    text="signin_with"
                    shape="pill"
                  />
                </div>
              </div>

              <p className="text-center text-sm text-white font-medium mt-6 drop-shadow">
                Don't have an account?{' '}
                <span
                  onClick={() => navigate('/signup')}
                  className="text-white hover:text-white/80 hover:underline font-bold cursor-pointer"
                >
                  Sign Up
                </span>
              </p>
            </div>
          </div>
        </div>
      </GoogleOAuthProvider>
    </>
  );
}
