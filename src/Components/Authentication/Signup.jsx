import React, { useState, useRef, useEffect } from 'react';
import { Heart, User, Mail, Lock, Phone, Calendar, ChevronDown, Eye, EyeOff, ArrowRight, ArrowLeft, X, Image as ImageIcon, Trash2, Upload, Loader2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import ReCAPTCHA from 'react-google-recaptcha';
import { useNavigate } from 'react-router-dom';
import signinbcg from './signinbcg.webp';

const BackendUrl = import.meta.env.VITE_BackendUrl;
const MAX_TOTAL_SIZE_UPLOAD = 10 * 1024 * 1024;
const MAX_IMAGE_SIZE = 1 * 1024 * 1024;
const TOTAL_PHOTOS_ALLOWED = 3;
const RECAPTCHA_SITE_KEY = '6LcfDKsrAAAAALOedfX8knxtsIJpPqnwQ_h3LdjB';

export default function Signup() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);
  const dobInputRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    dob: '',
    gender: '',
    bio: '',
    photos: [],
    agreeToTerms: false
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState(null);

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailVerificationLoading, setEmailVerificationLoading] = useState(false);

  // New state for resend OTP timeout
  const [resendCount, setResendCount] = useState(0);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);

  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - 18);
  const maxDobString = maxDob.toISOString().split("T")[0];

  useEffect(() => {
    return () => {
      formData.photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  // Timer countdown effect
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

  const handleCaptchaVerify = (token) => {
    setCaptchaToken(token);
    setIsCaptchaVerified(true);
  };

  const handleCaptchaExpiry = () => {
    setCaptchaToken('');
    setIsCaptchaVerified(false);
    toast.error('reCAPTCHA expired. Please verify again.');
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'fullName':
        if (!value) return 'Full name is required';
        if (value.length < 2) return 'Name must be at least 2 characters';
        return '';

      case 'email':
        if (!value) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email address';
        return '';

      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter';
        if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
        if (!/[0-9]/.test(value)) return 'Password must contain a number';
        return '';

      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords must match';
        return '';

      case 'mobile':
        if (!value) return 'Mobile number is required';
        if (!/^[0-9]{10}$/.test(value)) return 'Mobile number must be 10 digits';
        return '';

      case 'dob':
        if (!value) return 'Date of birth is required';
        {
          const today = new Date();
          const birthDate = new Date(value);
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          if (age < 18) return 'User must be at least 18 years old';
          if (birthDate > today) return 'Date cannot be in the future';
          return '';
        }

      case 'gender':
        if (!value) return 'Please select your gender';
        return '';

      case 'bio':
        if (!value) return 'Bio is required';
        if (value.length < 10) return 'Bio must be at least 10 characters';
        return '';

      case 'photos':
        if (!value || value.length === 0) return 'Please upload 3 photos';
        if (value.length < TOTAL_PHOTOS_ALLOWED) return `Please upload ${TOTAL_PHOTOS_ALLOWED - value.length} more photo(s)`;
        if (value.length > TOTAL_PHOTOS_ALLOWED) return 'Only 3 photos allowed';
        return '';

      case 'agreeToTerms':
        if (!value) return 'You must agree to the terms and conditions';
        return '';

      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    if (name === 'email') {
      setIsEmailVerified(false);
      setOtpSent(false);
      setOtp('');
      setResendCount(0);
      setResendTimer(0);
      setCanResend(true);
    }

    setFormData(prev => ({ ...prev, [name]: fieldValue }));

    if (touched[name]) {
      const error = validateField(name, fieldValue);
      setErrors(prev => ({ ...prev, [name]: error }));
      if (!error) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const getTimeoutDuration = (count) => {
    if (count === 0) return 60; // 1 minute for first resend
    if (count === 1) return 180; // 3 minutes for second resend
    return 300; // 5 minutes for subsequent resends
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOtp = async () => {
    if (validateField('email', formData.email)) {
      toast.error('Please enter a valid email.');
      return;
    }
    setEmailVerificationLoading(true);

    try {
      const response = await axios.post(
        `${BackendUrl}/api/user/requestOtp`,
        { email: formData.email },
        { timeout: 120000 }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        toast.success('OTP sent to your email!');
        setOtpSent(true);

        // Set timeout based on resend count
        const timeout = getTimeoutDuration(resendCount);
        setResendTimer(timeout);
        setCanResend(false);
        setResendCount(prev => prev + 1);
      } else {
        throw new Error(response.data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error("OTP Send Error:", error);
      toast.error(error.response?.data?.message || error.message || 'Failed to send OTP');
    } finally {
      setEmailVerificationLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 7) {
      toast.error('Please enter a valid 7-digit OTP.');
      return;
    }
    setEmailVerificationLoading(true);

    try {
      const response = await axios.post(
        `${BackendUrl}/api/user/verifyOtp`,
        { email: formData.email, otp: otp },
        { timeout: 120000 }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        toast.success('Email verified successfully!');
        setIsEmailVerified(true);
        setOtpSent(false);
        setResendCount(0);
        setResendTimer(0);
        setCanResend(true);
      } else {
        throw new Error(response.data.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error("OTP Verify Error:", error);
      toast.error(error.response?.data?.message || error.message || 'Invalid OTP. Please try again.');
    } finally {
      setEmailVerificationLoading(false);
    }
  };

  const getTotalPhotoSize = (photos) => photos.reduce((total, photo) => total + (photo.size || 0), 0);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const compressImage = (file, targetSize = MAX_IMAGE_SIZE) => {
    return new Promise((resolve, reject) => {
      if (file.size <= targetSize) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          let quality = 0.9;
          const minQuality = 0.1;
          const qualityStep = 0.1;
          let attempts = 0;
          const maxAttempts = 10;

          const tryCompress = () => {
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Compression failed - blob creation error'));
                return;
              }
              attempts++;
              if (blob.size <= targetSize || attempts >= maxAttempts || quality <= minQuality) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
                return;
              }

              quality = Math.max(quality - qualityStep, minQuality);
              tryCompress();
            }, file.type, quality);
          };

          tryCompress();
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  const uploadImageToS3 = async (file) => {
    try {
      // 1. Get Presigned URL for 'demo' folder
      const { data: urlData } = await axios.post(
        `${BackendUrl}/api/user/upload_photo_url`,
        {
          filename: file.name,
          contentType: file.type,
          fileSize: file.size
        },
        { timeout: 120000 }
      );

      if (urlData.code !== 0 && urlData.code !== "0") {
        throw new Error(urlData.message || 'Failed to initialize upload.');
      }

      // 2. Upload the file directly to S3 (Demo Folder)
      await axios.put(
        urlData.uploadUrl,
        file,
        {
          headers: { 'Content-Type': file.type },
          timeout: 120000
        }
      );

      // 3. Call 'verify_img' to trigger Rekognition and move to 'photos/'
      const { data: verifyData } = await axios.patch(
        `${BackendUrl}/api/user/verify_img`,
        { key: urlData.key },
        { timeout: 120000 }
      );

      if (verifyData.code === 0 || verifyData.code === "0") {
        // Returns the permanent S3 URL (e.g., .../photos/image.jpg)
        return verifyData.finalUrl;
      } else if (verifyData.code === 2 || verifyData.code === "2") {
        // Specifically catch the offensive content error
        // The 'alert' here is good for immediate feedback
        throw new Error(verifyData.message || "Offensive content detected.");
      } else {
        throw new Error(verifyData.message || 'Verification failed');
      }

    } catch (error) {
      // This will be caught by the toast.promise in handleSubmit
      console.error('Upload Error:', error);
      throw error;
    }
  };

  const handlePhotoUpload = async (e, replaceIdx = null) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (replaceIdx !== null && files.length > 1) {
      toast.error('Please select only one photo to replace.');
      return;
    }

    if (replaceIdx === null && formData.photos.length + files.length > TOTAL_PHOTOS_ALLOWED) {
      toast.error(`You can only add ${TOTAL_PHOTOS_ALLOWED - formData.photos.length} more photo(s).`);
      return;
    }

    const newFilesSize = files.reduce((sum, file) => sum + file.size, 0);
    let currentTotalSize = getTotalPhotoSize(formData.photos);
    if (replaceIdx !== null) {
      currentTotalSize -= formData.photos[replaceIdx].size;
    }

    if (newFilesSize + currentTotalSize > MAX_TOTAL_SIZE_UPLOAD) {
      toast.error(`Total file size exceeds ${formatBytes(MAX_TOTAL_SIZE_UPLOAD)}. Please select smaller images.`);
      if (fileInputRef.current) fileInputRef.current.value = null;
      return;
    }

    setUploadingPhotos(true);

    try {
      const compressedFiles = await Promise.all(
        files.map(file => compressImage(file, MAX_IMAGE_SIZE))
      );

      const newPhotos = compressedFiles.map(file => ({
        file: file,
        previewUrl: URL.createObjectURL(file),
        uploadedUrl: null,
        size: file.size
      }));

      if (replaceIdx !== null) {
        URL.revokeObjectURL(formData.photos[replaceIdx].previewUrl);
        setFormData(prev => ({
          ...prev,
          photos: prev.photos.map((p, i) => (i === replaceIdx ? newPhotos[0] : p))
        }));
        toast.success('Photo replaced successfully.');
      } else {
        setFormData(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
      }
    } catch (error) {
      console.error('Compression error:', error);
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  const handleRemovePhoto = (index) => {
    URL.revokeObjectURL(formData.photos[index].previewUrl);
    setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
    toast.success('Photo removed');
  };

  const handleReplacePhoto = (index) => {
    setReplaceIndex(index);
    fileInputRef.current?.click();
  };

  const validateStep1 = () => {
    const fields = ['fullName', 'email', 'password', 'confirmPassword', 'mobile', 'dob', 'gender',];
    const newErrors = {};
    fields.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });
    if (!isEmailVerified) {
      newErrors.email = 'Please verify your email address.';
    }
    setErrors(newErrors);
    setTouched(fields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error('Please fix all errors and verify your email.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const step2Errors = {
      bio: validateField('bio', formData.bio),
      photos: validateField('photos', formData.photos),
      agreeToTerms: validateField('agreeToTerms', formData.agreeToTerms)
    };
    Object.keys(step2Errors).forEach(k => !step2Errors[k] && delete step2Errors[k]);

    if (Object.keys(step2Errors).length > 0) {
      setErrors(step2Errors);
      setTouched({ bio: true, photos: true, agreeToTerms: true });
      toast.error('Please complete all required fields');
      return;
    }

    if (!isCaptchaVerified || !captchaToken) {
      toast.error('Please complete the reCAPTCHA verification.');
      return;
    }

    if (!isEmailVerified) {
      toast.error('Please verify your email before submitting.');
      return;
    }

    const totalSize = getTotalPhotoSize(formData.photos);
    if (totalSize > MAX_TOTAL_SIZE_UPLOAD) {
      toast.error('Total photo size exceeds 10MB. Please remove or replace some photos.');
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedPhotoUrls = await toast.promise(
        Promise.all(formData.photos.map(p => uploadImageToS3(p.file))),
        {
          loading: 'Uploading photos...',
          success: 'Photos uploaded successfully!',
          error: 'Failed to upload photos.'
        }
      );

      const payload = {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        mobile: formData.mobile,
        dob: formData.dob,
        gender: formData.gender === 'male' ? 'M' : 'F',
        Bio: formData.bio,
        profilePhoto: uploadedPhotoUrls,
        captcha: captchaToken
      };

      const response = await axios.post(
        `${BackendUrl}/api/user/register_user`,
        payload,
        { timeout: 120000 }
      );

      if (response.data.code === 0 || response.data.code === "0") {
        toast.success(response.data.message || 'User registered successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        throw new Error(response.data.error?.msg || response.data.message || 'Registration failed.');
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred during registration.');
      console.error('API Error:', error.response?.data || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
        
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(255, 255, 255, 0.9) inset !important;
          -webkit-text-fill-color: #000 !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        
        input[type="password"]:-webkit-autofill,
        input[type="password"]:-webkit-autofill:hover,
        input[type="password"]:-webkit-autofill:focus,
        input[type="password"]:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(255, 255, 255, 0.9) inset !important;
          -webkit-text-fill-color: #000 !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        input[type="date"]:not(:focus):not([value]):before {
          content: attr(placeholder);
          position: absolute;
          left: 0;
          right: 0;
          color: #6b7280;
          pointer-events: none;
        }

        input[type="date"]::-webkit-datetime-edit {
          color: transparent;
        }

        input[type="date"]:focus::-webkit-datetime-edit,
        input[type="date"]:valid::-webkit-datetime-edit {
          color: #1f2937;
        }

        .signup-background {
          background-image: url(${signinbcg});
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
        }

        @media (max-width: 640px) {
          .signup-background {
            background-position: 50% 35%;
          }
        }

        .glass-modal {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px 0 rgba(169, 24, 81, 0.15);
        }

        .glass-input {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .brand-name {
          font-family: 'Pacifico', cursive;
          font-weight: 400;
        }

        .flex-1.overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }

        .flex-1.overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }

        .flex-1.overflow-y-auto::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #a91851, #d4758f);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .flex-1.overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #8e1645, #a91851);
          box-shadow: 0 0 6px rgba(169, 24, 81, 0.5);
        }

        .flex-1.overflow-y-auto {
          scrollbar-width: thin;
          scrollbar-color: #a91851 transparent;
        }

        .flex-1.overflow-y-auto {
          padding-right: 4px;
          margin-right: 4px;
        }

          /* Date input styling */
          input[type="date"] {
            position: relative;
            color: #1f2937;
          }

          input[type="date"]::-webkit-calendar-picker-indicator {
            cursor: pointer;
            opacity: 0.6;
            position: absolute;
            right: 12px;
            z-index: 5;
          }

          /* ONLY show custom placeholder on mobile (under 600px) */
          @media (max-width: 600px) {
            .dob-placeholder {
              display: flex !important;
              z-index: 1;
            }
            
            /* Make the entire input clickable */
            .dob-input {
              cursor: pointer;
            }
            
            /* Make calendar picker cover entire input on mobile */
            .dob-input::-webkit-calendar-picker-indicator {
              opacity: 0;
              width: 100%;
              height: 100%;
              left: 0;
              right: 0;
              top: 0;
              bottom: 0;
              z-index: 10;
            }
          }

          /* Hide native placeholder text when empty */
          input[type="date"]::-webkit-datetime-edit-text,
          input[type="date"]::-webkit-datetime-edit-month-field,
          input[type="date"]::-webkit-datetime-edit-day-field,
          input[type="date"]::-webkit-datetime-edit-year-field {
            color: transparent;
          }

          /* Show date when selected */
          input[type="date"]:focus::-webkit-datetime-edit-text,
          input[type="date"]:focus::-webkit-datetime-edit-month-field,
          input[type="date"]:focus::-webkit-datetime-edit-day-field,
          input[type="date"]:focus::-webkit-datetime-edit-year-field,
          input[type="date"]:valid::-webkit-datetime-edit-text,
          input[type="date"]:valid::-webkit-datetime-edit-month-field,
          input[type="date"]:valid::-webkit-datetime-edit-day-field,
          input[type="date"]:valid::-webkit-datetime-edit-year-field {
            color: #1f2937;
          }
      `}</style>

      <div className="min-h-screen signup-background flex items-center justify-center p-4">
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

        {previewPhoto && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewPhoto(null)}>
            <div className="relative max-w-3xl max-h-[90vh]">
              <button onClick={() => setPreviewPhoto(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300">
                <X className="w-8 h-8" />
              </button>
              <img src={previewPhoto} alt="Preview" className="max-w-full max-h-[85vh] rounded-lg" />
            </div>
          </div>
        )}

        {showTermsModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTermsModal(false)}>
            <div className="bg-white rounded-xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[#a91851]">Terms and Conditions</h2>
                <button onClick={() => setShowTermsModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="text-sm text-gray-700 space-y-3">
                <p>By using this service, you agree to the following terms:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>You must be at least 18 years old to register.</li>
                  <li>All information provided must be accurate and truthful.</li>
                  <li>You are responsible for maintaining the confidentiality of your account.</li>
                  <li>Uploaded photos must comply with community guidelines.</li>
                  <li>We reserve the right to terminate accounts that violate our policies.</li>
                </ul>
                <p className="font-semibold mt-4">By proceeding, you acknowledge that you have read and agree to these terms.</p>
              </div>
              <button onClick={() => setShowTermsModal(false)} className="mt-6 w-full bg-[#a91851] text-white font-bold py-2 rounded-lg hover:bg-[#8e1645]">
                Close
              </button>
            </div>
          </div>
        )}

        <div className="w-full max-w-xl glass-modal rounded-3xl flex flex-col overflow-x-hidden" style={{ minHeight: '75vh', maxHeight: '85vh' }}>
          <div className="text-center pt-8 pb-4 px-6 flex-shrink-0">
            <div className="flex items-center justify-center gap-2 mb-4">
              <h1 className="text-5xl font-bold text-white drop-shadow-lg">Sign Up</h1>
            </div>
            <div className="text-center mb-2">
              <h3 className="brand-name text-4xl sm:text-4xl text-[#a91851] drop-shadow-lg">
                Lumière Lore
              </h3>
            </div>
            <p className="text-sm text-white drop-shadow mt-2">Step {currentStep} of 2</p>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 sm:px-8 pb-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      name="fullName"
                      placeholder="Full Name"
                      className="w-full px-5 py-3.5 text-base glass-input border-0 rounded-full focus:ring-2 focus:ring-white/50 outline-none text-gray-800 placeholder-gray-500"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={formData.fullName}
                    />
                  </div>
                  {touched.fullName && errors.fullName && (
                    <p className="text-red-600 text-xs mt-1 ml-4 font-semibold bg-white/80 px-3 py-1 rounded-full inline-block">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <div className="relative flex items-center">
                    <input
                      type="email"
                      name="email"
                      placeholder="Email Address"
                      disabled={isEmailVerified || otpSent}
                      className="w-full px-5 py-3.5 text-base glass-input border-0 rounded-full focus:ring-2 focus:ring-white/50 outline-none disabled:bg-gray-200/50 disabled:cursor-not-allowed text-gray-800 placeholder-gray-500"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={formData.email}
                    />
                    {!isEmailVerified && !otpSent && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={emailVerificationLoading || !!validateField('email', formData.email)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#a91851] text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-[#8e1645] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                      >
                        {emailVerificationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                      </button>
                    )}
                    {isEmailVerified && (
                      <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {touched.email && errors.email && (
                    <p className="text-red-600 text-xs mt-1 ml-4 font-semibold bg-white/80 px-3 py-1 rounded-full inline-block">{errors.email}</p>
                  )}
                </div>

                {otpSent && !isEmailVerified && (
                  <div className="p-4 glass-modal rounded-2xl space-y-3">
                    <div className='flex justify-between items-center text-sm'>
                      <p className="text-left text-white drop-shadow">OTP sent to your email</p>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setResendCount(0);
                          setResendTimer(0);
                          setCanResend(true);
                        }}
                        className="font-semibold text-white hover:text-white/80 drop-shadow"
                      >
                        Edit Email
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter 7-digit OTP"
                      maxLength="7"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full text-center tracking-widest font-mono py-3 text-base glass-input border-0 rounded-full focus:ring-2 focus:ring-white/50 outline-none text-gray-800"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={emailVerificationLoading || !canResend}
                        className="flex-1 bg-white/80 text-[#a91851] font-bold py-2.5 rounded-full hover:bg-white disabled:bg-gray-400/50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                      >
                        {emailVerificationLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : !canResend ? (
                          `Resend (${formatTime(resendTimer)})`
                        ) : (
                          'Resend'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={emailVerificationLoading}
                        className="flex-1 bg-[#a91851] text-white font-bold py-2.5 rounded-full hover:bg-[#8e1645] disabled:bg-gray-400/50 flex items-center justify-center text-sm"
                      >
                        {emailVerificationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      className="w-full px-5 py-3.5 text-base glass-input border-0 rounded-full focus:ring-2 focus:ring-white/50 outline-none text-gray-800 placeholder-gray-500"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={formData.password}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <p className="text-red-600 text-xs mt-1 ml-4 font-semibold bg-white/80 px-3 py-1 rounded-full inline-block">{errors.password}</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      className="w-full px-5 py-3.5 text-base glass-input border-0 rounded-full focus:ring-2 focus:ring-white/50 outline-none text-gray-800 placeholder-gray-500"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={formData.confirmPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <p className="text-red-600 text-xs mt-1 ml-4 font-semibold bg-white/80 px-3 py-1 rounded-full inline-block">{errors.confirmPassword}</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <input
                      type="tel"
                      inputMode="numeric"
                      name="mobile"
                      placeholder="Mobile Number"
                      className="w-full px-5 py-3.5 text-base glass-input border-0 rounded-full focus:ring-2 focus:ring-white/50 outline-none text-gray-800 placeholder-gray-500"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={formData.mobile}
                    />
                  </div>
                  {touched.mobile && errors.mobile && (
                    <p className="text-red-600 text-xs mt-1 ml-4 font-semibold bg-white/80 px-3 py-1 rounded-full inline-block">{errors.mobile}</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <input
                      ref={dobInputRef}
                      type="date"
                      name="dob"
                      className="w-full px-5 py-3.5 text-base glass-input border-0 rounded-full focus:ring-2 focus:ring-white/50 outline-none text-gray-800 dob-input"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={formData.dob}
                      max={maxDobString}
                      style={{
                        colorScheme: 'light'
                      }}
                    />
                    {!formData.dob && (
                      <span
                        onClick={() => {
                          if (dobInputRef.current?.showPicker) {
                            dobInputRef.current.showPicker();
                          } else {
                            dobInputRef.current?.focus();
                          }
                        }}
                        className="dob-placeholder absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer hidden items-center gap-2 select-none"
                      >
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <span className="text-base">Date of Birth</span>
                      </span>
                    )}
                  </div>
                  {touched.dob && errors.dob && (
                    <p className="text-red-600 text-xs mt-1 ml-4 font-semibold bg-white/80 px-3 py-1 rounded-full inline-block">{errors.dob}</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <select
                      name="gender"
                      className="w-full px-5 py-3.5 text-base glass-input border-0 rounded-full focus:ring-2 focus:ring-white/50 outline-none appearance-none text-gray-800"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={formData.gender}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 pointer-events-none" />
                  </div>
                  {touched.gender && errors.gender && (
                    <p className="text-red-600 text-xs mt-1 ml-4 font-semibold bg-white/80 px-3 py-1 rounded-full inline-block">{errors.gender}</p>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  className="w-full bg-white/90 text-[#a91851] font-bold py-3.5 rounded-full hover:bg-white hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-2 mt-4 text-base"
                >
                  Next <ArrowRight className="w-5 h-5" />
                </button>

                <p className="text-center text-sm text-white font-medium mt-4 drop-shadow">
                  Already have an account?{' '}
                  <span
                    onClick={() => navigate('/login')}
                    className="text-white hover:text-white/80 hover:underline font-bold cursor-pointer"
                  >
                    Sign In
                  </span>
                </p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <textarea
                    name="bio"
                    placeholder="Tell us about yourself..."
                    rows="3"
                    className="w-full px-5 py-3.5 text-base glass-input border-0 rounded-2xl focus:ring-2 focus:ring-white/50 outline-none resize-none text-gray-800 placeholder-gray-500"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={formData.bio}
                  />
                  {touched.bio && errors.bio && (
                    <p className="text-red-600 text-xs mt-1 ml-4 font-semibold bg-white/80 px-3 py-1 rounded-full inline-block">{errors.bio}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-3 ml-4 drop-shadow">
                    Profile Photos (3 Required, Max 10MB)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple={replaceIndex === null}
                    onChange={(e) => handlePhotoUpload(e, replaceIndex)}
                    className="hidden"
                  />

                  {formData.photos.length < TOTAL_PHOTOS_ALLOWED && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplaceIndex(null);
                        fileInputRef.current?.click();
                      }}
                      disabled={uploadingPhotos}
                      className="w-full py-4 glass-modal rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 disabled:opacity-50 mb-3 border border-white/30"
                    >
                      <ImageIcon className="w-7 h-7 text-white" />
                      <span className="text-base text-white font-medium drop-shadow">
                        {uploadingPhotos ? 'Processing...' : `Add Photos (${formData.photos.length}/${TOTAL_PHOTOS_ALLOWED})`}
                      </span>
                    </button>
                  )}

                  {formData.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {formData.photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo.previewUrl}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-28 object-cover rounded-lg border-2 border-white/50 cursor-pointer"
                            onClick={() => setPreviewPhoto(photo.previewUrl)}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleReplacePhoto(index)}
                              className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600"
                              title="Replace"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(index)}
                              className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-white text-center mt-1 drop-shadow">{formatBytes(photo.size)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {formData.photos.length > 0 && (
                    <p className="text-sm text-white mt-2 ml-4 drop-shadow">
                      Total: {formatBytes(getTotalPhotoSize(formData.photos))} / {formatBytes(MAX_TOTAL_SIZE_UPLOAD)}
                    </p>
                  )}

                  {touched.photos && errors.photos && (
                    <p className="text-red-600 text-xs mt-1 ml-4 font-semibold bg-white/80 px-3 py-1 rounded-full inline-block">{errors.photos}</p>
                  )}
                </div>

                <div className="flex justify-center py-3">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={handleCaptchaVerify}
                    onExpired={handleCaptchaExpiry}
                    onErrored={() => toast.error('reCAPTCHA error. Please try again.')}
                    theme="light"
                  />
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    id="agreeToTerms"
                    className="w-4 h-4 mt-0.5 text-[#a91851] border-2 border-white rounded focus:ring-white"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    checked={formData.agreeToTerms}
                  />
                  <label htmlFor="agreeToTerms" className="ml-2 text-sm text-white drop-shadow">
                    I agree to the{' '}
                    <span
                      onClick={() => setShowTermsModal(true)}
                      className="text-white hover:text-white/80 hover:underline font-semibold cursor-pointer"
                    >
                      Terms and Conditions
                    </span>
                  </label>
                </div>
                {touched.agreeToTerms && errors.agreeToTerms && (
                  <p className="text-red-600 text-xs ml-4 font-semibold bg-white/80 px-3 py-1 rounded-full inline-block">{errors.agreeToTerms}</p>
                )}

                <div className="flex gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 bg-white/70 text-gray-700 font-bold py-3.5 rounded-full hover:bg-white/90 flex items-center justify-center gap-2 text-base"
                  >
                    <ArrowLeft className="w-5 h-5" /> Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-white/90 text-[#a91851] font-bold py-3.5 rounded-full hover:bg-white hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-base"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Heart className="w-5 h-5 fill-current" />
                    )}
                    {isSubmitting ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
